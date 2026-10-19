import { test } from '@japa/runner'
import { makeAdmin, makeCandidate, makeEmployer, makeJob, resetData } from '#tests/helpers'

test.group('Role-based access control', (group) => {
  group.each.setup(() => resetData())

  test('guests are redirected to login from protected areas', async ({ client }) => {
    for (const url of ['/candidate', '/employer', '/admin', '/candidate/privacy']) {
      const res = await client.get(url).redirects(0)
      res.assertStatus(302)
      res.assertHeader('location', '/login')
    }
  })

  test('candidates cannot open employer or admin areas', async ({ client }) => {
    const { user } = await makeCandidate()
    ;(await client.get('/employer').loginAs(user)).assertStatus(403)
    ;(await client.get('/employer/candidates').loginAs(user)).assertStatus(403)
    ;(await client.get('/admin').loginAs(user)).assertStatus(403)
  })

  test('employers cannot open candidate or admin areas', async ({ client }) => {
    const { user } = await makeEmployer()
    ;(await client.get('/candidate').loginAs(user)).assertStatus(403)
    ;(await client.get('/admin/companies').loginAs(user)).assertStatus(403)
  })

  test('recruiters cannot manage company settings or team', async ({ client }) => {
    const { company } = await makeEmployer()
    const { user: recruiter } = await makeEmployer('verified', 'recruiter', company)
    const res = await client.get('/employer/team').loginAs(recruiter).redirects(0)
    res.assertStatus(302)
    res.assertHeader('location', '/employer')
    const put = await client.put('/employer/company').form({ name: 'Hijack', contactName: 'X', contactEmail: 'x@y.com' }).withCsrfToken().loginAs(recruiter).redirects(0)
    put.assertHeader('location', '/employer')
  })

  test('admins can open the admin area', async ({ client }) => {
    const admin = await makeAdmin()
    const res = await client.get('/admin').withInertia().loginAs(admin)
    res.assertStatus(200)
    res.assertInertiaComponent('admin/dashboard')
  })

  test('employers cannot see or edit another company\'s jobs (IDOR)', async ({ client }) => {
    const { company: other } = await makeEmployer()
    const job = await makeJob(other, { status: 'draft', publishedAt: null })
    const { user } = await makeEmployer()
    ;(await client.get(`/employer/jobs/${job.id}/edit`).withInertia().loginAs(user)).assertStatus(404)
    ;(await client.get(`/employer/jobs/${job.id}/applicants`).withInertia().loginAs(user)).assertStatus(404)
    ;(await client.post(`/employer/jobs/${job.id}/status`).form({ status: 'archived' }).withCsrfToken().loginAs(user)).assertStatus(404)
  })
})

test.group('Open redirect protection', (group) => {
  group.each.setup(() => resetData())

  test('redirect back never leaves the site, even with a foreign Referer', async ({ client, assert }) => {
    const res = await client.post('/forgot-password').form({ email: 'x@y.example' }).header('referer', 'https://evil.example/phish').withCsrfToken().redirects(0)
    const location = res.header('location') ?? ''
    assert.isFalse(location.includes('evil.example'), `redirected to ${location}`)
  })
})
