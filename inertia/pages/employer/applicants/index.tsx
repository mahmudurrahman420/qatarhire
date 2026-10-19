import { Head, Link, router } from '@inertiajs/react'
import { useState, type FormEvent } from 'react'
import { Search, FileText } from 'lucide-react'
import AppLayout from '~/layouts/app_layout'
import { ButtonLink } from '~/components/ui/button'
import { controlClass } from '~/components/ui/form'
import { EmptyState, PageHeader } from '~/components/ui/misc'
import { ApplicationStatusBadge, JobStatusBadge } from '~/components/status'
import { ApplicationStatus } from '#shared/enums'
import { ago, toQuery } from '~/lib/format'
import type { CandidateCard } from '~/lib/types'
import { cn } from '~/lib/cn'

type Props = {
  job: { id: number; title: string; slug: string; status: string }
  filters: { status: string; q: string }
  counts: Record<string, number>
  applications: { id: number; status: string; createdAt: string; hasCv: boolean; candidate: CandidateCard }[]
}

const stages = ['', 'submitted', 'under_review', 'shortlisted', 'interview', 'offer', 'hired', 'rejected', 'withdrawn'] as const

export default function Applicants({ job, filters, counts, applications }: Props) {
  const [q, setQ] = useState(filters.q)
  const total = Object.entries(counts).filter(([k]) => k !== 'withdrawn').reduce((s, [, v]) => s + v, 0)
  const go = (patch: Partial<Props['filters']>) => router.get(`/employer/jobs/${job.id}/applicants?${toQuery({ ...filters, ...patch })}`, {}, { preserveState: true })
  return (
    <AppLayout>
      <Head title={`Applicants: ${job.title}`} />
      <PageHeader
        title={job.title}
        description={<span className="inline-flex items-center gap-2">Applicants <JobStatusBadge status={job.status} /></span>}
        back={{ href: '/employer/jobs', label: 'All jobs' }}
        actions={<ButtonLink href={`/employer/jobs/${job.id}/edit`} variant="secondary" size="sm">Edit job</ButtonLink>}
      />
      <nav className="mb-4 flex gap-1 overflow-x-auto border-b border-line" aria-label="Pipeline stage">
        {stages.map((st) => {
          const n = st ? counts[st] ?? 0 : total
          return (
            <button key={st} type="button" onClick={() => go({ status: st })} aria-current={filters.status === st ? 'true' : undefined} className={cn('-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm', filters.status === st ? 'border-brand-600 font-medium text-brand-700' : 'border-transparent text-slate hover:text-ink')}>
              {st ? ApplicationStatus.label(st) : 'All active'} <span className="tabular-nums text-slate">{n}</span>
            </button>
          )
        })}
      </nav>
      <form className="mb-4 max-w-md" onSubmit={(e: FormEvent) => { e.preventDefault(); go({ q }) }} role="search">
        <label className="relative block">
          <span className="sr-only">Search applicants</span>
          <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-slate" aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, title or skill" className={cn(controlClass, 'h-10 ps-9')} />
        </label>
      </form>
      {applications.length ? (
        <ul className="overflow-hidden rounded-panel border border-line bg-white">
          {applications.map((a) => (
            <li key={a.id} className="border-b border-line last:border-b-0">
              <Link href={`/employer/applications/${a.id}`} className="flex flex-wrap items-center gap-4 px-5 py-3.5 hover:bg-pearl">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{a.candidate.name}</p>
                  <p className="truncate text-sm text-slate">{a.candidate.headline || a.candidate.currentJobTitle || 'No headline'}{a.candidate.yearsExperience !== null ? ` — ${a.candidate.yearsExperience} yrs` : ''}</p>
                  {a.candidate.skills.length > 0 && <p className="mt-1 truncate text-[13px] text-slate">{a.candidate.skills.slice(0, 5).join(', ')}</p>}
                </div>
                <div className="flex items-center gap-3 text-[13px] text-slate">
                  {a.hasCv && <FileText className="size-4" aria-label="CV attached" />}
                  <span>{ago(a.createdAt)}</span>
                  <ApplicationStatusBadge status={a.status} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title={filters.status || filters.q ? 'No applicants match' : 'No applicants yet'}>
          {job.status === 'published' ? 'New applicants appear here and in your notifications.' : 'Applicants can apply once the job is live.'}
        </EmptyState>
      )}
    </AppLayout>
  )
}
