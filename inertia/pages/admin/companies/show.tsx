import { Head, Link, router, useForm } from '@inertiajs/react'
import AppLayout from '~/layouts/app_layout'
import { Button } from '~/components/ui/button'
import { RadioCards, TextArea } from '~/components/ui/form'
import { Badge, CompanyLogo, PageHeader, Panel } from '~/components/ui/misc'
import { VerificationBadge } from '~/components/status'
import { CompanySize, ReportReason, VerificationStatus } from '#shared/enums'
import { date, dateTime } from '~/lib/format'

type Props = {
  company: { id: number; name: string; slug: string; website: string | null; description: string | null; address: string | null; contactName: string; contactEmail: string; phone: string | null; crNumber: string | null; size: string | null; industry: string | null; location: string | null; verificationStatus: string; isFeatured: boolean; logoUrl: string | null; createdAt: string }
  members: { id: number; fullName: string; email: string; role: string; emailVerified: boolean }[]
  history: { fromStatus: string | null; toStatus: string; note: string | null; reviewer: string | null; createdAt: string }[]
  reports: { id: number; reason: string; details: string | null; status: string; createdAt: string }[]
}

export default function AdminCompany({ company, members, history, reports }: Props) {
  const options = (['verified', 'rejected', 'suspended', 'pending'] as const).filter((s) => s !== company.verificationStatus)
  const form = useForm({ status: options[0] as string, note: '' })
  const facts: Array<[string, string | null]> = [
    ['CR number', company.crNumber], ['Website', company.website], ['Industry', company.industry], ['Location', company.location],
    ['Address', company.address], ['Size', company.size ? CompanySize.label(company.size as never) : null], ['Contact', `${company.contactName} <${company.contactEmail}>`], ['Phone', company.phone], ['Registered', date(company.createdAt)],
  ]
  const domain = company.contactEmail.split('@')[1]
  const freeMail = /^(gmail|yahoo|hotmail|outlook|live|icloud|aol|proton(mail)?)\./i.test(domain ?? '')
  return (
    <AppLayout>
      <Head title={company.name} />
      <PageHeader title={company.name} back={{ href: '/admin/companies', label: 'Employer verification' }} actions={<><VerificationBadge status={company.verificationStatus} /><Link href={`/companies/${company.slug}`} className="text-sm text-maroon-700 hover:underline">Public page</Link></>} />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-6">
          <Panel>
            <div className="flex gap-4">
              <CompanyLogo name={company.name} url={company.logoUrl} size={56} />
              <dl className="grid flex-1 gap-x-6 gap-y-2 sm:grid-cols-2">
                {facts.map(([k, v]) => <div key={k}><dt className="text-[13px] text-slate">{k}</dt><dd className="break-words text-sm">{v || <span className="text-slate">Not provided</span>}</dd></div>)}
              </dl>
            </div>
            {freeMail && <p className="mt-4 rounded-ctl bg-amber-50 px-3 py-2 text-[13px] text-amber">Contact email uses a free mail provider ({domain}). Consider asking for a company domain address.</p>}
            {company.description && <p className="mt-4 whitespace-pre-line border-t border-line pt-4 text-sm">{company.description}</p>}
          </Panel>
          <Panel title="Team" padded={false}>
            <ul className="divide-y divide-line text-sm">{members.map((m) => <li key={m.id} className="flex justify-between px-5 py-2.5"><span>{m.fullName} <span className="text-slate">{m.email}</span></span><span className="flex gap-1">{m.role === 'owner' && <Badge tone="maroon">Owner</Badge>}{!m.emailVerified && <Badge tone="amber">Email unverified</Badge>}</span></li>)}</ul>
          </Panel>
          {reports.length > 0 && (
            <Panel title={`Reports (${reports.length})`} padded={false}>
              <ul className="divide-y divide-line text-sm">{reports.map((r) => <li key={r.id} className="px-5 py-2.5"><span className="font-medium">{ReportReason.label(r.reason as never)}</span> <span className="text-slate">{date(r.createdAt)} — {r.status}</span>{r.details && <p className="text-slate">{r.details}</p>}</li>)}</ul>
            </Panel>
          )}
        </div>
        <aside className="flex flex-col gap-6">
          <Panel title="Decision">
            <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); form.post(`/admin/companies/${company.id}/verification`, { preserveScroll: true, onSuccess: () => form.reset('note') }) }}>
              <RadioCards name="decision" value={form.data.status} onChange={(v) => form.setData('status', v)} options={options.map((s) => ({ value: s, label: s === 'pending' ? 'Return to pending' : VerificationStatus.label(s) }))} />
              <TextArea label="Note to the company" optional={!['rejected', 'suspended'].includes(form.data.status)} rows={3} value={form.data.note} onChange={(e) => form.setData('note', e.target.value)} error={form.errors.note} hint="Sent with the notification. Required when rejecting or suspending." />
              <Button type="submit" loading={form.processing}>Save decision</Button>
            </form>
          </Panel>
          <Panel title="Featured employer">
            <p className="text-sm text-slate">{company.isFeatured ? 'Shown first in the directory and on the homepage.' : 'Not featured.'}</p>
            <Button className="mt-3" size="sm" variant="secondary" onClick={() => router.post(`/admin/companies/${company.id}/featured`, {}, { preserveScroll: true })}>{company.isFeatured ? 'Remove from featured' : 'Feature this employer'}</Button>
          </Panel>
          <Panel title="History">
            <ol className="flex flex-col gap-2 text-sm">{history.map((h, i) => <li key={i}><span className="font-medium">{VerificationStatus.label(h.toStatus as never)}</span> <span className="text-[12px] text-slate">{dateTime(h.createdAt)}{h.reviewer ? ` by ${h.reviewer}` : ''}</span>{h.note && <p className="text-[13px] text-slate">{h.note}</p>}</li>)}</ol>
          </Panel>
        </aside>
      </div>
    </AppLayout>
  )
}
