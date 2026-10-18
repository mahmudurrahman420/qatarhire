import { test } from '@japa/runner'
import Report from '#models/report'
import AuditLog from '#models/audit_log'
import SettingsService from '#services/settings_service'
import { makeAdmin, makeCandidate, makeEmployer, makeJob, resetData } from '#tests/helpers'

test.group('Administration', (group) => {
  group.each.setup(() => resetData())

  test('every admin page renders for administrators', async ({ client }) => {
    const admin = await makeAdmin()
    for (const url of ['/admin', '/admin/users', '/admin/companies', '/admin/jobs', '/admin/reports', '/admin/taxonomy/skills', '/admin/settings', '/admin/audit', '/admin/audit?tab=access']) {
      ;(await client.get(url).withInertia().loginAs(admin)).assertStatus(200)
    }
  })

  test('suspending a user blocks their next request', async ({ client }) => {
    const admin = await makeAdmin()
    const { user } = await makeCandidate()
    await client.post(`/admin/users/${user.id}/status`).json({ status: 'suspended' }).withCsrfToken().loginAs(admin)
    const res = await client.get('/candidate').loginAs(user).redirects(0)
    res.assertHeader('location', '/login')
  })

  test('reports can be filed publicly and resolved by admins', async ({ client, assert }) => {
    const { company } = await makeEmployer('verified')
    const job = await makeJob(company)
    await client.post('/reports').json({ subjectType: 'job', subjectId: job.id, reason: 'scam', details: 'Asked for a visa fee', email: 'a@b.example' }).withCsrfToken()
    const report = await Report.firstOrFail()
    assert.equal(report.status, 'open')
    const admin = await makeAdmin()
    await client.put(`/admin/reports/${report.id}`).json({ status: 'resolved', resolutionNote: 'Job removed' }).withCsrfToken().loginAs(admin)
    await report.refresh()
    assert.equal(report.status, 'resolved')
    assert.equal(report.resolvedBy, admin.id)
  })

  test('admins can take down a live job', async ({ client, assert }) => {
    const { company } = await makeEmployer('verified')
    const job = await makeJob(company)
    const admin = await makeAdmin()
    await client.post(`/admin/jobs/${job.id}/takedown`).json({ note: 'Fraud report confirmed' }).withCsrfToken().loginAs(admin)
    await job.refresh()
    assert.equal(job.status, 'rejected')
    ;(await client.get(`/jobs/${job.slug}`).withInertia()).assertStatus(404)
  })

  test('settings changes are saved and audited', async ({ client, assert }) => {
    const admin = await makeAdmin()
    await client
      .put('/admin/settings')
      .json({ job_moderation: 'all', employer_registration_open: false, max_cvs_per_candidate: 2, default_job_duration_days: 45, notify_candidate_on_cv_download: true })
      .withCsrfToken()
      .loginAs(admin)
    SettingsService.clearCache()
    assert.equal(await SettingsService.get('job_moderation'), 'all')
    assert.isFalse(await SettingsService.get('employer_registration_open'))
    assert.isNotNull(await AuditLog.query().where('action', 'admin.settings_updated').first())
  })

  test('closing employer registration blocks new employers', async ({ client, assert }) => {
    await SettingsService.set({ employer_registration_open: false })
    const res = await client
      .post('/employers/register')
      .form({ fullName: 'A B', email: 'blocked@co.example', password: 'longpassword1', passwordConfirmation: 'longpassword1', companyName: 'Blocked Co', acceptTerms: 'on' })
      .withCsrfToken()
    res.assertStatus(403)
    const { default: User } = await import('#models/user')
    assert.isNull(await User.findBy('email', 'blocked@co.example'))
  })

  test('in-use taxonomy items cannot be deleted', async ({ client, assert }) => {
    const { company } = await makeEmployer('verified')
    const job = await makeJob(company)
    const admin = await makeAdmin()
    await client.delete(`/admin/taxonomy/categories/${job.categoryId}`).withCsrfToken().loginAs(admin)
    const { default: JobCategory } = await import('#models/job_category')
    assert.isNotNull(await JobCategory.find(job.categoryId))
  })
})
