import { Head, Link, router, useForm } from '@inertiajs/react'
import { useState, type FormEvent } from 'react'
import { Lock, Search, SlidersHorizontal, Trash2 } from 'lucide-react'
import AppLayout from '~/layouts/app_layout'
import { Button, ButtonLink } from '~/components/ui/button'
import { Checkbox, controlClass, TextField } from '~/components/ui/form'
import { EmptyState, Modal, PageHeader, Pagination, Panel } from '~/components/ui/misc'
import { CandidateResult } from '~/components/candidates'
import { TagInput } from '~/components/tag_input'
import { Availability, EducationLevel, SortOptionsCandidates, WorkAuthorization } from '#shared/enums'
import { toQuery } from '~/lib/format'
import type { CandidateCard, Paginated, Taxonomy } from '~/lib/types'
import { cn } from '~/lib/cn'
import { LocationSlugOptions } from '~/lib/locations'
import { GulfCountries } from '#shared/gulf'
import { Gender } from '#shared/enums'

type Filters = {
  q: string; title: string; skills: string[]; skillMode: 'all' | 'any'; industry: string; expMin: number | null; expMax: number | null
  education: string; certification: string; languages: string[]; location: string; preferred: string; salaryMin: number | null; salaryMax: number | null; currency: string; gender: string
  availability: string[]; noticeMax: number | null; authorization: string[]; updated: number | null; completeness: number | null; hasCv: boolean; sort: string; page: number
}
type Props = {
  allowed: boolean
  companyStatus: string
  filters: Filters
  results: Paginated<CandidateCard> | null
  savedIds: number[]
  savedSearches: { id: number; name: string; filters: Record<string, unknown> }[]
  taxonomy: Taxonomy
}

/** Filters as they appear in the URL (numbers as strings, empties dropped). */
function qs(f: Partial<Filters>) {
  const { page, sort, skillMode, ...rest } = f
  return toQuery({ ...rest, skillMode: skillMode === 'any' ? 'any' : '', sort: sort && sort !== 'relevance' ? sort : '', page: page && page > 1 ? page : '' })
}

const n = (v: string) => (v === '' ? null : Number(v))
const sv = (v: number | null) => (v === null ? '' : String(v))

