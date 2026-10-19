import { Link, router } from '@inertiajs/react'
import { Bookmark, BookmarkCheck, Briefcase, FileText, MapPin, Mars, Venus } from 'lucide-react'
import type { CandidateCard } from '~/lib/types'
import { useShared } from '~/lib/page'
import { initials } from '~/lib/format'
import { cn } from '~/lib/cn'

/**
 * Save behaviour depends on who is looking:
 *  - employers toggle the candidate on their company shortlist
 *  - signed-out visitors are sent to sign in, then back to the profile
 *  - candidates and admins don't see save controls
 */
export function useSaveCandidate() {
  const { auth } = useShared()
  const canSave = !auth || auth.role === 'employer'
  const toggle = (id: number) => {
    if (!auth) return router.visit(`/login?redirect=${encodeURIComponent(`/talent/${id}`)}`)
    router.post(`/employer/candidates/${id}/toggle-save`, {}, { preserveScroll: true, preserveState: true })
  }
  return { canSave, toggle }
}

export function Portrait({ c, className }: { c: Pick<CandidateCard, 'name' | 'photoUrl'>; className?: string }) {
  return c.photoUrl ? (
    <img src={c.photoUrl} alt={`Photo of ${c.name}`} loading="lazy" className={cn('rounded-[10px] object-cover', className)} />
  ) : (
    <span aria-hidden className={cn('grid place-items-center rounded-[10px] bg-mint font-display text-2xl font-bold text-brand-700', className)}>
      {initials(c.name)}
    </span>
  )
}

function Meta({ icon: Icon, children, label }: { icon: typeof MapPin; children: React.ReactNode; label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] text-slate">
      <Icon className="size-4 shrink-0 text-navy/70" aria-hidden />
      {label && <span className="sr-only">{label}</span>}
      {children}
    </span>
  )
}

/** Horizontal jobseeker card from the homepage design: portrait left, details right. */
export function TalentCard({ c, saved }: { c: CandidateCard; saved?: boolean }) {
  const { canSave, toggle } = useSaveCandidate()
  const skills = c.skills.slice(0, 3)
  // like the design: long skill sets use a smaller tag size so all three stay on one line
  const chars = skills.join('').length
  const tagSize = chars > 34 ? 'px-1.5 text-[10px]' : chars > 26 ? 'px-2 text-[10.5px]' : 'px-2.5 text-[11.5px]'
  const SaveIcon = saved ? BookmarkCheck : Bookmark
  return (
    <article className="relative flex gap-3.5 rounded-[12px] border border-line bg-white p-3 shadow-[0_1px_2px_rgba(16,24,40,.04)]">
      <Link href={`/talent/${c.id}`} className="shrink-0" tabIndex={-1} aria-hidden>
        <Portrait c={c} className="h-[122px] w-[104px]" />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          {c.availability === 'immediately' ? (
            <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-[12px] font-medium text-brand-700">Available now</span>
          ) : (
            <span />
          )}
          {canSave && (
            <button type="button" onClick={() => toggle(c.id)} aria-pressed={saved} aria-label={saved ? `Remove ${c.name} from shortlist` : `Save ${c.name}`} className="-me-1 -mt-0.5 rounded p-1 text-navy hover:bg-pearl">
              <SaveIcon className={cn('size-[18px]', saved && 'text-brand-600')} />
            </button>
          )}
        </div>
        <h3 className="mt-1 font-display text-[19px] font-bold leading-tight text-navy">
          <Link href={`/talent/${c.id}`} className="hover:text-brand-700">{c.name}</Link>
        </h3>
        {c.desiredPosition && <p className="mt-0.5 line-clamp-2 text-[13.5px] font-medium leading-snug text-navy">Position wanted: {c.desiredPosition}</p>}
        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
          {c.gender && <Meta icon={c.gender === 'female' ? Venus : Mars} label="Gender:">{c.gender === 'female' ? 'Female' : 'Male'}</Meta>}
          {c.location && <Meta icon={MapPin} label="Location:">{c.location}</Meta>}
        </div>
        {c.yearsExperience !== null && (
          <div className="mt-1">
            <Meta icon={Briefcase}>Experience: {c.yearsExperience} year{c.yearsExperience === 1 ? '' : 's'}</Meta>
          </div>
        )}
        {skills.length > 0 && (
          <>
            <p className="mt-1.5 text-[13px] text-navy">Top skills:</p>
            <ul className="mt-1 flex min-w-0 flex-wrap gap-1">
              {skills.map((s) => (
                <li key={s} title={s} className={cn('min-w-0 truncate rounded-full bg-sky-tag py-[3px] font-medium text-sky-ink', tagSize)}>{s}</li>
              ))}
            </ul>
          </>
        )}
        <div className="mt-auto flex gap-2 pt-2.5">
          {c.publicCvUrl ? (
            <a href={c.publicCvUrl} className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-ctl bg-brand-600 text-sm font-semibold text-white hover:bg-brand-700">
              <FileText className="size-4" aria-hidden /> View CV
            </a>
          ) : (
            <Link href={`/talent/${c.id}`} className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-ctl bg-brand-600 text-sm font-semibold text-white hover:bg-brand-700">
              <FileText className="size-4" aria-hidden /> View profile
            </Link>
          )}
          {canSave && (
            <button type="button" onClick={() => toggle(c.id)} aria-pressed={saved} className="inline-flex h-10 items-center gap-1.5 rounded-ctl border border-line bg-white px-4 text-sm font-semibold text-navy hover:bg-pearl">
              <SaveIcon className="size-4" aria-hidden /> {saved ? 'Saved' : 'Save'}
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
