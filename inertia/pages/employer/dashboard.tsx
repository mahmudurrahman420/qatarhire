import { Head, Link } from '@inertiajs/react'
import AppLayout from '~/layouts/app_layout'
import { ButtonLink } from '~/components/ui/button'
import { PageHeader, Panel, Stat } from '~/components/ui/misc'
import { ApplicationStatusBadge, JobStatusBadge } from '~/components/status'
import { ago, date } from '~/lib/format'

type Props = {
  company: { name: string; verificationStatus: string }
  moderation: string
  jobCounts: Record<string, number>
  applicationCounts: Record<string, number>
  applicationsPerDay: { date: string; count: number }[]
  topJobs: { id: number; title: string; status: string; views: number; applicants: number }[]
  recentApplications: { id: number; status: string; createdAt: string; jobTitle: string; candidateName: string; headline: string | null }[]
}

export default function EmployerDashboard({ company, jobCounts, applicationCounts, applicationsPerDay, topJobs, recentApplications }: Props) {
  const totalApps = Object.entries(applicationCounts).filter(([k]) => k !== 'withdrawn').reduce((s, [, v]) => s + v, 0)
  const toReview = applicationCounts.submitted ?? 0
  const inProgress = (applicationCounts.shortlisted ?? 0) + (applicationCounts.interview ?? 0) + (applicationCounts.offer ?? 0)
  const max = Math.max(1, ...applicationsPerDay.map((d) => d.count))
  const last30 = applicationsPerDay.reduce((s, d) => s + d.count, 0)

  return (
    <AppLayout>
      <Head title="Employer dashboard" />
      <PageHeader title={company.name} actions={<ButtonLink href="/employer/jobs/create">Post a job</ButtonLink>} />

      {company.verificationStatus === 'pending' && (
        <div className="mb-6 rounded-panel border border-amber/20 bg-amber-50 px-5 py-4 text-sm text-amber">
          <p className="font-medium">Your company is being verified.</p>
          <p className="mt-1">You can post jobs now; each one is reviewed before it goes live. Candidate search opens once you're verified. Adding your CR number and logo on the <Link href="/employer/company" className="underline">company profile</Link> helps.</p>
        </div>
      )}
      {(company.verificationStatus === 'rejected' || company.verificationStatus === 'suspended') && (
        <div className="mb-6 rounded-panel border border-danger/20 bg-danger-50 px-5 py-4 text-sm text-danger">
          Your company is {company.verificationStatus}. Jobs can't be published. Check your notifications for the reason, or <Link href="/contact" className="underline">contact us</Link>.
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Live jobs" value={jobCounts.published ?? 0} hint={jobCounts.pending_review ? `${jobCounts.pending_review} awaiting review` : undefined} />
        <Stat label="New applicants to review" value={toReview} />
        <Stat label="Shortlisted to offer" value={inProgress} />
        <Stat label="Applicants (all time)" value={totalApps} hint={`${applicationCounts.hired ?? 0} hired`} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <Panel title="Applications in the last 30 days" actions={<span className="text-sm text-slate">{last30} total</span>}>
          <div className="flex h-36 items-end gap-[3px]" role="img" aria-label={`${last30} applications in the last 30 days`}>
            {applicationsPerDay.map((d) => (
              <div key={d.date} className="group relative flex-1">
                <div className="w-full rounded-t-[3px] bg-maroon-600/85" style={{ height: `${Math.max(d.count ? 6 : 2, (d.count / max) * 136)}px`, opacity: d.count ? 1 : 0.15 }} />
                <span className="pointer-events-none absolute bottom-full start-1/2 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded bg-ink px-1.5 py-0.5 text-[11px] text-white group-hover:block">
                  {date(d.date, { day: 'numeric', month: 'short' })}: {d.count}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-slate">
            <span>{date(applicationsPerDay[0]?.date, { day: 'numeric', month: 'short' })}</span>
            <span>Today</span>
          </div>
        </Panel>

        <Panel title="Recent applicants" padded={false}>
          {recentApplications.length ? (
            <ul className="divide-y divide-line">
              {recentApplications.map((a) => (
                <li key={a.id}>
                  <Link href={`/employer/applications/${a.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-pearl">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{a.candidateName}</span>
                      <span className="block truncate text-[13px] text-slate">{a.jobTitle} — {ago(a.createdAt)}</span>
                    </span>
                    <ApplicationStatusBadge status={a.status} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-4 text-sm text-slate">Applicants appear here as soon as they apply.</p>
          )}
        </Panel>
      </div>

      <Panel title="Active jobs" className="mt-6" padded={false} actions={<Link href="/employer/jobs" className="text-sm text-maroon-700 hover:underline">All jobs</Link>}>
        {topJobs.length ? (
          <table className="w-full text-sm">
            <thead className="text-start text-[13px] text-slate">
              <tr className="border-b border-line"><th className="px-5 py-2 text-start font-normal">Job</th><th className="px-3 py-2 text-end font-normal">Views</th><th className="px-3 py-2 text-end font-normal">Applicants</th><th className="px-5 py-2 text-end font-normal">Status</th></tr>
            </thead>
            <tbody>
              {topJobs.map((j) => (
                <tr key={j.id} className="border-b border-line last:border-b-0">
                  <td className="px-5 py-2.5"><Link href={`/employer/jobs/${j.id}/applicants`} className="font-medium hover:text-maroon-700">{j.title}</Link></td>
                  <td className="px-3 py-2.5 text-end tabular-nums">{j.views}</td>
                  <td className="px-3 py-2.5 text-end tabular-nums">{j.applicants}</td>
                  <td className="px-5 py-2.5 text-end"><JobStatusBadge status={j.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="px-5 py-5"><p className="text-sm text-slate">No live jobs yet.</p><ButtonLink href="/employer/jobs/create" size="sm" className="mt-3">Post your first job</ButtonLink></div>
        )}
      </Panel>
    </AppLayout>
  )
}
