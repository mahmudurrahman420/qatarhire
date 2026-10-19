import { Head, Link, router, useForm } from '@inertiajs/react'
import { useState, type FormEvent } from 'react'
import { SlidersHorizontal, X, Search, BellPlus } from 'lucide-react'
import SiteLayout from '~/layouts/site_layout'
import { JobList } from '~/components/jobs'
import { Button, ButtonLink } from '~/components/ui/button'
import { controlClass, Checkbox, TextField } from '~/components/ui/form'
import { EmptyState, Modal, Pagination } from '~/components/ui/misc'
import { EducationLevel, EmploymentType, SortOptionsJobs, WorkArrangement } from '#shared/enums'
import { toQuery } from '~/lib/format'
import { useShared } from '~/lib/page'
import type { JobCard, Paginated, Taxonomy } from '~/lib/types'
import { cn } from '~/lib/cn'
import { LocationSlugOptions } from '~/lib/locations'
import { countryBySlug, GulfCountries } from '#shared/gulf'

type Filters = {
  q: string; location: string; category: string; industry: string; company: string
  type: string[]; arrangement: string[]; education: string; experience: number | null
  salary: number | null; currency: string; posted: number | null; sort: string; page: number
}
type Props = { placeName: string; filters: Filters; results: Paginated<JobCard>; savedIds: number[]; taxonomy: Pick<Taxonomy, 'categories' | 'industries' | 'locations'> }

function go(f: Partial<Filters>) {
  const qs = toQuery({ ...f, page: f.page && f.page > 1 ? f.page : undefined, sort: f.sort === 'relevance' ? undefined : f.sort })
  router.get(`/jobs${qs ? `?${qs}` : ''}`, {}, { preserveState: true, preserveScroll: false })
}

function toggle(list: string[], v: string) {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v]
}

