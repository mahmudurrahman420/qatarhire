import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import CandidateExperience from '#models/candidate_experience'
import CandidateEducation from '#models/candidate_education'
import CandidateCertification from '#models/candidate_certification'
import Skill from '#models/skill'
import Taxonomy from '#services/taxonomy'
import UploadService, { UploadRejected } from '#services/upload_service'
import { computeCompleteness, refreshCompleteness } from '#services/profile_completeness'
import { cvBrief } from '#services/presenters'
import vine from '@vinejs/vine'
import {
  certificationValidator,
  educationValidator,
  experienceValidator,
  languagesValidator,
  profileValidator,
  skillsValidator,
} from '#validators/candidate'

const photoValidator = vine.compile(vine.object({ photo: vine.file({ size: '2mb', extnames: ['jpg', 'jpeg', 'png', 'webp'] }) }))

export default class ProfileController {
  async edit({ inertia, profile, auth }: HttpContext) {
    await profile.load((l) =>
      l.load('experiences').load('educations').load('certifications').load('skills').load('languages').load('cvs')
    )
    const { score, missing } = computeCompleteness(profile)
    return inertia.render('candidate/profile', {
      profile: {
        ...profile.serialize(),
        fullName: auth.getUserOrFail().fullName,
        phone: profile.phone,
        contactEmail: profile.contactEmail,
        photoUrl: profile.photoKey ? `/uploads/${profile.photoKey}` : null,
        skills: profile.skills.map((s) => s.name),
        languages: profile.languages.map((l) => ({ languageId: l.id, name: l.name, proficiency: l.$extras.pivot_proficiency })),
        cvs: profile.cvs.map(cvBrief),
      },
      completeness: { score, missing },
      taxonomy: await Taxonomy.all(),
    })
  }

  async update({ request, profile, auth, response, session }: HttpContext) {
    const data = await request.validateUsing(profileValidator)
    const user = auth.getUserOrFail()
    const { fullName, ...rest } = data
    if (user.fullName !== fullName) {
      user.fullName = fullName
      await user.save()
    }
    profile.merge({
      headline: rest.headline ?? null,
      currentJobTitle: rest.currentJobTitle ?? null,
      summary: rest.summary ?? null,
      phone: rest.phone ?? null,
      contactEmail: rest.contactEmail ?? null,
      currentLocationId: rest.currentLocationId ?? null,
      currentLocationText: rest.currentLocationText ?? null,
      preferredLocationId: rest.preferredLocationId ?? null,
      industryId: rest.industryId ?? null,
      yearsExperience: rest.yearsExperience ?? null,
      educationLevel: rest.educationLevel ?? null,
      expectedSalary: rest.expectedSalary ?? null,
      availability: rest.availability ?? null,
      noticePeriodDays: rest.noticePeriodDays ?? null,
      linkedinUrl: rest.linkedinUrl ?? null,
      portfolioUrl: rest.portfolioUrl ?? null,
      workAuthorization: rest.workAuthorization ?? null,
      openToRelocation: rest.openToRelocation ?? false,
    })
    await profile.save()
    await refreshCompleteness(profile)
    session.flash('success', 'Profile saved.')
    return response.redirect().back()
  }

  async uploadPhoto({ request, profile, response, session }: HttpContext) {
    const { photo } = await request.validateUsing(photoValidator)
    try {
      const key = await UploadService.storeImage(photo, 'photos')
      await UploadService.deletePublic(profile.photoKey)
      profile.photoKey = key
      await profile.save()
      session.flash('success', 'Photo updated.')
    } catch (e) {
      if (e instanceof UploadRejected) session.flashErrors({ photo: e.message })
      else throw e
    }
    return response.redirect().back()
  }

  async deletePhoto({ profile, response }: HttpContext) {
    await UploadService.deletePublic(profile.photoKey)
    profile.photoKey = null
    await profile.save()
    return response.redirect().back()
  }

