import type { HttpContext } from '@adonisjs/core/http'
import { randomBytes } from 'node:crypto'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import env from '#start/env'
import User from '#models/user'
import UserToken from '#models/user_token'
import CompanyUser from '#models/company_user'
import Mailer from '#services/mailer'
import AuditLogger from '#services/audit_logger'
import { inviteValidator } from '#validators/employer'
import { acceptInviteValidator } from '#validators/auth'

export default class TeamController {
  async index({ inertia, company }: HttpContext) {
    const members = await CompanyUser.query().where('company_id', company.id).preload('user').orderBy('role').orderBy('created_at')
    return inertia.render('employer/team', {
      members: members.map((m) => ({
        id: m.id,
        role: m.role,
        fullName: m.user.fullName,
        email: m.user.email,
        pending: !m.user.isVerified,
        joinedAt: m.createdAt.toISO(),
      })),
    })
  }

  async invite(ctx: HttpContext) {
    const { request, company, auth, response, session } = ctx
    const data = await request.validateUsing(inviteValidator)
    if (await User.findBy('email', data.email)) {
      session.flashErrors({ email: 'This email already has a QatarHire account. Ask them to use a different work email.' })
      return response.redirect().back()
    }
    const count = await CompanyUser.query().where('company_id', company.id).count('* as total')
    if (Number(count[0].$extras.total) >= 25) {
      session.flash('error', 'Teams are limited to 25 members.')
      return response.redirect().back()
    }
    const user = await db.transaction(async (trx) => {
      // random password the invitee never sees; they set their own on acceptance
      const u = await User.create(
        { fullName: data.fullName, email: data.email, password: randomBytes(32).toString('hex'), role: 'employer', status: 'active' },
        { client: trx }
      )
      await CompanyUser.create({ companyId: company.id, userId: u.id, role: 'recruiter' }, { client: trx })
      return u
    })
    const token = await UserToken.issue(user, 'company_invite', 60 * 24 * 7, { companyId: company.id })
    await Mailer.queue({
      to: user.email,
      subject: `${auth.getUserOrFail().fullName} invited you to recruit for ${company.name}`,
      template: 'invite',
      data: { name: user.fullName, companyName: company.name, inviter: auth.getUserOrFail().fullName, url: `${env.get('APP_URL')}/invitations/${token}` },
    })
    await AuditLogger.log('company.member_invited', { ctx, subject: { type: 'company', id: company.id }, meta: { userId: user.id } })
    session.flash('success', `Invitation sent to ${user.email}.`)
    return response.redirect().back()
  }

  async remove(ctx: HttpContext) {
    const { params, company, auth, response, session } = ctx
    const member = await CompanyUser.query().where('id', params.id).where('company_id', company.id).preload('user').firstOrFail()
    if (member.role === 'owner') {
      session.flash('error', 'The company owner cannot be removed.')
      return response.redirect().back()
    }
    if (member.userId === auth.getUserOrFail().id) return response.badRequest()
    // Removing a recruiter deletes their login; their notes remain with author set to null.
    await member.user.delete()
    await AuditLogger.log('company.member_removed', { ctx, subject: { type: 'company', id: company.id }, meta: { userId: member.userId } })
    session.flash('success', `${member.user.fullName} was removed from the team.`)
    return response.redirect().back()
  }

  // --- invitation acceptance (public, token-based) ------------------------------
  async showAccept({ inertia, params, response, session }: HttpContext) {
    const token = await UserToken.findValid(String(params.token), 'company_invite')
    if (!token) {
      session.flash('error', 'This invitation is invalid or has expired. Ask your company owner to invite you again.')
      return response.redirect().toPath('/login')
    }
    const membership = await CompanyUser.query().where('user_id', token.userId).preload('company').firstOrFail()
    return inertia.render('auth/accept_invite', { token: params.token, fullName: token.user.fullName, email: token.user.email, companyName: membership.company.name })
  }

  async accept(ctx: HttpContext) {
    const { request, params, response, session, auth } = ctx
    const token = await UserToken.findValid(String(params.token), 'company_invite')
    if (!token) {
      session.flash('error', 'This invitation is invalid or has expired.')
      return response.redirect().toPath('/login')
    }
    const data = await request.validateUsing(acceptInviteValidator)
    const user = token.user
    user.fullName = data.fullName
    user.password = data.password
    user.emailVerifiedAt = DateTime.now() // the emailed link proves address ownership
    await user.save()
    token.usedAt = DateTime.now()
    await token.save()
    await AuditLogger.log('company.invite_accepted', { ctx, actorId: user.id })
    session.regenerate()
    await auth.use('web').login(user)
    session.flash('success', 'Welcome aboard! Your account is ready.')
    return response.redirect().toPath('/employer')
  }
}
