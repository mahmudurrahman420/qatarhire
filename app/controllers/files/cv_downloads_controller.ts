import type { HttpContext } from '@adonisjs/core/http'
import drive from '@adonisjs/drive/services/main'
import CandidateCv from '#models/candidate_cv'
import CandidateProfile from '#models/candidate_profile'
import CandidateAccess from '#services/candidate_access'
import NotificationService from '#services/notification_service'
import SettingsService from '#services/settings_service'
import AuditLogger from '#services/audit_logger'
import { membershipFor } from '#services/company_context'

/**
 * The only way a CV leaves storage. Authorises the requester on every call:
 *  - anyone, for the primary CV of a public profile that allows CV downloads
 *  - the candidate who owns it
 *  - an employer with consent (applied to their company, or opted-in primary CV)
 *  - an administrator (logged)
 * Unauthorised requests get 404 so CV ids cannot be probed.
 */
export default class CvDownloadsController {
  async show(ctx: HttpContext) {
    const { params, auth, response } = ctx
    const user = auth.user ?? null
    const cv = await CandidateCv.find(params.id)
    if (!cv) return response.notFound()
    const profile = await CandidateProfile.findOrFail(cv.candidateProfileId)

    let allowed = false
    if (!user) {
      // signed-out visitors: only the primary CV of a public profile that allows downloads
      allowed = cv.isPrimary && profile.cvSearchable && (await CandidateAccess.isPubliclyVisible(profile))
      if (allowed) await CandidateAccess.logAccess(ctx, null, null, profile.id, 'cv_download', cv.id)
    } else if (user.isCandidate) {
      allowed = profile.userId === user.id || (cv.isPrimary && profile.cvSearchable && (await CandidateAccess.isPubliclyVisible(profile)))
    } else if (user.isEmployer) {
      const membership = await membershipFor(user)
      if (membership) {
        const access = await CandidateAccess.evaluate(membership.company, profile)
        allowed = access.canView && access.cvIds.includes(cv.id)
        if (allowed) {
          await CandidateAccess.logAccess(ctx, user, membership.company, profile.id, 'cv_download', cv.id)
          if (await SettingsService.get('notify_candidate_on_cv_download')) {
            await NotificationService.notify(profile.userId, {
              type: 'profile_accessed',
              title: `${membership.company.name} downloaded your CV`,
              url: '/candidate/privacy',
              email: { template: 'notification', subject: `${membership.company.name} downloaded your CV`, pref: 'profile_access' },
            })
          }
        }
      }
    } else if (user.isAdmin) {
      allowed = true
      await AuditLogger.log('admin.cv_download', { ctx, subject: { type: 'candidate_cv', id: cv.id } })
    }

    if (!allowed || !cv.isDownloadable) return response.notFound()

    const disk = drive.use('private')
    if (!(await disk.exists(cv.storageKey))) return response.notFound()
    const stream = await disk.getStream(cv.storageKey)
    const safeName = cv.originalName.replace(/["\\\r\n]/g, '_')
    response.header('Content-Type', cv.mimeType)
    response.header('Content-Disposition', `attachment; filename="${safeName}"`)
    response.header('Cache-Control', 'private, no-store')
    response.header('X-Content-Type-Options', 'nosniff')
    return response.stream(stream)
  }
}