export default function CandidateSearch({ allowed, companyStatus, filters, results, savedIds, savedSearches, taxonomy }: Props) {
  const [draft, setDraft] = useState(filters)
  const [mobile, setMobile] = useState(false)
  const [saving, setSaving] = useState(false)
  const skillByName = new Map(taxonomy.skills.map((s) => [s.name.toLowerCase(), s.slug]))
  const skillBySlug = new Map(taxonomy.skills.map((s) => [s.slug, s.name]))

  const apply = (f: Filters) => router.get(`/employer/candidates?${qs({ ...f, page: 1 })}`, {}, { preserveState: true })
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => setDraft((d) => ({ ...d, [k]: v }))
  const toggle = (k: 'languages' | 'availability' | 'authorization', v: string) => set(k, draft[k].includes(v) ? draft[k].filter((x) => x !== v) : [...draft[k], v])
  const submit = (e: FormEvent) => {
    e.preventDefault()
    setMobile(false)
    apply(draft)
  }

  if (!allowed) {
    return (
      <AppLayout>
        <Head title="Search candidates" />
        <PageHeader title="Search candidates" />
        <EmptyState title="Candidate search opens once your company is verified" action={<ButtonLink href="/employer/company" variant="secondary">Review company profile</ButtonLink>}>
          {companyStatus === 'pending'
            ? 'Our team is reviewing your company. In the meantime you can post jobs and manage applicants. Adding your CR number and a complete profile speeds up verification.'
            : `Your company is ${companyStatus}. Contact us if you believe this is a mistake.`}
          <span className="mt-2 flex items-center gap-1.5"><Lock className="size-4" aria-hidden /> Candidates trust that only verified employers can find them.</span>
        </EmptyState>
      </AppLayout>
    )
  }

  const locationSelect = (value: string, onChange: (v: string) => void, label: string) => (
    <label className="flex flex-col gap-1.5 text-sm font-medium">
      {label}
      <select className={cn(controlClass, 'h-10 font-normal')} value={value} onChange={(e) => onChange(e.target.value)}>
        <LocationSlugOptions locations={taxonomy.locations} anyLabel="Any" />
      </select>
    </label>
  )

  const filterForm = (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <TextField label="Job title" placeholder="e.g. Quantity surveyor" value={draft.title} onChange={(e) => set('title', e.target.value)} hint="Matches current title, headline and past roles." />
      <div className="flex flex-col gap-2">
        <TagInput
          label="Skills"
          value={draft.skills.map((s) => skillBySlug.get(s) ?? s)}
          onChange={(names) => set('skills', names.map((x) => skillByName.get(x.toLowerCase())).filter((x): x is string => Boolean(x)))}
          suggestions={taxonomy.skills.map((s) => s.name)}
          placeholder="Choose from the list"
          max={15}
        />
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-1.5"><input type="radio" className="accent-brand-600" checked={draft.skillMode === 'all'} onChange={() => set('skillMode', 'all')} /> Has all</label>
          <label className="flex items-center gap-1.5"><input type="radio" className="accent-brand-600" checked={draft.skillMode === 'any'} onChange={() => set('skillMode', 'any')} /> Has any</label>
        </div>
      </div>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Industry
        <select className={cn(controlClass, 'h-10 font-normal')} value={draft.industry} onChange={(e) => set('industry', e.target.value)}>
          <option value="">Any</option>
          {taxonomy.industries.map((i) => <option key={i.slug} value={i.slug}>{i.name}</option>)}
        </select>
      </label>
      <fieldset className="grid grid-cols-2 gap-2">
        <legend className="mb-1.5 text-sm font-medium">Years of experience</legend>
        <input aria-label="Minimum years" type="number" min={0} placeholder="Min" className={cn(controlClass, 'h-10')} value={sv(draft.expMin)} onChange={(e) => set('expMin', n(e.target.value))} />
        <input aria-label="Maximum years" type="number" min={0} placeholder="Max" className={cn(controlClass, 'h-10')} value={sv(draft.expMax)} onChange={(e) => set('expMax', n(e.target.value))} />
      </fieldset>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Education (at least)
        <select className={cn(controlClass, 'h-10 font-normal')} value={draft.education} onChange={(e) => set('education', e.target.value)}>
          <option value="">Any</option>
          {EducationLevel.values.filter((v) => v !== 'none').map((v) => <option key={v} value={v}>{EducationLevel.label(v)}</option>)}
        </select>
      </label>
      <TextField label="Certification" placeholder="e.g. NEBOSH, PMP" value={draft.certification} onChange={(e) => set('certification', e.target.value)} />
      {locationSelect(draft.location, (v) => set('location', v), 'Current location')}
      {locationSelect(draft.preferred, (v) => set('preferred', v), 'Wants to work in')}
      <fieldset className="grid grid-cols-2 gap-2">
        <legend className="mb-1.5 text-sm font-medium">Expected monthly salary</legend>
        <select aria-label="Salary currency" className={cn(controlClass, 'col-span-2 h-10')} value={draft.currency} onChange={(e) => set('currency', e.target.value)}>
          <option value="">Currency of the selected country</option>
          {GulfCountries.map((c) => <option key={c.currency} value={c.currency}>{c.currency} ({c.name})</option>)}
        </select>
        <input aria-label="Minimum salary" type="number" min={0} step={500} placeholder="From" className={cn(controlClass, 'h-10')} value={sv(draft.salaryMin)} onChange={(e) => set('salaryMin', n(e.target.value))} />
        <input aria-label="Maximum salary" type="number" min={0} step={500} placeholder="To" className={cn(controlClass, 'h-10')} value={sv(draft.salaryMax)} onChange={(e) => set('salaryMax', n(e.target.value))} />
        <p className="col-span-2 text-[12px] text-slate">Only candidates who shared an expected salary.</p>
      </fieldset>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm font-medium">Availability</legend>
        {Availability.values.filter((v) => v !== 'not_looking').map((v) => <Checkbox key={v} label={Availability.label(v)} checked={draft.availability.includes(v)} onChange={() => toggle('availability', v)} />)}
      </fieldset>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Notice period up to
        <select className={cn(controlClass, 'h-10 font-normal')} value={sv(draft.noticeMax)} onChange={(e) => set('noticeMax', n(e.target.value))}>
          <option value="">Any</option>
          {[0, 7, 15, 30, 60, 90].map((d) => <option key={d} value={d}>{d === 0 ? 'Immediate' : `${d} days`}</option>)}
        </select>
      </label>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm font-medium">Languages</legend>
        <div className="grid grid-cols-2 gap-2">
          {taxonomy.languages.slice(0, 12).map((l) => <Checkbox key={l.code} label={l.name} checked={draft.languages.includes(l.code)} onChange={() => toggle('languages', l.code)} />)}
        </div>
      </fieldset>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm font-medium">Work authorisation</legend>
        {WorkAuthorization.values.filter((v) => v !== 'prefer_not_to_say').map((v) => <Checkbox key={v} label={WorkAuthorization.label(v)} checked={draft.authorization.includes(v)} onChange={() => toggle('authorization', v)} />)}
        <p className="text-[12px] text-slate">Only candidates who chose to share this.</p>
      </fieldset>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Profile updated
        <select className={cn(controlClass, 'h-10 font-normal')} value={sv(draft.updated)} onChange={(e) => set('updated', n(e.target.value))}>
          <option value="">Any time</option>
          <option value="7">In the last week</option>
          <option value="30">In the last month</option>
          <option value="90">In the last 3 months</option>
        </select>
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Profile completeness
        <select className={cn(controlClass, 'h-10 font-normal')} value={sv(draft.completeness)} onChange={(e) => set('completeness', n(e.target.value))}>
          <option value="">Any</option>
          <option value="50">50% or more</option>
          <option value="75">75% or more</option>
          <option value="90">90% or more</option>
        </select>
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Gender
        <select className={cn(controlClass, 'h-10 font-normal')} value={draft.gender} onChange={(e) => set('gender', e.target.value)}>
          <option value="">Any</option>
          {Gender.values.map((g) => <option key={g} value={g}>{Gender.label(g)}</option>)}
        </select>
      </label>
      <Checkbox label="Has a downloadable CV" checked={draft.hasCv} onChange={(e) => set('hasCv', e.target.checked)} />
      <div className="sticky bottom-0 flex gap-2 bg-pearl py-2 lg:bg-transparent">
        <Button type="submit" className="flex-1">Apply filters</Button>
        <ButtonLink href="/employer/candidates" variant="quiet">Reset</ButtonLink>
      </div>
    </form>
  )

  const total = results?.meta.total ?? 0
  return (
    <AppLayout>
      <Head title="Search candidates" />
      <PageHeader title="Search candidates" description="Candidates who chose to be discoverable by verified employers, plus public profiles. Contact details and CVs appear on a profile only where the candidate allows it." />

      <form onSubmit={submit} className="mb-6 flex gap-2" role="search">
        <label className="relative flex-1">
          <span className="sr-only">Keywords</span>
          <Search className="absolute start-3 top-1/2 size-5 -translate-y-1/2 text-slate" aria-hidden />
          <input value={draft.q} onChange={(e) => set('q', e.target.value)} placeholder="Keywords: skills, titles, certifications" className={cn(controlClass, 'h-12 ps-10 text-base')} />
        </label>
        <Button type="submit" size="lg">Search</Button>
        <Button type="button" variant="secondary" size="lg" className="lg:hidden" onClick={() => setMobile(true)} aria-label="Filters"><SlidersHorizontal className="size-4" /></Button>
      </form>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="hidden lg:block" aria-label="Filters">{filterForm}</aside>
        <section aria-live="polite">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm"><span className="font-semibold">{total.toLocaleString('en')}</span> candidate{total === 1 ? '' : 's'}</p>
            <div className="flex items-center gap-2">
              <select aria-label="Sort" value={filters.sort} onChange={(e) => apply({ ...filters, sort: e.target.value })} className={cn(controlClass, 'h-9 w-auto text-sm')}>
                {SortOptionsCandidates.values.map((v) => <option key={v} value={v}>{SortOptionsCandidates.label(v)}</option>)}
              </select>
              <Button size="sm" variant="secondary" onClick={() => setSaving(true)}>Save search</Button>
            </div>
          </div>
          {results && results.data.length ? (
            <>
              <div className="overflow-hidden rounded-panel border border-line bg-white">
                {results.data.map((c) => <CandidateResult key={c.id} c={c} saved={savedIds.includes(c.id)} highlight={filters.skills.map((s) => skillBySlug.get(s) ?? s)} />)}
              </div>
              <div className="mt-6"><Pagination meta={results.meta} href={(p) => `/employer/candidates?${qs({ ...filters, page: p })}`} /></div>
            </>
          ) : (
            <EmptyState title="No candidates match all of these filters" action={<ButtonLink href="/employer/candidates" variant="secondary">Reset filters</ButtonLink>}>
              Try "Has any" for skills, widen the experience range, or remove the salary and location filters. New candidates join every day — save this search to come back to it.
            </EmptyState>
          )}

          {savedSearches.length > 0 && (
            <Panel title="Your saved searches" className="mt-8" padded={false}>
              <ul className="divide-y divide-line">
                {savedSearches.map((s) => (
                  <li key={s.id} className="flex items-center justify-between px-5 py-2.5">
                    <Link href={`/employer/candidates?${qs(s.filters as Partial<Filters>)}`} className="text-sm font-medium hover:text-brand-700">{s.name}</Link>
                    <Button size="sm" variant="quiet" aria-label={`Delete ${s.name}`} onClick={() => router.delete(`/employer/saved-searches/${s.id}`, { preserveScroll: true })}><Trash2 className="size-4" /></Button>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </section>
      </div>

      <Modal open={mobile} onClose={() => setMobile(false)} title="Filters">{filterForm}</Modal>
      <SaveSearchModal open={saving} onClose={() => setSaving(false)} query={qs(filters)} />
    </AppLayout>
  )
}

function SaveSearchModal({ open, onClose, query }: { open: boolean; onClose: () => void; query: string }) {
  const form = useForm({ name: '', query })
  return (
    <Modal open={open} onClose={onClose} title="Save this search">
      <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); form.transform((d) => ({ ...d, query })); form.post('/employer/saved-searches', { preserveScroll: true, onSuccess: () => { form.reset(); onClose() } }) }}>
        <TextField label="Name" placeholder="e.g. MEP engineers, Dubai, immediate" value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} error={form.errors.name} required />
        <p className="text-sm text-slate">Saved searches are private to you and re-run with the latest candidates each time.</p>
        <div className="flex justify-end gap-2"><Button type="button" variant="quiet" onClick={onClose}>Cancel</Button><Button type="submit" loading={form.processing}>Save search</Button></div>
      </form>
    </Modal>
  )
}
