import { Head, router, useForm } from '@inertiajs/react'
import { useRef, useState } from 'react'
import { Download, FileText, Pencil, Plus, Star, Trash2, Upload } from 'lucide-react'
import AppLayout from '~/layouts/app_layout'
import { Button } from '~/components/ui/button'
import { Checkbox, SelectField, TextArea, TextField } from '~/components/ui/form'
import { Badge, Modal, PageHeader, Panel } from '~/components/ui/misc'
import { TagInput } from '~/components/tag_input'
import { Availability, EducationLevel, LanguageProficiency, WorkAuthorization } from '#shared/enums'
import { date, fileSize } from '~/lib/format'
import type { CvBrief, Taxonomy } from '~/lib/types'

type Experience = { id: number; jobTitle: string; companyName: string; location: string | null; startDate: string; endDate: string | null; isCurrent: boolean; description: string | null }
type Education = { id: number; institution: string; qualification: string; fieldOfStudy: string | null; startYear: number | null; endYear: number | null }
type Certification = { id: number; name: string; issuer: string | null; year: number | null }
type Profile = {
  fullName: string; headline: string | null; currentJobTitle: string | null; summary: string | null
  phone: string | null; contactEmail: string | null; photoUrl: string | null
  currentLocationId: number | null; currentLocationText: string | null; preferredLocationId: number | null
  industryId: number | null; yearsExperience: number | null; educationLevel: string | null; expectedSalary: number | null
  availability: string | null; noticePeriodDays: number | null; linkedinUrl: string | null; portfolioUrl: string | null
  workAuthorization: string | null; openToRelocation: boolean
  experiences: Experience[]; educations: Education[]; certifications: Certification[]
  skills: string[]; languages: { languageId: number; name: string; proficiency: string }[]; cvs: CvBrief[]
}
type Props = { profile: Profile; completeness: { score: number; missing: string[] }; taxonomy: Taxonomy }

const s = (v: unknown) => (v === null || v === undefined ? '' : String(v))
const orUndef = (v: string) => (v === '' ? undefined : v)
const numOrUndef = (v: string) => (v === '' ? undefined : Number(v))

