import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import ace from '@adonisjs/core/services/ace'
import User from '#models/user'
import UserToken from '#models/user_token'
import UserVerification from '#services/user_verification'
import { makeCandidate, resetData } from '#tests/helpers'

async function withEnv<T>(vars: Record<string, string | undefined>, fn: () => Promise<T>) {
  const saved = Object.keys(vars).map((k) => [k, process.env[k]] as const)
  for (const [k, v] of Object.entries(vars)) v === undefined ? delete process.env[k] : (process.env[k] = v)
  try {
    return await fn()
  } finally {
    saved.forEach(([k, v]) => (v === undefined ? delete process.env[k] : (process.env[k] = v)))
  }
}
const OFF = { EMAIL_VERIFICATION_REQUIRED: undefined } // not set = default false

test.group('EMAIL_VERIFICATION_REQUIRED off (default)', (group) => {
  group.each.setup(() => resetData())

  test('candidate signup is verified and lands on the dashboard, no verify gate', async ({ client, assert }) => {
    await withEnv(OFF, async () => {
      const res = await client.post('/register')
        .form({ fullName: 'Shaid Uli', email: 'shaid@example.com', password: 'longpassword1', passwordConfirmation: 'longpassword1', acceptTerms: 'on' })
        .withCsrfToken().redirects(0)
      assert.equal(res.header('location'), '/candidate')
      const user = await User.findByOrFail('email', 'shaid@example.com')
      assert.isNotNull(user.emailVerifiedAt)
      assert.isNull(await UserToken.query().where('user_id', user.id).where('type', 'verify_email').first())
      const dash = await client.get('/candidate').loginAs(user).redirects(0)
      dash.assertStatus(200)
    })
  })

  test('employer signup is verified and goes to the employer area', async ({ client, assert }) => {
    await withEnv(OFF, async () => {
      const res = await client.post('/employers/register')
        .form({ fullName: 'Owner Two', email: 'owner2@acme.example', password: 'longpassword1', passwordConfirmation: 'longpassword1', companyName: 'Acme Two', acceptTerms: 'on' })
        .withCsrfToken().redirects(0)
      assert.equal(res.header('location'), '/employer')
      assert.isNotNull((await User.findByOrFail('email', 'owner2@acme.example')).emailVerifiedAt)
    })
  })

  test('an already-unverified user is let through and healed instead of gated', async ({ client, assert }) => {
    const { user } = await makeCandidate({ verified: false })
    await withEnv(OFF, async () => {
      ;(await client.get('/candidate').loginAs(user).redirects(0)).assertStatus(200)
      const notice = await client.get('/verify-email').loginAs(user).redirects(0)
      assert.equal(notice.header('location'), '/candidate')
    })
    await user.refresh()
    assert.isNotNull(user.emailVerifiedAt)
  })

  test('startup command verifies active unverified users only, and is idempotent', async ({ assert }) => {
    const { user: pending } = await makeCandidate({ verified: false })
    const { user: suspended } = await makeCandidate({ verified: false })
    suspended.status = 'suspended'
    await suspended.save()
    const { user: done } = await makeCandidate()
    const earlier = DateTime.fromISO('2026-01-01T00:00:00Z')
    done.emailVerifiedAt = earlier
    await done.save()

    await withEnv(OFF, async () => {
      const cmd = await ace.exec('users:auto-verify', [])
      assert.equal(cmd.exitCode, 0)
    })
    await Promise.all([pending.refresh(), suspended.refresh(), done.refresh()])
    assert.isNotNull(pending.emailVerifiedAt)
    assert.isNull(suspended.emailVerifiedAt)
    assert.equal(done.emailVerifiedAt!.toUTC().toISODate(), '2026-01-01')
    assert.equal(await UserVerification.verifyPendingActiveUsers(), 0, 'second run changes nothing')
  })

  test('startup command does nothing when verification is required', async ({ assert }) => {
    const { user } = await makeCandidate({ verified: false })
    await withEnv({ EMAIL_VERIFICATION_REQUIRED: 'true' }, () => ace.exec('users:auto-verify', []))
    await user.refresh()
    assert.isNull(user.emailVerifiedAt)
  })
})

test.group('EMAIL_VERIFICATION_REQUIRED=true keeps the gate', (group) => {
  group.each.setup(() => resetData())

  test('signup goes to the verify notice with an unverified account', async ({ client, assert }) => {
    await withEnv({ EMAIL_VERIFICATION_REQUIRED: 'true' }, async () => {
      const res = await client.post('/register')
        .form({ fullName: 'Gate Kept', email: 'gate@example.com', password: 'longpassword1', passwordConfirmation: 'longpassword1', acceptTerms: 'on' })
        .withCsrfToken().redirects(0)
      assert.equal(res.header('location'), '/verify-email')
      assert.isNull((await User.findByOrFail('email', 'gate@example.com')).emailVerifiedAt)
    })
  })
})

test.group('Password reset with log-only mail in production', (group) => {
  group.each.setup(() => resetData())

  test('page and submit point to support instead of claiming an email was sent', async ({ client, assert }) => {
    const { user } = await makeCandidate()
    await withEnv({ NODE_ENV: 'production', MAIL_MAILER: 'log', SUPPORT_EMAIL: 'support@hiremegulf.com' }, async () => {
      const page = await client.get('/forgot-password').withInertia()
      assert.isFalse(page.inertiaProps.mailEnabled)
      assert.equal(page.inertiaProps.supportEmail, 'support@hiremegulf.com')
      await client.post('/forgot-password').form({ email: user.email }).withCsrfToken().redirects(0)
    })
    assert.isNull(await UserToken.query().where('user_id', user.id).where('type', 'password_reset').first())
  })
})
