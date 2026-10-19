import { test } from '@japa/runner'
import User from '#models/user'
import CandidateProfile from '#models/candidate_profile'
import SocialAccount from '#models/social_account'
import SocialLogin from '#services/social_login'
import SettingsService from '#services/settings_service'
import { PASSWORD, makeAdmin, makeCandidate, makeEmployer, resetData } from '#tests/helpers'

const google = (over: Partial<{ id: string; email: string | null; name: string | null; emailVerified: boolean }> = {}) => ({
  id: 'g-123', email: 'new.person@gmail.com', name: 'New Person', emailVerified: true, ...over,
})

/** Temporarily remove a provider's env vars (they are read per request). */
async function withoutEnv<T>(keys: string[], fn: () => Promise<T>) {
  const saved = keys.map((k) => [k, process.env[k]] as const)
  keys.forEach((k) => delete process.env[k])
  try {
    return await fn()
  } finally {
    saved.forEach(([k, v]) => (v === undefined ? delete process.env[k] : (process.env[k] = v)))
  }
}

test.group('Social sign-in: pages and redirects', (group) => {
  group.each.setup(() => resetData())

  test('buttons appear only for configured providers', async ({ client, assert }) => {
    for (const url of ['/login', '/register', '/employers/register']) {
      const res = await client.get(url).withInertia()
      assert.deepEqual(res.inertiaProps.socialProviders, ['google', 'linkedin'], url)
    }
    await withoutEnv(['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'LINKEDIN_CLIENT_ID', 'LINKEDIN_CLIENT_SECRET'], async () => {
      for (const url of ['/login', '/register', '/employers/register']) {
        const res = await client.get(url).withInertia()
        res.assertStatus(200)
        assert.deepEqual(res.inertiaProps.socialProviders, [], url)
      }
    })
  })

  test('google redirect goes to accounts.google.com with our callback', async ({ client, assert }) => {
    const res = await client.get('/auth/google/redirect?intent=candidate').redirects(0)
    res.assertStatus(302)
    const url = new URL(res.header('location')!)
    assert.equal(url.origin, 'https://accounts.google.com')
    assert.equal(url.searchParams.get('client_id'), 'test-google-client-id.apps.googleusercontent.com')
    assert.equal(url.searchParams.get('redirect_uri'), `${process.env.APP_URL!.replace(/\/+$/, '')}/auth/google/callback`)
    assert.include(url.searchParams.get('scope')!, 'openid')
    assert.include(url.searchParams.get('scope')!, 'userinfo.email')
    assert.isNotEmpty(url.searchParams.get('state'))
  })

  test('linkedin redirect uses OpenID Connect scopes', async ({ client, assert }) => {
    const res = await client.get('/auth/linkedin/redirect?intent=employer').redirects(0)
    res.assertStatus(302)
    const url = new URL(res.header('location')!)
    assert.equal(url.origin + url.pathname, 'https://www.linkedin.com/oauth/v2/authorization')
    assert.equal(url.searchParams.get('scope'), 'openid profile email')
    assert.match(url.searchParams.get('redirect_uri')!, /\/auth\/linkedin\/callback$/)
  })

  test('unconfigured or unknown providers are 404', async ({ client }) => {
    ;(await client.get('/auth/facebook/redirect').redirects(0)).assertStatus(404)
    ;(await client.get('/auth/facebook/callback').redirects(0)).assertStatus(404)
    ;(await client.get('/auth/github/redirect').redirects(0)).assertStatus(404)
    await withoutEnv(['GOOGLE_CLIENT_ID'], async () => {
      ;(await client.get('/auth/google/redirect').redirects(0)).assertStatus(404)
    })
  })

  test('a callback without a valid state is rejected', async ({ client, assert }) => {
    const res = await client.get('/auth/google/callback?code=abc&state=forged').redirects(0)
    res.assertStatus(302)
    assert.equal(res.header('location'), '/login')
    assert.equal(await User.query().count('* as n').then((r) => Number(r[0].$extras.n)), 0)
  })
})

