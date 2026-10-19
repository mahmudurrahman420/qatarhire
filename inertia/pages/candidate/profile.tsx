import { Head, router, useForm } from '@inertiajs/react'
import { useMemo, useRef, useState, type ReactNode } from 'react'
import { Download, FileText, Plus, Star, Trash2, Upload } from 'lucide-react'
import AppLayout from '~/layouts/app_layout'
import { Button } from '~/components/ui/button'
import { Checkbox, SelectField, TextField } from '~/components/ui/form'
import { Badge, Modal, PageHeader, Panel } from '~/components/ui/misc'
import { TagInput } from '~/components/tag_input'
import { RichTextEditor } from '~/components/rich_text_editor'
import { MultiSelect, PhoneField, SectionTitle, YesNo } from '~/components/profile_fields'
import { Gender, LanguageProficiency, WorkAuthorization } from '#shared/enums'
import {
  AboutJobMax, AboutMeMax, Benefit, CareerLevel, DesiredEmploymentType, EmploymentStatus, Institutes, LanguageLimit, Majors, NoticePeriod,
  QualificationValues, salaryRanges,
} from '#shared/profile_options'
import { Currencies, GulfCountries } from '#shared/gulf'
import { date, fileSize } from '~/lib/format'
import type { CvBrief, Taxonomy } from '~/lib/types'
import { locationIdOptions } from '~/lib/locations'
import { cn } from '~/lib/cn'

type Experience = { id: number; jobTitle: string; companyName: string; location: string | null; startDate: string; endDate: string | null; isCurrent: boolean; description: string | null; descriptionHtml: string; employmentType: string | null }
type Education = { id: number; institution: string; qualification: string; fieldOfStudy: string | null; startDate: string | null; endDate: string | null; isCustomInstitute: boolean }
type Certification = { id: number; name: string; issuer: string | null; year: number | null }
type Profile = {
  fullName: string; accountEmail: string; headline: string | null; desiredPosition: string | null; gender: string | null; currentJobTitle: string | null
  summaryHtml: string; phone: string | null; whatsapp: string | null; photoUrl: string | null
  currentLocationId: number | null; currentLocationText: string | null; preferredLocationId: number | null
  yearsExperience: number | null; expectedSalary: number | null; expectedSalaryCurrency: string | null
  linkedinUrl: string | null; portfolioUrl: string | null; instagramUrl: string | null; facebookUrl: string | null
  workAuthorization: string | null; openToRelocation: boolean; hasDrivingLicence: boolean | null; hasDisability: boolean | null
  employmentStatus: string | null; careerLevel: string | null; hasGccExperience: boolean | null; noticePeriod: string
  currentSalaryRange: string | null; currentSalaryCurrency: string | null
  industryIds: number[]; functionIds: number[]; desiredEmploymentTypes: string[]; benefits: string[]
  preferredPositions: string[]; preferredIndustryIds: number[]; preferredCityIds: number[]
  experiences: Experience[]; educations: Education[]; certifications: Certification[]
  skills: string[]; languages: { languageId: number; name: string; proficiency: string }[]; cvs: CvBrief[]
}
type Props = { profile: Profile; completeness: { score: number; missing: string[] }; taxonomy: Taxonomy }

type EduRow = { id?: number; qualification: string; major: string; institution: string; isCustomInstitute: boolean; startDate: string; endDate: string }
type ExpRow = { id?: number; isCurrent: boolean; jobTitle: string; companyName: string; employmentType: string; location: string; startDate: string; endDate: string; description: string }

const s = (v: unknown) => (v === null || v === undefined ? '' : String(v))
const orUndef = (v: string) => (v.trim() === '' ? undefined : v)
const numOrUndef = (v: string) => (v === '' ? undefined : Number(v))
const boolOrUndef = (v: boolean | null) => (v === null ? undefined : v)
const day = (v: string | null | undefined) => (v ? v.slice(0, 10) : '')

const newEdu = (): EduRow => ({ qualification: '', major: '', institution: '', isCustomInstitute: false, startDate: '', endDate: '' })
const newExp = (): ExpRow => ({ isCurrent: false, jobTitle: '', companyName: '', employmentType: 'full_time', location: '', startDate: '', endDate: '', description: '' })

