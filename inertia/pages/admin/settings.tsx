import { Head, router, useForm } from '@inertiajs/react'
import AppLayout from '~/layouts/app_layout'
import { Button } from '~/components/ui/button'
import { Checkbox, RadioCards, TextField } from '~/components/ui/form'
import { PageHeader, Panel } from '~/components/ui/misc'
import { dateTime } from '~/lib/format'

type Settings = { job_moderation: 'all' | 'unverified_only' | 'none'; billing_enabled: boolean; employer_registration_open: boolean; max_cvs_per_candidate: number; default_job_duration_days: number; notify_candidate_on_cv_download: boolean; site_notice: string }
type Props = { settings: Settings; queue: { pending: number; failed: { id: number; name: string; attempts: number; failedAt: string; error: string | null }[] } }

export default function AdminSettings({ settings, queue }: Props) {
  const { billing_enabled, ...editable } = settings
  const form = useForm(editable)
  return (
    <AppLayout>
      <Head title="Platform settings" />
      <PageHeader title="Platform settings" />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Panel>
          <form className="flex flex-col gap-6" onSubmit={(e) => { e.preventDefault(); form.transform((d) => ({ ...d, max_cvs_per_candidate: Number(d.max_cvs_per_candidate), default_job_duration_days: Number(d.default_job_duration_days), site_notice: d.site_notice || undefined })); form.put('/admin/settings', { preserveScroll: true }) }}>
            <fieldset>
              <legend className="mb-2 text-sm font-medium">Job moderation</legend>
              <RadioCards name="mod" value={form.data.job_moderation} onChange={(v) => form.setData('job_moderation', v)} options={[
                { value: 'unverified_only', label: 'Review jobs from unverified companies', description: 'Recommended. Verified employers publish immediately.' },
                { value: 'all', label: 'Review every job', description: 'Every new job and every edit to a live job waits for approval.' },
                { value: 'none', label: 'No review', description: 'Jobs publish immediately. Use only if you monitor reports closely.' },
              ]} />
            </fieldset>
            <Checkbox label="Allow new employer registrations" checked={form.data.employer_registration_open} onChange={(e) => form.setData('employer_registration_open', e.target.checked)} />
            <Checkbox label="Notify candidates when an employer downloads their CV" checked={form.data.notify_candidate_on_cv_download} onChange={(e) => form.setData('notify_candidate_on_cv_download', e.target.checked)} />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="CVs per candidate" type="number" min={1} max={10} value={form.data.max_cvs_per_candidate} onChange={(e) => form.setData('max_cvs_per_candidate', Number(e.target.value))} error={form.errors.max_cvs_per_candidate} />
              <TextField label="Default job duration (days)" type="number" min={7} max={180} value={form.data.default_job_duration_days} onChange={(e) => form.setData('default_job_duration_days', Number(e.target.value))} error={form.errors.default_job_duration_days} />
            </div>
            <TextField label="Site-wide notice" optional maxLength={300} value={form.data.site_notice} onChange={(e) => form.setData('site_notice', e.target.value)} hint="Shown as a banner on every page, e.g. planned maintenance. Leave empty to hide." />
            <div><Button type="submit" loading={form.processing}>Save settings</Button></div>
          </form>
        </Panel>
        <aside className="flex flex-col gap-6">
          <Panel title="Billing">
            <p className="text-sm text-slate">{billing_enabled ? 'Billing is enabled.' : 'Billing is off: every feature is free for employers.'} Enabling paid plans requires integrating a payment provider available in Qatar; it can't be switched on from here.</p>
          </Panel>
          <Panel title="Background jobs" padded={false}>
            <p className="px-5 pt-4 text-sm text-slate">{queue.pending} queued. Failed jobs are retried five times before appearing below.</p>
            {queue.failed.length ? (
              <ul className="mt-2 divide-y divide-line">
                {queue.failed.map((j) => (
                  <li key={j.id} className="px-5 py-2.5 text-sm">
                    <div className="flex items-center justify-between gap-2"><span className="font-medium">{j.name}</span><Button size="sm" variant="secondary" onClick={() => router.post(`/admin/queue/${j.id}/retry`, {}, { preserveScroll: true })}>Retry</Button></div>
                    <p className="text-[12px] text-slate">{dateTime(j.failedAt)} — {j.error}</p>
                  </li>
                ))}
              </ul>
            ) : <p className="px-5 pb-4 text-sm text-gulf">No failed jobs.</p>}
          </Panel>
        </aside>
      </div>
    </AppLayout>
  )
}
