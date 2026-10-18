import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import Application from '#models/application'
import ApplicationStatusHistory from '#models/application_status_history'
import ApplicationNote from '#models/application_note'
import Notification from '#models/notification'
import { makeCandidate, makeEmployer, makeJob, resetData } from '#tests/helpers'

test.group('Applications and recruitment workflow', (group) => {
  group.each.setup(() => resetData())

  test('a candidate applies once; a second attempt is refused', async ({ client, assert }) => {
    const { user, profile } = await makeCandidate()
    const { user: emp, company } = await makeEmployer('verified')
    const job = await makeJob(company)
    const first = await client.post(`/jobs/${job.slug}/apply`).json({ coverLetter: 'Hello' }).withCsrfToken().loginAs(user).redirects(0)
    first.assertHeader('location', '/candidate/applications')
    await client.post(`/jobs/${job.slug}/apply`).json({}).withCsrfToken().loginAs(user).redirects(0)
    const apps = await Application.query().where('job_id', job.id).where('candidate_profile_id', profile.id)
    assert.lengthOf(apps, 1)
    const history = await ApplicationStatusHistory.query().where('application_id', apps[0].id)
    assert.equal(history[0].toStatus, 'submitted')
    assert.isNotNull(await Notification.query().where('user_id', emp.id).where('type', 'application_received').first(), 'employer notified')
    assert.isNotNull(await Notification.query().where('user_id', user.id).where('type', 'application_submitted').first(), 'candidate notified')
  })

  test('the database enforces one application per job and candidate', async ({ assert }) => {
    const { profile } = await makeCandidate()
    const { company } = await makeEmployer('verified')
    const job = await makeJob(company)
    await Application.create({ jobId: job.id, candidateProfileId: profile.id, status: 'submitted' })
    await assert.rejects(() => Application.create({ jobId: job.id, candidateProfileId: profile.id, status: 'submitted' }))
  })

  test('closed, paused and expired jobs do not accept applications', async ({ client, assert }) => {
    const { user, profile } = await makeCandidate()
    const { company } = await makeEmployer('verified')
    const closed = await makeJob(company, { status: 'closed' })
    const paused = await makeJob(company, { status: 'paused' })
    const expired = await makeJob(company, { deadline: DateTime.now().minus({ days: 1 }) })
    for (const job of [closed, paused, expired]) {
      await client.post(`/jobs/${job.slug}/apply`).json({}).withCsrfToken().loginAs(user)
    }
    assert.lengthOf(await Application.query().where('candidate_profile_id', profile.id), 0)
  })

  test('a candidate cannot attach another candidate\'s CV', async ({ client, assert }) => {
    const { user, profile } = await makeCandidate()
    const { profile: other } = await makeCandidate()
    const { default: CandidateCv } = await import('#models/candidate_cv')
    const cv = await CandidateCv.create({ candidateProfileId: other.id, label: 'x', storageKey: `cvs/test/${Date.now()}.pdf`, originalName: 'x.pdf', mimeType: 'application/pdf', sizeBytes: 10, isPrimary: true })
    const { company } = await makeEmployer('verified')
    const job = await makeJob(company)
    await client.post(`/jobs/${job.slug}/apply`).json({ cvId: cv.id }).withCsrfToken().loginAs(user)
    assert.lengthOf(await Application.query().where('candidate_profile_id', profile.id), 0)
  })

  test('employer moves an application through allowed stages; invalid jumps are refused', async ({ client, assert }) => {
    const { user: cand, profile } = await makeCandidate()
    const { user: emp, company } = await makeEmployer('verified')
    const job = await makeJob(company)
    const app = await Application.create({ jobId: job.id, candidateProfileId: profile.id, status: 'submitted' })
    const move = (status: string) => client.post(`/employer/applications/${app.id}/status`).json({ status }).withCsrfToken().loginAs(emp)

    await move('hired') // submitted → hired is not allowed
    assert.equal((await app.refresh()).status, 'submitted')
    await move('shortlisted')
    await move('interview')
    await move('offer')
    await move('hired')
    assert.equal((await app.refresh()).status, 'hired')
    const history = await ApplicationStatusHistory.query().where('application_id', app.id).orderBy('id')
    assert.deepEqual(history.map((h) => h.toStatus), ['shortlisted', 'interview', 'offer', 'hired'])
    assert.isNotNull(await Notification.query().where('user_id', cand.id).where('type', 'application_status_changed').first())
  })

  test('opening an application marks it under review', async ({ client, assert }) => {
    const { profile } = await makeCandidate()
    const { user: emp, company } = await makeEmployer('verified')
    const app = await Application.create({ jobId: (await makeJob(company)).id, candidateProfileId: profile.id, status: 'submitted' })
    await client.get(`/employer/applications/${app.id}`).withInertia().loginAs(emp)
    assert.equal((await app.refresh()).status, 'under_review')
  })

  test('other companies cannot view, move or annotate an application', async ({ client, assert }) => {
    const { profile } = await makeCandidate()
    const { company } = await makeEmployer('verified')
    const app = await Application.create({ jobId: (await makeJob(company)).id, candidateProfileId: profile.id, status: 'submitted' })
    const { user: intruder } = await makeEmployer('verified')
    ;(await client.get(`/employer/applications/${app.id}`).withInertia().loginAs(intruder)).assertStatus(404)
    ;(await client.post(`/employer/applications/${app.id}/status`).json({ status: 'rejected' }).withCsrfToken().loginAs(intruder)).assertStatus(404)
    ;(await client.post(`/employer/applications/${app.id}/notes`).json({ body: 'x' }).withCsrfToken().loginAs(intruder)).assertStatus(404)
    assert.equal((await app.refresh()).status, 'submitted')
  })

  test('recruiters in the same company share the pipeline; private notes never reach the candidate', async ({ client, assert }) => {
    const { user: cand, profile } = await makeCandidate()
    const { company } = await makeEmployer('verified')
    const { user: recruiter } = await makeEmployer('verified', 'recruiter', company)
    const app = await Application.create({ jobId: (await makeJob(company)).id, candidateProfileId: profile.id, status: 'submitted' })
    await client.post(`/employer/applications/${app.id}/notes`).json({ body: 'Strong on React, weak on SQL' }).withCsrfToken().loginAs(recruiter)
    assert.lengthOf(await ApplicationNote.query().where('application_id', app.id), 1)
    const res = await client.get('/candidate/applications').withInertia().loginAs(cand)
    assert.notInclude(JSON.stringify(res.inertiaProps), 'weak on SQL')
  })

  test('candidates can withdraw before an offer, not after', async ({ client, assert }) => {
    const { user, profile } = await makeCandidate()
    const { company } = await makeEmployer('verified')
    const a = await Application.create({ jobId: (await makeJob(company)).id, candidateProfileId: profile.id, status: 'interview' })
    const b = await Application.create({ jobId: (await makeJob(company)).id, candidateProfileId: profile.id, status: 'offer' })
    await client.post(`/candidate/applications/${a.id}/withdraw`).withCsrfToken().loginAs(user)
    await client.post(`/candidate/applications/${b.id}/withdraw`).withCsrfToken().loginAs(user)
    assert.equal((await a.refresh()).status, 'withdrawn')
    assert.equal((await b.refresh()).status, 'offer')
  })

  test('a candidate cannot withdraw someone else\'s application', async ({ client, assert }) => {
    const { profile } = await makeCandidate()
    const { user: other } = await makeCandidate()
    const { company } = await makeEmployer('verified')
    const app = await Application.create({ jobId: (await makeJob(company)).id, candidateProfileId: profile.id, status: 'submitted' })
    ;(await client.post(`/candidate/applications/${app.id}/withdraw`).withCsrfToken().loginAs(other)).assertStatus(404)
    assert.equal((await app.refresh()).status, 'submitted')
  })
})
