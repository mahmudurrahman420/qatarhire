import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import CandidateCv from '#models/candidate_cv'
import UploadService, { UploadRejected } from '#services/upload_service'
import SettingsService from '#services/settings_service'
import AuditLogger from '#services/audit_logger'
import { refreshCompleteness } from '#services/profile_completeness'
import { cvUploadValidator } from '#validators/candidate'

export default class CvsController {
  /**
   * Upload a new CV version. With `replaceId`, the new file replaces that version
   * (keeping its primary flag) and the old file is deleted from storage.
   */
  async store(ctx: HttpContext) {
    const { request, profile, response, session } = ctx
    const { cv, label } = await request.validateUsing(cvUploadValidator)
    const replaceId = Number(request.input('replaceId')) || null
    const toReplace = replaceId ? await CandidateCv.query().where('id', replaceId).where('candidate_profile_id', profile.id).first() : null

    const count = await CandidateCv.query().where('candidate_profile_id', profile.id).count('* as total')
    const max = await SettingsService.get('max_cvs_per_candidate')
    if (!toReplace && Number(count[0].$extras.total) >= max) {
      session.flashErrors({ cv: `You can keep up to ${max} CVs. Delete or replace one first.` })
      return response.redirect().back()
    }

    let stored
    try {
      stored = await UploadService.storeCv(cv)
    } catch (e) {
      if (e instanceof UploadRejected) {
        session.flashErrors({ cv: e.message })
        return response.redirect().back()
      }
      throw e
    }

    const isFirst = Number(count[0].$extras.total) === 0
    if (toReplace) {
      const oldKey = toReplace.storageKey
      toReplace.merge({ ...stored, label: label || toReplace.label, parseStatus: 'none', parsedData: null })
      await toReplace.save()
      await UploadService.deletePrivate(oldKey)
      await AuditLogger.log('cv.replaced', { ctx, subject: { type: 'candidate_cv', id: toReplace.id } })
    } else {
      const created = await CandidateCv.create({
        ...stored,
        candidateProfileId: profile.id,
        label: label || (isFirst ? 'My CV' : `CV ${Number(count[0].$extras.total) + 1}`),
        isPrimary: isFirst,
      })
      await AuditLogger.log('cv.uploaded', { ctx, subject: { type: 'candidate_cv', id: created.id } })
    }
    await refreshCompleteness(profile)
    session.flash('success', toReplace ? 'CV replaced.' : 'CV uploaded.')
    return response.redirect().back()
  }

  async makePrimary({ params, profile, response }: HttpContext) {
    const cv = await CandidateCv.query().where('id', params.id).where('candidate_profile_id', profile.id).firstOrFail()
    await db.transaction(async (trx) => {
      await CandidateCv.query({ client: trx }).where('candidate_profile_id', profile.id).update({ is_primary: false })
      await CandidateCv.query({ client: trx }).where('id', cv.id).update({ is_primary: true })
    })
    return response.redirect().back()
  }

  /** Deleting a CV removes the file; applications keep a record but lose the attachment. */
  async destroy(ctx: HttpContext) {
    const { params, profile, response, session } = ctx
    const cv = await CandidateCv.query().where('id', params.id).where('candidate_profile_id', profile.id).firstOrFail()
    await cv.delete()
    await UploadService.deletePrivate(cv.storageKey)
    if (cv.isPrimary) {
      const next = await CandidateCv.query().where('candidate_profile_id', profile.id).orderBy('created_at', 'desc').first()
      if (next) {
        next.isPrimary = true
        await next.save()
      }
    }
    await refreshCompleteness(profile)
    await AuditLogger.log('cv.deleted', { ctx, subject: { type: 'candidate_cv', id: cv.id } })
    session.flash('success', 'CV deleted.')
    return response.redirect().back()
  }
}
