import { Head, Link, router } from '@inertiajs/react'
import AppLayout from '~/layouts/app_layout'
import { Button } from '~/components/ui/button'
import { Badge, PageHeader, Pagination } from '~/components/ui/misc'
import { FilterTabs, SearchBox, Table } from '~/components/admin'
import { date, toQuery } from '~/lib/format'

type U = { id: number; fullName: string; email: string; role: string; status: string; emailVerified: boolean; company: { id: number; name: string } | null; createdAt: string }
type Props = { filters: { q: string; role: string }; users: { data: U[]; meta: { total: number; page: number; lastPage: number } } }

export default function Users({ filters, users }: Props) {
  return (
    <AppLayout>
      <Head title="Users" />
      <PageHeader title="Users" description={`${users.meta.total} accounts`} />
      <FilterTabs base="/admin/users" param="role" current={filters.role || 'all'} extra={{ q: filters.q }} tabs={[['', 'All'], ['candidate', 'Job seekers'], ['employer', 'Employers'], ['admin', 'Admins']]} />
      <SearchBox base="/admin/users" value={filters.q} params={{ role: filters.role }} placeholder="Name or email" />
      <Table head={['User', 'Role', 'Company', 'Joined', 'Status', '']}>
        {users.data.map((u) => (
          <tr key={u.id}>
            <td><p className="font-medium">{u.fullName}</p><p className="text-[13px] text-slate">{u.email}{!u.emailVerified && ' (unverified)'}</p></td>
            <td className="capitalize">{u.role}</td>
            <td>{u.company ? <Link href={`/admin/companies/${u.company.id}`} className="hover:text-maroon-700">{u.company.name}</Link> : '—'}</td>
            <td className="text-slate">{date(u.createdAt)}</td>
            <td>{u.status === 'active' ? <Badge tone="gulf">Active</Badge> : <Badge tone="danger">Suspended</Badge>}</td>
            <td className="text-end">
              {u.role !== 'admin' && (u.status === 'active'
                ? <Button size="sm" variant="danger" onClick={() => confirm(`Suspend ${u.email}? They will be signed out.`) && router.post(`/admin/users/${u.id}/status`, { status: 'suspended' }, { preserveScroll: true })}>Suspend</Button>
                : <Button size="sm" variant="secondary" onClick={() => router.post(`/admin/users/${u.id}/status`, { status: 'active' }, { preserveScroll: true })}>Reactivate</Button>)}
            </td>
          </tr>
        ))}
      </Table>
      <div className="mt-4"><Pagination meta={users.meta} href={(p) => `/admin/users?${toQuery({ ...filters, page: p })}`} /></div>
    </AppLayout>
  )
}
