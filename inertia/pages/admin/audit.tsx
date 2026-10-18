import { Head, Link } from '@inertiajs/react'
import AppLayout from '~/layouts/app_layout'
import { PageHeader, Pagination } from '~/components/ui/misc'
import { SearchBox, Table } from '~/components/admin'
import { dateTime, toQuery } from '~/lib/format'
import { cn } from '~/lib/cn'

type Row = { id: number; action: string; actor?: string | null; subject?: string | null; meta?: Record<string, unknown> | null; ip: string | null; createdAt: string; company?: string | null; candidateProfileId?: number; userId?: number | null }
type Props = { tab: 'audit' | 'access'; filters: { action: string }; rows: { data: Row[]; meta: { total: number; page: number; lastPage: number } } }

export default function Audit({ tab, filters, rows }: Props) {
  return (
    <AppLayout>
      <Head title="Audit log" />
      <PageHeader title="Audit log" description="Security-relevant actions and every employer access to candidate profiles, contact details and CVs." />
      <nav className="mb-4 flex gap-1 border-b border-line">
        {[['audit', 'Security & admin actions'], ['access', 'Candidate data access']].map(([v, l]) => (
          <Link key={v} href={`/admin/audit?tab=${v}`} className={cn('-mb-px border-b-2 px-3 py-2 text-sm', tab === v ? 'border-maroon-600 font-medium text-maroon-700' : 'border-transparent text-slate hover:text-ink')}>{l}</Link>
        ))}
      </nav>
      {tab === 'audit' ? (
        <>
          <SearchBox base="/admin/audit" value={filters.action} params={{ tab }} placeholder="Action prefix, e.g. auth. or admin." />
          <Table head={['When', 'Action', 'Actor', 'Subject', 'Details', 'IP']} minWidth={900}>
            {rows.data.map((r) => (
              <tr key={r.id}>
                <td className="whitespace-nowrap text-slate">{dateTime(r.createdAt)}</td>
                <td className="font-medium">{r.action}</td>
                <td>{r.actor ?? <span className="text-slate">system / guest</span>}</td>
                <td className="text-slate">{r.subject ?? ''}</td>
                <td className="max-w-xs break-words font-mono text-[12px] text-slate">{r.meta ? JSON.stringify(r.meta) : ''}</td>
                <td className="text-slate">{r.ip}</td>
              </tr>
            ))}
          </Table>
        </>
      ) : (
        <Table head={['When', 'Action', 'Company', 'Candidate profile', 'User', 'IP']}>
          {rows.data.map((r) => (
            <tr key={r.id}>
              <td className="whitespace-nowrap text-slate">{dateTime(r.createdAt)}</td>
              <td className="font-medium">{r.action.replace('_', ' ')}</td>
              <td>{r.company ?? '—'}</td>
              <td>#{r.candidateProfileId}</td>
              <td className="text-slate">{r.userId ? `#${r.userId}` : '—'}</td>
              <td className="text-slate">{r.ip}</td>
            </tr>
          ))}
        </Table>
      )}
      <div className="mt-4"><Pagination meta={rows.meta} href={(p) => `/admin/audit?${toQuery({ tab, action: filters.action, page: p })}`} /></div>
    </AppLayout>
  )
}
