import { Head, Link, router, useForm } from '@inertiajs/react'
import AppLayout from '~/layouts/app_layout'
import { Button, ButtonLink } from '~/components/ui/button'
import { Checkbox, RadioCards, SelectField, TextArea, TextField } from '~/components/ui/form'
import { PageHeader, Panel } from '~/components/ui/misc'
import { JobStatusBadge } from '~/components/status'
import { TagInput } from '~/components/tag_input'
import { EducationLevel, EmploymentType, WorkArrangement } from '#shared/enums'
import type { Taxonomy } from '~/lib/types'

type Job = {
  id: number; slug: string; status: string; title: string; categoryId: number | null; industryId: number | null; locationId: number | null
  description: string; responsibilities: string | null; requirements: string | null; skills: string[]; minExperience: number; educationLevel: string | null
  employmentType: string; workArrangement: string; salaryMin: number | null; salaryMax: number | null; salaryVisible: boolean; vacancies: number
  deadline: string | null; applicationMethod: string; applicationUrl: string | null; applicationEmail: string | null; moderationNote: string | null; isExpired: boolean
}
type Props = { job: Job | null; taxonomy: Taxonomy; moderation: { willReview: boolean; companyStatus: string }; defaultDeadline: string | null }
const s = (v: unknown) => (v === null || v === undefined ? '' : String(v))

