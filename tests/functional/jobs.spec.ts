import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import Job from '#models/job'
import Company from '#models/company'
import AuditLog from '#models/audit_log'
import SettingsService from '#services/settings_service'
import { makeAdmin, makeEmployer, makeJob, refIds, resetData } from '#tests/helpers'

async function jobPayload(overrides: Record<string, unknown> = {}) {
  const { it, westBay } = await refIds()
  return {
    title: 'Backend Engineer',
    categoryId: it.id,
    locationId: westBay.id,
    description: 'We are looking for a backend engineer to build and run our Node.js services in Doha.',
    skills: ['Node.js', 'PostgreSQL'],
    minExperience: 3,
    employmentType: 'full_time',
    workArrangement: 'hybrid',
    salaryMin: 12000,
    salaryMax: 16000,
    salaryVisible: true,
    vacancies: 1,
    deadline: DateTime.now().plus({ days: 30 }).toISODate(),
    applicationMethod: 'platform',
    intent: 'draft',
    ...overrides,
  }
}

test.group('Employer verification', (group) => {
  group.each.setup(() => resetData())

  test('only administrators can change verification status, and it is recorded', async ({ client, assert }) => {
    const { user: owner, company } = await makeEmployer('pending')
    await client.post(`/admin/companies/${company.id}/verification`).json({ status: 'verified' }).withCsrfToken().loginAs(owner)
    await company.refresh()
    assert.equal(company.verificationStatus, 'pending')

    const admin = await makeAdmin()
    await client.post(`/admin/companies/${company.id}/verification`).json({ status: 'verified' }).withCsrfToken().loginAs(admin)
    await company.refresh()
    assert.equal(company.verificationStatus, 'verified')
    await company.load('verifications')
    assert.equal(company.verifications[0].toStatus, 'verified')
    assert.isNotNull(await AuditLog.query().where('action', 'admin.company_verification').first())
  })

  test('rejecting a company requires a note', async ({ client, assert }) => {
    const { company } = await makeEmployer('pending')
    const admin = await makeAdmin()
    const res = await client.post(`/admin/companies/${company.id}/verification`).json({ status: 'rejected' }).accept('json').withCsrfToken().loginAs(admin)
    res.assertStatus(422)
    await company.refresh()
    assert.equal(company.verificationStatus, 'pending')
  })
})

test.group('Job creation, moderation and publication', (group) => {
  group.each.setup(() => resetData())

  test('employer saves a draft with skills', async ({ client, assert }) => {
    const { user, company } = await makeEmployer('verified')
    await client.post('/employer/jobs').json(await jobPayload()).withCsrfToken().loginAs(user)
    const job = await Job.query().where('company_id', company.id).preload('skills').firstOrFail()
    assert.equal(job.status, 'draft')
    assert.sameMembers(job.skills.map((s) => s.name), ['Node.js', 'PostgreSQL'])
  })

  test('invalid salary ranges and past deadlines are rejected', async ({ client }) => {
    const { user } = await makeEmployer('verified')
    const a = await client.post('/employer/jobs').json(await jobPayload({ salaryMin: 20000, salaryMax: 10000 })).accept('json').withCsrfToken().loginAs(user)
    a.assertStatus(422)
    const b = await client.post('/employer/jobs').json(await jobPayload({ deadline: DateTime.now().minus({ days: 1 }).toISODate() })).accept('json').withCsrfToken().loginAs(user)
    b.assertStatus(422)
  })

  test('jobs from unverified companies go to review; admin approval publishes them', async ({ client, assert }) => {
    const { user, company } = await makeEmployer('pending')
    await client.post('/employer/jobs').json(await jobPayload({ intent: 'publish' })).withCsrfToken().loginAs(user)
    const job = await Job.findByOrFail('company_id', company.id)
    assert.equal(job.status, 'pending_review')

    const pub = await client.get('/jobs').withInertia()
    assert.notInclude(pub.inertiaProps.results.data.map((j: any) => j.id), job.id)

    const admin = await makeAdmin()
    await client.post(`/admin/jobs/${job.id}/moderate`).json({ decision: 'approve' }).withCsrfToken().loginAs(admin)
    await job.refresh()
    assert.equal(job.status, 'published')
    assert.isNotNull(job.publishedAt)
  })

  test('verified companies publish immediately under the default moderation setting', async ({ client, assert }) => {
    const { user, company } = await makeEmployer('verified')
    await client.post('/employer/jobs').json(await jobPayload({ intent: 'publish' })).withCsrfToken().loginAs(user)
    const job = await Job.findByOrFail('company_id', company.id)
    assert.equal(job.status, 'published')
  })

  test('"review every job" setting applies to verified companies too', async ({ client, assert }) => {
    await SettingsService.set({ job_moderation: 'all' })
    const { user, company } = await makeEmployer('verified')
    await client.post('/employer/jobs').json(await jobPayload({ intent: 'publish' })).withCsrfToken().loginAs(user)
    assert.equal((await Job.findByOrFail('company_id', company.id)).status, 'pending_review')
  })

  test('suspended companies cannot publish and their jobs disappear from public pages', async ({ client, assert }) => {
    const { user, company } = await makeEmployer('verified')
    const live = await makeJob(company)
    const draft = await makeJob(company, { status: 'draft', publishedAt: null })
    company.verificationStatus = 'suspended'
    await company.save()
    await client.post(`/employer/jobs/${draft.id}/status`).json({ status: 'published' }).withCsrfToken().loginAs(user)
    await draft.refresh()
    assert.equal(draft.status, 'draft')
    ;(await client.get(`/jobs/${live.slug}`).withInertia()).assertStatus(404)
  })

  test('status transitions: pause, resume, close; invalid transitions are refused', async ({ client, assert }) => {
    const { user, company } = await makeEmployer('verified')
    const job = await makeJob(company)
    const post = (status: string) => client.post(`/employer/jobs/${job.id}/status`).json({ status }).withCsrfToken().loginAs(user)
    await post('paused')
    assert.equal((await job.refresh()).status, 'paused')
    await post('published')
    assert.equal((await job.refresh()).status, 'published')
    await post('closed')
    assert.equal((await job.refresh()).status, 'closed')
    await post('paused') // closed → paused is not allowed
    assert.equal((await job.refresh()).status, 'closed')
  })

  test('editing a live job is audited and re-reviewed when moderation applies', async ({ client, assert }) => {
    const { user, company } = await makeEmployer('pending')
    const job = await makeJob(company)
    await client.put(`/employer/jobs/${job.id}`).json(await jobPayload({ title: 'Changed title' })).withCsrfToken().loginAs(user)
    await job.refresh()
    assert.equal(job.status, 'pending_review')
    const log = await AuditLog.query().where('action', 'job.updated').where('subject_id', job.id).firstOrFail()
    assert.include(log.meta!.changed as string[], 'title')
  })

  test('accidental double submission creates only one job', async ({ client, assert }) => {
    const { user, company } = await makeEmployer('verified')
    const payload = await jobPayload()
    await client.post('/employer/jobs').json(payload).withCsrfToken().loginAs(user)
    await client.post('/employer/jobs').json(payload).withCsrfToken().loginAs(user)
    const count = await Job.query().where('company_id', company.id).count('* as c')
    assert.equal(Number(count[0].$extras.c), 1)
  })

  test('the jobs:expire command closes jobs past their deadline', async ({ assert }) => {
    const { company } = await makeEmployer('verified')
    const job = await makeJob(company)
    await Job.query().where('id', job.id).update({ deadline: DateTime.now().minus({ days: 2 }).toISODate() })
    const ace = await import('@adonisjs/core/services/ace')
    await ace.default.exec('jobs:expire', [])
    assert.equal((await job.refresh()).status, 'closed')
  })

  void Company
})

