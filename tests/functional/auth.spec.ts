import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import mail from '@adonisjs/mail/services/main'
import User from '#models/user'
import UserToken from '#models/user_token'
import CandidateProfile from '#models/candidate_profile'
import Company from '#models/company'
import db from '@adonisjs/lucid/services/db'
import { makeCandidate, PASSWORD, resetData, signupWithOtp } from '#tests/helpers'

test.group('Authentication', (group) => {
  group.each.setup(() => resetData())

  test('candidate signup creates no account until the email code is verified', async ({ client, assert }) => {
    const form = { fullName: 'Layla Hassan', email: 'Layla@Example.com', password: 'longpassword1', passwordConfirmation: 'longpassword1', acceptTerms: 'on' }
    const first = await client.post('/register').form(form).withCsrfToken().redirects(0)
    first.assertHeader('location', '/signup/verify')
    assert.isNull(await User.findBy('email', 'layla@example.com'), 'no user before OTP')
    const pending = await db.from('pending_signups').where('email', 'layla@example.com').firstOrFail()
    assert.notEqual(pending.password_hash, 'longpassword1')
    await db.from('pending_signups').delete()

    const { final } = await signupWithOtp(client, '/register', form)
    assert.equal(final!.header('location'), '/candidate')
    const user = await User.findByOrFail('email', 'layla@example.com')
    assert.equal(user.role, 'candidate')
    assert.isNotNull(user.emailVerifiedAt)
    await User.verifyCredentials('layla@example.com', 'longpassword1')
    const profile = await CandidateProfile.findByOrFail('user_id', user.id)
    assert.equal(profile.visibility, 'private')
    assert.isNull(await db.from('pending_signups').first(), 'pending row consumed')
  })

  test('wrong codes are rejected and lock after 5 attempts', async ({ client, assert }) => {
    const form = { fullName: 'Wrong Code', email: 'wrong@example.com', password: 'longpassword1', passwordConfirmation: 'longpassword1', acceptTerms: 'on' }
    const first = await client.post('/register').form(form).withCsrfToken().redirects(0)
    const token = first.session().pending_signup
    for (let i = 0; i < 4; i++) {
      const r = await client.post('/signup/verify').form({ code: '000000' }).withSession({ pending_signup: token }).withCsrfToken().redirects(0)
      assert.equal(r.header('location'), '/signup/verify')
    }
    const last = await client.post('/signup/verify').form({ code: '000000' }).withSession({ pending_signup: token }).withCsrfToken().redirects(0)
    assert.equal(last.header('location'), '/register')
    assert.isNull(await User.findBy('email', 'wrong@example.com'))
    assert.isNull(await db.from('pending_signups').where('token', token).first())
  })

  test('resend is throttled for 60 seconds', async ({ client, assert }) => {
    const form = { fullName: 'Re Send', email: 'resend@example.com', password: 'longpassword1', passwordConfirmation: 'longpassword1', acceptTerms: 'on' }
    const first = await client.post('/register').form(form).withCsrfToken().redirects(0)
    const token = first.session().pending_signup
    const before = await db.from('pending_signups').where('token', token).firstOrFail()
    const r = await client.post('/signup/verify/resend').withSession({ pending_signup: token }).withCsrfToken().redirects(0)
    assert.match(String(r.flashMessages().error), /wait/)
    const after = await db.from('pending_signups').where('token', token).firstOrFail()
    assert.equal(after.code_hash, before.code_hash)
  })

  test('expired codes are rejected', async ({ client, assert }) => {
    const form = { fullName: 'Ex Pired', email: 'expired@example.com', password: 'longpassword1', passwordConfirmation: 'longpassword1', acceptTerms: 'on' }
    const first = await client.post('/register').form(form).withCsrfToken().redirects(0)
    const token = first.session().pending_signup
    await db.from('pending_signups').where('token', token).update({ expires_at: '2000-01-01 00:00:00' })
    await client.post('/signup/verify').form({ code: '123456' }).withSession({ pending_signup: token }).withCsrfToken().redirects(0)
    assert.isNull(await User.findBy('email', 'expired@example.com'))
  })

  test('signup fails gracefully when email is not configured in production', async ({ client, assert }) => {
    const saved = { NODE_ENV: process.env.NODE_ENV, MAIL_MAILER: process.env.MAIL_MAILER }
    process.env.NODE_ENV = 'production'; process.env.MAIL_MAILER = 'log'
    try {
      const r = await client.post('/register').form({ fullName: 'No Mail', email: 'nomail@example.com', password: 'longpassword1', passwordConfirmation: 'longpassword1', acceptTerms: 'on' }).withCsrfToken().redirects(0)
      assert.match(String(r.flashMessages().error), /couldn't send a verification email/)
    } finally {
      process.env.NODE_ENV = saved.NODE_ENV; process.env.MAIL_MAILER = saved.MAIL_MAILER
    }
    assert.isNull(await db.from('pending_signups').first())
    assert.isNull(await User.findBy('email', 'nomail@example.com'))
  })

  test('employer registration creates a pending company with the user as owner', async ({ client, assert }) => {
    await signupWithOtp(client, '/employers/register', { fullName: 'Owner One', email: 'owner@acme.example', password: 'longpassword1', passwordConfirmation: 'longpassword1', companyName: 'Acme Qatar', acceptTerms: 'on' })
    const company = await Company.query().where('name', 'Acme Qatar').preload('members').firstOrFail()
    assert.equal(company.verificationStatus, 'pending', 'companies are never auto-verified')
    assert.equal(company.members[0].role, 'owner')
  })

  test('registration rejects a duplicate email', async ({ client, assert }) => {
    const { user } = await makeCandidate()
    await signupWithOtp(client, '/register', { fullName: 'X Y', email: user.email, password: 'longpassword1', passwordConfirmation: 'longpassword1', acceptTerms: 'on' })
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