export default function ProfilePage({ profile, completeness, taxonomy }: Props) {
  const locationOptions = taxonomy.locations.flatMap((m) => [
    { value: m.id, label: `${m.name} (all)`, group: m.name },
    ...m.areas.map((a) => ({ value: a.id, label: a.name, group: m.name })),
  ])

  const basics = useForm({
    fullName: profile.fullName, headline: s(profile.headline), currentJobTitle: s(profile.currentJobTitle), summary: s(profile.summary),
    phone: s(profile.phone), contactEmail: s(profile.contactEmail), currentLocationId: s(profile.currentLocationId), currentLocationText: s(profile.currentLocationText),
    preferredLocationId: s(profile.preferredLocationId), industryId: s(profile.industryId), yearsExperience: s(profile.yearsExperience),
    educationLevel: s(profile.educationLevel), expectedSalary: s(profile.expectedSalary), availability: s(profile.availability),
    noticePeriodDays: s(profile.noticePeriodDays), linkedinUrl: s(profile.linkedinUrl), portfolioUrl: s(profile.portfolioUrl),
    workAuthorization: s(profile.workAuthorization), openToRelocation: profile.openToRelocation,
  })
  const saveBasics = () =>
    (basics.transform((d) => ({
        ...d,
        headline: orUndef(d.headline), currentJobTitle: orUndef(d.currentJobTitle), summary: orUndef(d.summary), phone: orUndef(d.phone),
        contactEmail: orUndef(d.contactEmail), currentLocationText: orUndef(d.currentLocationText), linkedinUrl: orUndef(d.linkedinUrl), portfolioUrl: orUndef(d.portfolioUrl),
        currentLocationId: numOrUndef(d.currentLocationId), preferredLocationId: numOrUndef(d.preferredLocationId), industryId: numOrUndef(d.industryId),
        yearsExperience: numOrUndef(d.yearsExperience), expectedSalary: numOrUndef(d.expectedSalary), noticePeriodDays: numOrUndef(d.noticePeriodDays),
        educationLevel: orUndef(d.educationLevel), availability: orUndef(d.availability), workAuthorization: orUndef(d.workAuthorization),
      })), basics).put('/candidate/profile', { preserveScroll: true })

  const skills = useForm({ skills: profile.skills })
  const langs = useForm({ languages: profile.languages.map(({ languageId, proficiency }) => ({ languageId, proficiency })) })

  const [expModal, setExpModal] = useState<Experience | 'new' | null>(null)
  const [eduModal, setEduModal] = useState<Education | 'new' | null>(null)
  const [certModal, setCertModal] = useState(false)

  const remove = (url: string, what: string) => {
    if (confirm(`Remove this ${what}?`)) router.delete(url, { preserveScroll: true })
  }

  return (
    <AppLayout>
      <Head title="Profile & CV" />
      <PageHeader title="Profile & CV" description="Employers see this profile when you apply, and in search if you make it discoverable." />

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="flex min-w-0 flex-col gap-6">
          <CvPanel cvs={profile.cvs} />

          <Panel title="About you">
            <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); saveBasics() }}>
              <PhotoField url={profile.photoUrl} />
              <TextField wrapperClass="sm:col-span-2" label="Full name" value={basics.data.fullName} onChange={(e) => basics.setData('fullName', e.target.value)} error={basics.errors.fullName} required />
              <TextField wrapperClass="sm:col-span-2" label="Professional headline" placeholder="e.g. Site engineer with 8 years in MEP projects" value={basics.data.headline} onChange={(e) => basics.setData('headline', e.target.value)} error={basics.errors.headline} hint="The first line employers read." />
              <TextField label="Current or most recent job title" value={basics.data.currentJobTitle} onChange={(e) => basics.setData('currentJobTitle', e.target.value)} error={basics.errors.currentJobTitle} />
              <SelectField label="Industry" placeholder="Choose" value={basics.data.industryId} onChange={(e) => basics.setData('industryId', e.target.value)} options={taxonomy.industries.map((i) => ({ value: i.id, label: i.name }))} error={basics.errors.industryId} />
              <TextArea wrapperClass="sm:col-span-2" label="Summary" rows={5} value={basics.data.summary} onChange={(e) => basics.setData('summary', e.target.value)} error={basics.errors.summary} hint="A few sentences on what you do, what you're good at and what you're looking for." />
              <TextField label="Years of experience" type="number" min={0} max={60} value={basics.data.yearsExperience} onChange={(e) => basics.setData('yearsExperience', e.target.value)} error={basics.errors.yearsExperience} />
              <SelectField label="Highest education" placeholder="Choose" value={basics.data.educationLevel} onChange={(e) => basics.setData('educationLevel', e.target.value)} options={EducationLevel.values.map((v) => ({ value: v, label: EducationLevel.label(v) }))} error={basics.errors.educationLevel} />
              <SelectField label="Current location in Qatar" placeholder="Outside Qatar / not listed" value={basics.data.currentLocationId} onChange={(e) => basics.setData('currentLocationId', e.target.value)} options={locationOptions} error={basics.errors.currentLocationId} />
              <TextField label="Current location (if outside Qatar)" optional placeholder="e.g. Kochi, India" value={basics.data.currentLocationText} onChange={(e) => basics.setData('currentLocationText', e.target.value)} error={basics.errors.currentLocationText} />
              <SelectField label="Preferred work location" placeholder="Anywhere in Qatar" value={basics.data.preferredLocationId} onChange={(e) => basics.setData('preferredLocationId', e.target.value)} options={taxonomy.locations.map((m) => ({ value: m.id, label: m.name }))} error={basics.errors.preferredLocationId} />
              <TextField label="Expected monthly salary (QAR)" optional type="number" min={0} step={100} value={basics.data.expectedSalary} onChange={(e) => basics.setData('expectedSalary', e.target.value)} error={basics.errors.expectedSalary} />
              <SelectField label="Availability" placeholder="Choose" value={basics.data.availability} onChange={(e) => basics.setData('availability', e.target.value)} options={Availability.values.map((v) => ({ value: v, label: Availability.label(v) }))} error={basics.errors.availability} />
              <TextField label="Notice period (days)" optional type="number" min={0} max={365} value={basics.data.noticePeriodDays} onChange={(e) => basics.setData('noticePeriodDays', e.target.value)} error={basics.errors.noticePeriodDays} />
              <SelectField
                label="Work authorisation in Qatar"
                optional
                placeholder="Prefer not to say"
                value={basics.data.workAuthorization}
                onChange={(e) => basics.setData('workAuthorization', e.target.value)}
                options={WorkAuthorization.values.filter((v) => v !== 'prefer_not_to_say').map((v) => ({ value: v, label: WorkAuthorization.label(v) }))}
                hint="Optional. Helps employers who can't sponsor visas."
              />
              <div className="flex items-end pb-2"><Checkbox label="Open to relocating within Qatar" checked={basics.data.openToRelocation} onChange={(e) => basics.setData('openToRelocation', e.target.checked)} /></div>
              <TextField label="Phone" optional type="tel" placeholder="+974" value={basics.data.phone} onChange={(e) => basics.setData('phone', e.target.value)} error={basics.errors.phone} hint="Private. Shared only per your privacy settings." />
              <TextField label="Contact email" optional type="email" value={basics.data.contactEmail} onChange={(e) => basics.setData('contactEmail', e.target.value)} error={basics.errors.contactEmail} hint="Private. Defaults to your sign-in email." />
              <TextField label="LinkedIn URL" optional type="url" placeholder="https://linkedin.com/in/…" value={basics.data.linkedinUrl} onChange={(e) => basics.setData('linkedinUrl', e.target.value)} error={basics.errors.linkedinUrl} />
              <TextField label="Portfolio URL" optional type="url" placeholder="https://" value={basics.data.portfolioUrl} onChange={(e) => basics.setData('portfolioUrl', e.target.value)} error={basics.errors.portfolioUrl} />
              <div className="sm:col-span-2"><Button type="submit" loading={basics.processing}>Save profile</Button></div>
            </form>
          </Panel>

          <Panel title="Employment history" actions={<Button size="sm" variant="secondary" onClick={() => setExpModal('new')}><Plus className="size-4" /> Add role</Button>} padded={false}>
            {profile.experiences.length ? (
              <ol className="divide-y divide-line">
                {profile.experiences.map((x) => (
                  <li key={x.id} className="flex gap-4 px-5 py-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{x.jobTitle}</p>
                      <p className="text-sm text-slate">{x.companyName}{x.location ? `, ${x.location}` : ''}</p>
                      <p className="text-[13px] text-slate">{date(x.startDate, { month: 'short', year: 'numeric' })} – {x.isCurrent ? 'Present' : date(x.endDate, { month: 'short', year: 'numeric' })}</p>
                      {x.description && <p className="mt-2 line-clamp-3 whitespace-pre-line text-sm">{x.description}</p>}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button size="sm" variant="quiet" onClick={() => setExpModal(x)} aria-label={`Edit ${x.jobTitle}`}><Pencil className="size-4" /></Button>
                      <Button size="sm" variant="quiet" onClick={() => remove(`/candidate/experiences/${x.id}`, 'role')} aria-label={`Remove ${x.jobTitle}`}><Trash2 className="size-4" /></Button>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="px-5 py-4 text-sm text-slate">Add your recent roles, most recent first. Employers search job titles here.</p>
            )}
          </Panel>

          <Panel title="Education" actions={<Button size="sm" variant="secondary" onClick={() => setEduModal('new')}><Plus className="size-4" /> Add education</Button>} padded={false}>
            {profile.educations.length ? (
              <ul className="divide-y divide-line">
                {profile.educations.map((x) => (
                  <li key={x.id} className="flex gap-4 px-5 py-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{x.qualification}{x.fieldOfStudy ? `, ${x.fieldOfStudy}` : ''}</p>
                      <p className="text-sm text-slate">{x.institution}{x.endYear ? ` — ${x.startYear ? `${x.startYear}–` : ''}${x.endYear}` : ''}</p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button size="sm" variant="quiet" onClick={() => setEduModal(x)} aria-label="Edit"><Pencil className="size-4" /></Button>
                      <Button size="sm" variant="quiet" onClick={() => remove(`/candidate/educations/${x.id}`, 'education')} aria-label="Remove"><Trash2 className="size-4" /></Button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-4 text-sm text-slate">Add degrees, diplomas or school qualifications.</p>
            )}
          </Panel>

          <Panel title="Skills">
            <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); skills.put('/candidate/skills', { preserveScroll: true }) }}>
              <TagInput label="Your skills" value={skills.data.skills} onChange={(v) => skills.setData('skills', v)} suggestions={taxonomy.skills.map((x) => x.name)} placeholder="Type a skill and press Enter" hint="Recruiters filter by these. Add tools, certifications and specialisms." error={skills.errors.skills} max={40} />
              <div><Button type="submit" size="sm" loading={skills.processing} disabled={!skills.isDirty}>Save skills</Button></div>
            </form>
          </Panel>

          <Panel title="Languages">
            <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); langs.put('/candidate/languages', { preserveScroll: true }) }}>
              {langs.data.languages.map((l, i) => (
                <div key={i} className="flex flex-wrap items-end gap-2">
                  <SelectField wrapperClass="min-w-40 flex-1" label={`Language ${i + 1}`} value={l.languageId} onChange={(e) => langs.setData('languages', langs.data.languages.map((x, j) => (j === i ? { ...x, languageId: Number(e.target.value) } : x)))} options={taxonomy.languages.map((x) => ({ value: x.id, label: x.name }))} />
                  <SelectField wrapperClass="min-w-40 flex-1" label="Level" value={l.proficiency} onChange={(e) => langs.setData('languages', langs.data.languages.map((x, j) => (j === i ? { ...x, proficiency: e.target.value } : x)))} options={LanguageProficiency.values.map((v) => ({ value: v, label: LanguageProficiency.label(v) }))} />
                  <Button type="button" variant="quiet" onClick={() => langs.setData('languages', langs.data.languages.filter((_, j) => j !== i))} aria-label="Remove language"><Trash2 className="size-4" /></Button>
                </div>
              ))}
              {langs.errors.languages && <p className="text-[13px] text-danger">{langs.errors.languages}</p>}
              <div className="flex gap-2">
                <Button type="button" variant="secondary" size="sm" disabled={langs.data.languages.length >= 10} onClick={() => langs.setData('languages', [...langs.data.languages, { languageId: taxonomy.languages.find((x) => !langs.data.languages.some((y) => y.languageId === x.id))?.id ?? taxonomy.languages[0].id, proficiency: 'professional' }])}>
                  <Plus className="size-4" /> Add language
                </Button>
                <Button type="submit" size="sm" loading={langs.processing} disabled={!langs.isDirty}>Save languages</Button>
              </div>
            </form>
          </Panel>

          <Panel title="Certifications" actions={<Button size="sm" variant="secondary" onClick={() => setCertModal(true)}><Plus className="size-4" /> Add</Button>} padded={false}>
            {profile.certifications.length ? (
              <ul className="divide-y divide-line">
                {profile.certifications.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <span className="text-sm"><span className="font-medium">{c.name}</span>{c.issuer ? ` — ${c.issuer}` : ''}{c.year ? ` (${c.year})` : ''}</span>
                    <Button size="sm" variant="quiet" onClick={() => remove(`/candidate/certifications/${c.id}`, 'certification')} aria-label="Remove"><Trash2 className="size-4" /></Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-4 text-sm text-slate">e.g. NEBOSH IGC, PMP, CPA, Qatar driving licence.</p>
            )}
          </Panel>
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <Panel title="Profile strength">
            <p className="font-display text-3xl font-bold">{completeness.score}%</p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-pearl"><div className="h-full rounded-full bg-maroon-600" style={{ width: `${completeness.score}%` }} /></div>
            {completeness.missing.length ? (
              <ul className="mt-4 flex flex-col gap-1.5 text-sm text-slate">{completeness.missing.map((m) => <li key={m}>{m}</li>)}</ul>
            ) : (
              <p className="mt-4 text-sm text-gulf">Your profile is complete.</p>
            )}
          </Panel>
        </aside>
      </div>

      <ExperienceModal value={expModal} onClose={() => setExpModal(null)} />
      <EducationModal value={eduModal} onClose={() => setEduModal(null)} />
      <CertificationModal open={certModal} onClose={() => setCertModal(false)} />
    </AppLayout>
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
                <p className="flex items-center gap-2 text-sm font-medium">{cv.label} {cv.isPrimary && <Badge tone="maroon">Main CV</Badge>}</p>
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

function ExperienceModal({ value, onClose }: { value: Experience | 'new' | null; onClose: () => void }) {
  const editing = value && value !== 'new' ? value : null
  const form = useForm({ jobTitle: '', companyName: '', location: '', startDate: '', endDate: '', isCurrent: false, description: '' })
  const [loadedFor, setLoadedFor] = useState<unknown>(undefined)
  if (value !== loadedFor) {
    setLoadedFor(value)
    form.setData({
      jobTitle: editing?.jobTitle ?? '', companyName: editing?.companyName ?? '', location: editing?.location ?? '',
      startDate: editing?.startDate?.slice(0, 7) ?? '', endDate: editing?.endDate?.slice(0, 7) ?? '', isCurrent: editing?.isCurrent ?? false, description: editing?.description ?? '',
    })
    form.clearErrors()
  }
  const submit = () => {
    form.transform((d) => ({ ...d, location: d.location || undefined, endDate: d.isCurrent || !d.endDate ? undefined : d.endDate, description: d.description || undefined }))
    const opts = { preserveScroll: true, onSuccess: onClose }
    if (editing) form.put(`/candidate/experiences/${editing.id}`, opts)
    else form.post('/candidate/experiences', opts)
  }
  return (
    <Modal open={value !== null} onClose={onClose} title={editing ? 'Edit role' : 'Add a role'} wide>
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); submit() }}>
        <TextField label="Job title" value={form.data.jobTitle} onChange={(e) => form.setData('jobTitle', e.target.value)} error={form.errors.jobTitle} required />
        <TextField label="Company" value={form.data.companyName} onChange={(e) => form.setData('companyName', e.target.value)} error={form.errors.companyName} required />
        <TextField wrapperClass="sm:col-span-2" label="Location" optional value={form.data.location} onChange={(e) => form.setData('location', e.target.value)} error={form.errors.location} />
        <TextField label="Start" type="month" value={form.data.startDate} onChange={(e) => form.setData('startDate', e.target.value)} error={form.errors.startDate} required />
        <TextField label="End" type="month" value={form.data.endDate} onChange={(e) => form.setData('endDate', e.target.value)} error={form.errors.endDate} disabled={form.data.isCurrent} />
        <Checkbox className="sm:col-span-2" label="I currently work here" checked={form.data.isCurrent} onChange={(e) => form.setData('isCurrent', e.target.checked)} />
        <TextArea wrapperClass="sm:col-span-2" label="What you did" optional rows={4} value={form.data.description} onChange={(e) => form.setData('description', e.target.value)} error={form.errors.description} hint="Key responsibilities and results. Start lines with - for a list." />
        <div className="flex justify-end gap-2 sm:col-span-2">
          <Button type="button" variant="quiet" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={form.processing}>{editing ? 'Save role' : 'Add role'}</Button>
        </div>
      </form>
    </Modal>
  )
}