test.group('Public job search', (group) => {
  group.each.setup(() => resetData())

  test('filters combine correctly and expired/unpublished jobs are excluded', async ({ client, assert }) => {
    const { company } = await makeEmployer('verified')
    const { lusail } = await refIds()
    const react = await makeJob(company, { title: 'React Developer', salaryMin: 15000, salaryMax: 20000 }, ['React'])
    const nurse = await makeJob(company, { title: 'Staff Nurse', employmentType: 'part_time', locationId: lusail.id, salaryMin: 7000, salaryMax: 9000 })
    const expired = await makeJob(company, { title: 'React Lead', deadline: DateTime.now().minus({ days: 1 }) })
    const draft = await makeJob(company, { title: 'React Draft', status: 'draft' })

    const ids = async (qs: string) => (await client.get(`/jobs?${qs}`).withInertia()).inertiaProps.results.data.map((j: any) => j.id)

    const kw = await ids('q=react')
    assert.include(kw, react.id)
    assert.notInclude(kw, expired.id)
    assert.notInclude(kw, draft.id)

    assert.deepEqual(await ids('type=part_time'), [nurse.id])
    assert.deepEqual(await ids('salary=12000&currency=QAR'), [react.id])
    assert.deepEqual(await ids('salary=12000&currency=AED'), [], 'other currencies are not compared')
    assert.deepEqual(await ids('salary=12000&location=qatar'), [react.id], 'the selected country sets the currency')
    // a city matches itself; a country matches all of its cities and districts
    assert.deepEqual(await ids('location=lusail'), [nurse.id])
    assert.deepEqual((await ids('location=qatar')).sort(), [react.id, nurse.id].sort())
    assert.deepEqual(await ids('location=uae'), [])
    assert.deepEqual(await ids('q=react&type=part_time'), [])
  })

  test('hidden salaries are filterable but never exposed', async ({ client, assert }) => {
    const { company } = await makeEmployer('verified')
    const job = await makeJob(company, { salaryVisible: false, salaryMin: 30000, salaryMax: 40000 })
    const res = await client.get('/jobs?salary=25000&currency=QAR').withInertia()
    const card = res.inertiaProps.results.data.find((j: any) => j.id === job.id)
    assert.isNull(card.salary)
    assert.notInclude(JSON.stringify(res.inertiaProps), '30000')
  })

  test('open jobs carry JobPosting structured data with validThrough; closed jobs do not', async ({ client, assert }) => {
    const { company } = await makeEmployer('verified')
    const open = await makeJob(company)
    const res = await client.get(`/jobs/${open.slug}`).withInertia()
    assert.equal(res.inertiaProps.structuredData['@type'], 'JobPosting')
    assert.match(res.inertiaProps.structuredData.validThrough, /T23:59:59\+03:00$/)
    const closed = await makeJob(company, { status: 'closed' })
    const res2 = await client.get(`/jobs/${closed.slug}`).withInertia()
    assert.isNull(res2.inertiaProps.structuredData)
  })

  test('sitemap lists live jobs only', async ({ client, assert }) => {
    const { company } = await makeEmployer('verified')
    const live = await makeJob(company)
    const closed = await makeJob(company, { status: 'closed' })
    const res = await client.get('/sitemap.xml')
    assert.include(res.text(), live.slug)
    assert.notInclude(res.text(), closed.slug)
  })
})
