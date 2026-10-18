import { Head, Link, router } from '@inertiajs/react'
import AppLayout from '~/layouts/app_layout'
import { Button, ButtonLink } from '~/components/ui/button'
import { EmptyState, PageHeader } from '~/components/ui/misc'
import { JobStatusBadge } from '~/components/status'
import { date, ago } from '~/lib/format'
import { cn } from '~/lib/cn'

type Job = { id: number; title: string; slug: string; status: string; isExpired: boolean; location: string | null; deadline: string | null; publishedAt: string | null; updatedAt: string; applicants: number; newApplicants: number; views: number; moderationNote: string | null }

const tabs = [['', 'Active'], ['published', 'Live'], ['pending_review', 'In review'], ['draft', 'Drafts'], ['closed', 'Closed'], ['archived', 'Archived']] as const

export default function EmployerJobs({ jobs, status }: { jobs: Job[]; status: string }) {
  return (
    <AppLayout>
      <Head title="Jobs" />
      <PageHeader title="Jobs" actions={<ButtonLink href="/employer/jobs/create">Post a job</ButtonLink>} />
      <nav className="mb-4 flex gap-1 overflow-x-auto border-b border-line" aria-label="Job status">
        {tabs.map(([v, l]) => (
          <Link key={v} href={v ? `/employer/jobs?status=${v}` : '/employer/jobs'} aria-current={status === v ? 'page' : undefined} className={cn('-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm', status === v ? 'border-maroon-600 font-medium text-maroon-700' : 'border-transparent text-slate hover:text-ink')}>
            {l}
          </Link>
        ))}
      </nav>
      {jobs.length ? (
        <div className="overflow-x-auto rounded-panel border border-line bg-white">
          <table className="w-full min-w-[720px] text-sm">
            <thead><tr className="border-b border-line text-[13px] text-slate"><th className="px-5 py-2 text-start font-normal">Job</th><th className="px-3 py-2 text-start font-normal">Status</th><th className="px-3 py-2 text-end font-normal">Applicants</th><th className="px-3 py-2 text-end font-normal">Views</th><th className="px-3 py-2 text-start font-normal">Deadline</th><th className="px-5 py-2" /></tr></thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j.id} className="border-b border-line align-top last:border-b-0">
                  <td className="px-5 py-3">
                    <Link href={`/employer/jobs/${j.id}/edit`} className="font-medium hover:text-maroon-700">{j.title}</Link>
                    <p className="text-[13px] text-slate">{j.location ?? 'No location'} — edited {ago(j.updatedAt)}</p>
                    {j.status === 'rejected' && j.moderationNote && <p className="mt-1 text-[13px] text-danger">Reviewer: {j.moderationNote}</p>}
                  </td>
                  <td className="px-3 py-3"><JobStatusBadge status={j.status} expired={j.isExpired} /></td>
                  <td className="px-3 py-3 text-end tabular-nums">
                    <Link href={`/employer/jobs/${j.id}/applicants`} className="hover:text-maroon-700">{j.applicants}</Link>
                    {j.newApplicants > 0 && <span className="ms-1.5 rounded-full bg-maroon-600 px-1.5 text-[11px] text-white">{j.newApplicants} new</span>}
                  </td>
                  <td className="px-3 py-3 text-end tabular-nums text-slate">{j.views}</td>
                  <td className="px-3 py-3 text-slate">{j.deadline ? date(j.deadline) : '—'}</td>
                  <td className="px-5 py-3 text-end">
                    <div className="flex justify-end gap-1">
                      <ButtonLink href={`/employer/jobs/${j.id}/applicants`} size="sm" variant="secondary">Applicants</ButtonLink>
                      <Button size="sm" variant="quiet" onClick={() => router.post(`/employer/jobs/${j.id}/duplicate`)}>Duplicate</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title={status ? 'No jobs with this status' : 'No jobs yet'} action={<ButtonLink href="/employer/jobs/create">Post a job</ButtonLink>}>
          Drafts are saved as you go; publish when you're ready.
        </EmptyState>
      )}
    </AppLayout>
  )
}
