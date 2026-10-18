import { Head, Link, router } from '@inertiajs/react'
import { Trash2 } from 'lucide-react'
import AppLayout from '~/layouts/app_layout'
import { Button, ButtonLink } from '~/components/ui/button'
import { EmptyState, PageHeader, Panel } from '~/components/ui/misc'
import { JobList } from '~/components/jobs'
import { toQuery, date } from '~/lib/format'
import type { JobCard } from '~/lib/types'

type Alert = { id: number; name: string; filters: Record<string, unknown>; alertsEnabled: boolean; createdAt: string; lastAlertedAt: string | null }

export default function Saved({ jobs, alerts }: { jobs: JobCard[]; alerts: Alert[] }) {
  return (
    <AppLayout>
      <Head title="Saved jobs & alerts" />
      <PageHeader title="Saved jobs & alerts" />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section>
          <h2 className="mb-3 text-xl">Saved jobs</h2>
          {jobs.length ? <JobList jobs={jobs} savedIds={jobs.map((j) => j.id)} canSave /> : (
            <EmptyState title="No saved jobs" action={<ButtonLink href="/jobs" variant="secondary">Browse jobs</ButtonLink>}>Tap the heart on any job to keep it here.</EmptyState>
          )}
        </section>
        <Panel title="Job alerts" padded={false}>
          {alerts.length ? (
            <ul className="divide-y divide-line">
              {alerts.map((a) => (
                <li key={a.id} className="flex items-start justify-between gap-2 px-5 py-3">
                  <div className="min-w-0">
                    <Link href={`/jobs?${toQuery(a.filters)}`} className="text-sm font-medium hover:text-maroon-700">{a.name}</Link>
                    <p className="text-[13px] text-slate">Since {date(a.createdAt)}</p>
                  </div>
                  <Button size="sm" variant="quiet" aria-label={`Delete alert ${a.name}`} onClick={() => router.delete(`/candidate/alerts/${a.id}`, { preserveScroll: true })}><Trash2 className="size-4" /></Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-4 text-sm text-slate">Run a search, then choose "Create alert" to get new matching jobs by email.</p>
          )}
        </Panel>
      </div>
    </AppLayout>
  )
}