export default function JobsIndex({ placeName, filters, results, savedIds, taxonomy }: Props) {
  const { auth } = useShared()
  const [q, setQ] = useState(filters.q)
  const [mobileFilters, setMobileFilters] = useState(false)
  const [alertOpen, setAlertOpen] = useState(() => typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('alert') === '1')
  // salary amounts only compare within one currency: the selected country's, or the one chosen here
  const salaryCurrency = filters.currency || countryBySlug(filters.location)?.currency || ''
  const steps = ['KWD', 'OMR', 'BHD'].includes(salaryCurrency) ? [300, 500, 800, 1200, 1800, 2500, 3500] : [3000, 5000, 8000, 12000, 18000, 25000, 35000]
  const update = (patch: Partial<Filters>) => go({ ...filters, ...patch, page: 1 })

  const active =
    [filters.location, filters.category, filters.industry, filters.company, filters.education].filter(Boolean).length +
    filters.type.length + filters.arrangement.length + [filters.experience, filters.salary, filters.posted].filter((v) => v !== null).length

  const pill = (on: boolean) => cn('rounded-full border px-3 py-1 text-[13px] transition-colors', on ? 'border-brand-600 bg-brand-600 text-white' : 'border-line bg-white hover:border-slate/40')

  const filterPanel = (
    <div className="flex flex-col gap-6">
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Location</legend>
        <select className={cn(controlClass, 'h-10')} value={filters.location} onChange={(e) => update({ location: e.target.value })} aria-label="Location">
          <LocationSlugOptions locations={taxonomy.locations} />
        </select>
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Category</legend>
        <select className={cn(controlClass, 'h-10')} value={filters.category} onChange={(e) => update({ category: e.target.value })} aria-label="Category">
          <option value="">Any category</option>
          {taxonomy.categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Industry</legend>
        <select className={cn(controlClass, 'h-10')} value={filters.industry} onChange={(e) => update({ industry: e.target.value })} aria-label="Industry">
          <option value="">Any industry</option>
          {taxonomy.industries.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Job type</legend>
        <div className="flex flex-wrap gap-2">
          {EmploymentType.values.map((t) => (
            <button key={t} type="button" aria-pressed={filters.type.includes(t)} className={pill(filters.type.includes(t))} onClick={() => update({ type: toggle(filters.type, t) })}>
              {EmploymentType.label(t)}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Work arrangement</legend>
        <div className="flex flex-col gap-2">
          {WorkArrangement.values.map((t) => (
            <Checkbox key={t} label={WorkArrangement.label(t)} checked={filters.arrangement.includes(t)} onChange={() => update({ arrangement: toggle(filters.arrangement, t) })} />
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Minimum monthly salary</legend>
        <div className="grid grid-cols-[92px_1fr] gap-2">
          <select className={cn(controlClass, 'h-10')} value={salaryCurrency} onChange={(e) => update({ currency: e.target.value, salary: null })} aria-label="Salary currency">
            <option value="">Currency</option>
            {GulfCountries.map((c) => <option key={c.currency} value={c.currency}>{c.currency}</option>)}
          </select>
          <select className={cn(controlClass, 'h-10')} disabled={!salaryCurrency} value={filters.salary ?? ''} onChange={(e) => update({ salary: e.target.value ? Number(e.target.value) : null, currency: salaryCurrency })} aria-label="Minimum monthly salary">
            <option value="">Any salary</option>
            {steps.map((s) => <option key={s} value={s}>{s.toLocaleString('en')}+</option>)}
          </select>
        </div>
        <p className="mt-1.5 text-xs text-slate">{salaryCurrency ? 'Only includes jobs that state a salary in this currency.' : 'Pick a country or currency first.'}</p>
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-sm font-medium">My experience</legend>
        <select className={cn(controlClass, 'h-10')} value={filters.experience ?? ''} onChange={(e) => update({ experience: e.target.value === '' ? null : Number(e.target.value) })} aria-label="Years of experience">
          <option value="">Any requirement</option>
          {[0, 1, 2, 3, 5, 8, 10, 15].map((y) => <option key={y} value={y}>{y === 0 ? 'No experience yet' : `${y} years`}</option>)}
        </select>
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-sm font-medium">My education</legend>
        <select className={cn(controlClass, 'h-10')} value={filters.education} onChange={(e) => update({ education: e.target.value })} aria-label="Education">
          <option value="">Any requirement</option>
          {EducationLevel.values.filter((v) => v !== 'none').map((v) => <option key={v} value={v}>{EducationLevel.label(v)}</option>)}
        </select>
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Posted</legend>
        <div className="flex flex-wrap gap-2">
          {[[null, 'Any time'], [1, 'Last 24 hours'], [7, 'Last 7 days'], [30, 'Last 30 days']].map(([v, l]) => (
            <button key={String(v)} type="button" aria-pressed={filters.posted === v} className={pill(filters.posted === v)} onClick={() => update({ posted: v as number | null })}>
              {l}
            </button>
          ))}
        </div>
      </fieldset>
    </div>
  )

  function submit(e: FormEvent) {
    e.preventDefault()
    update({ q })
  }

  const title = `${filters.q ? `${filters.q} jobs` : 'Jobs'} in ${placeName}`
  return (
    <SiteLayout>
      <Head title={title} />
      <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
        <form onSubmit={submit} role="search" className="flex gap-2">
          <label className="relative flex-1">
            <span className="sr-only">Search jobs</span>
            <Search className="absolute start-3 top-1/2 size-5 -translate-y-1/2 text-slate" aria-hidden />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Job title, skill or company" className={cn(controlClass, 'h-12 ps-10 text-base')} />
          </label>
          <Button type="submit" size="lg">Search</Button>
        </form>

        <div className="mt-6 grid gap-8 lg:grid-cols-[260px_1fr]">
          <aside className="hidden lg:block" aria-label="Filters">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-sans text-base font-semibold tracking-normal">Filters</h2>
              {active > 0 && <Link href={filters.q ? `/jobs?q=${encodeURIComponent(filters.q)}` : '/jobs'} className="text-sm text-brand-700 hover:underline">Clear all</Link>}
            </div>
            {filterPanel}
          </aside>

          <section aria-live="polite">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl">{title}</h1>
                <p className="text-sm text-slate">{results.meta.total.toLocaleString('en')} job{results.meta.total === 1 ? '' : 's'}</p>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setMobileFilters(true)} className="inline-flex h-10 items-center gap-2 rounded-ctl border border-line bg-white px-3 text-sm lg:hidden">
                  <SlidersHorizontal className="size-4" /> Filters{active ? ` (${active})` : ''}
                </button>
                <label className="flex items-center gap-2 text-sm">
                  <span className="text-slate">Sort</span>
                  <select value={filters.sort} onChange={(e) => update({ sort: e.target.value })} className={cn(controlClass, 'h-10 w-auto')}>
                    {SortOptionsJobs.values.map((s) => <option key={s} value={s}>{SortOptionsJobs.label(s)}</option>)}
                  </select>
                </label>
                {auth?.role === 'candidate' && (
                  <Button type="button" variant="secondary" onClick={() => setAlertOpen(true)} title="Email me new jobs for this search">
                    <BellPlus className="size-4" /> <span className="hidden sm:inline">Create alert</span>
                  </Button>
                )}
              </div>
            </div>

            {active > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {filters.location && <Chip label={`Location: ${placeName}`} onRemove={() => update({ location: '' })} />}
                {filters.category && <Chip label={taxonomy.categories.find((c) => c.slug === filters.category)?.name ?? filters.category} onRemove={() => update({ category: '' })} />}
                {filters.industry && <Chip label={taxonomy.industries.find((c) => c.slug === filters.industry)?.name ?? filters.industry} onRemove={() => update({ industry: '' })} />}
                {filters.company && <Chip label={`Company: ${filters.company.replace(/-/g, ' ')}`} onRemove={() => update({ company: '' })} />}
                {filters.type.map((t) => <Chip key={t} label={EmploymentType.label(t as never)} onRemove={() => update({ type: filters.type.filter((x) => x !== t) })} />)}
                {filters.arrangement.map((t) => <Chip key={t} label={WorkArrangement.label(t as never)} onRemove={() => update({ arrangement: filters.arrangement.filter((x) => x !== t) })} />)}
                {filters.salary !== null && <Chip label={`${salaryCurrency} ${filters.salary.toLocaleString('en')}+`} onRemove={() => update({ salary: null })} />}
                {filters.experience !== null && <Chip label={`${filters.experience} yrs experience`} onRemove={() => update({ experience: null })} />}
                {filters.education && <Chip label={EducationLevel.label(filters.education as never)} onRemove={() => update({ education: '' })} />}
                {filters.posted !== null && <Chip label={`Last ${filters.posted} day${filters.posted > 1 ? 's' : ''}`} onRemove={() => update({ posted: null })} />}
              </div>
            )}

            {results.data.length ? (
              <>
                <JobList jobs={results.data} savedIds={savedIds} canSave={auth?.role === 'candidate'} />
                <div className="mt-6">
                  <Pagination meta={results.meta} href={(p) => `/jobs?${toQuery({ ...filters, sort: filters.sort === 'relevance' ? '' : filters.sort, page: p > 1 ? p : '' })}`} />
                </div>
              </>
            ) : (
              <EmptyState
                title="No jobs match this search"
                action={<ButtonLink href="/jobs" variant="secondary">Clear search and filters</ButtonLink>}
              >
                Try fewer filters, a broader location such as a whole country, or a shorter keyword — for example "accountant" instead of "senior chartered accountant".
                {auth?.role === 'candidate' && ' You can also create an alert and we will email you when a match is posted.'}
              </EmptyState>
            )}
          </section>
        </div>
      </div>

      <Modal open={mobileFilters} onClose={() => setMobileFilters(false)} title="Filters">
        {filterPanel}
        <div className="mt-6 flex justify-between">
          <ButtonLink href="/jobs" variant="quiet">Clear all</ButtonLink>
          <Button type="button" onClick={() => setMobileFilters(false)}>Show {results.meta.total} jobs</Button>
        </div>
      </Modal>

      {auth?.role === 'candidate' && <AlertModal open={alertOpen} onClose={() => setAlertOpen(false)} filters={filters} />}
    </SiteLayout>
  )
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white py-1 pe-1 ps-3 text-[13px] capitalize ring-1 ring-line">
      {label}
      <button type="button" onClick={onRemove} className="rounded-full p-0.5 hover:bg-pearl" aria-label={`Remove filter ${label}`}>
        <X className="size-3.5" />
      </button>
    </span>
  )
}

function AlertModal({ open, onClose, filters }: { open: boolean; onClose: () => void; filters: Filters }) {
  const form = useForm({ name: filters.q || 'Jobs in the Gulf', query: toQuery({ ...filters, page: '', sort: '' }) })
  return (
    <Modal open={open} onClose={onClose} title="Email me new jobs for this search">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          form.post('/candidate/alerts', { preserveScroll: true, onSuccess: onClose })
        }}
        className="flex flex-col gap-4"
      >
        <TextField label="Alert name" value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} error={form.errors.name} required />
        <p className="text-sm text-slate">We check for new matching jobs regularly and email you a short list. Manage alerts under Saved jobs & alerts.</p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="quiet" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={form.processing}>Create alert</Button>
        </div>
      </form>
    </Modal>
  )
}
