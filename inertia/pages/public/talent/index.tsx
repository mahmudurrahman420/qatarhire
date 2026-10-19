import { Head, Link, router } from '@inertiajs/react'
import { useState, type FormEvent } from 'react'
import { Search } from 'lucide-react'
import SiteLayout from '~/layouts/site_layout'
import { TalentCard } from '~/components/talent'
import { Button, ButtonLink } from '~/components/ui/button'
import { Checkbox, controlClass } from '~/components/ui/form'
import { EmptyState, Pagination } from '~/components/ui/misc'
import { LocationSlugOptions } from '~/lib/locations'
import { Availability, Gender } from '#shared/enums'
import { toQuery } from '~/lib/format'
import { useShared } from '~/lib/page'
import type { CandidateCard, Paginated, Taxonomy } from '~/lib/types'
import { cn } from '~/lib/cn'

type Filters = { q: string; location: string; industry: string; availability: string[]; expMin: number | null; gender: string; hasCv: boolean; sort: string; page: number }
type Props = { filters: Filters; results: Paginated<CandidateCard>; savedIds: number[]; canUseEmployerSearch: boolean; taxonomy: Taxonomy }

function qs(f: Partial<Filters>) {
  return toQuery({ q: f.q, location: f.location, industry: f.industry, availability: f.availability, expMin: f.expMin, gender: f.gender, hasCv: f.hasCv ? 1 : '', sort: f.sort && f.sort !== 'relevance' ? f.sort : '', page: f.page && f.page > 1 ? f.page : '' })
}

export default function TalentIndex({ filters, results, savedIds, canUseEmployerSearch, taxonomy }: Props) {
  const { auth } = useShared()
  const [q, setQ] = useState(filters.q)
  const update = (patch: Partial<Filters>) => router.get(`/talent?${qs({ ...filters, ...patch, page: 1 })}`, {}, { preserveState: true })
  const submit = (e: FormEvent) => {
    e.preventDefault()
    update({ q })
  }
  const toggleAvail = (v: string) => update({ availability: filters.availability.includes(v) ? filters.availability.filter((x) => x !== v) : [...filters.availability, v] })

  return (
    <SiteLayout>
      <Head title="Find talent" />
      <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
        <h1 className="text-[30px] font-bold tracking-[-0.02em]">Find talent</h1>
        <p className="mt-1 text-slate">Public profiles of jobseekers across the Gulf. Anyone can view these profiles and the CVs their owners chose to share.</p>
        {canUseEmployerSearch ? (
          <p className="mt-3 rounded-ctl bg-mint px-4 py-2.5 text-sm text-navy">
            Your company is verified: <Link href="/employer/candidates" className="font-semibold text-brand-700 underline">employer search</Link> also includes candidates who share their profile only with verified employers, with more filters.
          </p>
        ) : auth?.role === 'employer' ? null : (
          <p className="mt-3 text-sm text-slate">
            Recruiting? <Link href="/employers/register" className="font-medium text-brand-700 hover:underline">Register your company</Link> to search more candidates and contact them.
          </p>
        )}

        <form onSubmit={submit} role="search" className="mt-6 flex gap-2">
          <label className="relative flex-1">
            <span className="sr-only">Job title, skill or keyword</span>
            <Search className="absolute start-3 top-1/2 size-5 -translate-y-1/2 text-slate" aria-hidden />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Job title, skill or keyword" className={cn(controlClass, 'h-12 ps-10 text-base')} />
          </label>
          <Button type="submit" size="lg">Search Talent</Button>
        </form>

        <div className="mt-6 grid gap-8 lg:grid-cols-[250px_1fr]">
          <aside aria-label="Filters" className="flex flex-col gap-5">
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Country or city
              <select className={cn(controlClass, 'h-10 font-normal')} value={filters.location} onChange={(e) => update({ location: e.target.value })}>
                <LocationSlugOptions locations={taxonomy.locations} />
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Industry
              <select className={cn(controlClass, 'h-10 font-normal')} value={filters.industry} onChange={(e) => update({ industry: e.target.value })}>
                <option value="">Any industry</option>
                {taxonomy.industries.map((i) => <option key={i.slug} value={i.slug}>{i.name}</option>)}
              </select>
            </label>
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1.5 text-sm font-medium">Availability</legend>
              {Availability.values.filter((v) => v !== 'not_looking').map((v) => <Checkbox key={v} label={Availability.label(v)} checked={filters.availability.includes(v)} onChange={() => toggleAvail(v)} />)}
            </fieldset>
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Experience
              <select className={cn(controlClass, 'h-10 font-normal')} value={filters.expMin ?? ''} onChange={(e) => update({ expMin: e.target.value === '' ? null : Number(e.target.value) })}>
                <option value="">Any</option>
                {[1, 2, 3, 5, 8, 10].map((y) => <option key={y} value={y}>{y}+ years</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Gender
              <select className={cn(controlClass, 'h-10 font-normal')} value={filters.gender} onChange={(e) => update({ gender: e.target.value })}>
                <option value="">Any</option>
                {Gender.values.map((g) => <option key={g} value={g}>{Gender.label(g)}</option>)}
              </select>
            </label>
            <Checkbox label="Has a CV to download" checked={filters.hasCv} onChange={(e) => update({ hasCv: e.target.checked })} />
            <Link href="/talent" className="text-sm text-brand-700 hover:underline">Clear all filters</Link>
          </aside>

          <section aria-live="polite">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm"><span className="font-semibold">{results.meta.total}</span> profile{results.meta.total === 1 ? '' : 's'}</p>
              <label className="flex items-center gap-2 text-[13px]">
                Sort by
                <select value={filters.sort} onChange={(e) => update({ sort: e.target.value })} className={cn(controlClass, 'h-9 w-auto text-[13px]')}>
                  <option value="relevance">Most relevant</option>
                  <option value="updated">Most recent</option>
                  <option value="experience">Most experienced</option>
                </select>
              </label>
            </div>
            {results.data.length ? (
              <>
                <div className="grid gap-3 md:grid-cols-2">{results.data.map((c) => <TalentCard key={c.id} c={c} saved={savedIds.includes(c.id)} />)}</div>
                <div className="mt-6"><Pagination meta={results.meta} href={(p) => `/talent?${qs({ ...filters, page: p })}`} /></div>
              </>
            ) : (
              <EmptyState title="No public profiles match" action={<ButtonLink href="/talent" variant="secondary">Clear filters</ButtonLink>}>
                Try a whole country instead of a city, or fewer filters.
              </EmptyState>
            )}
          </section>
        </div>
      </div>
    </SiteLayout>
  )
}
