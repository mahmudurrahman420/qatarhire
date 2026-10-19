import { test } from '@japa/runner'
import Industry from '#models/industry'
import JobCategory from '#models/job_category'
import Language from '#models/language'
import Location from '#models/location'
import CandidateProfile from '#models/candidate_profile'
import CandidateExperience from '#models/candidate_experience'
import CandidateEducation from '#models/candidate_education'
import { makeCandidate, makeEmployer, resetData } from '#tests/helpers'

async function payload(overrides: Record<string, unknown> = {}) {
  const industry = await Industry.firstOrFail()
  const fn = await JobCategory.firstOrFail()
  const [en, ar] = await Language.query().whereIn('code', ['en', 'ar']).orderBy('code')
  const qatar = await Location.findByOrFail('slug', 'qatar')
  const doha = await Location.query().where('slug', 'doha').firstOrFail()
  return {
    fullName: 'Test Candidate', hasDrivingLicence: true, hasDisability: true, openToRelocation: true,
    languages: [{ languageId: ar.id, proficiency: 'native' }, { languageId: en.id, proficiency: 'professional' }],
    educations: [{ qualification: "Bachelor's Degree", major: 'Accounting', institution: 'Qatar University', startDate: '2015-09-01', endDate: '2019-06-30' }],
    employmentStatus: 'employed', headline: 'Accountant | VAT', industryIds: [industry.id], functionIds: [fn.id], careerLevel: 'senior', skills: ['VAT', 'Excel'],
    hasGccExperience: true, noticePeriod: '1_week', desiredEmploymentTypes: ['full_time'], currentSalaryRange: '4000-5000', currentSalaryCurrency: 'QAR',
    benefits: ['housing', 'medical'],
    experiences: [{ isCurrent: true, jobTitle: 'Accountant', companyName: 'ACME W.L.L.', employmentType: 'full_time', startDate: '2020-01-01', description: '<p>Did <b>things</b><script>x</script></p>' }],
    preferredPositions: ['Senior Accountant'], preferredIndustryIds: [industry.id], preferredLocationId: qatar.id, preferredCityIds: [doha.id],
    phone: '+974 6699 4850', whatsapp: '+974 6699 4851', linkedinUrl: 'https://www.linkedin.com/in/test', instagramUrl: 'https://instagram.com/test',
    summary: '<p>I am an accountant with <u>seven</u> years of experience.</p>',
    ...overrides,
  }
}

test.group('Full jobseeker profile', (group) => {
  group.each.setup(() => resetData())

  test('saves every section and reloads it', async ({ client, assert }) => {
    const { user, profile } = await makeCandidate({ visibility: 'public' })
    const res = await client.put('/candidate/profile').json(await payload()).withCsrfToken().loginAs(user).redirects(0)
    res.assertStatus(302)
    const p = await CandidateProfile.findOrFail(profile.id)
    assert.equal(p.headline, 'Accountant | VAT')
    assert.isTrue(p.hasDrivingLicence)
    assert.equal(p.noticePeriod, '1_week')
    assert.equal(p.noticePeriodDays, 7)
    assert.equal(p.availability, 'within_1_month')
    assert.equal(p.educationLevel, 'bachelor')
    assert.deepEqual(p.benefits, ['housing', 'medical'])
    assert.lengthOf(p.preferredCityIds, 1)
    const exp = await CandidateExperience.query().where('candidate_profile_id', p.id)
    assert.lengthOf(exp, 1)
    assert.equal(exp[0].description, '<p>Did <b>things</b></p>')
    assert.lengthOf(await CandidateEducation.query().where('candidate_profile_id', p.id), 1)

    // second save keeps row ids for edited items and removes dropped ones
    const again = await payload({ experiences: [{ id: exp[0].id, isCurrent: false, jobTitle: 'Accountant', companyName: 'ACME', startDate: '2020-01-01', endDate: '2024-01-01' }], educations: [] })
    await client.put('/candidate/profile').json(again).withCsrfToken().loginAs(user).redirects(0)
    const exp2 = await CandidateExperience.query().where('candidate_profile_id', p.id)
    assert.equal(exp2[0].id, exp[0].id)
    assert.isFalse(exp2[0].isCurrent)
    assert.lengthOf(await CandidateEducation.query().where('candidate_profile_id', p.id), 0)

    const edit = await client.get('/candidate/profile').withInertia().loginAs(user)
    assert.equal(edit.inertiaProps.profile.whatsapp, '+974 6699 4851')
    assert.lengthOf(edit.inertiaProps.profile.languages, 2)
  })

  test('rejects contact details in About Me and About Job, and requires headline, industry, function and phone', async ({ client, assert }) => {
    const { user } = await makeCandidate()
    const bad = await payload({
      summary: '<p>Email me at me@example.com</p>',
      experiences: [{ isCurrent: true, jobTitle: 'Cook', companyName: 'X', startDate: '2020-01-01', description: 'Call 6699 4850' }],
      headline: '', industryIds: [], functionIds: [], phone: '',
      instagramUrl: 'https://example.com/me',
    })
    const res = await client.put('/candidate/profile').json(bad).withCsrfToken().loginAs(user).withInertia()
    const errors = res.inertiaProps.errors as Record<string, string>
    assert.match(errors.summary, /not allowed/)
    assert.match(errors['experiences.0.description'], /not allowed/)
    for (const k of ['headline', 'industryIds', 'functionIds', 'phone', 'instagramUrl']) assert.property(errors, k)
  })

  test('public view hides contact, disability and current salary; employers see salary', async ({ client, assert }) => {
    const { user, profile } = await makeCandidate({ visibility: 'public', contactSharing: 'verified_employers' })
    await client.put('/candidate/profile').json(await payload()).withCsrfToken().loginAs(user).redirects(0)
    const pub = await client.get(`/talent/${profile.id}`).withInertia()
    const c = pub.inertiaProps.candidate
    assert.isNull(c.contact)
    assert.isNull(c.currentSalary)
    assert.isNull(c.hasDisability)
    assert.notInclude(JSON.stringify(c), '6699')
    assert.equal(c.careerLevel, 'Senior Level')
    const { user: emp } = await makeEmployer('verified')
    const res = await client.get(`/employer/candidates/${profile.id}`).withInertia().loginAs(emp)
    assert.equal(res.inertiaProps.candidate.currentSalary, '4,000 – 5,000 QAR')
    assert.equal(res.inertiaProps.candidate.contact.whatsapp, '+974 6699 4851')
  })
})
