import { Head, Link, router, useForm } from '@inertiajs/react'
import AppLayout from '~/layouts/app_layout'
import { Button } from '~/components/ui/button'
import { TextArea } from '~/components/ui/form'
import { PageHeader, Panel } from '~/components/ui/misc'
import { JobStatusBadge, VerificationBadge } from '~/components/status'
import { RichText } from '~/components/jobs'
import { EmploymentType, ReportReason } from '#shared/enums'
import { date, salaryText } from '~/lib/format'
import type { JobCard } from '~/lib/types'

type Props = {
  job: JobCard & { description: string; responsibilities: string | null; requirements: string | null; status: string; isExpired: boolean; moderationNote: string | null; applicationMethod: string; applicationUrl: string | null; applicationEmail: string | null }
  company: { id: number; name: string; verificationStatus: string }
  reports: { id: number; reason: string; details: string | null; status: string; createdAt: string }[]
}

export default function AdminJob({ job, company, reports }: Props) {
  const form = useForm({ decision: 'approve' as 'approve' | 'reject', note: '' })
  const takedown = useForm({ note: '' })
  return (
    <AppLayout>
      <Head title={`Review: ${job.title}`} />
      <PageHeader title={job.title} back={{ href: '/admin/jobs', label: 'Job moderation' }} actions={<JobStatusBadge status={job.status} expired={job.isExpired} />} />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Panel>
          <p className="text-sm text-slate"><Link href={`/admin/companies/${company.id}`} className="font-medium text-ink hover:text-brand-700">{company.name}</Link> — {job.location} — {EmploymentType.label(job.employmentType as never)} — {salaryText(job.salary) ?? 'Salary not shown'}</p>
          <div className="mt-2"><VerificationBadge status={company.verificationStatus} /></div>
          {job.applicationMethod !== 'platform' && <p className="mt-3 rounded-ctl bg-amber-50 px-3 py-2 text-[13px] text-amber">Applies off-platform: {job.applicationUrl ?? job.applicationEmail}. Check the destination is legitimate.</p>}
          <div className="mt-5"><RichText text={job.description} /></div>
          {job.responsibilities && <><h2 className="mt-5 text-lg">Responsibilities</h2><RichText text={job.responsibilities} /></>}
          {job.requirements && <><h2 className="mt-5 text-lg">Requirements</h2><RichText text={job.requirements} /></>}
          {job.skills.length > 0 && <p className="mt-5 text-sm text-slate">Skills: {job.skills.join(', ')}</p>}
        </Panel>
        <aside className="flex flex-col gap-6">
          {job.status === 'pending_review' && (
            <Panel title="Decision">
              <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); form.post(`/admin/jobs/${job.id}/moderate`) }}>
                <div className="flex gap-2">
                  <Button type="button" variant={form.data.decision === 'approve' ? 'primary' : 'secondary'} onClick={() => form.setData('decision', 'approve')}>Approve</Button>
                  <Button type="button" variant={form.data.decision === 'reject' ? 'danger' : 'secondary'} onClick={() => form.setData('decision', 'reject')}>Request changes</Button>
                </div>
                {form.data.decision === 'reject' && <TextArea label="What needs to change" rows={4} value={form.data.note} onChange={(e) => form.setData('note', e.target.value)} error={form.errors.note} required />}
                <Button type="submit" loading={form.processing}>{form.data.decision === 'approve' ? 'Approve and publish' : 'Send back to employer'}</Button>
              </form>
            </Panel>
          )}
          {job.status === 'published' && (
            <Panel title="Take down">
              <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); if (confirm('Take this job down?')) takedown.post(`/admin/jobs/${job.id}/takedown`) }}>
                <TextArea label="Reason (sent to employer)" rows={3} value={takedown.data.note} onChange={(e) => takedown.setData('note', e.target.value)} />
                <Button type="submit" variant="danger" loading={takedown.processing}>Take down job</Button>
              </form>
              <Button className="mt-3" size="sm" variant="secondary" onClick={() => router.post(`/admin/jobs/${job.id}/featured`, {}, { preserveScroll: true })}>{job.isFeatured ? 'Remove from featured' : 'Feature for 30 days'}</Button>
            </Panel>
          )}
          {job.moderationNote && <Panel title="Last moderation note"><p className="text-sm">{job.moderationNote}</p></Panel>}
          <Panel title={`Reports (${reports.length})`}>
            {reports.length ? <ul className="flex flex-col gap-2 text-sm">{reports.map((r) => <li key={r.id}><span className="font-medium">{ReportReason.label(r.reason as never)}</span> <span className="text-[12px] text-slate">{date(r.createdAt)}, {r.status}</span>{r.details && <p className="text-slate">{r.details}</p>}</li>)}</ul> : <p className="text-sm text-slate">No reports.</p>}
          </Panel>
          <Link href={`/jobs/${job.slug}`} className="text-sm text-brand-700 hover:underline">Open public page</Link>
        </aside>
      </div>
    </AppLayout>
  )
}