export default function JobForm({ job, taxonomy, moderation, defaultDeadline }: Props) {
  const form = useForm({
    title: s(job?.title), categoryId: s(job?.categoryId), industryId: s(job?.industryId), locationId: s(job?.locationId),
    description: s(job?.description), responsibilities: s(job?.responsibilities), requirements: s(job?.requirements), skills: job?.skills ?? [],
    minExperience: s(job?.minExperience ?? 0), educationLevel: s(job?.educationLevel), employmentType: job?.employmentType ?? 'full_time', workArrangement: job?.workArrangement ?? 'on_site',
    salaryMin: s(job?.salaryMin), salaryMax: s(job?.salaryMax), salaryVisible: job?.salaryVisible ?? true, vacancies: s(job?.vacancies ?? 1),
    deadline: job ? s(job.deadline) : s(defaultDeadline), applicationMethod: job?.applicationMethod ?? 'platform', applicationUrl: s(job?.applicationUrl), applicationEmail: s(job?.applicationEmail),
    intent: 'draft' as 'draft' | 'publish',
  })

  const submit = (intent: 'draft' | 'publish') => {
    form.transform((d) => ({
      ...d,
      intent,
      categoryId: d.categoryId ? Number(d.categoryId) : undefined,
      industryId: d.industryId ? Number(d.industryId) : undefined,
      locationId: d.locationId ? Number(d.locationId) : undefined,
      minExperience: Number(d.minExperience || 0),
      vacancies: Number(d.vacancies || 1),
      salaryMin: d.salaryMin ? Number(d.salaryMin) : undefined,
      salaryMax: d.salaryMax ? Number(d.salaryMax) : undefined,
      educationLevel: d.educationLevel || undefined,
      responsibilities: d.responsibilities || undefined,
      requirements: d.requirements || undefined,
      deadline: d.deadline || undefined,
      applicationUrl: d.applicationMethod === 'external_url' ? d.applicationUrl || undefined : undefined,
      applicationEmail: d.applicationMethod === 'email' ? d.applicationEmail || undefined : undefined,
    }))
    if (job) form.put(`/employer/jobs/${job.id}`, { preserveScroll: true })
    else form.post('/employer/jobs', { preserveScroll: true })
  }

  const setStatus = (status: string, confirmText?: string) => {
    if (!job || (confirmText && !confirm(confirmText))) return
    router.post(`/employer/jobs/${job.id}/status`, { status }, { preserveScroll: true })
  }

  const canPublish = !job || ['draft', 'rejected', 'closed'].includes(job.status)
  const blocked = moderation.companyStatus === 'rejected' || moderation.companyStatus === 'suspended'
  const locationOptions = taxonomy.locations.flatMap((m) => [{ value: m.id, label: `${m.name} (municipality)`, group: m.name }, ...m.areas.map((a) => ({ value: a.id, label: a.name, group: m.name }))])

  return (
    <AppLayout>
      <Head title={job ? `Edit: ${job.title}` : 'Post a job'} />
      <PageHeader
        title={job ? job.title || 'Edit job' : 'Post a job'}
        back={{ href: '/employer/jobs', label: 'All jobs' }}
        actions={job && (
          <>
            <JobStatusBadge status={job.status} expired={job.isExpired} />
            <ButtonLink href={`/employer/jobs/${job.id}/preview`} variant="secondary" size="sm">Preview</ButtonLink>
            <ButtonLink href={`/employer/jobs/${job.id}/applicants`} variant="secondary" size="sm">Applicants</ButtonLink>
          </>
        )}
      />

      {job?.status === 'rejected' && job.moderationNote && (
        <div className="mb-6 rounded-panel border border-danger/20 bg-danger-50 px-5 py-4 text-sm text-danger"><p className="font-medium">Our reviewers asked for changes</p><p className="mt-1">{job.moderationNote}</p></div>
      )}
      {job?.status === 'pending_review' && <div className="mb-6 rounded-panel border border-amber/20 bg-amber-50 px-5 py-4 text-sm text-amber">This job is waiting for review. We'll notify you when it's approved.</div>}

      <form className="grid gap-6 lg:grid-cols-[1fr_300px]" onSubmit={(e) => { e.preventDefault(); submit('draft') }}>
        <div className="flex min-w-0 flex-col gap-6">
          <Panel title="The role">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField wrapperClass="sm:col-span-2" label="Job title" value={form.data.title} onChange={(e) => form.setData('title', e.target.value)} error={form.errors.title} required placeholder="e.g. Senior Quantity Surveyor" />
              <SelectField label="Category" placeholder="Choose" value={form.data.categoryId} onChange={(e) => form.setData('categoryId', e.target.value)} options={taxonomy.categories.map((c) => ({ value: c.id, label: c.name }))} error={form.errors.categoryId} required />
              <SelectField label="Industry" optional placeholder="Same as company" value={form.data.industryId} onChange={(e) => form.setData('industryId', e.target.value)} options={taxonomy.industries.map((c) => ({ value: c.id, label: c.name }))} error={form.errors.industryId} />
              <SelectField label="Location in Qatar" placeholder="Choose" value={form.data.locationId} onChange={(e) => form.setData('locationId', e.target.value)} options={locationOptions} error={form.errors.locationId} required />
              <SelectField label="Work arrangement" value={form.data.workArrangement} onChange={(e) => form.setData('workArrangement', e.target.value)} options={WorkArrangement.values.map((v) => ({ value: v, label: WorkArrangement.label(v) }))} />
              <SelectField label="Employment type" value={form.data.employmentType} onChange={(e) => form.setData('employmentType', e.target.value)} options={EmploymentType.values.map((v) => ({ value: v, label: EmploymentType.label(v) }))} />
              <TextField label="Number of openings" type="number" min={1} max={500} value={form.data.vacancies} onChange={(e) => form.setData('vacancies', e.target.value)} error={form.errors.vacancies} />
            </div>
          </Panel>

          <Panel title="Description">
            <div className="flex flex-col gap-4">
              <TextArea label="About the job" rows={7} value={form.data.description} onChange={(e) => form.setData('description', e.target.value)} error={form.errors.description} required hint="At least 50 characters. Blank lines make paragraphs; lines starting with - become bullet points." />
              <TextArea label="Responsibilities" optional rows={6} value={form.data.responsibilities} onChange={(e) => form.setData('responsibilities', e.target.value)} error={form.errors.responsibilities} />
              <TextArea label="Requirements and qualifications" optional rows={6} value={form.data.requirements} onChange={(e) => form.setData('requirements', e.target.value)} error={form.errors.requirements} />
              <TagInput label="Required skills" value={form.data.skills} onChange={(v) => form.setData('skills', v)} suggestions={taxonomy.skills.map((x) => x.name)} placeholder="Type a skill and press Enter" max={20} error={form.errors.skills} hint="Candidates search and get matched on these." />
            </div>
          </Panel>

          <Panel title="Requirements and pay">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Minimum years of experience" type="number" min={0} max={40} value={form.data.minExperience} onChange={(e) => form.setData('minExperience', e.target.value)} error={form.errors.minExperience} />
              <SelectField label="Minimum education" placeholder="Not specified" value={form.data.educationLevel} onChange={(e) => form.setData('educationLevel', e.target.value)} options={EducationLevel.values.map((v) => ({ value: v, label: EducationLevel.label(v) }))} />
              <TextField label="Monthly salary from (QAR)" optional type="number" min={0} step={100} value={form.data.salaryMin} onChange={(e) => form.setData('salaryMin', e.target.value)} error={form.errors.salaryMin} />
              <TextField label="Monthly salary to (QAR)" optional type="number" min={0} step={100} value={form.data.salaryMax} onChange={(e) => form.setData('salaryMax', e.target.value)} error={form.errors.salaryMax} />
              <Checkbox className="sm:col-span-2" label="Show salary on the job listing" description="Jobs with a visible salary get noticeably more applicants. If hidden, it's still used to match salary filters but never displayed." checked={form.data.salaryVisible} onChange={(e) => form.setData('salaryVisible', e.target.checked)} />
            </div>
          </Panel>

          <Panel title="How to apply">
            <div className="flex flex-col gap-4">
              <RadioCards
                name="method"
                value={form.data.applicationMethod}
                onChange={(v) => form.setData('applicationMethod', v)}
                options={[
                  { value: 'platform', label: 'On QatarHire', description: 'Candidates apply with their profile and CV; you manage them in your pipeline.' },
                  { value: 'external_url', label: 'On our website', description: 'Candidates are sent to your careers page.' },
                  { value: 'email', label: 'By email', description: 'Candidates email their CV to an address you choose.' },
                ]}
              />
              {form.data.applicationMethod === 'external_url' && <TextField label="Application URL" type="url" placeholder="https://" value={form.data.applicationUrl} onChange={(e) => form.setData('applicationUrl', e.target.value)} error={form.errors.applicationUrl} required />}
              {form.data.applicationMethod === 'email' && <TextField label="Application email" type="email" value={form.data.applicationEmail} onChange={(e) => form.setData('applicationEmail', e.target.value)} error={form.errors.applicationEmail} required />}
              <TextField label="Application deadline" optional type="date" value={form.data.deadline} onChange={(e) => form.setData('deadline', e.target.value)} error={form.errors.deadline} hint="Up to 180 days ahead. The job closes automatically after this date." />
            </div>
          </Panel>
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <Panel title="Publish">
            <div className="flex flex-col gap-3">
              {blocked ? (
                <p className="text-sm text-danger">Your company is {moderation.companyStatus}; jobs can't be published.</p>
              ) : moderation.willReview ? (
                <p className="text-sm text-slate">When you publish, our team reviews the job before it goes live — usually within one working day.</p>
              ) : (
                <p className="text-sm text-slate">Publishing makes the job live immediately.</p>
              )}
              {canPublish && !blocked && (
                <Button type="button" loading={form.processing} onClick={() => submit('publish')}>{moderation.willReview ? 'Submit for review' : 'Publish job'}</Button>
              )}
              <Button type="submit" variant="secondary" loading={form.processing}>{job ? 'Save changes' : 'Save draft'}</Button>
              {Object.keys(form.errors).length > 0 && <p className="text-[13px] text-danger" role="alert">Please fix the highlighted fields.</p>}
              {job && (
                <div className="mt-2 flex flex-col gap-1 border-t border-line pt-3">
                  {job.status === 'published' && <Button type="button" size="sm" variant="quiet" onClick={() => setStatus('paused')}>Pause (hide temporarily)</Button>}
                  {job.status === 'paused' && <Button type="button" size="sm" variant="quiet" onClick={() => setStatus('published')}>Resume</Button>}
                  {['published', 'paused'].includes(job.status) && <Button type="button" size="sm" variant="quiet" onClick={() => setStatus('closed', 'Close this job to new applications?')}>Close to applications</Button>}
                  {job.status === 'pending_review' && <Button type="button" size="sm" variant="quiet" onClick={() => setStatus('draft')}>Withdraw from review</Button>}
                  {['draft', 'rejected', 'closed'].includes(job.status) && <Button type="button" size="sm" variant="quiet" onClick={() => setStatus('archived', 'Archive this job? It will be hidden from your list.')}>Archive</Button>}
                  {job.status === 'published' && <Link href={`/jobs/${job.slug}`} className="px-3 py-1.5 text-center text-[13px] text-maroon-700 hover:underline">View public page</Link>}
                </div>
              )}
            </div>
          </Panel>
        </aside>
      </form>
    </AppLayout>
  )
}
