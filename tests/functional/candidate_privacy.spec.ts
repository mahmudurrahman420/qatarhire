import { test } from '@japa/runner'
import Application from '#models/application'
import CandidateAccessLog from '#models/candidate_access_log'
import { makeCandidate, makeEmployer, makeJob, resetData } from '#tests/helpers'

test.group('Candidate privacy and recruiter search visibility', (group) => {
  group.each.setup(() => resetData())

  test('private and unverified-email candidates never appear in search', async ({ client, assert }) => {
    const { profile: visible } = await makeCandidate({ visibility: 'discoverable' })
    const { profile: hidden } = await makeCandidate({ visibility: 'private' })
    const { profile: unverified } = await makeCandidate({ visibility: 'discoverable', verified: false })
    const { user: emp } = await makeEmployer('verified')
    const res = await client.get('/employer/candidates').withInertia().loginAs(emp)
    const ids = res.inertiaProps.results.data.map((c: any) => c.id)
    assert.include(ids, visible.id)
    assert.notInclude(ids, hidden.id)
    assert.notInclude(ids, unverified.id)
  })

  test('search result cards carry no contact details or CV links', async ({ client, assert }) => {
    await makeCandidate({ visibility: 'discoverable', contactSharing: 'verified_employers', cvSearchable: true })
    const { user: emp } = await makeEmployer('verified')
    const res = await client.get('/employer/candidates').withInertia().loginAs(emp)
    const card = res.inertiaProps.results.data[0]
    const json = JSON.stringify(card)
    for (const key of ['phone', 'email', 'contactEmail', 'downloadUrl', 'storageKey']) assert.notInclude(json, `"${key}"`)
    assert.notMatch(card.name, /Person$/, 'full surname is not shown in search')
  })

  test('unverified companies cannot search candidates', async ({ client, assert }) => {
    await makeCandidate({ visibility: 'discoverable' })
    const { user: emp } = await makeEmployer('pending')
    const res = await client.get('/employer/candidates').withInertia().loginAs(emp)
    assert.isFalse(res.inertiaProps.allowed)
    assert.isNull(res.inertiaProps.results)
  })

  test('private profiles return 404 to employers who were not applied to', async ({ client }) => {
    const { profile } = await makeCandidate({ visibility: 'private' })
    const { user: emp } = await makeEmployer('verified')
    ;(await client.get(`/employer/candidates/${profile.id}`).withInertia().loginAs(emp)).assertStatus(404)
  })

  test('contact details are hidden unless the candidate shares them', async ({ client, assert }) => {
    const { profile: noShare } = await makeCandidate({ visibility: 'discoverable', contactSharing: 'on_application' })
    const { profile: share } = await makeCandidate({ visibility: 'discoverable', contactSharing: 'verified_employers' })
    const { user: emp } = await makeEmployer('verified')
    const a = await client.get(`/employer/candidates/${noShare.id}`).withInertia().loginAs(emp)
    assert.isNull(a.inertiaProps.candidate.contact)
    const b = await client.get(`/employer/candidates/${share.id}`).withInertia().loginAs(emp)
    assert.equal(b.inertiaProps.candidate.contact.phone, '+974 5555 0000')
    assert.isNotNull(await CandidateAccessLog.query().where('candidate_profile_id', share.id).where('action', 'contact_view').first())
  })

  test('applying shares the profile and contact details with that employer only', async ({ client, assert }) => {
    const { profile } = await makeCandidate({ visibility: 'private' })
    const { user: emp, company } = await makeEmployer('pending')
    const job = await makeJob(company)
    const app = await Application.create({ jobId: job.id, candidateProfileId: profile.id, status: 'submitted' })
    const res = await client.get(`/employer/applications/${app.id}`).withInertia().loginAs(emp)
    res.assertStatus(200)
    assert.isNotNull(res.inertiaProps.candidate.contact)
    const { user: otherEmp } = await makeEmployer('verified')
    ;(await client.get(`/employer/applications/${app.id}`).withInertia().loginAs(otherEmp)).assertStatus(404)
    ;(await client.get(`/employer/candidates/${profile.id}`).withInertia().loginAs(otherEmp)).assertStatus(404)
  })

  test('switching to private removes a candidate from search immediately', async ({ client, assert }) => {
    const { user, profile } = await makeCandidate({ visibility: 'discoverable' })
    const { user: emp } = await makeEmployer('verified')
    await client.put('/candidate/privacy').json({ visibility: 'private', contactSharing: 'on_application', cvSearchable: false }).withCsrfToken().loginAs(user)
    const res = await client.get('/employer/candidates').withInertia().loginAs(emp)
    assert.notInclude(res.inertiaProps.results.data.map((c: any) => c.id), profile.id)
  })

  test('candidates can see which employers accessed their profile', async ({ client, assert }) => {
    const { user, profile } = await makeCandidate({ visibility: 'discoverable' })
    const { user: emp, company } = await makeEmployer('verified')
    await client.get(`/employer/candidates/${profile.id}`).withInertia().loginAs(emp)
    const res = await client.get('/candidate/privacy').withInertia().loginAs(user)
    assert.equal(res.inertiaProps.accessLog[0].company.name, company.name)
  })

  test('data export contains the candidate\'s data and account deletion removes it', async ({ client, assert }) => {
    const { user, profile } = await makeCandidate()
    const exp = await client.get('/candidate/data-export').loginAs(user)
    exp.assertStatus(200)
    assert.equal(JSON.parse(exp.text()).account.email, user.email)
    await client.post('/candidate/delete-account').json({ password: 'TestPassword#123', confirm: 'DELETE' }).withCsrfToken().loginAs(user)
    const { default: User } = await import('#models/user')
    const { default: CandidateProfile } = await import('#models/candidate_profile')
    assert.isNull(await User.find(user.id))
    assert.isNull(await CandidateProfile.find(profile.id))
  })
})
