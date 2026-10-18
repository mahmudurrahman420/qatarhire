import { Link } from '@inertiajs/react'
import { BookmarkCheck, Download, FileText, Mail, MapPin, Phone, Link2, Globe } from 'lucide-react'
import { Availability, EducationLevel, LanguageProficiency, WorkAuthorization } from '#shared/enums'
import type { CandidateCard, CvBrief } from '~/lib/types'
import { ago, date, fileSize, initials, qar } from '~/lib/format'
import { Badge, Panel } from '~/components/ui/misc'
import { RichText } from '~/components/jobs'
import { cn } from '~/lib/cn'

export type CandidateDetail = CandidateCard & {
  fullName: string
  summary: string | null
  expectedSalary: number | null
  noticePeriodDays: number | null
  workAuthorization: string | null
  openToRelocation: boolean
  educationLevel: string | null
  linkedinUrl: string | null
  portfolioUrl: string | null
  experiences: { id: number; jobTitle: string; companyName: string; location: string | null; startDate: string; endDate: string | null; isCurrent: boolean; description: string | null }[]
  educations: { id: number; institution: string; qualification: string; fieldOfStudy: string | null; startYear: number | null; endYear: number | null }[]
  certifications: { id: number; name: string; issuer: string | null; year: number | null }[]
  languages: { name: string; proficiency: string }[]
  contact: { email: string; phone: string | null } | null
  cvs: CvBrief[]
}