  // --- employment history ---------------------------------------------------
  async storeExperience({ request, profile, response, session }: HttpContext) {
    const data = await request.validateUsing(experienceValidator)
    await CandidateExperience.create({ ...this.experienceAttrs(data), candidateProfileId: profile.id })
    await this.touch(profile)
    session.flash('success', 'Experience added.')
    return response.redirect().back()
  }

  async updateExperience({ request, params, profile, response, session }: HttpContext) {
    const row = await CandidateExperience.query().where('id', params.id).where('candidate_profile_id', profile.id).firstOrFail()
    const data = await request.validateUsing(experienceValidator)
    row.merge(this.experienceAttrs(data))
    await row.save()
    await this.touch(profile)
    session.flash('success', 'Experience updated.')
    return response.redirect().back()
  }

  async destroyExperience({ params, profile, response }: HttpContext) {
    await CandidateExperience.query().where('id', params.id).where('candidate_profile_id', profile.id).delete()
    await this.touch(profile)
    return response.redirect().back()
  }

  // --- education ----------------------------------------------------------------
  async storeEducation({ request, profile, response }: HttpContext) {
    const data = await request.validateUsing(educationValidator)
    await CandidateEducation.create({ ...this.nulls(data), candidateProfileId: profile.id })
    await this.touch(profile)
    return response.redirect().back()
  }

  async updateEducation({ request, params, profile, response }: HttpContext) {
    const row = await CandidateEducation.query().where('id', params.id).where('candidate_profile_id', profile.id).firstOrFail()
    row.merge(this.nulls(await request.validateUsing(educationValidator)))
    await row.save()
    await this.touch(profile)
    return response.redirect().back()
  }

  async destroyEducation({ params, profile, response }: HttpContext) {
    await CandidateEducation.query().where('id', params.id).where('candidate_profile_id', profile.id).delete()
    await this.touch(profile)
    return response.redirect().back()
  }

  // --- certifications ------------------------------------------------------------
  async storeCertification({ request, profile, response }: HttpContext) {
    const data = await request.validateUsing(certificationValidator)
    await CandidateCertification.create({ ...this.nulls(data), candidateProfileId: profile.id })
    await this.touch(profile)
    return response.redirect().back()
  }

  async destroyCertification({ params, profile, response }: HttpContext) {
    await CandidateCertification.query().where('id', params.id).where('candidate_profile_id', profile.id).delete()
    await this.touch(profile)
    return response.redirect().back()
  }

  // --- skills & languages -----------------------------------------------------------
  async updateSkills({ request, profile, response, session }: HttpContext) {
    const { skills } = await request.validateUsing(skillsValidator)
    const ids = await Skill.resolveIds(skills)
    await profile.related('skills').sync(ids)
    await this.touch(profile)
    session.flash('success', 'Skills saved.')
    return response.redirect().back()
  }

  async updateLanguages({ request, profile, response, session }: HttpContext) {
    const { languages } = await request.validateUsing(languagesValidator)
    const map: Record<number, { proficiency: string }> = {}
    for (const l of languages) map[l.languageId] = { proficiency: l.proficiency }
    await profile.related('languages').sync(map)
    await this.touch(profile)
    session.flash('success', 'Languages saved.')
    return response.redirect().back()
  }

  private experienceAttrs(data: Awaited<ReturnType<typeof experienceValidator.validate>>) {
    return {
      jobTitle: data.jobTitle,
      companyName: data.companyName,
      location: data.location ?? null,
      startDate: DateTime.fromJSDate(data.startDate),
      isCurrent: data.isCurrent ?? false,
      endDate: data.isCurrent || !data.endDate ? null : DateTime.fromJSDate(data.endDate),
      description: data.description ?? null,
    }
  }

  private nulls<T extends Record<string, unknown>>(data: T) {
    return Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v ?? null])) as {
      [K in keyof T]-?: undefined extends T[K] ? Exclude<T[K], undefined> | null : T[K]
    }
  }

  private async touch(profile: HttpContext['profile']) {
    profile.profileUpdatedAt = DateTime.now()
    await profile.save()
    await refreshCompleteness(profile)
  }
}
