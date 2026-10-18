import { Head, Link } from '@inertiajs/react'
import AppLayout from '~/layouts/app_layout'
import { EmptyState, PageHeader, Pagination } from '~/components/ui/misc'
import { VerificationBadge } from '~/components/status'
import { FilterTabs, SearchBox, Table } from '~/components/admin'
import { date, toQuery } from '~/lib/format'

type C = { id: number; name: string; slug: string; industry: string | null; verificationStatus: string; isFeatured: boolean; jobs: number; createdAt: string }
type Props = { filters: { status: string; q: string }; companies: { data: C[]; meta: { total: number; page: number; lastPage: number } } }

export default function AdminCompanies({ filters, companies }: Props) {
  return (
    <AppLayout>
      <Head title="Employer verification" />
      <PageHeader title="Employer verification" description="Oldest first. Open a company to review its details and decide." />
      <FilterTabs base="/admin/companies" current={filters.status} extra={{ q: filters.q }} tabs={[['pending', 'Pending'], ['verified', 'Verified'], ['rejected', 'Rejected'], ['suspended', 'Suspended'], ['', 'All']]} />
      <SearchBox base="/admin/companies" value={filters.q} params={{ status: filters.status }} placeholder="Company name" />
      {companies.data.length ? (
        <Table head={['Company', 'Industry', 'Jobs', 'Registered', 'Status']}>
          {companies.data.map((c) => (
            <tr key={c.id}>
              <td><Link href={`/admin/companies/${c.id}`} className="font-medium hover:text-maroon-700">{c.name}</Link>{c.isFeatured && <span className="ms-2 text-[12px] text-amber">Featured</span>}</td>
              <td className="text-slate">{c.industry ?? '—'}</td>
              <td className="tabular-nums">{c.jobs}</td>
              <td className="text-slate">{date(c.createdAt)}</td>
              <td><VerificationBadge status={c.verificationStatus} /></td>
            </tr>
          ))}
        </Table>
      ) : <EmptyState title="Nothing in this queue">All caught up.</EmptyState>}
      <div className="mt-4"><Pagination meta={companies.meta} href={(p) => `/admin/companies?${toQuery({ ...filters, page: p })}`} /></div>
    </AppLayout>
  )
}
