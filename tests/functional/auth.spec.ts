import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import mail from '@adonisjs/mail/services/main'
import User from '#models/user'
import UserToken from '#models/user_token'
import CandidateProfile from '#models/candidate_profile'
import Company from '#models/company'
import { makeCandidate, PASSWORD, resetData } from '#tests/helpers'

test.group('Authentication', (group) => {
  group.each.setup(() => resetData())

  test('candidate registration creates an unverified account with a private profile', async ({ client, assert }) => {
    const res = await client
      .post('/register')
      .form({ fullName: 'Layla Hassan', email: 'Layla@Example.com', password: 'longpassword1', passwordConfirmation: 'longpassword1', acceptTerms: 'on' })
      .withCsrfToken()
      .redirects(0)
    res.assertStatus(302)
    res.assertHeader('location', '/verify-email')
    const user = await User.findByOrFail('email', 'layla@example.com')
    assert.equal(user.role, 'candidate')
    assert.isNull(user.emailVerifiedAt)
    assert.notEqual(user.password, 'longpassword1', 'password must be hashed')
    const profile = await CandidateProfile.findByOrFail('user_id', user.id)
    assert.equal(profile.visibility, 'private')
    assert.isNotNull(await UserToken.query().where('user_id', user.id).where('type', 'verify_email').first())
  })

  test('employer registration creates a pending company with the user as owner', async ({ client, assert }) => {
    await client
      .post('/employers/register')
      .form({ fullName: 'Owner One', email: 'owner@acme.example', password: 'longpassword1', passwordConfirmation: 'longpassword1', companyName: 'Acme Qatar', acceptTerms: 'on' })
      .withCsrfToken()
      .redirects(0)
    const company = await Company.query().where('name', 'Acme Qatar').preload('members').firstOrFail()
    assert.equal(company.verificationStatus, 'pending', 'companies are never auto-verified')
    assert.equal(company.members[0].role, 'owner')
  })

  test('registration rejects a duplicate email', async ({ client, assert }) => {
    const { user } = await makeCandidate()
    await client.post('/register').form({ fullName: 'X Y', email: user.email, password: 'longpassword1', passwordConfirmation: 'longpassword1', acceptTerms: 'on' }).withCsrfToken().redirects(0)
    assert.equal(await User.query().where('email', user.email).count('* as c').then((r) => Number(r[0].$extras.c)), 1)
  })

  test('requests without a CSRF token are rejected', async ({ client, assert }) => {
    const { user } = await makeCandidate()
    const res = await client.post('/login').form({ email: user.email, password: PASSWORD }).redirects(0)
    assert.notEqual(res.header('location'), '/candidate', 'login must not succeed without a CSRF token')
    assert.notProperty(res.session(), 'auth_web')
  })

  test('login succeeds with correct credentials and fails otherwise', async ({ client }) => {
    const { user } = await makeCandidate()
    const bad = await client.post('/login').form({ email: user.email, password: 'wrong-password' }).withCsrfToken().redirects(0)
    bad.assertStatus(302)
    if (bad.header('location') === '/candidate') throw new Error('wrong password must not sign in')
    const ok = await client.post('/login').form({ email: user.email, password: PASSWORD }).withCsrfToken().redirects(0)
    ok.assertHeader('location', '/candidate')
  })

  test('login ignores off-site redirect targets', async ({ client }) => {
    const { user } = await makeCandidate()
    const res = await client.post('/login').form({ email: user.email, password: PASSWORD, redirect: '//evil.example/x' }).withCsrfToken().redirects(0)
    res.assertHeader('location', '/candidate')
  })

  test('suspended user is rejected at login', async ({ client, assert }) => {
    const { user } = await makeCandidate()
    user.status = 'suspended'
    await user.save()
    const res = await client.post('/login').form({ email: user.email, password: PASSWORD }).withCsrfToken().redirects(0)
    assert.notEqual(res.header('location'), '/candidate')
  })

  test('unverified users are sent to the verification notice', async ({ client }) => {
    const { user } = await makeCandidate({ verified: false })
    const res = await client.get('/candidate').loginAs(user).redirects(0)
    res.assertHeader('location', '/verify-email')
  })

  test('email verification link verifies the account once', async ({ client, assert }) => {
    const { user } = await makeCandidate({ verified: false })
    const token = await UserToken.issue(user, 'verify_email', 60)
    const res = await client.get(`/verify-email/${token}`).redirects(0)
    res.assertStatus(302)
    await user.refresh()
    assert.isNotNull(user.emailVerifiedAt)
    const again = await UserToken.findValid(token, 'verify_email')
    assert.isNull(again, 'token is single use')
  })

  test('password reset issues a token, resets the password and invalidates the token', async ({ client, assert }) => {
    const fake = mail.fake()
    const { user } = await makeCandidate()
    await client.post('/forgot-password').form({ email: user.email }).withCsrfToken().redirects(0)
    fake.messages.assertSent({ subject: 'Reset your password' })
    const sent = fake.messages.sent()[0]
    await sent.computeContents()
    sent.assertContent('html', /\/reset-password\/[\w-]{20,}/)
    sent.assertContent('html', 'Choose a new password')
    assert.isTrue(true)
    mail.restore()

    const token = await UserToken.issue(user, 'password_reset', 60)
    await client.post(`/reset-password/${token}`).form({ password: 'brandnewpass99', passwordConfirmation: 'brandnewpass99' }).withCsrfToken().redirects(0)
    await User.verifyCredentials(user.email, 'brandnewpass99')
    assert.isNull(await UserToken.findValid(token, 'password_reset'))
  })

  test('forgot password does not reveal whether an account exists', async ({ client }) => {
    const res = await client.post('/forgot-password').form({ email: 'nobody@nowhere.example' }).withCsrfToken().redirects(0)
    res.assertStatus(302)
    res.assertFlashMessage('success', 'If an account exists for that email, a reset link is on its way. It expires in 60 minutes.')
  })

  test('expired reset tokens are rejected', async ({ client, assert }) => {
    const { user } = await makeCandidate()
    const token = await UserToken.issue(user, 'password_reset', 60)
    await UserToken.query().where('user_id', user.id).update({ expires_at: DateTime.now().minus({ minutes: 1 }).toSQL({ includeOffset: false }) })
    await client.post(`/reset-password/${token}`).form({ password: 'brandnewpass99', passwordConfirmation: 'brandnewpass99' }).withCsrfToken().redirects(0)
    await assert.rejects(() => User.verifyCredentials(user.email, 'brandnewpass99'))
  })

  test('login is rate limited after repeated failures', async ({ client }) => {
    let last = 0
    for (let i = 0; i < 11; i++) {
      const res = await client.post('/login').form({ email: 'x@y.example', password: 'wrong-password' }).withCsrfToken().redirects(0)
      last = res.status()
    }
    if (last !== 429) throw new Error(`expected 429 after 11 attempts, got ${last}`)
  })
})