function EducationModal({ value, onClose }: { value: Education | 'new' | null; onClose: () => void }) {
  const editing = value && value !== 'new' ? value : null
  const form = useForm({ institution: '', qualification: '', fieldOfStudy: '', startYear: '', endYear: '' })
  const [loadedFor, setLoadedFor] = useState<unknown>(undefined)
  if (value !== loadedFor) {
    setLoadedFor(value)
    form.setData({ institution: editing?.institution ?? '', qualification: editing?.qualification ?? '', fieldOfStudy: editing?.fieldOfStudy ?? '', startYear: s(editing?.startYear), endYear: s(editing?.endYear) })
    form.clearErrors()
  }
  const submit = () => {
    form.transform((d) => ({ ...d, fieldOfStudy: d.fieldOfStudy || undefined, startYear: numOrUndef(d.startYear), endYear: numOrUndef(d.endYear) }))
    const opts = { preserveScroll: true, onSuccess: onClose }
    if (editing) form.put(`/candidate/educations/${editing.id}`, opts)
    else form.post('/candidate/educations', opts)
  }
  return (
    <Modal open={value !== null} onClose={onClose} title={editing ? 'Edit education' : 'Add education'}>
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); submit() }}>
        <TextField wrapperClass="sm:col-span-2" label="Qualification" placeholder="e.g. BSc, Diploma, Grade 12" value={form.data.qualification} onChange={(e) => form.setData('qualification', e.target.value)} error={form.errors.qualification} required />
        <TextField wrapperClass="sm:col-span-2" label="Institution" value={form.data.institution} onChange={(e) => form.setData('institution', e.target.value)} error={form.errors.institution} required />
        <TextField wrapperClass="sm:col-span-2" label="Field of study" optional value={form.data.fieldOfStudy} onChange={(e) => form.setData('fieldOfStudy', e.target.value)} error={form.errors.fieldOfStudy} />
        <TextField label="Start year" optional type="number" value={form.data.startYear} onChange={(e) => form.setData('startYear', e.target.value)} error={form.errors.startYear} />
        <TextField label="End year (or expected)" optional type="number" value={form.data.endYear} onChange={(e) => form.setData('endYear', e.target.value)} error={form.errors.endYear} />
        <div className="flex justify-end gap-2 sm:col-span-2">
          <Button type="button" variant="quiet" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={form.processing}>Save</Button>
        </div>
      </form>
    </Modal>
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
