import { Head, Link } from '@inertiajs/react'
import AppLayout from '~/layouts/app_layout'
import { EmptyState, PageHeader, Pagination } from '~/components/ui/misc'
import { JobStatusBadge, VerificationBadge } from '~/components/status'
import { FilterTabs, SearchBox, Table } from '~/components/admin'
import { ago, toQuery } from '~/lib/format'

type J = { id: number; title: string; slug: string; status: string; isFeatured: boolean; isExpired: boolean; company: { id: number; name: string; verificationStatus: string }; applicants: number; updatedAt: string }
type Props = { filters: { status: string; q: string }; jobs: { data: J[]; meta: { total: number; page: number; lastPage: number } } }

export default function AdminJobs({ filters, jobs }: Props) {
  return (
    <AppLayout>
      <Head title="Job moderation" />
      <PageHeader title="Job moderation" />
      <FilterTabs base="/admin/jobs" current={filters.status} extra={{ q: filters.q }} tabs={[['pending_review', 'Pending review'], ['published', 'Live'], ['rejected', 'Rejected'], ['closed', 'Closed'], ['', 'All']]} />
      <SearchBox base="/admin/jobs" value={filters.q} params={{ status: filters.status }} placeholder="Job title" />
      {jobs.data.length ? (
        <Table head={['Job', 'Company', 'Applicants', 'Updated', 'Status']}>
          {jobs.data.map((j) => (
            <tr key={j.id}>
              <td><Link href={`/admin/jobs/${j.id}`} className="font-medium hover:text-brand-700">{j.title}</Link>{j.isFeatured && <span className="ms-2 text-[12px] text-amber">Featured</span>}</td>
              <td><Link href={`/admin/companies/${j.company.id}`} className="hover:text-brand-700">{j.company.name}</Link><div className="mt-1"><VerificationBadge status={j.company.verificationStatus} /></div></td>
              <td className="tabular-nums">{j.applicants}</td>
              <td className="text-slate">{ago(j.updatedAt)}</td>
              <td><JobStatusBadge status={j.status} expired={j.isExpired} /></td>
            </tr>
          ))}
        </Table>
      ) : <EmptyState title="Nothing to review">New submissions appear here.</EmptyState>}
      <div className="mt-4"><Pagination meta={jobs.meta} href={(p) => `/admin/jobs?${toQuery({ ...filters, page: p })}`} /></div>
    </AppLayout>
  )
}
