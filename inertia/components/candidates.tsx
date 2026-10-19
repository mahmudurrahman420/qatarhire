import { Link } from '@inertiajs/react'
import { BookmarkCheck, Download, FileText, Mail, MapPin, Phone, Link2, Globe, MessageCircle } from 'lucide-react'
import { Availability, EducationLevel, LanguageProficiency, WorkAuthorization } from '#shared/enums'
import type { CandidateCard, CvBrief } from '~/lib/types'
import { ago, date, fileSize, initials, money } from '~/lib/format'
import { Badge, Panel } from '~/components/ui/misc'
import { RichText } from '~/components/jobs'
import { SafeHtml } from '~/components/rich_text_editor'
import { cn } from '~/lib/cn'

export type CandidateDetail = CandidateCard & {
  fullName: string
  summary: string | null
  summaryHtml: string | null
  expectedSalary: number | null
  expectedSalaryCurrency: string | null
  noticePeriodDays: number | null
  noticePeriod: string | null
  workAuthorization: string | null
  openToRelocation: boolean
  educationLevel: string | null
  employmentStatus: string | null
  careerLevel: string | null
  hasGccExperience: boolean | null
  hasDrivingLicence: boolean | null
  industries: string[]
  functions: string[]
  desiredEmploymentTypes: string[]
  benefits: string[]
  preferredPositions: string[]
  preferredIndustries: string[]
  preferredCities: string[]
  currentSalary: string | null
  hasDisability: boolean | null
  linkedinUrl: string | null
  portfolioUrl: string | null
  experiences: { id: number; jobTitle: string; companyName: string; location: string | null; startDate: string; endDate: string | null; isCurrent: boolean; description: string | null; descriptionHtml: string | null; employmentType: string | null }[]
  educations: { id: number; institution: string; qualification: string; fieldOfStudy: string | null; startYear: number | null; endYear: number | null; startDate: string | null; endDate: string | null }[]
  certifications: { id: number; name: string; issuer: string | null; year: number | null }[]
  languages: { name: string; proficiency: string }[]
  contact: { email: string; phone: string | null; whatsapp: string | null; instagramUrl: string | null; facebookUrl: string | null } | null
  cvs: CvBrief[]
}

