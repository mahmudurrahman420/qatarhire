import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import CandidateExperience from '#models/candidate_experience'
import CandidateEducation from '#models/candidate_education'
import CandidateCertification from '#models/candidate_certification'
import Skill from '#models/skill'
import Location from '#models/location'
import { currencyFor } from '#shared/gulf'
import Taxonomy from '#services/taxonomy'
import UploadService, { UploadRejected } from '#services/upload_service'
import { computeCompleteness, refreshCompleteness } from '#services/profile_completeness'
import { cvBrief } from '#services/presenters'
import vine from '@vinejs/vine'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import Industry from '#models/industry'
import JobCategory from '#models/job_category'
import Language from '#models/language'
import type CandidateProfile from '#models/candidate_profile'
import { NoticePeriodDays, availabilityForNotice, highestLevel, noticeFromDays } from '#shared/profile_options'
import { sanitizeHtml, toSafeHtml } from '#shared/rich_text'
import {
  fullProfileValidator,
  certificationValidator,
  educationValidator,
  experienceValidator,
  languagesValidator,
  skillsValidator,
} from '#validators/candidate'

async function defaultCurrency(locationId: number | undefined) {
  const loc = locationId ? await Location.find(locationId) : null
  return currencyFor(loc?.countryCode)
}

const photoValidator = vine.compile(vine.object({ photo: vine.file({ size: '2mb', extnames: ['jpg', 'jpeg', 'png', 'webp'] }) }))

export default class ProfileController {
  async edit({ inertia, profile, auth }: HttpContext) {
    await profile.load((l) =>
      l.load('experiences').load('educations').load('certifications').load('skills').load('languages').load('cvs')
    )
    const { score, missing } = computeCompleteness(profile)
    const user = auth.getUserOrFail()
    return inertia.render('candidate/profile', {
      profile: {
        ...profile.serialize(),
        ...profile.privateFields,
        fullName: user.fullName,
        accountEmail: user.email,
        photoUrl: profile.photoUrl,
        summaryHtml: toSafeHtml(profile.summary) ?? '',
        // older profiles had a single industry; preselect it
        industryIds: profile.industryIds.length ? profile.industryIds : profile.industryId ? [profile.industryId] : [],
        noticePeriod: profile.noticePeriod ?? noticeFromDays(profile.noticePeriodDays),
        experiences: profile.experiences.map((x) => ({ ...x.serialize(), descriptionHtml: toSafeHtml(x.description) ?? '' })),
        educations: profile.educations.map((e) => ({
          ...e.serialize(),
          startDate: e.startDate?.toISODate() ?? (e.startYear ? `${e.startYear}-01-01` : null),
          endDate: e.endDate?.toISODate() ?? (e.endYear ? `${e.endYear}-12-31` : null),
        })),
        skills: profile.skills.map((s) => s.name),
        languages: profile.languages.map((l) => ({ languageId: l.id, name: l.name, proficiency: l.$extras.pivot_proficiency })),
        cvs: profile.cvs.map(cvBrief),
      },
      completeness: { score, missing },
      taxonomy: await Taxonomy.all(),
    })
  }

