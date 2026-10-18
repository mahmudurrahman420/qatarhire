import { test } from '@japa/runner'
import drive from '@adonisjs/drive/services/main'
import CandidateCv from '#models/candidate_cv'
import CandidateAccessLog from '#models/candidate_access_log'
import Application from '#models/application'
import Notification from '#models/notification'
import { makeAdmin, makeCandidate, makeEmployer, makeJob, PDF_BYTES, resetData, tmpFile } from '#tests/helpers'

async function upload(client: any, user: any, name: string, content: Buffer | string, extra: Record<string, string> = {}) {
  const path = await tmpFile(name, content)
  const req = client.post('/candidate/cvs').file('cv', path).withCsrfToken().loginAs(user).redirects(0)
  for (const [k, v] of Object.entries(extra)) req.field(k, v)
  return req
}

test.group('CV upload, storage and protected downloads', (group) => {
  group.each.setup(() => resetData())

  test('a PDF is stored privately under a random key and becomes the primary CV', async ({ client, assert }) => {
    const { user, profile } = await makeCandidate()
    const res = await upload(client, user, 'my cv.pdf', PDF_BYTES)
    res.assertStatus(302)
    const cv = await CandidateCv.findByOrFail('candidate_profile_id', profile.id)
    assert.isTrue(cv.isPrimary)
    assert.equal(cv.mimeType, 'application/pdf')
    assert.match(cv.storageKey, /^cvs\/\d{4}\/\d{2}\/[0-9a-f-]{36}\.pdf$/)
    assert.notInclude(cv.storageKey, 'my cv')
    assert.isTrue(await drive.use('private').exists(cv.storageKey))
    assert.notProperty(cv.serialize(), 'storageKey', 'storage keys are never serialised')
  })

  test('files that are not really PDF/DOCX are rejected even with a .pdf name', async ({ client, assert }) => {
    const { user, profile } = await makeCandidate()
    const res = await upload(client, user, 'evil.pdf', '<script>alert(1)</script>')
    res.assertStatus(302)
    assert.isNull(await CandidateCv.findBy('candidate_profile_id', profile.id))
  })

  test('replacing a CV swaps the file and deletes the old one', async ({ client, assert }) => {
    const { user, profile } = await makeCandidate()
    await upload(client, user, 'a.pdf', PDF_BYTES)
    const first = await CandidateCv.findByOrFail('candidate_profile_id', profile.id)
    const oldKey = first.storageKey
    await upload(client, user, 'b.pdf', PDF_BYTES, { replaceId: String(first.id) })
    await first.refresh()
    assert.notEqual(first.storageKey, oldKey)
    assert.isFalse(await drive.use('private').exists(oldKey))
    assert.equal(await CandidateCv.query().where('candidate_profile_id', profile.id).count('* as c').then((r) => Number(r[0].$extras.c)), 1)
  })

  test('deleting a CV removes the file', async ({ client, assert }) => {
    const { user, profile } = await makeCandidate()
    await upload(client, user, 'a.pdf', PDF_BYTES)
    const cv = await CandidateCv.findByOrFail('candidate_profile_id', profile.id)
    await client.delete(`/candidate/cvs/${cv.id}`).withCsrfToken().loginAs(user).redirects(0)
    assert.isNull(await CandidateCv.find(cv.id))
    assert.isFalse(await drive.use('private').exists(cv.storageKey))
  })

  test('the owner can download; other candidates and unrelated employers get 404', async ({ client }) => {
    const { user, profile } = await makeCandidate({ visibility: 'discoverable' })
    await upload(client, user, 'a.pdf', PDF_BYTES)
    const cv = await CandidateCv.findByOrFail('candidate_profile_id', profile.id)

    const own = await client.get(`/files/cvs/${cv.id}`).loginAs(user)
    own.assertStatus(200)
    own.assertHeader('content-disposition', 'attachment; filename="a.pdf"'.replace('a.pdf', cv.originalName))
    own.assertHeader('cache-control', 'private, no-store')

    const { user: other } = await makeCandidate()
    ;(await client.get(`/files/cvs/${cv.id}`).loginAs(other)).assertStatus(404)

    // discoverable, but cvSearchable = false: a verified employer still cannot download
    const { user: emp } = await makeEmployer('verified')
    ;(await client.get(`/files/cvs/${cv.id}`).loginAs(emp)).assertStatus(404)
  })

  test('an employer can download the CV attached to an application to its job, and the access is logged', async ({ client, assert }) => {
    const { user, profile } = await makeCandidate()
    await upload(client, user, 'a.pdf', PDF_BYTES)
    const cv = await CandidateCv.findByOrFail('candidate_profile_id', profile.id)
    const { user: emp, company } = await makeEmployer('pending')
    const job = await makeJob(company)
    await Application.create({ jobId: job.id, candidateProfileId: profile.id, candidateCvId: cv.id, status: 'submitted' })

    const res = await client.get(`/files/cvs/${cv.id}`).loginAs(emp)
    res.assertStatus(200)
    const log = await CandidateAccessLog.query().where('candidate_profile_id', profile.id).where('action', 'cv_download').firstOrFail()
    assert.equal(log.companyId, company.id)
    assert.isNotNull(await Notification.query().where('user_id', user.id).where('type', 'profile_accessed').first(), 'candidate is notified')
  })

  test('withdrawing an application revokes the employer\'s CV access', async ({ client }) => {
    const { user, profile } = await makeCandidate()
    await upload(client, user, 'a.pdf', PDF_BYTES)
    const cv = await CandidateCv.findByOrFail('candidate_profile_id', profile.id)
    const { user: emp, company } = await makeEmployer('verified')
    const job = await makeJob(company)
    await Application.create({ jobId: job.id, candidateProfileId: profile.id, candidateCvId: cv.id, status: 'withdrawn' })
    ;(await client.get(`/files/cvs/${cv.id}`).loginAs(emp)).assertStatus(404)
  })

  test('opted-in primary CV is downloadable by verified employers only', async ({ client }) => {
    const { user, profile } = await makeCandidate({ visibility: 'discoverable', cvSearchable: true })
    await upload(client, user, 'a.pdf', PDF_BYTES)
    const cv = await CandidateCv.findByOrFail('candidate_profile_id', profile.id)
    const { user: verified } = await makeEmployer('verified')
    const { user: pending } = await makeEmployer('pending')
    ;(await client.get(`/files/cvs/${cv.id}`).loginAs(verified)).assertStatus(200)
    ;(await client.get(`/files/cvs/${cv.id}`).loginAs(pending)).assertStatus(404)

    // consent withdrawn: takes effect on the next request
    profile.cvSearchable = false
    await profile.save()
    ;(await client.get(`/files/cvs/${cv.id}`).loginAs(verified)).assertStatus(404)
  })

  test('administrators can download and the download is audited', async ({ client, assert }) => {
    const { user, profile } = await makeCandidate()
    await upload(client, user, 'a.pdf', PDF_BYTES)
    const cv = await CandidateCv.findByOrFail('candidate_profile_id', profile.id)
    const admin = await makeAdmin()
    ;(await client.get(`/files/cvs/${cv.id}`).loginAs(admin)).assertStatus(200)
    const { default: AuditLog } = await import('#models/audit_log')
    assert.isNotNull(await AuditLog.query().where('action', 'admin.cv_download').where('subject_id', cv.id).first())
  })
})
