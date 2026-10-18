import { Head, Link, router, useForm } from '@inertiajs/react'
import { useState } from 'react'
import { Building2, CalendarClock, Flag, Heart, MapPin, Users, GraduationCap, Briefcase, ExternalLink, Mail } from 'lucide-react'
import SiteLayout from '~/layouts/site_layout'
import { RichText, JobList } from '~/components/jobs'
import { Button, ButtonLink } from '~/components/ui/button'
import { Badge, CompanyLogo, Modal } from '~/components/ui/misc'
import { SelectField, TextArea, TextField } from '~/components/ui/form'
import { ApplicationStatusBadge, VerificationBadge } from '~/components/status'
import { ApplicationMethod, CompanySize, EducationLevel, EmploymentType, ReportReason, WorkArrangement } from '#shared/enums'
import { date, salaryText, ago, daysLeft } from '~/lib/format'
import { useShared } from '~/lib/page'
import type { JobCard } from '~/lib/types'
import { cn } from '~/lib/cn'

type JobDetail = JobCard & {
  description: string
  responsibilities: string | null
  requirements: string | null
  educationLevel: string | null
  vacancies: number
  industry: string | null
  applicationMethod: string
  applicationUrl: string | null
  applicationEmail: string | null
  status: string
  isExpired: boolean
  updatedAt: string
}
type Props = {
  job: JobDetail
  company: { id: number; name: string; slug: string; logoUrl: string | null; verified: boolean; description: string | null; website: string | null; size: string | null; industry: string | null; verificationStatus: string }
  related: JobCard[]
  candidateState: { applied: boolean; status: string | null; saved: boolean } | null
  isOwnerPreview: boolean
}

