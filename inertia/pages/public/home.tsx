import { Head, Link, router } from '@inertiajs/react'
import { useEffect, useState, type FormEvent } from 'react'
import { ArrowRight, Bell, Bookmark, BookmarkCheck, Briefcase, ChevronDown, ChevronRight, FileText, MapPin, Search, ShieldCheck, UserRound, Users } from 'lucide-react'
import SiteLayout from '~/layouts/site_layout'
import { TalentCard } from '~/components/talent'
import { CompanyLogo } from '~/components/ui/misc'
import { EmploymentType } from '#shared/enums'
import { countryBySlug } from '#shared/gulf'
import { ago, toQuery } from '~/lib/format'
import { useShared } from '~/lib/page'
import type { CandidateCard, JobCard } from '~/lib/types'
import { cn } from '~/lib/cn'

type Feed = { tab: string; sort: string; country: string; data: CandidateCard[]; meta: { total: number; page: number; lastPage: number } }
type Props = {
  country: string
  feed: Feed
  savedIds: number[]
  latestJobs: JobCard[]
  industries: { id: number; name: string; slug: string }[]
  locations: { name: string; slug: string; cities: { name: string; slug: string }[] }[]
}

const TABS = [
  ['all', 'All profiles'],
  ['available', 'Available now'],
  ['recent', 'Recently updated'],
] as const

