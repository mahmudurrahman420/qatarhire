import { Head, Link } from '@inertiajs/react'
import AppLayout from '~/layouts/app_layout'
import { ButtonLink } from '~/components/ui/button'
import { EmptyState, PageHeader, Panel, Stat } from '~/components/ui/misc'
import { JobList } from '~/components/jobs'
import { ApplicationStatusBadge } from '~/components/status'
import { ago } from '~/lib/format'
import { useShared } from '~/lib/page'
import type { JobCard } from '~/lib/types'

type Props = {
  completeness: { score: number; missing: string[] }
  visibility: 'private' | 'discoverable'
  hasCv: boolean
  counts: Record<string, number>
  recentApplications: { id: number; status: string; updatedAt: string; job: JobCard }[]
  recommended: JobCard[]
  savedCount: number
  alertCount: number
}

export default function CandidateDashboard({ completeness, visibility, hasCv, counts, recentApplications, recommended, savedCount, alertCount }: Props) {
  const { auth } = useShared()
  const active = ['submitted', 'under_review', 'shortlisted', 'interview', 'offer'].reduce((s, k) => s + (counts[k] ?? 0), 0)
  const interviews = (counts.interview ?? 0) + (counts.offer ?? 0)
  return (
    <AppLayout>
      <Head title="My dashboard" />
      <PageHeader title={`Hello, ${auth!.fullName.split(' ')[0]}`} actions={<ButtonLink href="/jobs">Find jobs</ButtonLink>} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Active applications" value={active} />
        <Stat label="Interviews and offers" value={interviews} />
        <Stat label="Saved jobs" value={savedCount} />
        <Stat label="Job alerts" value={alertCount} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-6">
          <Panel title="Recent applications" actions={<Link href="/candidate/applications" className="text-sm text-maroon-700 hover:underline">All applications</Link>} padded={false}>
            {recentApplications.length ? (
              <ul>
                {recentApplications.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 border-b border-line px-5 py-3 last:border-b-0">
                    <div className="min-w-0">
                      <Link href={`/jobs/${a.job.slug}`} className="block truncate text-sm font-medium hover:text-maroon-700">{a.job.title}</Link>
                      <p className="truncate text-[13px] text-slate">{a.job.company?.name} — updated {ago(a.updatedAt)}</p>
                    </div>
                    <ApplicationStatusBadge status={a.status} />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-5"><p className="text-sm text-slate">You haven't applied for anything yet. When you do, you'll see each employer's progress here.</p></div>
            )}
          </Panel>

          <section>
            <h2 className="mb-3 text-xl">Jobs that fit your profile</h2>
            {recommended.length ? (
              <JobList jobs={recommended} />
            ) : (
              <EmptyState title="Add skills to get suggestions" action={<ButtonLink href="/candidate/profile" variant="secondary">Edit profile</ButtonLink>}>
                We match open jobs to your industry and skills.
              </EmptyState>
            )}
          </section>
        </div>

        <aside className="flex flex-col gap-6">
          <Panel title="Profile strength">
            <div className="flex items-center gap-3">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-pearl" role="progressbar" aria-valuenow={completeness.score} aria-valuemin={0} aria-valuemax={100} aria-label="Profile completeness">
                <div className="h-full rounded-full bg-maroon-600" style={{ width: `${completeness.score}%` }} />
              </div>
              <span className="text-sm font-semibold tabular-nums">{completeness.score}%</span>
            </div>
            {completeness.missing.length > 0 && (
              <ul className="mt-4 flex flex-col gap-1.5 text-sm text-slate">
                {completeness.missing.map((m) => <li key={m}>{m}</li>)}
              </ul>
            )}
            <ButtonLink href="/candidate/profile" variant="secondary" size="sm" className="mt-4">Improve profile</ButtonLink>
          </Panel>

          <Panel title="Who can find you">
            {visibility === 'discoverable' ? (
              <p className="text-sm text-slate">Verified employers can find your profile in candidate search.</p>
            ) : (
              <p className="text-sm text-slate">Your profile is private. Only employers you apply to can see it.</p>
            )}
            {!hasCv && <p className="mt-2 text-sm text-amber">Upload a CV so you can apply in one step.</p>}
            <Link href="/candidate/privacy" className="mt-3 inline-block text-sm font-medium text-maroon-700 hover:underline">Privacy settings</Link>
          </Panel>
        </aside>
      </div>
    </AppLayout>
  )
}
