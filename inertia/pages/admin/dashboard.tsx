import { Head, Link } from '@inertiajs/react'
import AppLayout from '~/layouts/app_layout'
import { PageHeader, Panel, Stat } from '~/components/ui/misc'
import { ApplicationStatus, JobStatus, VerificationStatus } from '#shared/enums'

type Props = {
  users: Record<string, number>; companies: Record<string, number>; jobs: Record<string, number>; applications: Record<string, number>
  week: { newUsers: number; newApplications: number }; openReports: number; failedQueueJobs: number
}

function Breakdown({ title, data, label, href }: { title: string; data: Record<string, number>; label: (k: string) => string; href?: (k: string) => string }) {
  const entries = Object.entries(data)
  return (
    <Panel title={title} padded={false}>
      {entries.length ? (
        <ul className="divide-y divide-line text-sm">
          {entries.map(([k, v]) => (
            <li key={k} className="flex justify-between px-5 py-2">
              {href ? <Link href={href(k)} className="hover:text-maroon-700">{label(k)}</Link> : <span>{label(k)}</span>}
              <span className="tabular-nums">{v}</span>
            </li>
          ))}
        </ul>
      ) : <p className="px-5 py-3 text-sm text-slate">None yet.</p>}
    </Panel>
  )
}

export default function AdminDashboard({ users, companies, jobs, applications, week, openReports, failedQueueJobs }: Props) {
  return (
    <AppLayout>
      <Head title="Admin" />
      <PageHeader title="Platform overview" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/admin/companies?status=pending"><Stat label="Companies awaiting verification" value={companies.pending ?? 0} /></Link>
        <Link href="/admin/jobs?status=pending_review"><Stat label="Jobs awaiting review" value={jobs.pending_review ?? 0} /></Link>
        <Link href="/admin/reports"><Stat label="Open reports" value={openReports} /></Link>
        <Stat label="This week" value={week.newUsers} hint={`new users, ${week.newApplications} applications`} />
      </div>
      {failedQueueJobs > 0 && (
        <p className="mt-4 rounded-panel border border-danger/20 bg-danger-50 px-5 py-3 text-sm text-danger">
          {failedQueueJobs} background job{failedQueueJobs > 1 ? 's have' : ' has'} failed (usually email delivery). <Link href="/admin/settings" className="underline">Review in settings</Link>.
        </p>
      )}
      <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Breakdown title="Users" data={users} label={(k) => k[0].toUpperCase() + k.slice(1) + 's'} href={(k) => `/admin/users?role=${k}`} />
        <Breakdown title="Companies" data={companies} label={(k) => VerificationStatus.label(k as never)} href={(k) => `/admin/companies?status=${k}`} />
        <Breakdown title="Jobs" data={jobs} label={(k) => JobStatus.label(k as never)} href={(k) => `/admin/jobs?status=${k}`} />
        <Breakdown title="Applications" data={applications} label={(k) => ApplicationStatus.label(k as never)} />
      </div>
    </AppLayout>
  )
}