/** Search result row. Contains only what the presenter allows: no contact details, no CV links. */
export function CandidateResult({ c, saved, highlight }: { c: CandidateCard; saved?: boolean; highlight?: string[] }) {
  return (
    <article className="relative flex gap-4 border-b border-line px-5 py-4 last:border-b-0">
      <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-full bg-dune font-display text-sm font-bold text-brand-700">{initials(c.name)}</span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <h3 className="font-sans text-base font-semibold tracking-normal">
            <Link href={`/employer/candidates/${c.id}`} className="after:absolute after:inset-0 hover:text-brand-700">{c.headline || c.currentJobTitle || 'Candidate'}</Link>
          </h3>
          <span className="text-sm text-slate">{c.name}</span>
        </div>
        <p className="mt-0.5 text-sm text-slate">
          {[c.currentJobTitle && c.headline ? c.currentJobTitle : null, c.yearsExperience !== null ? `${c.yearsExperience} yrs experience` : null, c.industry].filter(Boolean).join(', ')}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {c.skills.map((s) => (
            <span key={s} className={cn('rounded-full px-2 py-0.5 text-[12px] ring-1 ring-inset', highlight?.some((h) => h.toLowerCase() === s.toLowerCase()) ? 'bg-brand-50 text-brand-700 ring-brand-100' : 'bg-pearl text-slate ring-line')}>{s}</span>
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
        {saved && <BookmarkCheck className="size-4 text-brand-600" aria-label="Saved" />}
      </div>
    </article>
  )
}

const yesNo = (v: boolean | null | undefined) => (v === null || v === undefined ? null : v ? 'Yes' : 'No')
const monthYear = (d: string | null) => (d ? date(d, { month: 'short', year: 'numeric' }) : null)

function TagList({ items }: { items: string[] }) {
  return <ul className="flex flex-wrap gap-1.5">{items.map((s) => <li key={s}><Badge>{s}</Badge></li>)}</ul>
}

export function CandidateProfileView({ c, showFullName }: { c: CandidateDetail; showFullName?: boolean }) {
  const facts: Array<[string, string | null]> = [
    ['Experience', c.yearsExperience !== null ? `${c.yearsExperience} years` : null],
    ['Career level', c.careerLevel],
    ['Employment status', c.employmentStatus],
    ['Industry', c.industries.length ? c.industries.join(', ') : c.industry],
    ['Function', c.functions.length ? c.functions.join(', ') : null],
    ['Location', c.location],
    ['Prefers to work in', [c.preferredCities.join(', '), c.preferredLocation].filter(Boolean).join(' — ') || null],
    ['Education', c.educationLevel ? EducationLevel.label(c.educationLevel as never) : null],
    ['Availability', c.noticePeriod ? `Notice period: ${c.noticePeriod}` : c.availability ? Availability.label(c.availability as never) : null],
    ['Notice period', !c.noticePeriod && c.noticePeriodDays !== null ? `${c.noticePeriodDays} days` : null],
    ['GCC experience', yesNo(c.hasGccExperience)],
    ['Driving licence', yesNo(c.hasDrivingLicence)],
    ['Employment type wanted', c.desiredEmploymentTypes.length ? c.desiredEmploymentTypes.join(', ') : null],
    ['Current salary', c.currentSalary ? `${c.currentSalary} / month` : null],
    ['Expected salary', c.expectedSalary !== null ? `${money(c.expectedSalary, c.expectedSalaryCurrency)} / month` : null],
    ['Work authorisation', c.workAuthorization ? WorkAuthorization.label(c.workAuthorization as never) : null],
    ['Relocation', c.openToRelocation ? 'Open to relocating to another Gulf country' : null],
    ['Disability', c.hasDisability ? 'Yes (shared with employers only)' : null],
  ]
  return (
    <div className="flex flex-col gap-6">
      <header className="flex gap-4">
        {c.photoUrl ? (
          <img src={c.photoUrl} alt={`Photo of ${c.fullName}`} className="h-28 w-24 shrink-0 rounded-[10px] object-cover" />
        ) : (
          <span aria-hidden className="grid size-16 shrink-0 place-items-center rounded-full bg-mint font-display text-lg font-bold text-brand-700">{initials(c.fullName)}</span>
        )}
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">{showFullName ? c.fullName : c.name}</h1>
          {c.desiredPosition && <p className="mt-0.5 font-medium text-navy">Position wanted: {c.desiredPosition}</p>}
          {c.headline && <p className="mt-1 text-[16px]">{c.headline}</p>}
          <p className="mt-1 text-sm text-slate">Profile updated {ago(c.profileUpdatedAt)}</p>
        </div>
      </header>

      <Panel title="About me">
        {c.summaryHtml ? <SafeHtml html={c.summaryHtml} /> : c.summary ? <RichText text={c.summary} /> : <p className="text-sm text-slate">No summary provided.</p>}
        <dl className="mt-5 grid gap-x-6 gap-y-3 border-t border-line pt-4 sm:grid-cols-2">
          {facts.filter(([, v]) => v).map(([k, v]) => (
            <div key={k}><dt className="text-[13px] text-slate">{k}</dt><dd className="text-sm font-medium">{v}</dd></div>
          ))}
        </dl>
      </Panel>

      {c.experiences.length > 0 && (
        <Panel title="Employment details" padded={false}>
          <ol className="divide-y divide-line">
            {c.experiences.map((x) => (
              <li key={x.id} className="px-5 py-4">
                <p className="font-medium">{x.jobTitle}</p>
                <p className="text-sm text-slate">
                  {x.companyName}{x.location ? `, ${x.location}` : ''}{x.employmentType ? ` · ${x.employmentType}` : ''} — {monthYear(x.startDate)} to {x.isCurrent ? 'present' : monthYear(x.endDate)}
                </p>
                {x.descriptionHtml ? <div className="mt-2 text-sm"><SafeHtml html={x.descriptionHtml} /></div> : x.description && <div className="mt-2 text-sm"><RichText text={x.description} /></div>}
              </li>
            ))}
          </ol>
        </Panel>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Panel title="Skills">
          {c.skills.length ? <TagList items={c.skills} /> : <p className="text-sm text-slate">None listed.</p>}
        </Panel>
        <Panel title="Languages">
          {c.languages.length ? <ul className="flex flex-col gap-1 text-sm">{c.languages.map((l) => <li key={l.name}>{l.name} <span className="text-slate">— {LanguageProficiency.label(l.proficiency as never)}</span></li>)}</ul> : <p className="text-sm text-slate">None listed.</p>}
        </Panel>
        {c.educations.length > 0 && (
          <Panel title="Education">
            <ul className="flex flex-col gap-3 text-sm">
              {c.educations.map((e) => (
                <li key={e.id}>
                  <p className="font-medium">{e.qualification}{e.fieldOfStudy ? `, ${e.fieldOfStudy}` : ''}</p>
                  <p className="text-slate">
                    {e.institution}
                    {e.startDate || e.endDate ? ` (${[monthYear(e.startDate), monthYear(e.endDate)].filter(Boolean).join(' – ')})` : e.endYear ? ` (${e.endYear})` : ''}
                  </p>
                </li>
              ))}
            </ul>
          </Panel>
        )}
        {c.certifications.length > 0 && (
          <Panel title="Certifications">
            <ul className="flex flex-col gap-1 text-sm">{c.certifications.map((x) => <li key={x.id}>{x.name}{x.issuer ? <span className="text-slate"> — {x.issuer}</span> : null}{x.year ? <span className="text-slate"> ({x.year})</span> : null}</li>)}</ul>
          </Panel>
        )}
        {(c.preferredPositions.length > 0 || c.preferredIndustries.length > 0 || c.benefits.length > 0) && (
          <Panel title="Employment preferences" className="md:col-span-2">
            <dl className="grid gap-4 sm:grid-cols-2">
              {c.preferredPositions.length > 0 && <div><dt className="mb-1.5 text-[13px] text-slate">Preferred positions</dt><dd><TagList items={c.preferredPositions} /></dd></div>}
              {c.preferredIndustries.length > 0 && <div><dt className="mb-1.5 text-[13px] text-slate">Preferred industries</dt><dd><TagList items={c.preferredIndustries} /></dd></div>}
              {c.benefits.length > 0 && <div className="sm:col-span-2"><dt className="mb-1.5 text-[13px] text-slate">Benefits looking for</dt><dd><TagList items={c.benefits} /></dd></div>}
            </dl>
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
          <li className="flex items-center gap-2"><Mail className="size-4 text-slate" aria-hidden /><a href={`mailto:${c.contact.email}`} className="break-all text-brand-700 hover:underline">{c.contact.email}</a></li>
          {c.contact.phone && <li className="flex items-center gap-2"><Phone className="size-4 text-slate" aria-hidden /><a href={`tel:${c.contact.phone.replace(/\s/g, '')}`} className="hover:underline">{c.contact.phone}</a></li>}
          {c.contact.whatsapp && <li className="flex items-center gap-2"><MessageCircle className="size-4 text-slate" aria-hidden /><a href={`https://wa.me/${c.contact.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer nofollow" className="hover:underline">WhatsApp {c.contact.whatsapp}</a></li>}
          {c.linkedinUrl && <li className="flex items-center gap-2"><Link2 className="size-4 text-slate" aria-hidden /><a href={c.linkedinUrl} target="_blank" rel="noopener noreferrer nofollow" className="text-brand-700 hover:underline">LinkedIn</a></li>}
          {c.contact.instagramUrl && <li className="flex items-center gap-2"><Link2 className="size-4 text-slate" aria-hidden /><a href={c.contact.instagramUrl} target="_blank" rel="noopener noreferrer nofollow" className="text-brand-700 hover:underline">Instagram</a></li>}
          {c.contact.facebookUrl && <li className="flex items-center gap-2"><Link2 className="size-4 text-slate" aria-hidden /><a href={c.contact.facebookUrl} target="_blank" rel="noopener noreferrer nofollow" className="text-brand-700 hover:underline">Facebook</a></li>}
          {c.portfolioUrl && <li className="flex items-center gap-2"><Globe className="size-4 text-slate" aria-hidden /><a href={c.portfolioUrl} target="_blank" rel="noopener noreferrer nofollow" className="text-brand-700 hover:underline">Portfolio</a></li>}
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

