import { Link, router } from '@inertiajs/react'
import { Heart, MapPin, Clock } from 'lucide-react'
import { EmploymentType, WorkArrangement } from '#shared/enums'
import type { JobCard } from '~/lib/types'
import { ago, daysLeft, salaryText } from '~/lib/format'
import { CompanyLogo, Badge } from '~/components/ui/misc'
import { VerifiedMark } from '~/components/status'
import { cn } from '~/lib/cn'

export function DeadlineNote({ deadline }: { deadline: string | null }) {
  const d = daysLeft(deadline)
  if (d === null) return null
  if (d < 0) return <span className="text-slate">Closed</span>
  if (d === 0) return <span className="font-medium text-amber">Closes today</span>
  if (d <= 5) return <span className="font-medium text-amber">Closes in {d} day{d > 1 ? 's' : ''}</span>
  return null
}

/** A job as a list row: scannable, with the company and pay on the same line as the title. */
export function JobRow({ job, saved, canSave }: { job: JobCard; saved?: boolean; canSave?: boolean }) {
  const salary = salaryText(job.salary)
  return (
    <article className={cn('group relative flex gap-4 border-b border-line px-4 py-4 last:border-b-0 sm:px-5', job.isFeatured && 'bg-dune-50/60')}>
      {job.company && <CompanyLogo name={job.company.name} url={job.company.logoUrl} />}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h3 className="font-sans text-base font-semibold tracking-normal">
            <Link href={`/jobs/${job.slug}`} className="after:absolute after:inset-0 hover:text-brand-700">
              {job.title}
            </Link>
          </h3>
          {job.isFeatured && <Badge tone="dune">Featured</Badge>}
        </div>
        {job.company && (
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-slate">
            {job.company.name}
            {job.company.verified && <VerifiedMark className="size-3.5 text-gulf" />}
          </p>
        )}
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-slate">
          {job.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" aria-hidden /> {job.location}
            </span>
          )}
          <span>{EmploymentType.label(job.employmentType as never)}</span>
          {job.workArrangement !== 'on_site' && <span>{WorkArrangement.label(job.workArrangement as never)}</span>}
          {salary && <span className="font-medium text-ink">{salary}</span>}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end justify-between gap-2 text-[13px] text-slate">
        <span className="inline-flex items-center gap-1 whitespace-nowrap">
          <Clock className="size-3.5" aria-hidden /> {ago(job.publishedAt)}
        </span>
        <DeadlineNote deadline={job.deadline} />
        {canSave && (
          <button
            type="button"
            onClick={() => router.post(`/jobs/${job.slug}/save`, {}, { preserveScroll: true })}
            className="relative z-10 rounded-ctl p-1.5 hover:bg-brand-50"
            aria-pressed={saved}
            aria-label={saved ? `Remove ${job.title} from saved jobs` : `Save ${job.title}`}
          >
            <Heart className={cn('size-4', saved ? 'fill-brand-600 text-brand-600' : 'text-slate')} />
          </button>
        )}
      </div>
    </article>
  )
}

export function JobList({ jobs, savedIds, canSave }: { jobs: JobCard[]; savedIds?: number[]; canSave?: boolean }) {
  return (
    <div className="overflow-hidden rounded-panel border border-line bg-white">
      {jobs.map((j) => (
        <JobRow key={j.id} job={j} saved={savedIds?.includes(j.id)} canSave={canSave} />
      ))}
    </div>
  )
}

/** Renders employer-written plain text: blank lines become paragraphs, "- " lines become lists. Never injects HTML. */
export function RichText({ text }: { text: string | null }) {
  if (!text) return null
  const blocks = text.split(/\n{2,}/)
  return (
    <div className="prose-job text-[15px] leading-relaxed">
      {blocks.map((b, i) => {
        const lines = b.split('\n')
        if (lines.every((l) => /^\s*[-•*]\s+/.test(l))) {
          return (
            <ul key={i}>
              {lines.map((l, j) => (
                <li key={j}>{l.replace(/^\s*[-•*]\s+/, '')}</li>
              ))}
            </ul>
          )
        }
        return (
          <p key={i}>
            {lines.map((l, j) => (
              <span key={j}>
                {l}
                {j < lines.length - 1 && <br />}
              </span>
            ))}
          </p>
        )
      })}
    </div>
  )
}