export default function ProfilePage({ profile, completeness, taxonomy }: Props) {
  const [certModal, setCertModal] = useState(false)
  const locationOptions = locationIdOptions(taxonomy.locations)
  const countryOf = (locId: number | null) => taxonomy.locations.find((c) => c.id === locId || c.cities.some((x) => x.id === locId || x.areas.some((a) => a.id === locId)))
  const prefCountry = countryOf(profile.preferredLocationId)
  const prefCityFromOld = prefCountry && profile.preferredLocationId !== prefCountry.id ? prefCountry.cities.find((x) => x.id === profile.preferredLocationId || x.areas.some((a) => a.id === profile.preferredLocationId))?.id : undefined
  const homeCurrency = GulfCountries.find((g) => g.code === countryOf(profile.currentLocationId)?.code)?.currency ?? 'QAR'
  const homeDial = GulfCountries.find((g) => g.code === countryOf(profile.currentLocationId)?.code)?.dial ?? '+974'

  const form = useForm({
    fullName: profile.fullName,
    gender: s(profile.gender),
    currentLocationId: s(profile.currentLocationId),
    currentLocationText: s(profile.currentLocationText),
    workAuthorization: s(profile.workAuthorization),
    hasDrivingLicence: profile.hasDrivingLicence,
    hasDisability: profile.hasDisability,
    openToRelocation: profile.openToRelocation as boolean | null,
    languages: profile.languages.map(({ languageId, proficiency }) => ({ languageId, proficiency })),
    educations: profile.educations.map((e): EduRow => ({ id: e.id, qualification: QualificationValues.includes(e.qualification) ? e.qualification : '', major: s(e.fieldOfStudy), institution: e.institution, isCustomInstitute: e.isCustomInstitute || !Institutes.includes(e.institution), startDate: day(e.startDate), endDate: day(e.endDate) })),
    employmentStatus: s(profile.employmentStatus),
    headline: s(profile.headline),
    desiredPosition: s(profile.desiredPosition),
    currentJobTitle: s(profile.currentJobTitle),
    industryIds: profile.industryIds,
    functionIds: profile.functionIds,
    careerLevel: s(profile.careerLevel),
    yearsExperience: s(profile.yearsExperience),
    skills: profile.skills,
    hasGccExperience: profile.hasGccExperience,
    noticePeriod: profile.noticePeriod,
    desiredEmploymentTypes: profile.desiredEmploymentTypes,
    currentSalaryRange: s(profile.currentSalaryRange),
    currentSalaryCurrency: profile.currentSalaryCurrency ?? homeCurrency,
    expectedSalary: s(profile.expectedSalary),
    expectedSalaryCurrency: s(profile.expectedSalaryCurrency),
    benefits: profile.benefits,
    experiences: profile.experiences.map((x): ExpRow => ({ id: x.id, isCurrent: x.isCurrent, jobTitle: x.jobTitle, companyName: x.companyName, employmentType: s(x.employmentType), location: s(x.location), startDate: day(x.startDate), endDate: day(x.endDate), description: x.descriptionHtml })),
    preferredPositions: profile.preferredPositions.length ? profile.preferredPositions : profile.desiredPosition ? [profile.desiredPosition] : [],
    preferredIndustryIds: profile.preferredIndustryIds,
    preferredLocationId: s(prefCountry?.id),
    preferredCityIds: profile.preferredCityIds.length ? profile.preferredCityIds : prefCityFromOld ? [prefCityFromOld] : [],
    phone: s(profile.phone),
    whatsapp: s(profile.whatsapp),
    portfolioUrl: s(profile.portfolioUrl),
    linkedinUrl: s(profile.linkedinUrl),
    instagramUrl: s(profile.instagramUrl),
    facebookUrl: s(profile.facebookUrl),
    summary: profile.summaryHtml,
  })
  const d = form.data
  const err = (k: string) => (form.errors as Record<string, string | undefined>)[k]
  const set = form.setData as (k: string, v: unknown) => void
  const setRow = <K extends 'educations' | 'experiences' | 'languages'>(key: K, i: number, patch: Partial<(typeof d)[K][number]>) =>
    set(key, (d[key] as object[]).map((r, j) => (j === i ? { ...r, ...patch } : r)))
  const removeRow = (key: 'educations' | 'experiences' | 'languages', i: number) => set(key, (d[key] as object[]).filter((_, j) => j !== i))

  const save = () => {
    form.transform((x) => ({
      ...x,
      gender: orUndef(x.gender), currentLocationId: numOrUndef(x.currentLocationId), currentLocationText: orUndef(x.currentLocationText), workAuthorization: orUndef(x.workAuthorization),
      hasDrivingLicence: boolOrUndef(x.hasDrivingLicence), hasDisability: boolOrUndef(x.hasDisability), openToRelocation: boolOrUndef(x.openToRelocation), hasGccExperience: boolOrUndef(x.hasGccExperience),
      educations: x.educations.map((e) => ({ ...e, major: orUndef(e.major), startDate: orUndef(e.startDate), endDate: orUndef(e.endDate) })),
      employmentStatus: orUndef(x.employmentStatus), desiredPosition: orUndef(x.desiredPosition), currentJobTitle: orUndef(x.currentJobTitle), careerLevel: orUndef(x.careerLevel),
      yearsExperience: numOrUndef(x.yearsExperience), noticePeriod: orUndef(x.noticePeriod), currentSalaryRange: orUndef(x.currentSalaryRange),
      currentSalaryCurrency: x.currentSalaryRange ? x.currentSalaryCurrency : undefined, expectedSalary: numOrUndef(x.expectedSalary), expectedSalaryCurrency: orUndef(x.expectedSalaryCurrency),
      experiences: x.experiences.map((e) => ({ ...e, employmentType: orUndef(e.employmentType), location: orUndef(e.location), endDate: e.isCurrent ? undefined : orUndef(e.endDate), description: orUndef(e.description) })),
      preferredLocationId: numOrUndef(x.preferredLocationId),
      whatsapp: orUndef(x.whatsapp), portfolioUrl: orUndef(x.portfolioUrl), linkedinUrl: orUndef(x.linkedinUrl), instagramUrl: orUndef(x.instagramUrl), facebookUrl: orUndef(x.facebookUrl),
      summary: orUndef(x.summary),
    }))
    form.put('/candidate/profile', {
      preserveScroll: (page) => !Object.keys(page.props.errors ?? {}).length,
      onError: () => setTimeout(() => document.querySelector('[aria-invalid="true"], [role="alert"]')?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 50),
    })
  }

  const industryOpts = taxonomy.industries.map((i) => ({ value: i.id, label: i.name }))
  const functionOpts = taxonomy.categories.map((c) => ({ value: c.id, label: c.name }))
  const prefCountryRow = taxonomy.locations.find((c) => String(c.id) === d.preferredLocationId)
  const cityOpts = (prefCountryRow?.cities ?? []).map((c) => ({ value: c.id, label: c.name }))
  const ranges = useMemo(() => salaryRanges(d.currentSalaryCurrency || homeCurrency), [d.currentSalaryCurrency, homeCurrency])
  const errorCount = Object.keys(form.errors).length

  return (
    <AppLayout>
      <Head title="Profile & CV" />
      <PageHeader title="Profile & CV" description="Employers see this profile when you apply, and in search if you make it discoverable." />

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="flex min-w-0 flex-col gap-6">
          <CvPanel cvs={profile.cvs} />

          <form noValidate className="flex flex-col gap-6" onSubmit={(e) => { e.preventDefault(); save() }}>
            <Panel title="Personal details">
              <div className="grid gap-4 sm:grid-cols-2">
                <PhotoField url={profile.photoUrl} />
                <TextField wrapperClass="sm:col-span-2" label="Full name" value={d.fullName} onChange={(e) => set('fullName', e.target.value)} error={err('fullName')} required />
                <SelectField label="Gender" optional placeholder="Prefer not to say" value={d.gender} onChange={(e) => set('gender', e.target.value)} options={Gender.values.map((v) => ({ value: v, label: Gender.label(v) }))} />
                <SelectField label="Current location in the Gulf" placeholder="Outside the Gulf / not listed" value={d.currentLocationId} onChange={(e) => set('currentLocationId', e.target.value)} options={locationOptions} error={err('currentLocationId')} />
                <TextField label="Current location (if outside the Gulf)" optional placeholder="e.g. Chittagong, Bangladesh" value={d.currentLocationText} onChange={(e) => set('currentLocationText', e.target.value)} error={err('currentLocationText')} />
                <SelectField label="Work authorisation in the Gulf" optional placeholder="Prefer not to say" value={d.workAuthorization} onChange={(e) => set('workAuthorization', e.target.value)} options={WorkAuthorization.values.filter((v) => v !== 'prefer_not_to_say').map((v) => ({ value: v, label: WorkAuthorization.label(v) }))} />
              </div>
              <div className="mt-5 grid gap-5 sm:grid-cols-3">
                <YesNo name="licence" label="Driving Licence" value={d.hasDrivingLicence} onChange={(v) => set('hasDrivingLicence', v)} />
                <YesNo name="disability" label="Disability" value={d.hasDisability} onChange={(v) => set('hasDisability', v)} />
                <YesNo name="relocate" label="Willing to relocate" value={d.openToRelocation} onChange={(v) => set('openToRelocation', v)} />
              </div>
              <p className="mt-2 text-[12px] text-slate">Disability is shared only with employers, never on your public profile.</p>
            </Panel>

            <Panel title="Languages">
              <div className="flex flex-col gap-4">
                {d.languages.map((l, i) => (
                  <div key={i} className="rounded-ctl border border-line p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[15px] font-semibold text-navy">Language {i + 1}</span>
                      <Button type="button" size="sm" variant="danger" onClick={() => removeRow('languages', i)}><Trash2 className="size-4" /> Remove</Button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <SelectField label="Language" value={l.languageId} onChange={(e) => setRow('languages', i, { languageId: Number(e.target.value) })} options={taxonomy.languages.filter((x) => x.id === l.languageId || !d.languages.some((y) => y.languageId === x.id)).map((x) => ({ value: x.id, label: x.name }))} />
                      <SelectField label="Proficiency" value={l.proficiency} onChange={(e) => setRow('languages', i, { proficiency: e.target.value })} options={LanguageProficiency.values.map((v) => ({ value: v, label: LanguageProficiency.label(v) }))} />
                    </div>
                  </div>
                ))}
                {err('languages') && <p className="text-[13px] text-danger" role="alert">{err('languages')}</p>}
                <div className="flex flex-wrap items-center gap-3">
                  <Button type="button" variant="secondary" size="sm" disabled={d.languages.length >= LanguageLimit} onClick={() => set('languages', [...d.languages, { languageId: taxonomy.languages.find((x) => !d.languages.some((y) => y.languageId === x.id))?.id ?? taxonomy.languages[0].id, proficiency: 'conversational' }])}>
                    <Plus className="size-4" /> Add language
                  </Button>
                  <span className="rounded-full bg-pearl px-3 py-1 text-[12px] font-medium text-slate">You can add up to {LanguageLimit} languages</span>
                </div>
              </div>
            </Panel>

            <Panel title="Education">
              <div className="flex flex-col gap-4">
                {d.educations.map((e, i) => (
                  <Repeat key={e.id ?? `n${i}`} title={`Education ${i + 1}`} onRemove={() => removeRow('educations', i)}>
                    <SelectField label="Qualification" placeholder="Choose" value={e.qualification} onChange={(ev) => setRow('educations', i, { qualification: ev.target.value })} options={QualificationValues.map((q) => ({ value: q, label: q }))} error={err(`educations.${i}.qualification`)} />
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium" htmlFor={`major-${i}`}>Major</label>
                      <input id={`major-${i}`} list="majors" value={e.major} onChange={(ev) => setRow('educations', i, { major: ev.target.value })} placeholder="Start typing, e.g. Accounting" className="h-10 w-full rounded-ctl border border-line px-3 text-[15px] focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100" />
                    </div>
                    <div className="flex flex-col gap-1.5 sm:col-span-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">Institute</span>
                        <Checkbox label="Custom Institute" checked={e.isCustomInstitute} onChange={(ev) => setRow('educations', i, { isCustomInstitute: ev.target.checked, institution: '' })} />
                      </div>
                      {e.isCustomInstitute ? (
                        <TextField label={<span className="sr-only">Institute name</span>} placeholder="Institute name and city, e.g. Chittagong College, Bangladesh" value={e.institution} onChange={(ev) => setRow('educations', i, { institution: ev.target.value })} error={err(`educations.${i}.institution`)} />
                      ) : (
                        <SelectField label={<span className="sr-only">Institute</span>} placeholder="Choose institute" value={e.institution} onChange={(ev) => setRow('educations', i, { institution: ev.target.value })} options={Institutes.map((x) => ({ value: x, label: x }))} error={err(`educations.${i}.institution`)} />
                      )}
                    </div>
                    <DateRange start={e.startDate} end={e.endDate} onStart={(v) => setRow('educations', i, { startDate: v })} onEnd={(v) => setRow('educations', i, { endDate: v })} error={err(`educations.${i}.startDate`) ?? err(`educations.${i}.endDate`)} />
                  </Repeat>
                ))}
                <datalist id="majors">{Majors.map((m) => <option key={m} value={m} />)}</datalist>
                <div><Button type="button" size="sm" onClick={() => set('educations', [...d.educations, newEdu()])}><Plus className="size-4" /> Add new education</Button></div>
              </div>
            </Panel>

            <Panel title="Employment information">
              <div className="grid gap-4 sm:grid-cols-2">
                <div role="radiogroup" aria-label="Employment status" className="grid gap-2 sm:col-span-2 sm:grid-cols-2">
                  {EmploymentStatus.values.map((v) => (
                    <label key={v} className={cn('flex cursor-pointer items-center gap-2 rounded-ctl border bg-white px-3 py-2 text-sm', d.employmentStatus === v ? 'border-brand-500 bg-brand-50/60' : 'border-line')}>
                      <input type="radio" name="employmentStatus" checked={d.employmentStatus === v} onChange={() => set('employmentStatus', v)} className="accent-brand-600" /> {EmploymentStatus.label(v)}
                    </label>
                  ))}
                </div>
                <TextField wrapperClass="sm:col-span-2" label={<>Professional Headline <span className="text-danger">*</span></>} placeholder="e.g. Chef de Partie | Fine Dining & Culinary Expert" value={d.headline} onChange={(e) => set('headline', e.target.value)} error={err('headline')} />
                <TextField label="Position wanted" placeholder="e.g. Civil Engineer" value={d.desiredPosition} onChange={(e) => set('desiredPosition', e.target.value)} error={err('desiredPosition')} hint="Shown on your profile card." />
                <TextField label="Current or most recent job title" value={d.currentJobTitle} onChange={(e) => set('currentJobTitle', e.target.value)} error={err('currentJobTitle')} />
                <MultiSelect label="Industry" required value={d.industryIds} onChange={(v) => set('industryIds', v)} options={industryOpts} max={5} error={err('industryIds')} />
                <MultiSelect label="Function" required value={d.functionIds} onChange={(v) => set('functionIds', v)} options={functionOpts} max={5} error={err('functionIds')} />
                <SelectField label="Career Level" placeholder="Choose" value={d.careerLevel} onChange={(e) => set('careerLevel', e.target.value)} options={CareerLevel.values.map((v) => ({ value: v, label: CareerLevel.label(v) }))} />
                <TextField label="Years of experience" type="number" min={0} max={60} value={d.yearsExperience} onChange={(e) => set('yearsExperience', e.target.value)} error={err('yearsExperience')} />
                <div className="sm:col-span-2">
                  <TagInput label="Skills" value={d.skills} onChange={(v) => set('skills', v)} suggestions={taxonomy.skills.map((x) => x.name)} placeholder="Type a skill and press Enter" hint="Pick from suggestions or add your own." error={err('skills')} max={40} />
                </div>
                <div className="sm:col-span-2"><YesNo name="gcc" label="GCC Experience" value={d.hasGccExperience} onChange={(v) => set('hasGccExperience', v)} /></div>
                <SelectField label="Notice Period / Availability" placeholder="Choose" value={d.noticePeriod} onChange={(e) => set('noticePeriod', e.target.value)} options={NoticePeriod.values.map((v) => ({ value: v, label: NoticePeriod.label(v) }))} />
                <MultiSelect label="Desired Employment Type" value={d.desiredEmploymentTypes} onChange={(v) => set('desiredEmploymentTypes', v)} options={DesiredEmploymentType.values.map((v) => ({ value: v as string, label: DesiredEmploymentType.label(v) }))} />
                <div className="grid grid-cols-[1fr_96px] gap-2">
                  <SelectField label="Current Salary (monthly)" placeholder="Prefer not to say" value={d.currentSalaryRange} onChange={(e) => set('currentSalaryRange', e.target.value)} options={ranges} error={err('currentSalaryRange')} hint="Shared with employers only." />
                  <SelectField label="Currency" value={d.currentSalaryCurrency} onChange={(e) => { set('currentSalaryCurrency', e.target.value); set('currentSalaryRange', '') }} options={Currencies.map((c) => ({ value: c, label: c }))} />
                </div>
                <div className="grid grid-cols-[1fr_96px] gap-2">
                  <TextField label="Expected monthly salary" optional type="number" min={0} step={100} value={d.expectedSalary} onChange={(e) => set('expectedSalary', e.target.value)} error={err('expectedSalary')} />
                  <SelectField label="Currency" placeholder="Auto" value={d.expectedSalaryCurrency} onChange={(e) => set('expectedSalaryCurrency', e.target.value)} options={Currencies.map((c) => ({ value: c, label: c }))} />
                </div>
                <div className="sm:col-span-2">
                  <MultiSelect label="Employment Benefits" value={d.benefits} onChange={(v) => set('benefits', v)} options={Benefit.values.map((v) => ({ value: v as string, label: Benefit.label(v) }))} hint="Benefits you receive now or expect." />
                </div>
              </div>
            </Panel>

            <Panel title="Employment details">
              <div className="flex flex-col gap-4">
                {d.experiences.map((x, i) => (
                  <Repeat key={x.id ?? `n${i}`} title={x.jobTitle || `Role ${i + 1}`} onRemove={() => removeRow('experiences', i)}>
                    <Checkbox className="sm:col-span-2" label="I am currently working here" checked={x.isCurrent} onChange={(e) => setRow('experiences', i, { isCurrent: e.target.checked, endDate: e.target.checked ? '' : x.endDate })} />
                    <TextField label="Job title" value={x.jobTitle} onChange={(e) => setRow('experiences', i, { jobTitle: e.target.value })} error={err(`experiences.${i}.jobTitle`)} required />
                    <TextField label="Company" value={x.companyName} onChange={(e) => setRow('experiences', i, { companyName: e.target.value })} error={err(`experiences.${i}.companyName`)} required />
                    <SelectField label="Employment Type" placeholder="Choose" value={x.employmentType} onChange={(e) => setRow('experiences', i, { employmentType: e.target.value })} options={DesiredEmploymentType.values.map((v) => ({ value: v, label: DesiredEmploymentType.label(v) }))} />
                    <TextField label="Location" optional placeholder="e.g. Doha, Qatar" value={x.location} onChange={(e) => setRow('experiences', i, { location: e.target.value })} error={err(`experiences.${i}.location`)} />
                    <DateRange start={x.startDate} end={x.isCurrent ? null : x.endDate} onStart={(v) => setRow('experiences', i, { startDate: v })} onEnd={(v) => setRow('experiences', i, { endDate: v })} error={err(`experiences.${i}.startDate`) ?? err(`experiences.${i}.endDate`)} />
                    <div className="sm:col-span-2">
                      <RichTextEditor label="About Job" value={x.description} onChange={(v) => setRow('experiences', i, { description: v })} max={AboutJobMax} error={err(`experiences.${i}.description`)} placeholder="Key responsibilities and results" />
                    </div>
                  </Repeat>
                ))}
                <div><Button type="button" size="sm" onClick={() => set('experiences', [...d.experiences, newExp()])}><Plus className="size-4" /> Add employment</Button></div>
              </div>
            </Panel>

            <Panel title="Employment preferences">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <TagInput label="Preferred Position" value={d.preferredPositions} onChange={(v) => set('preferredPositions', v)} suggestions={[]} placeholder="Type a job title and press Enter" error={err('preferredPositions')} max={10} />
                </div>
                <div className="sm:col-span-2">
                  <MultiSelect label="Preferred Industries" value={d.preferredIndustryIds} onChange={(v) => set('preferredIndustryIds', v)} options={industryOpts} max={5} error={err('preferredIndustryIds')} />
                </div>
                <SelectField label="Preferred Location" placeholder="Anywhere in the Gulf" value={d.preferredLocationId} onChange={(e) => { set('preferredLocationId', e.target.value); set('preferredCityIds', []) }} options={taxonomy.locations.map((c) => ({ value: c.id, label: c.name }))} />
                <MultiSelect label="Preferred City" value={d.preferredCityIds} onChange={(v) => set('preferredCityIds', v)} options={cityOpts} max={10} placeholder={prefCountryRow ? 'Choose cities' : 'Choose a country first'} />
              </div>
            </Panel>

            <Panel title="Contact details">
              <div className="grid gap-4 sm:grid-cols-2">
                <PhoneField label="Phone Number" required value={d.phone} onChange={(v) => set('phone', v)} error={err('phone')} fallbackDial={homeDial} />
                <PhoneField label="WhatsApp Number" value={d.whatsapp} onChange={(v) => set('whatsapp', v)} error={err('whatsapp')} fallbackDial={homeDial} />
                <TextField label="Email" type="email" value={profile.accountEmail} readOnly disabled hint="Your sign-in email. Change it in account settings." />
                <TextField label="Portfolio Link" optional type="url" placeholder="https://" value={d.portfolioUrl} onChange={(e) => set('portfolioUrl', e.target.value)} error={err('portfolioUrl')} />
              </div>
              <p className="mt-3 text-[12px] text-slate">Private. Shared only with employers your privacy settings allow, never on your public profile.</p>
              <SectionTitle>Social media</SectionTitle>
              <div className="mt-3 grid gap-4 sm:grid-cols-3">
                <TextField label="LinkedIn" optional type="url" placeholder="https://www.linkedin.com/in/…" value={d.linkedinUrl} onChange={(e) => set('linkedinUrl', e.target.value)} error={err('linkedinUrl')} />
                <TextField label="Instagram" optional type="url" placeholder="https://www.instagram.com/…" value={d.instagramUrl} onChange={(e) => set('instagramUrl', e.target.value)} error={err('instagramUrl')} />
                <TextField label="Facebook" optional type="url" placeholder="https://www.facebook.com/…" value={d.facebookUrl} onChange={(e) => set('facebookUrl', e.target.value)} error={err('facebookUrl')} />
              </div>
            </Panel>

            <Panel title="About me">
              <RichTextEditor label="About Me" value={d.summary} onChange={(v) => set('summary', v)} max={AboutMeMax} error={err('summary')} placeholder="What you do, what you're good at and what you're looking for." />
            </Panel>

            <div className="sticky bottom-0 z-10 -mx-4 flex items-center gap-3 border-t border-line bg-white/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-panel sm:border">
              <Button type="submit" loading={form.processing}>Save profile</Button>
              {errorCount > 0 ? <span className="text-sm text-danger" role="alert">Please fix the {errorCount === 1 ? 'highlighted field' : `${errorCount} highlighted fields`}.</span> : form.recentlySuccessful ? <span className="text-sm text-brand-700">Saved.</span> : form.isDirty ? <span className="text-sm text-slate">Unsaved changes</span> : null}
            </div>
          </form>

          <Panel title="Certifications" actions={<Button size="sm" variant="secondary" onClick={() => setCertModal(true)}><Plus className="size-4" /> Add</Button>} padded={false}>
            {profile.certifications.length ? (
              <ul className="divide-y divide-line">
                {profile.certifications.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <span className="text-sm"><span className="font-medium">{c.name}</span>{c.issuer ? ` — ${c.issuer}` : ''}{c.year ? ` (${c.year})` : ''}</span>
                    <Button size="sm" variant="quiet" onClick={() => confirm('Remove this certification?') && router.delete(`/candidate/certifications/${c.id}`, { preserveScroll: true })} aria-label="Remove"><Trash2 className="size-4" /></Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-4 text-sm text-slate">e.g. NEBOSH IGC, PMP, CPA, HACCP.</p>
            )}
          </Panel>
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <Panel title="Profile strength">
            <p className="font-display text-3xl font-bold">{completeness.score}%</p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-pearl"><div className="h-full rounded-full bg-brand-600" style={{ width: `${completeness.score}%` }} /></div>
            {completeness.missing.length ? (
              <ul className="mt-4 flex flex-col gap-1.5 text-sm text-slate">{completeness.missing.map((m) => <li key={m}>{m}</li>)}</ul>
            ) : (
              <p className="mt-4 text-sm text-gulf">Your profile is complete.</p>
            )}
          </Panel>
        </aside>
      </div>

      <CertificationModal open={certModal} onClose={() => setCertModal(false)} />
    </AppLayout>
  )
}

function Repeat({ title, onRemove, children }: { title: string; onRemove: () => void; children: ReactNode }) {
  return (
    <div className="rounded-ctl border border-line bg-pearl/40 p-3 sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-[15px] font-semibold text-navy">{title}</span>
        <Button type="button" size="sm" variant="danger" onClick={onRemove}><Trash2 className="size-4" /> Remove</Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </div>
  )
}

/** Start → end date pair. Passing end={null} hides the end date ("currently working here"). */
function DateRange({ start, end, onStart, onEnd, error }: { start: string; end: string | null; onStart: (v: string) => void; onEnd: (v: string) => void; error?: string }) {
  return (
    <div className="flex flex-col gap-1.5 sm:col-span-2">
      <div className="grid grid-cols-2 gap-2">
        <TextField label="Start date" type="date" value={start} onChange={(e) => onStart(e.target.value)} aria-invalid={Boolean(error)} />
        {end === null ? (
          <div className="flex flex-col gap-1.5"><span className="text-sm font-medium">End date</span><span className="flex h-10 items-center rounded-ctl border border-dashed border-line px-3 text-sm text-slate">Present</span></div>
        ) : (
          <TextField label="End date" type="date" value={end} min={start || undefined} onChange={(e) => onEnd(e.target.value)} aria-invalid={Boolean(error)} />
        )}
      </div>
      {error && <p className="text-[13px] text-danger" role="alert">{error}</p>}
    </div>
  )
}

function PhotoField({ url }: { url: string | null }) {
  const input = useRef<HTMLInputElement>(null)
  const form = useForm<{ photo: File | null }>({ photo: null })
  return (
    <div className="flex items-center gap-4 sm:col-span-2">
      {url ? <img src={url} alt="Your profile photo" className="size-16 rounded-full object-cover" /> : <span className="grid size-16 place-items-center rounded-full bg-dune text-sm text-slate">Photo</span>}
      <div className="flex flex-col gap-1">
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="secondary" loading={form.processing} onClick={() => input.current?.click()}>{url ? 'Change photo' : 'Add photo'}</Button>
          {url && <Button type="button" size="sm" variant="quiet" onClick={() => router.delete('/candidate/photo', { preserveScroll: true })}>Remove</Button>}
        </div>
        <p className="text-[13px] text-slate">Optional. JPG, PNG or WebP up to 2 MB.</p>
        {form.errors.photo && <p className="text-[13px] text-danger">{form.errors.photo}</p>}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (!f) return
          router.post('/candidate/photo', { photo: f }, { forceFormData: true, preserveScroll: true, onError: (errs) => form.setError('photo', errs.photo ?? 'Upload failed') })
          e.target.value = ''
        }}
      />
    </div>
  )
}