export default function Home({ country, feed, savedIds, latestJobs, industries, locations }: Props) {
  const { auth } = useShared()
  const place = countryBySlug(country)
  const isCandidate = auth?.role === 'candidate'
  const isEmployer = auth?.role === 'employer'

  // "Load more" appends further pages to the server-rendered first page
  const [cards, setCards] = useState(feed.data)
  const [meta, setMeta] = useState(feed.meta)
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    setCards(feed.data)
    setMeta(feed.meta)
  }, [feed])

  const feedParams = { country, tab: feed.tab === 'all' ? '' : feed.tab, sort: feed.sort === 'updated' ? '' : feed.sort }
  const go = (patch: Partial<typeof feedParams>) => {
    const qs = toQuery({ ...feedParams, ...patch })
    router.get(`/${qs ? `?${qs}` : ''}`, {}, { preserveScroll: true, preserveState: true, only: ['feed', 'country', 'savedIds'] })
  }
  async function loadMore() {
    setLoading(true)
    try {
      const res = await fetch(`/talent/feed?${toQuery({ ...feedParams, page: meta.page + 1 })}`, { headers: { Accept: 'application/json' } })
      if (!res.ok) throw new Error(String(res.status))
      const next: Feed = await res.json()
      setCards((prev) => [...prev, ...next.data.filter((n) => !prev.some((p) => p.id === n.id))])
      setMeta(next.meta)
    } finally {
      setLoading(false)
    }
  }

  return (
    <SiteLayout>
      <Head title={place ? `Jobseekers and jobs in ${place.fullName}` : 'Get discovered by Gulf employers'} />

      {/* jobseeker hero */}
      <section className="relative overflow-hidden bg-mint">
        <img src="/images/hero-skyline.png" alt="" aria-hidden className="pointer-events-none absolute bottom-0 end-0 top-2 hidden h-[calc(100%-0.5rem)] w-auto max-w-none select-none md:block lg:end-[max(0px,calc((100vw-72rem)/2))]" />
        <div className="relative mx-auto max-w-6xl px-4 py-7 sm:px-6">
          <h1 className="text-[34px] font-bold leading-[1.05] tracking-[-0.035em] sm:text-[44px] lg:whitespace-nowrap">Let your next employer find you.</h1>
          <p className="mt-2 max-w-xl text-[17px] text-navy lg:max-w-none">Create your professional profile. Get discovered by recruiters across the Gulf.</p>
          <Link
            href={isCandidate ? '/candidate/profile' : '/register'}
            className="mt-4 inline-flex h-11 items-center gap-2.5 rounded-ctl bg-brand-600 px-6 text-[15px] font-semibold text-white shadow-sm hover:bg-brand-700"
          >
            {isCandidate ? 'Update Your Profile' : 'Post Your Profile'} <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* recruiter banner */}
        <section className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-[8px] bg-navy-900 px-5 py-3 text-white">
          <img src="/images/hiring-team.png" alt="" aria-hidden className="hidden h-[58px] w-auto sm:block" />
          <div className="w-full min-w-0 sm:w-auto sm:flex-1">
            <h2 className="font-display text-[20px] font-bold text-white">
              Hiring?<span className="ms-2">Discover your next team member.</span>
            </h2>
            <p className="text-sm text-white/80">Search talent, view profiles and find the right fit for your business.</p>
          </div>
          <div className="flex w-full gap-3 sm:w-auto">
            <Link href={isEmployer ? '/employer/candidates' : '/talent'} className="inline-flex h-10 items-center gap-2 rounded-ctl bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-500">
              Browse Talent <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link href={isEmployer ? '/employer/jobs/create' : '/employers/register'} className="inline-flex h-10 items-center rounded-ctl border border-white/80 px-6 text-sm font-semibold text-white hover:bg-white/10">
              Post a Job
            </Link>
          </div>
        </section>

        <SearchPanel locations={locations} industries={industries} country={country} />

        {/* main: 72% profiles / 28% sidebar */}
        <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_288px]">
          <section aria-labelledby="discover-h">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 id="discover-h" className="text-[28px] font-bold leading-tight tracking-[-0.02em]">Discover jobseekers</h2>
                <p className="mt-0.5 text-[15px] text-slate">
                  {place ? `Professionals ready for their next opportunity in ${place.fullName}` : 'Professionals ready for their next opportunity'}
                </p>
              </div>
              <label className="flex items-center gap-2 text-[13px] text-navy">
                Sort by
                <span className="relative">
                  <select value={feed.sort} onChange={(e) => go({ sort: e.target.value === 'updated' ? '' : e.target.value })} className="h-9 appearance-none rounded-ctl border border-line bg-white pe-9 ps-3 text-[13px] text-navy">
                    <option value="updated">Most recent</option>
                    <option value="experience">Most experienced</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute end-2.5 top-1/2 size-4 -translate-y-1/2 text-navy" aria-hidden />
                </span>
              </label>
            </div>
            <div className="mt-3 flex flex-wrap gap-2" role="tablist" aria-label="Filter profiles">
              {TABS.map(([v, l]) => (
                <button
                  key={v}
                  type="button"
                  role="tab"
                  aria-selected={feed.tab === v}
                  onClick={() => go({ tab: v === 'all' ? '' : v })}
                  className={cn(
                    'h-8 rounded-ctl border px-4 text-[13px] font-medium transition-colors',
                    feed.tab === v ? 'border-brand-600 bg-brand-600 text-white' : 'border-line bg-white text-navy hover:border-slate/40'
                  )}
                >
                  {l}
                </button>
              ))}
            </div>

            {cards.length ? (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {cards.map((c) => <TalentCard key={c.id} c={c} saved={savedIds.includes(c.id)} />)}
              </div>
            ) : (
              <div className="mt-4 rounded-[12px] border border-dashed border-line px-6 py-10">
                <p className="font-display text-lg text-navy">No public profiles {place ? `in ${place.fullName} ` : ''}yet{feed.tab !== 'all' ? ' for this filter' : ''}</p>
                <p className="mt-1 text-sm text-slate">
                  {feed.tab !== 'all' ? 'Try "All profiles", or another country.' : 'Be the first: create your profile and choose to show it here.'}
                </p>
              </div>
            )}

            {meta.page < meta.lastPage && (
              <div className="mt-5 flex justify-center">
                <button type="button" onClick={loadMore} disabled={loading} aria-busy={loading} className="inline-flex h-10 items-center gap-2 rounded-ctl border border-brand-600 bg-white px-10 text-sm font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-60">
                  {loading ? 'Loading…' : 'Load More Profiles'} <ChevronDown className="size-4" aria-hidden />
                </button>
              </div>
            )}
          </section>

          <aside className="flex flex-col gap-4">
            <LatestJobs jobs={latestJobs} placeName={place?.fullName} country={country} />
            <section className="flex gap-3 rounded-[8px] bg-navy-900 p-4 text-white">
              <Bell className="mt-1 size-6 shrink-0" aria-hidden />
              <div>
                <h2 className="font-display text-[17px] font-bold text-white">Your next role, delivered.</h2>
                <p className="mt-0.5 text-[13px] text-white/80">Get job alerts that match your skills.</p>
                <Link href={isCandidate ? '/jobs?alert=1' : '/register'} className="mt-3 inline-flex h-9 items-center gap-2 rounded-ctl bg-white px-4 text-[13px] font-semibold text-navy hover:bg-mint">
                  Create Job Alert <ArrowRight className="size-4" aria-hidden />
                </Link>
              </div>
            </section>
            <section className="flex gap-3 rounded-[8px] border border-sunrise-line bg-sunrise p-4">
              <ShieldCheck className="mt-0.5 size-6 shrink-0 text-amber" aria-hidden />
              <div>
                <h2 className="font-sans text-[13px] font-semibold tracking-normal text-amber">Stay safe: never pay to apply for a job.</h2>
                <p className="mt-0.5 text-[12px] text-slate">hiremegulf.com is free for jobseekers. Real employers never ask for money to process an application or visa.</p>
                <Link href="/safety" className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-sky-ink hover:underline">
                  Safety tips <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              </div>
            </section>
          </aside>
        </div>
      </div>

      {/* three-step strip */}
      <section className="mt-8 border-t border-line" aria-label="How it works for jobseekers">
        <ol className="mx-auto grid max-w-6xl gap-6 px-4 py-5 sm:px-6 md:grid-cols-3">
          {[
            [UserRound, 'Create your profile', 'Showcase your experience, skills and career goals.'],
            [FileText, 'Showcase your skills', 'Highlight what makes you a great fit.'],
            [Users, 'Get discovered', 'Let recruiters across the Gulf find you.'],
          ].map(([Icon, title, text], i) => {
            const I = Icon as typeof UserRound
            return (
              <li key={String(title)} className="flex items-center gap-4">
                <I className="size-9 shrink-0 text-brand-600" strokeWidth={1.75} aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-navy">{i + 1}. {String(title)}</p>
                  <p className="text-[12px] text-slate">{String(text)}</p>
                </div>
                {i < 2 && <ChevronRight className="hidden size-5 text-slate md:block" aria-hidden />}
              </li>
            )
          })}
        </ol>
      </section>
    </SiteLayout>
  )
}

