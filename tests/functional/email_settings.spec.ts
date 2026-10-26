import { test } from '@japa/runner'
import PlatformSetting from '#models/platform_setting'
import EmailSettings from '#services/email_settings'
import { makeAdmin, makeCandidate, resetData } from '#tests/helpers'

const TOKEN = 'wSsVR61testtokenABCDEFG9xyz'

function mockFetch() {
  const calls: { url: string; init: any }[] = []
  const original = globalThis.fetch
  globalThis.fetch = (async (url: any, init: any) => {
    calls.push({ url: String(url), init })
    return new Response(JSON.stringify({ request_id: 'r1', data: [] }), { status: 201 })
  }) as any
  return { calls, restore: () => (globalThis.fetch = original) }
}

test.group('Admin email settings (ZeptoMail)', (group) => {
  group.each.setup(async () => {
    await resetData()
    await PlatformSetting.query().whereIn('key', ['zeptomail_token_enc', 'mail_from_address', 'mail_from_name']).delete()
  })

  test('admin saves a token; it is stored encrypted and never shown back', async ({ client, assert }) => {
    const admin = await makeAdmin()
    let page = await client.get('/admin/settings/email').withInertia().loginAs(admin)
    page.assertStatus(200)
    assert.isFalse(page.inertiaProps.email.configured)
    await client.post('/admin/settings/email').form({ zeptomail_token: TOKEN, from_address: 'noreply@hiremegulf.com', from_name: 'HireMeGulf' }).withCsrfToken().loginAs(admin)
    const row = await PlatformSetting.findOrFail('zeptomail_token_enc')
    assert.notInclude(String(row.value), TOKEN)
    page = await client.get('/admin/settings/email').withInertia().loginAs(admin)
    assert.isTrue(page.inertiaProps.email.configured)
    assert.equal(page.inertiaProps.email.last4, '9xyz')
    assert.notInclude(JSON.stringify(page.inertiaProps), TOKEN)
  })

  test('non-admins cannot open it', async ({ client }) => {
    const { user } = await makeCandidate()
    ;(await client.get('/admin/settings/email').loginAs(user).redirects(0)).assertStatus(403)
  })

  test('password reset is sent through the ZeptoMail API when configured', async ({ client, assert }) => {
    const { user } = await makeCandidate()
    await EmailSettings.save({ token: `Zoho-enczapikey ${TOKEN}`, fromAddress: 'noreply@hiremegulf.com', fromName: 'HireMeGulf' })
    const m = mockFetch()
    try {
      await client.post('/forgot-password').form({ email: user.email }).withCsrfToken()
    } finally {
      m.restore()
    }
    assert.lengthOf(m.calls, 1)
    assert.equal(m.calls[0].url, 'https://api.zeptomail.com/v1.1/email')
    assert.equal(m.calls[0].init.headers.Authorization, `Zoho-enczapikey ${TOKEN}`)
    const body = JSON.parse(m.calls[0].init.body)
    assert.equal(body.from.address, 'noreply@hiremegulf.com')
    assert.equal(body.to[0].email_address.address, user.email)
    assert.equal(body.subject, 'Reset your password')
    assert.include(body.htmlbody, '/reset-password/')
  })

  test('test email shows the API error message', async ({ client, assert }) => {
    const admin = await makeAdmin()
    await EmailSettings.save({ token: TOKEN })
    const original = globalThis.fetch
    globalThis.fetch = (async () => new Response(JSON.stringify({ error: { code: 'TM_3201', message: 'Invalid API Token found' } }), { status: 401 })) as any
    try {
      const res = await client.post('/admin/settings/email/test').form({ recipient: 'x@example.com' }).withCsrfToken().loginAs(admin).redirects(0)
      assert.include(JSON.stringify(res.flashMessages()), 'Invalid API Token found')
    } finally {
      globalThis.fetch = original
    }
  })
})