/** Search result row. Contains only what the presenter allows: no contact details, no CV links. */
export function CandidateResult({ c, saved, highlight }: { c: CandidateCard; saved?: boolean; highlight?: string[] }) {
  return (
    <article className="relative flex gap-4 border-b border-line px-5 py-4 last:border-b-0">
      <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-full bg-dune font-display text-sm font-bold text-maroon-700">{initials(c.name)}</span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <h3 className="font-sans text-base font-semibold tracking-normal">
            <Link href={`/employer/candidates/${c.id}`} className="after:absolute after:inset-0 hover:text-maroon-700">{c.headline || c.currentJobTitle || 'Candidate'}</Link>
          </h3>
          <span className="text-sm text-slate">{c.name}</span>
        </div>
        <p className="mt-0.5 text-sm text-slate">
          {[c.currentJobTitle && c.headline ? c.currentJobTitle : null, c.yearsExperience !== null ? `${c.yearsExperience} yrs experience` : null, c.industry].filter(Boolean).join(', ')}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {c.skills.map((s) => (
            <span key={s} className={cn('rounded-full px-2 py-0.5 text-[12px] ring-1 ring-inset', highlight?.some((h) => h.toLowerCase() === s.toLowerCase()) ? 'bg-maroon-50 text-maroon-700 ring-maroon-100' : 'bg-pearl text-slate ring-line')}>{s}</span>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-slate">
          {c.location && <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" aria-hidden />{c.location}</span>}
          {c.education && <span>{c.education}</span>}
          {c.availability && <span className={c.availability === 'immediately' ? 'font-medium text-gulf' : undefined}>{Availability.label(c.availability as never)}</span>}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2 text-[12px] text-slate">
        <span>Updated {ago(c.profileUpdatedAt)}</span>
        {c.hasCv && <span className="inline-flex items-center gap-1"><FileText className="size-3.5" aria-hidden /> CV</span>}
        {saved && <BookmarkCheck className="size-4 text-maroon-600" aria-label="Saved" />}
      </div>
    </article>
  )
}

export function CandidateProfileView({ c, showFullName }: { c: CandidateDetail; showFullName?: boolean }) {
  const facts: Array<[string, string | null]> = [
    ['Experience', c.yearsExperience !== null ? `${c.yearsExperience} years` : null],
    ['Industry', c.industry],
    ['Location', c.location],
    ['Prefers to work in', c.preferredLocation],
    ['Education', c.educationLevel ? EducationLevel.label(c.educationLevel as never) : null],
    ['Availability', c.availability ? Availability.label(c.availability as never) : null],
    ['Notice period', c.noticePeriodDays !== null ? `${c.noticePeriodDays} days` : null],
    ['Expected salary', c.expectedSalary !== null ? `${qar(c.expectedSalary)} / month` : null],
    ['Work authorisation', c.workAuthorization ? WorkAuthorization.label(c.workAuthorization as never) : null],
    ['Relocation', c.openToRelocation ? 'Open to relocating within Qatar' : null],
  ]
  return (
    <div className="flex flex-col gap-6">
      <header className="flex gap-4">
        <span aria-hidden className="grid size-16 shrink-0 place-items-center rounded-full bg-dune font-display text-lg font-bold text-maroon-700">{initials(c.fullName)}</span>
        <div>
          <h1 className="text-2xl">{showFullName ? c.fullName : c.name}</h1>
          {c.headline && <p className="mt-1 text-[17px]">{c.headline}</p>}
          <p className="mt-1 text-sm text-slate">Profile updated {ago(c.profileUpdatedAt)}</p>
        </div>
      </header>

      <Panel title="Summary">
        {c.summary ? <RichText text={c.summary} /> : <p className="text-sm text-slate">No summary provided.</p>}
        <dl className="mt-5 grid gap-x-6 gap-y-3 border-t border-line pt-4 sm:grid-cols-2">
          {facts.filter(([, v]) => v).map(([k, v]) => (
            <div key={k}><dt className="text-[13px] text-slate">{k}</dt><dd className="text-sm font-medium">{v}</dd></div>
          ))}
        </dl>
      </Panel>

      {c.experiences.length > 0 && (
        <Panel title="Experience" padded={false}>
          <ol className="divide-y divide-line">
            {c.experiences.map((x) => (
              <li key={x.id} className="px-5 py-4">
                <p className="font-medium">{x.jobTitle}</p>
                <p className="text-sm text-slate">{x.companyName}{x.location ? `, ${x.location}` : ''} — {date(x.startDate, { month: 'short', year: 'numeric' })} to {x.isCurrent ? 'present' : date(x.endDate, { month: 'short', year: 'numeric' })}</p>
                {x.description && <div className="mt-2 text-sm"><RichText text={x.description} /></div>}
              </li>
            ))}
          </ol>
        </Panel>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Panel title="Skills">
          {c.skills.length ? <ul className="flex flex-wrap gap-1.5">{c.skills.map((s) => <li key={s}><Badge>{s}</Badge></li>)}</ul> : <p className="text-sm text-slate">None listed.</p>}
        </Panel>
        <Panel title="Languages">
          {c.languages.length ? <ul className="flex flex-col gap-1 text-sm">{c.languages.map((l) => <li key={l.name}>{l.name} <span className="text-slate">— {LanguageProficiency.label(l.proficiency as never)}</span></li>)}</ul> : <p className="text-sm text-slate">None listed.</p>}
        </Panel>
        {c.educations.length > 0 && (
          <Panel title="Education">
            <ul className="flex flex-col gap-3 text-sm">{c.educations.map((e) => <li key={e.id}><p className="font-medium">{e.qualification}{e.fieldOfStudy ? `, ${e.fieldOfStudy}` : ''}</p><p className="text-slate">{e.institution}{e.endYear ? ` (${e.endYear})` : ''}</p></li>)}</ul>
          </Panel>
        )}
        {c.certifications.length > 0 && (
          <Panel title="Certifications">
            <ul className="flex flex-col gap-1 text-sm">{c.certifications.map((x) => <li key={x.id}>{x.name}{x.issuer ? <span className="text-slate"> — {x.issuer}</span> : null}{x.year ? <span className="text-slate"> ({x.year})</span> : null}</li>)}</ul>
          </Panel>
        )}
      </div>
    </div>
  )
}

/** Contact and CV access box, reflecting exactly what consent allows. */
export function AccessPanel({ c, applied }: { c: CandidateDetail; applied: boolean }) {
  return (
    <Panel title="Contact and CV">
      {c.contact ? (
        <ul className="flex flex-col gap-2 text-sm">
          <li className="flex items-center gap-2"><Mail className="size-4 text-slate" aria-hidden /><a href={`mailto:${c.contact.email}`} className="break-all text-maroon-700 hover:underline">{c.contact.email}</a></li>
          {c.contact.phone && <li className="flex items-center gap-2"><Phone className="size-4 text-slate" aria-hidden /><a href={`tel:${c.contact.phone}`} className="hover:underline">{c.contact.phone}</a></li>}
          {c.linkedinUrl && <li className="flex items-center gap-2"><Link2 className="size-4 text-slate" aria-hidden /><a href={c.linkedinUrl} target="_blank" rel="noopener noreferrer nofollow" className="text-maroon-700 hover:underline">LinkedIn</a></li>}
          {c.portfolioUrl && <li className="flex items-center gap-2"><Globe className="size-4 text-slate" aria-hidden /><a href={c.portfolioUrl} target="_blank" rel="noopener noreferrer nofollow" className="text-maroon-700 hover:underline">Portfolio</a></li>}
        </ul>
      ) : (
        <p className="text-sm text-slate">This candidate shares contact details only with employers they apply to.</p>
      )}
      <div className="mt-4 border-t border-line pt-4">
        {c.cvs.length ? (
          <ul className="flex flex-col gap-2">
            {c.cvs.map((cv) => (
              <li key={cv.id}>
                <a href={cv.downloadUrl} className="flex items-center gap-2 rounded-ctl border border-line px-3 py-2 text-sm hover:bg-pearl">
                  <Download className="size-4 text-slate" aria-hidden />
                  <span className="min-w-0 flex-1 truncate">{cv.label}</span>
                  <span className="text-[12px] text-slate">{fileSize(cv.sizeBytes)}</span>
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate">{applied ? 'No CV was attached to this application.' : "This candidate hasn't made their CV available to search."}</p>
        )}
        <p className="mt-3 text-[12px] text-slate">Downloads are logged and the candidate is notified. Use candidate data only for recruitment.</p>
      </div>
    </Panel>
  )
}