function SearchPanel({ locations, industries, country }: Pick<Props, 'locations' | 'industries' | 'country'>) {
  const [tab, setTab] = useState<'talent' | 'jobs'>('talent')
  const [q, setQ] = useState('')
  const [location, setLocation] = useState(country)
  const [industry, setIndustry] = useState('')
  useEffect(() => setLocation(country), [country])

  function submit(e: FormEvent) {
    e.preventDefault()
    const qs = toQuery({ q: q.trim(), location, industry })
    router.get(`${tab === 'talent' ? '/talent' : '/jobs'}${qs ? `?${qs}` : ''}`)
  }
  const field = 'flex h-10 items-center gap-2 rounded-ctl border border-line bg-white px-3 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100'
  return (
    <section className="mt-3 rounded-[10px] border border-line bg-white px-5 pb-4 shadow-[0_2px_10px_-4px_rgba(16,24,40,.12)]">
      <div className="flex gap-6 border-b border-line" role="tablist" aria-label="Search for">
        {(['talent', 'jobs'] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn('-mb-px border-b-2 px-1 pb-2 pt-3 text-sm font-semibold', tab === t ? 'border-brand-600 text-brand-700' : 'border-transparent text-navy hover:text-brand-700')}
          >
            {t === 'talent' ? 'Find Talent' : 'Find Jobs'}
          </button>
        ))}
      </div>
      <form onSubmit={submit} role="search" className="mt-3 grid gap-3 md:grid-cols-[1.1fr_1fr_1fr_auto] md:items-end">
        <label className="flex flex-col gap-1.5 text-[13px] font-medium text-navy">
          Job title or skill
          <span className={field}>
            <Search className="size-4 shrink-0 text-navy/70" aria-hidden />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. Accountant, HVAC, Sales" className="w-full bg-transparent text-sm font-normal outline-none placeholder:text-slate/70" />
          </span>
        </label>
        <label className="flex flex-col gap-1.5 text-[13px] font-medium text-navy">
          Country or city
          <span className={cn(field, 'relative')}>
            <MapPin className="size-4 shrink-0 text-navy/70" aria-hidden />
            <select value={location} onChange={(e) => setLocation(e.target.value)} className="w-full appearance-none bg-transparent pe-6 text-sm font-normal outline-none">
              <option value="">Select country or city</option>
              {locations.map((c) => (
                <optgroup key={c.slug} label={c.name}>
                  <option value={c.slug}>All of {c.name}</option>
                  {c.cities.map((ci) => <option key={ci.slug} value={ci.slug}>{ci.name}</option>)}
                </optgroup>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute end-3 size-4 text-navy" aria-hidden />
          </span>
        </label>
        <label className="flex flex-col gap-1.5 text-[13px] font-medium text-navy">
          Industry
          <span className={cn(field, 'relative')}>
            <Briefcase className="size-4 shrink-0 text-navy/70" aria-hidden />
            <select value={industry} onChange={(e) => setIndustry(e.target.value)} className="w-full appearance-none bg-transparent pe-6 text-sm font-normal outline-none">
              <option value="">Select industry</option>
              {industries.map((i) => <option key={i.slug} value={i.slug}>{i.name}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute end-3 size-4 text-navy" aria-hidden />
          </span>
        </label>
        <button type="submit" className="inline-flex h-10 items-center justify-center gap-2 rounded-ctl bg-brand-600 px-7 text-sm font-semibold text-white hover:bg-brand-700">
          <Search className="size-4" aria-hidden /> {tab === 'talent' ? 'Search Talent' : 'Search Jobs'}
        </button>
      </form>
    </section>
  )
}

function LatestJobs({ jobs, placeName, country }: { jobs: JobCard[]; placeName?: string; country: string }) {
  const { auth } = useShared()
  const canSave = !auth || auth.role === 'candidate'
  const [saved, setSaved] = useState<number[]>([])
  const save = (j: JobCard) => {
    if (!auth) return router.visit(`/login?redirect=${encodeURIComponent(`/jobs/${j.slug}`)}`)
    router.post(`/jobs/${j.slug}/save`, {}, { preserveScroll: true, onSuccess: () => setSaved((s) => (s.includes(j.id) ? s.filter((x) => x !== j.id) : [...s, j.id])) })
  }
  return (
    <section className="rounded-[10px] border border-line bg-white p-3" aria-labelledby="latest-h">
      <div className="flex items-start justify-between px-1">
        <div>
          <h2 id="latest-h" className="text-[19px] font-bold">Latest jobs</h2>
          <p className="text-[12px] text-slate">{placeName ? `In ${placeName}` : 'Across the Gulf'}</p>
        </div>
        <Link href={country ? `/jobs?sort=newest&location=${country}` : '/jobs?sort=newest'} className="mt-1 inline-flex items-center gap-1 text-[13px] font-medium text-sky-ink hover:underline">
          View all <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </div>
      {jobs.length ? (
        <ul className="mt-2 flex flex-col gap-2">
          {jobs.map((j) => {
            const isSaved = saved.includes(j.id)
            const Icon = isSaved ? BookmarkCheck : Bookmark
            return (
              <li key={j.id} className="rounded-[8px] border border-line p-2.5">
                <div className="flex gap-3">
                  {j.company && <CompanyLogo name={j.company.name} url={j.company.logoUrl} size={36} />}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <Link href={`/jobs/${j.slug}`} className="truncate text-sm font-semibold text-navy hover:text-brand-700">{j.title}</Link>
                      {canSave && (
                        <button type="button" onClick={() => save(j)} aria-pressed={isSaved} aria-label={isSaved ? `Remove ${j.title} from saved jobs` : `Save ${j.title}`} className="-me-1 rounded p-0.5 text-navy hover:bg-pearl">
                          <Icon className={cn('size-4', isSaved && 'text-brand-600')} />
                        </button>
                      )}
                    </div>
                    {j.company && <p className="truncate text-[12px] text-slate">{j.company.name}</p>}
                    {j.location && (
                      <p className="mt-0.5 flex items-center gap-1 truncate text-[12px] text-slate">
                        <MapPin className="size-3.5 shrink-0" aria-hidden /> {j.location}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-3 text-[12px]">
                  <span className="rounded bg-brand-50 px-1.5 py-0.5 font-medium text-brand-700">{EmploymentType.label(j.employmentType as never)}</span>
                  <span className="text-slate">{ago(j.publishedAt)}</span>
                  <Link href={`/jobs/${j.slug}`} className="ms-auto inline-flex items-center gap-1 font-medium text-sky-ink hover:underline">
                    View Job <ArrowRight className="size-3.5" aria-hidden />
                  </Link>
                </div>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="px-1 py-4 text-sm text-slate">New jobs appear here as soon as employers publish them.</p>
      )}
    </section>
  )
}