test.group('Social sign-in: account resolution', (group) => {
  group.each.setup(() => resetData())

  test('new candidate: verified account + profile + link', async ({ assert }) => {
    const r = await SocialLogin.resolve('google', google(), 'candidate')
    assert.isTrue(r.ok)
    if (!r.ok) return
    assert.isTrue(r.created)
    assert.equal(r.user.role, 'candidate')
    assert.isNotNull(r.user.emailVerifiedAt)
    assert.equal(r.user.fullName, 'New Person')
    assert.isNotNull(await CandidateProfile.findBy('user_id', r.user.id))
    const link = await SocialAccount.findByOrFail('user_id', r.user.id)
    assert.equal(link.provider, 'google')
    // second sign-in finds the same user through the link, even if the email changed upstream
    const again = await SocialLogin.resolve('google', google({ email: 'other@gmail.com' }), 'login')
    assert.isTrue(again.ok && again.user.id === r.user.id && !again.created)
  })

  test('new employer has no company yet and is sent to setup', async ({ client, assert }) => {
    const r = await SocialLogin.resolve('google', google({ id: 'g-emp', email: 'boss@acme.qa' }), 'employer')
    assert.isTrue(r.ok)
    if (!r.ok) return
    assert.equal(r.user.role, 'employer')
    const dash = await client.get('/employer').loginAs(r.user).redirects(0)
    assert.equal(dash.header('location'), '/employer/setup')
    const page = await client.get('/employer/setup').loginAs(r.user).withInertia()
    page.assertInertiaComponent('employer/setup')
    const save = await client.post('/employer/setup').json({ companyName: 'Acme Trading', acceptTerms: true }).withCsrfToken().loginAs(r.user).redirects(0)
    assert.equal(save.header('location'), '/employer')
    const ok = await client.get('/employer').loginAs(r.user).redirects(0)
    ok.assertStatus(200)
    // setup is one-time
    const back = await client.get('/employer/setup').loginAs(r.user).redirects(0)
    assert.equal(back.header('location'), '/employer')
  })

  test('existing email: links the provider and signs in, keeping the role', async ({ assert }) => {
    const { user } = await makeEmployer('verified')
    const r = await SocialLogin.resolve('google', google({ id: 'g-existing', email: user.email.toUpperCase() }), 'candidate')
    assert.isTrue(r.ok)
    if (!r.ok) return
    assert.equal(r.user.id, user.id)
    assert.equal(r.user.role, 'employer')
    assert.isFalse(r.created)
    assert.isTrue(r.linked)
    // verified account keeps its password
    await r.user.refresh()
    assert.isTrue(await r.user.verifyPassword(PASSWORD))
  })

  test('unverified pre-registered account: verified and old password locked out', async ({ assert }) => {
    const { user } = await makeCandidate({ verified: false })
    const r = await SocialLogin.resolve('google', google({ id: 'g-pre', email: user.email }), 'login')
    assert.isTrue(r.ok)
    await user.refresh()
    assert.isNotNull(user.emailVerifiedAt)
    assert.isFalse(await user.verifyPassword(PASSWORD))
  })

  test('never creates or signs in admins', async ({ assert }) => {
    const admin = await makeAdmin()
    const r = await SocialLogin.resolve('google', google({ id: 'g-admin', email: admin.email }), 'candidate')
    assert.deepEqual(r, { ok: false, reason: 'admin' })
    assert.equal(await SocialAccount.query().count('* as n').then((x) => Number(x[0].$extras.n)), 0)
    // a crafted intent can't produce an admin either
    const odd = await SocialLogin.resolve('google', google({ id: 'g-odd', email: 'odd@x.qa' }), 'admin' as any)
    assert.isTrue(odd.ok && odd.user.role === 'candidate')
  })

  test('refuses unverified or missing emails, unknown accounts on login, suspended users, closed employer signup', async ({ assert }) => {
    assert.deepEqual(await SocialLogin.resolve('google', google({ emailVerified: false }), 'candidate'), { ok: false, reason: 'unverified_email' })
    assert.deepEqual(await SocialLogin.resolve('google', google({ email: null }), 'candidate'), { ok: false, reason: 'no_email' })
    assert.deepEqual(await SocialLogin.resolve('google', google(), 'login'), { ok: false, reason: 'no_account' })
    const { user } = await makeCandidate()
    user.status = 'suspended'
    await user.save()
    assert.deepEqual(await SocialLogin.resolve('google', google({ id: 'g-s', email: user.email }), 'login'), { ok: false, reason: 'suspended' })
    await SettingsService.set({ employer_registration_open: false })
    assert.deepEqual(await SocialLogin.resolve('google', google({ id: 'g-c', email: 'c@x.qa' }), 'employer'), { ok: false, reason: 'employer_closed' })
  })
})

test.group('Admin sign-in', (group) => {
  group.each.setup(() => resetData())

  test('/admin/login renders the admin variant without social buttons', async ({ client, assert }) => {
    const res = await client.get('/admin/login').withInertia()
    res.assertInertiaComponent('auth/login')
    assert.equal(res.inertiaProps.portal, 'admin')
    assert.equal(res.inertiaProps.redirect, '/admin')
    assert.deepEqual(res.inertiaProps.socialProviders, [])
  })

  test('admin signs in there and lands on /admin', async ({ client, assert }) => {
    const admin = await makeAdmin()
    const res = await client.post('/login').json({ email: admin.email, password: PASSWORD, redirect: '/admin', portal: 'admin' }).withCsrfToken().redirects(0)
    assert.equal(res.header('location'), '/admin')
  })

  test('non-admins are refused at the admin portal and never redirected into /admin', async ({ client, assert }) => {
    const { user } = await makeCandidate()
    const res = await client.post('/login').json({ email: user.email, password: PASSWORD, redirect: '/admin', portal: 'admin' }).withCsrfToken().redirects(0)
    res.assertStatus(302)
    assert.notEqual(res.header('location'), '/admin')
    const normal = await client.post('/login').json({ email: user.email, password: PASSWORD, redirect: '/admin/users' }).withCsrfToken().redirects(0)
    assert.equal(normal.header('location'), '/candidate')
    const already = await client.get('/admin/login').loginAs(user).redirects(0)
    assert.equal(already.header('location'), '/candidate')
    ;(await client.get('/admin').loginAs(user).redirects(0)).assertStatus(403)
  })
})