function CvPanel({ cvs }: { cvs: CvBrief[] }) {
  const input = useRef<HTMLInputElement>(null)
  const [replaceId, setReplaceId] = useState<number | null>(null)
  const form = useForm<{ cv: File | null; label: string; replaceId: string }>({ cv: null, label: '', replaceId: '' })

  const pick = (id: number | null) => {
    setReplaceId(id)
    input.current?.click()
  }
  return (
    <Panel
      title="CVs"
      actions={cvs.length > 0 && cvs.length < 3 && <Button size="sm" onClick={() => pick(null)} loading={form.processing && !replaceId}><Upload className="size-4" /> Upload CV</Button>}
      padded={false}
    >
      {cvs.length ? (
        <ul className="divide-y divide-line">
          {cvs.map((cv) => (
            <li key={cv.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
              <FileText className="size-5 shrink-0 text-slate" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-sm font-medium">{cv.label} {cv.isPrimary && <Badge tone="brand">Main CV</Badge>}</p>
                <p className="truncate text-[13px] text-slate">{cv.originalName} — {fileSize(cv.sizeBytes)}, uploaded {date(cv.createdAt)}</p>
              </div>
              <div className="flex flex-wrap gap-1">
                <a href={cv.downloadUrl} className="inline-flex h-8 items-center gap-1.5 rounded-ctl px-3 text-[13px] text-slate hover:bg-pearl hover:text-ink"><Download className="size-4" /> Download</a>
                {!cv.isPrimary && <Button size="sm" variant="quiet" onClick={() => router.post(`/candidate/cvs/${cv.id}/primary`, {}, { preserveScroll: true })}><Star className="size-4" /> Make main</Button>}
                <Button size="sm" variant="quiet" onClick={() => pick(cv.id)} loading={form.processing && replaceId === cv.id}>Replace</Button>
                <Button size="sm" variant="quiet" onClick={() => confirm('Delete this CV? Employers you applied to with it will no longer be able to download it.') && router.delete(`/candidate/cvs/${cv.id}`, { preserveScroll: true })} aria-label={`Delete ${cv.label}`}><Trash2 className="size-4" /></Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="px-5 py-5">
          <p className="text-sm text-slate">Upload a PDF or Word (.docx) CV, up to 5 MB. You can keep up to three versions — for example, one for engineering roles and one for project management.</p>
          <Button className="mt-3" onClick={() => pick(null)} loading={form.processing}><Upload className="size-4" /> Upload your CV</Button>
        </div>
      )}
      {form.errors.cv && <p className="px-5 pb-4 text-sm text-danger" role="alert">{form.errors.cv}</p>}
      <p className="border-t border-line px-5 py-3 text-[13px] text-slate">CVs are stored privately. Employers can download one only when you apply to them, or if you allow it in privacy settings.</p>
      <input
        ref={input}
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (!f) return
          const label = replaceId ? '' : (prompt('Name this CV (e.g. "Engineering CV")', cvs.length ? `CV ${cvs.length + 1}` : 'My CV') ?? '')
          form.clearErrors()
          router.post('/candidate/cvs', { cv: f, label, replaceId: replaceId ?? '' }, {
            forceFormData: true,
            preserveScroll: true,
            onStart: () => form.setData('cv', f),
            onError: (errs) => form.setError('cv', errs.cv ?? 'Upload failed. Please try again.'),
          })
        }}
      />
    </Panel>
  )
}

function CertificationModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const form = useForm({ name: '', issuer: '', year: '' })
  return (
    <Modal open={open} onClose={onClose} title="Add a certification">
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          void (form.transform((d) => ({ name: d.name, issuer: d.issuer || undefined, year: numOrUndef(d.year) })), form).post('/candidate/certifications', { preserveScroll: true, onSuccess: () => { form.reset(); onClose() } })
        }}
      >
        <TextField label="Certification" value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} error={form.errors.name} required />
        <TextField label="Issued by" optional value={form.data.issuer} onChange={(e) => form.setData('issuer', e.target.value)} error={form.errors.issuer} />
        <TextField label="Year" optional type="number" value={form.data.year} onChange={(e) => form.setData('year', e.target.value)} error={form.errors.year} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="quiet" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={form.processing}>Add</Button>
        </div>
      </form>
    </Modal>
  )
}
