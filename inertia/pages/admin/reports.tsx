import { Head, Link, useForm } from '@inertiajs/react'
import AppLayout from '~/layouts/app_layout'
import { Button } from '~/components/ui/button'
import { EmptyState, PageHeader, Pagination, Badge } from '~/components/ui/misc'
import { FilterTabs } from '~/components/admin'
import { ReportReason, ReportStatus } from '#shared/enums'
import { controlClass } from '~/components/ui/form'
import { dateTime, toQuery } from '~/lib/format'
import { cn } from '~/lib/cn'

type R = { id: number; subjectType: string; reason: string; details: string | null; status: string; resolutionNote: string | null; createdAt: string; reporter: { fullName: string | null; email: string } | null; subject: { label: string; url: string | null } }
type Props = { filters: { status: string }; reports: { data: R[]; meta: { total: number; page: number; lastPage: number } } }

function ReportRow({ r }: { r: R }) {
  const form = useForm({ status: r.status, resolutionNote: r.resolutionNote ?? '' })
  return (
    <li className="rounded-panel border border-line bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm"><Badge tone={r.reason === 'scam' ? 'danger' : 'neutral'}>{ReportReason.label(r.reason as never)}</Badge> <span className="ms-1 capitalize text-slate">{r.subjectType}:</span> {r.subject.url ? <Link href={r.subject.url} className="font-medium hover:text-brand-700">{r.subject.label}</Link> : r.subject.label}</p>
          {r.details && <p className="mt-2 whitespace-pre-line text-sm">{r.details}</p>}
          <p className="mt-2 text-[12px] text-slate">{dateTime(r.createdAt)} — from {r.reporter ? `${r.reporter.fullName ?? ''} ${r.reporter.email}` : 'anonymous'}</p>
        </div>
        <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); form.put(`/admin/reports/${r.id}`, { preserveScroll: true }) }}>
          <select aria-label="Status" className={cn(controlClass, 'h-9 w-auto text-sm')} value={form.data.status} onChange={(e) => form.setData('status', e.target.value)}>
            {ReportStatus.values.map((s) => <option key={s} value={s}>{ReportStatus.label(s)}</option>)}
          </select>
          <input aria-label="Resolution note" placeholder="Resolution note" className={cn(controlClass, 'h-9 w-56 text-sm')} value={form.data.resolutionNote} onChange={(e) => form.setData('resolutionNote', e.target.value)} />
          <Button size="sm" type="submit" loading={form.processing}>Update</Button>
        </form>
      </div>
    </li>
  )
}

export default function Reports({ filters, reports }: Props) {
  return (
    <AppLayout>
      <Head title="Reports" />
      <PageHeader title="Reports" description="Reports from users about jobs and employers. Take action on the job or company page, then resolve the report here." />
      <FilterTabs base="/admin/reports" current={filters.status} tabs={[['open', 'Open'], ['reviewing', 'Reviewing'], ['resolved', 'Resolved'], ['dismissed', 'Dismissed'], ['', 'All']]} />
      {reports.data.length ? <ul className="flex flex-col gap-3">{reports.data.map((r) => <ReportRow key={r.id} r={r} />)}</ul> : <EmptyState title="No reports here">Nothing needs attention.</EmptyState>}
      <div className="mt-4"><Pagination meta={reports.meta} href={(p) => `/admin/reports?${toQuery({ ...filters, page: p })}`} /></div>
    </AppLayout>
  )
}