  /** Saves the whole profile form, including the repeatable sections, in one transaction. */
  async update({ request, profile, auth, response, session }: HttpContext) {
    const data = await request.validateUsing(fullProfileValidator)
    const user = auth.getUserOrFail()

    const known = await this.knownIds(data)
    const industryIds = data.industryIds.filter((id) => known.industries.has(id))
    const prefIndustryIds = data.preferredIndustryIds.filter((id) => known.industries.has(id))
    const functionIds = data.functionIds.filter((id) => known.categories.has(id))
    const preferredCountry = data.preferredLocationId ? await Location.find(data.preferredLocationId) : null
    const cityIds = data.preferredCityIds.filter((id) => known.cities.get(id) === preferredCountry?.countryCode)
    if (!industryIds.length || !functionIds.length) {
      session.flashErrors({ ...(!industryIds.length && { industryIds: 'Choose at least one industry' }), ...(!functionIds.length && { functionIds: 'Choose at least one function' }) })
      return response.redirect().back()
    }
    const quals = data.educations.map((e) => e.qualification)
    const currentCurrency = data.currentSalaryRange ? (data.currentSalaryCurrency ?? (await defaultCurrency(data.currentLocationId))) : null
    const expectedCurrency = data.expectedSalary ? (data.expectedSalaryCurrency ?? (await defaultCurrency(data.preferredLocationId ?? data.currentLocationId))) : null
    // resolved before the transaction: SQLite has a single connection, so queries outside trx would wait on it
    const skillIds = await Skill.resolveIds(data.skills)

    await db.transaction(async (trx) => {
      if (user.fullName !== data.fullName) {
        user.useTransaction(trx)
        user.fullName = data.fullName
        await user.save()
      }
      profile.useTransaction(trx)
      profile.merge({
        // personal
        gender: data.gender ?? null,
        currentLocationId: data.currentLocationId ?? null,
        currentLocationText: data.currentLocationText ?? null,
        workAuthorization: data.workAuthorization ?? null,
        hasDrivingLicence: data.hasDrivingLicence ?? null,
        hasDisability: data.hasDisability ?? null,
        openToRelocation: data.openToRelocation ?? false,
        // employment information
        employmentStatus: data.employmentStatus ?? null,
        headline: data.headline,
        desiredPosition: data.desiredPosition ?? data.preferredPositions[0] ?? null,
        currentJobTitle: data.currentJobTitle ?? null,
        industryIds,
        industryId: industryIds[0] ?? null,
        functionIds,
        careerLevel: data.careerLevel ?? null,
        yearsExperience: data.yearsExperience ?? null,
        hasGccExperience: data.hasGccExperience ?? null,
        noticePeriod: data.noticePeriod ?? null,
        noticePeriodDays: data.noticePeriod ? NoticePeriodDays[data.noticePeriod] : null,
        availability: data.noticePeriod ? availabilityForNotice(data.noticePeriod) : profile.availability,
        desiredEmploymentTypes: data.desiredEmploymentTypes,
        currentSalaryRange: data.currentSalaryRange ?? null,
        currentSalaryCurrency: currentCurrency,
        expectedSalary: data.expectedSalary ?? null,
        expectedSalaryCurrency: expectedCurrency,
        benefits: data.benefits,
        educationLevel: (highestLevel(quals) as CandidateProfile['educationLevel'] | null) ?? profile.educationLevel,
        // preferences
        preferredPositions: data.preferredPositions,
        preferredIndustryIds: prefIndustryIds,
        preferredLocationId: data.preferredLocationId ?? null,
        preferredCityIds: cityIds,
        // contact & social
        phone: data.phone,
        whatsapp: data.whatsapp ?? null,
        portfolioUrl: data.portfolioUrl ?? null,
        linkedinUrl: data.linkedinUrl ?? null,
        instagramUrl: data.instagramUrl ?? null,
        facebookUrl: data.facebookUrl ?? null,
        summary: data.summary ? sanitizeHtml(data.summary) || null : null,
      })
      await profile.save()

      // repeatables: update rows the candidate owns, create new ones, delete removed ones
      await this.syncRows(trx, CandidateEducation, profile.id, data.educations, (e) => {
        const start = e.startDate ? DateTime.fromJSDate(e.startDate) : null
        const end = e.endDate ? DateTime.fromJSDate(e.endDate) : null
        return {
          qualification: e.qualification,
          fieldOfStudy: e.major ?? null,
          institution: e.institution,
          isCustomInstitute: e.isCustomInstitute ?? false,
          startDate: start,
          endDate: end,
          startYear: start?.year ?? null,
          endYear: end?.year ?? null,
        }
      })
      await this.syncRows(trx, CandidateExperience, profile.id, data.experiences, (x) => ({
        jobTitle: x.jobTitle,
        companyName: x.companyName,
        employmentType: x.employmentType ?? null,
        location: x.location ?? null,
        startDate: DateTime.fromJSDate(x.startDate),
        isCurrent: x.isCurrent ?? false,
        endDate: x.isCurrent || !x.endDate ? null : DateTime.fromJSDate(x.endDate),
        description: x.description ? sanitizeHtml(x.description) || null : null,
      }))

      await profile.related('skills').sync(skillIds, true, trx)
      const langMap: Record<number, { proficiency: string }> = {}
      for (const l of data.languages) if (known.languages.has(l.languageId)) langMap[l.languageId] = { proficiency: l.proficiency }
      await profile.related('languages').sync(langMap, true, trx)
    })

    profile.profileUpdatedAt = DateTime.now()
    await profile.save()
    await refreshCompleteness(profile)
    session.flash('success', 'Profile saved.')
    return response.redirect().back()
  }

  private async knownIds(data: { industryIds: number[]; preferredIndustryIds: number[]; functionIds: number[]; preferredCityIds: number[]; languages: { languageId: number }[] }) {
    const [industries, categories, cities, languages] = await Promise.all([
      Industry.query().whereIn('id', [...data.industryIds, ...data.preferredIndustryIds, 0]).select('id'),
      JobCategory.query().whereIn('id', [...data.functionIds, 0]).select('id'),
      Location.query().whereIn('id', [...data.preferredCityIds, 0]).where('kind', 'city').select('id', 'country_code'),
      Language.query().whereIn('id', [...data.languages.map((l) => l.languageId), 0]).select('id'),
    ])
    return {
      industries: new Set(industries.map((r) => r.id)),
      categories: new Set(categories.map((r) => r.id)),
      cities: new Map(cities.map((r) => [r.id, r.countryCode] as const)),
      languages: new Set(languages.map((r) => r.id)),
    }
  }

  private async syncRows<M extends typeof CandidateEducation | typeof CandidateExperience, T extends { id?: number }>(
    trx: TransactionClientContract,
    Model: M,
    profileId: number,
    items: T[],
    attrs: (item: T) => Record<string, unknown>
  ) {
    const existing = await Model.query({ client: trx }).where('candidate_profile_id', profileId)
    const keep = new Set<number>()
    for (const item of items) {
      const row = item.id ? existing.find((r) => r.id === item.id) : undefined
      if (row) {
        row.merge(attrs(item) as never)
        await row.useTransaction(trx).save()
        keep.add(row.id)
      } else {
        const created = await Model.create({ ...attrs(item), candidateProfileId: profileId } as never, { client: trx })
        keep.add(created.id)
      }
    }
    const remove = existing.filter((r) => !keep.has(r.id)).map((r) => r.id)
    if (remove.length) await Model.query({ client: trx }).whereIn('id', remove).delete()
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