export default function JobShow({ job, company, related, candidateState, isOwnerPreview }: Props) {
  const { auth } = useShared()
  const [reportOpen, setReportOpen] = useState(false)
  const salary = salaryText(job.salary)
  const left = daysLeft(job.deadline)

  const facts: Array<[typeof MapPin, string, string | null]> = [
    [MapPin, 'Location', [job.location, job.workArrangement !== 'on_site' ? WorkArrangement.label(job.workArrangement as never) : null].filter(Boolean).join(', ') || 'Qatar'],
    [Briefcase, 'Job type', EmploymentType.label(job.employmentType as never)],
    [Users, 'Experience', job.minExperience === 0 ? 'Open to new graduates' : `${job.minExperience}+ years`],
    [GraduationCap, 'Education', job.educationLevel ? EducationLevel.label(job.educationLevel as never) : 'Not specified'],
    [CalendarClock, 'Apply by', job.deadline ? date(job.deadline) : 'Open until filled'],
  ]

  const applyBlock = (() => {
    if (!job.isOpen) return <p className="rounded-ctl bg-pearl px-4 py-3 text-sm text-slate">This job is no longer accepting applications.</p>
    if (candidateState?.applied)
      return (
        <div className="flex flex-col gap-2">
          <p className="text-sm">You applied for this job.</p>
          {candidateState.status && <ApplicationStatusBadge status={candidateState.status} />}
          <ButtonLink href="/candidate/applications" variant="secondary" className="mt-1">Track application</ButtonLink>
        </div>
      )
    if (job.applicationMethod === 'external_url' && job.applicationUrl)
      return (
        <>
          <a href={job.applicationUrl} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex h-12 items-center justify-center gap-2 rounded-ctl bg-maroon-600 px-6 font-medium text-white hover:bg-maroon-700">
            Apply on company site <ExternalLink className="size-4" />
          </a>
          <p className="text-xs text-slate">You'll leave QatarHire. Never pay a fee to apply.</p>
        </>
      )
    if (job.applicationMethod === 'email' && job.applicationEmail)
      return (
        <>
          <a href={`mailto:${job.applicationEmail}?subject=${encodeURIComponent(`Application: ${job.title}`)}`} className="inline-flex h-12 items-center justify-center gap-2 rounded-ctl bg-maroon-600 px-6 font-medium text-white hover:bg-maroon-700">
            <Mail className="size-4" /> Apply by email
          </a>
          <p className="break-all text-xs text-slate">{job.applicationEmail}</p>
        </>
      )
    if (!auth) return <ButtonLink href={`/login?redirect=${encodeURIComponent(`/jobs/${job.slug}/apply`)}`} size="lg">Sign in to apply</ButtonLink>
    if (auth.role !== 'candidate') return <p className="text-sm text-slate">Sign in with a job seeker account to apply.</p>
    return <ButtonLink href={`/jobs/${job.slug}/apply`} size="lg">Apply now</ButtonLink>
  })()

  return (
    <SiteLayout>
      <Head title={`${job.title} at ${company.name}`} />
      {isOwnerPreview && (
        <div className="bg-amber-50 px-4 py-2 text-center text-sm text-amber">
          Preview — this job is not public yet ({job.status.replace('_', ' ')}).{' '}
          <Link href={`/employer/jobs/${job.id}/edit`} className="font-medium underline">Back to editor</Link>
        </div>
      )}
      <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
        <nav aria-label="Breadcrumb" className="mb-5 text-sm text-slate">
          <Link href="/jobs" className="hover:text-maroon-700">Jobs</Link>
          {job.category && <> <span aria-hidden>/</span> <span>{job.category}</span></>}
        </nav>

        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <article>
            <header className="flex gap-4">
              <CompanyLogo name={company.name} url={company.logoUrl} size={64} />
              <div className="min-w-0">
                <h1 className="text-[28px] sm:text-[34px]">{job.title}</h1>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-slate">
                  <Link href={`/companies/${company.slug}`} className="font-medium text-ink hover:text-maroon-700">{company.name}</Link>
                  {company.verified && <VerificationBadge status="verified" />}
                </p>
                <p className="mt-2 text-sm text-slate">
                  Posted {ago(job.publishedAt)}
                  {job.isExpired && <Badge tone="amber" className="ms-2">Closed</Badge>}
                </p>
              </div>
            </header>

            {salary && <p className="mt-6 font-display text-2xl font-bold text-maroon-700">{salary}</p>}

            <dl className="mt-6 grid gap-x-6 gap-y-4 rounded-panel border border-line bg-white p-5 sm:grid-cols-2">
              {facts.map(([Icon, label, value]) => (
                <div key={label} className="flex gap-3">
                  <Icon className="mt-0.5 size-4 shrink-0 text-slate" aria-hidden />
                  <div>
                    <dt className="text-[13px] text-slate">{label}</dt>
                    <dd className="text-sm font-medium">{value}</dd>
                  </div>
                </div>
              ))}
              {job.vacancies > 1 && (
                <div className="flex gap-3">
                  <Users className="mt-0.5 size-4 shrink-0 text-slate" aria-hidden />
                  <div>
                    <dt className="text-[13px] text-slate">Openings</dt>
                    <dd className="text-sm font-medium">{job.vacancies} positions</dd>
                  </div>
                </div>
              )}
            </dl>

            <section className="mt-8">
              <h2 className="mb-3 text-xl">About the role</h2>
              <RichText text={job.description} />
            </section>
            {job.responsibilities && (
              <section className="mt-8">
                <h2 className="mb-3 text-xl">What you'll do</h2>
                <RichText text={job.responsibilities} />
              </section>
            )}
            {job.requirements && (
              <section className="mt-8">
                <h2 className="mb-3 text-xl">What you'll need</h2>
                <RichText text={job.requirements} />
              </section>
            )}
            {job.skills.length > 0 && (
              <section className="mt-8">
                <h2 className="mb-3 text-xl">Skills</h2>
                <ul className="flex flex-wrap gap-2">
                  {job.skills.map((s) => (
                    <li key={s}><Link href={`/jobs?q=${encodeURIComponent(s)}`} className="inline-block rounded-full bg-white px-3 py-1 text-sm ring-1 ring-line hover:ring-slate/40">{s}</Link></li>
                  ))}
                </ul>
              </section>
            )}

            <section className="mt-10 rounded-panel border border-line bg-white p-5">
              <div className="flex items-center gap-3">
                <Building2 className="size-5 text-slate" aria-hidden />
                <h2 className="font-sans text-base font-semibold tracking-normal">About {company.name}</h2>
              </div>
              {company.description ? <div className="mt-3 text-sm text-slate"><RichText text={company.description} /></div> : <p className="mt-3 text-sm text-slate">This employer hasn't added a description yet.</p>}
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate">
                {company.industry && <span>{company.industry}</span>}
                {company.size && <span>{CompanySize.label(company.size as never)}</span>}
                {company.website && <a href={company.website} target="_blank" rel="noopener noreferrer nofollow" className="text-maroon-700 hover:underline">Company website</a>}
              </div>
              {!company.verified && (
                <p className="mt-4 rounded-ctl bg-amber-50 px-3 py-2 text-[13px] text-amber">
                  This employer's verification is still in progress. Their job posts are reviewed by our team before they go live.
                </p>
              )}
            </section>
          </article>

          <aside className="lg:sticky lg:top-6 lg:self-start">
            <div className="flex flex-col gap-3 rounded-panel border border-line bg-white p-5">
              {applyBlock}
              {job.isOpen && left !== null && left <= 7 && left >= 0 && <p className="text-sm font-medium text-amber">{left === 0 ? 'Closes today' : `Closes in ${left} day${left > 1 ? 's' : ''}`}</p>}
              {auth?.role === 'candidate' && candidateState && (
                <Button type="button" variant="secondary" onClick={() => router.post(`/jobs/${job.slug}/save`, {}, { preserveScroll: true })} aria-pressed={candidateState.saved}>
                  <Heart className={cn('size-4', candidateState.saved && 'fill-maroon-600 text-maroon-600')} /> {candidateState.saved ? 'Saved' : 'Save job'}
                </Button>
              )}
              {job.applicationMethod !== 'platform' && <p className="text-xs text-slate">{ApplicationMethod.label(job.applicationMethod as never)}</p>}
            </div>
            <button type="button" onClick={() => setReportOpen(true)} className="mt-3 inline-flex items-center gap-1.5 px-1 text-sm text-slate hover:text-danger">
              <Flag className="size-4" /> Report this job
            </button>
          </aside>
        </div>

        {related.length > 0 && (
          <section className="mt-16">
            <h2 className="mb-4 text-2xl">Similar jobs</h2>
            <JobList jobs={related} />
          </section>
        )}
      </div>
      <ReportModal open={reportOpen} onClose={() => setReportOpen(false)} jobId={job.id} signedIn={Boolean(auth)} />
    </SiteLayout>
  )
}

function ReportModal({ open, onClose, jobId, signedIn }: { open: boolean; onClose: () => void; jobId: number; signedIn: boolean }) {
  const form = useForm({ subjectType: 'job', subjectId: jobId, reason: 'scam', details: '', email: '' })
  return (
    <Modal open={open} onClose={onClose} title="Report this job">
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          form.post('/reports', { preserveScroll: true, onSuccess: () => { form.reset(); onClose() } })
        }}
      >
        <SelectField label="What's wrong?" value={form.data.reason} onChange={(e) => form.setData('reason', e.target.value)} options={ReportReason.values.filter((v) => v !== 'misuse_of_data').map((v) => ({ value: v, label: ReportReason.label(v) }))} error={form.errors.reason} />
        <TextArea label="Details" optional rows={4} value={form.data.details} onChange={(e) => form.setData('details', e.target.value)} error={form.errors.details} hint="For example: the recruiter asked for a payment, or the company name doesn't match." />
        {!signedIn && <TextField label="Your email" type="email" value={form.data.email} onChange={(e) => form.setData('email', e.target.value)} error={form.errors.email} required hint="So our team can follow up." />}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="quiet" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={form.processing}>Send report</Button>
        </div>
      </form>
    </Modal>
  )
}
