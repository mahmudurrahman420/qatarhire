import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import EmailSettings from '#services/email_settings'
import AuditLogger from '#services/audit_logger'
import { sendViaZeptoMail } from '#services/mail/zeptomail'

const saveValidator = vine.compile(
  vine.object({
    zeptomail_token: vine.string().trim().minLength(10).maxLength(2000).optional(),
    from_address: vine.string().trim().email().maxLength(254),
    from_name: vine.string().trim().minLength(1).maxLength(100),
  })
)
const testValidator = vine.compile(vine.object({ recipient: vine.string().trim().email().maxLength(254) }))

export default class AdminEmailSettingsController {
  async show({ inertia }: HttpContext) {
    return inertia.render('admin/email_settings', { email: await EmailSettings.status() })
  }

  async update(ctx: HttpContext) {
    const { request, response, session } = ctx
    const data = await request.validateUsing(saveValidator)
    await EmailSettings.save({ token: data.zeptomail_token, fromAddress: data.from_address, fromName: data.from_name })
    await AuditLogger.log('admin.email_settings_updated', { ctx, meta: { tokenChanged: !!data.zeptomail_token, fromAddress: data.from_address, fromName: data.from_name } })
    session.flash('success', data.zeptomail_token ? 'Email settings saved. ZeptoMail token updated.' : 'Email settings saved.')
    return response.redirect().toPath('/admin/settings/email')
  }

  async clearToken(ctx: HttpContext) {
    await EmailSettings.clearToken()
    await AuditLogger.log('admin.email_token_cleared', { ctx })
    ctx.session.flash('success', 'Stored ZeptoMail token removed.')
    return ctx.response.redirect().toPath('/admin/settings/email')
  }

  async test(ctx: HttpContext) {
    const { request, response, session } = ctx
    const { recipient } = await request.validateUsing(testValidator)
    const cfg = await EmailSettings.zepto()
    if (!cfg) {
      session.flash('error', 'ZeptoMail is not configured yet. Save a token first.')
      return response.redirect().toPath('/admin/settings/email')
    }
    try {
      await sendViaZeptoMail({
        token: cfg.token,
        from: { address: cfg.fromAddress, name: cfg.fromName },
        to: [{ address: recipient }],
        subject: `${cfg.fromName} test email`,
        html: `<p>This is a test email from ${cfg.fromName}. ZeptoMail delivery is working.</p>`,
        text: `This is a test email from ${cfg.fromName}. ZeptoMail delivery is working.`,
      })
      await AuditLogger.log('admin.email_test_sent', { ctx, meta: { recipient } })
      session.flash('success', `Test email sent to ${recipient}.`)
    } catch (error) {
      session.flash('error', `Test email failed: ${(error as Error).message}`)
    }
    return response.redirect().toPath('/admin/settings/email')
  }
}
