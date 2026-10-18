import { Head, Link, router } from '@inertiajs/react'
import { useState, type FormEvent } from 'react'
import { Search, MapPin } from 'lucide-react'
import SiteLayout from '~/layouts/site_layout'
import { JobList } from '~/components/jobs'
import { Button, ButtonLink } from '~/components/ui/button'
import { CompanyLogo } from '~/components/ui/misc'
import { VerifiedMark } from '~/components/status'
import { useShared } from '~/lib/page'
import type { JobCard } from '~/lib/types'

type Props = {
  latestJobs: JobCard[]
  featuredCompanies: { id: number; name: string; slug: string; logoUrl: string | null; verified: boolean; openJobs: number }[]
  categories: { id: number; name: string; slug: string; jobs: number }[]
  industries: { id: number; name: string; slug: string }[]
  locations: { name: string; slug: string }[]
  popularTitles: string[]
  stats: { liveJobs: number }
}

export default function Home({ latestJobs, featuredCompanies, categories, locations, popularTitles, stats }: Props) {
  const { appName } = useShared()
  const [q, setQ] = useState('')
  const [location, setLocation] = useState('')

  function submit(e: FormEvent) {
    e.preventDefault()
    const params: Record<string, string> = {}
    if (q.trim()) params.q = q.trim()
    if (location) params.location = location
    router.get('/jobs', params)
  }

  const sortedCategories = [...categories].sort((a, b) => b.jobs - a.jobs)

  return (
    <SiteLayout header="maroon">
      <Head title="Jobs in Qatar" />

      <section className="serrated-edge bg-maroon-600 pb-20 text-white">
        <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6 sm:pt-16">
          <h1 className="max-w-3xl text-[34px] leading-[1.08] text-white sm:text-[52px]">
            Work in Qatar, with employers you can check before you apply.
          </h1>
          <p className="mt-4 max-w-xl text-[17px] text-white/80">
            {stats.liveJobs > 0 ? `${stats.liveJobs.toLocaleString('en')} open jobs` : 'Open jobs'} across Doha, Lusail, Al Rayyan and beyond. Employers are reviewed by our team, and your profile stays private until you decide otherwise.
          </p>

          <form onSubmit={submit} role="search" className="mt-8 grid gap-2 rounded-panel bg-white p-2 text-ink shadow-[0_12px_40px_-12px_rgba(40,5,15,.45)] sm:grid-cols-[1fr_240px_auto]">
            <label className="flex items-center gap-2 rounded-ctl px-3 focus-within:bg-pearl">
              <Search className="size-5 shrink-0 text-slate" aria-hidden />
              <span className="sr-only">Job title, skill or company</span>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Job title, skill or company" className="h-12 w-full bg-transparent text-base outline-none placeholder:text-slate/70" />
            </label>
            <label className="flex items-center gap-2 rounded-ctl border-line px-3 focus-within:bg-pearl sm:border-s">
              <MapPin className="size-5 shrink-0 text-slate" aria-hidden />
              <span className="sr-only">Location</span>
              <select value={location} onChange={(e) => setLocation(e.target.value)} className="h-12 w-full bg-transparent text-base outline-none">
                <option value="">All of Qatar</option>
                {locations.map((l) => (
                  <option key={l.slug} value={l.slug}>{l.name}</option>
                ))}
              </select>
            </label>
            <Button type="submit" size="lg" className="h-12">Search jobs</Button>
          </form>

          {popularTitles.length > 0 && (
            <div className="mt-5 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-white/70">Popular:</span>
              {popularTitles.slice(0, 6).map((t) => (
                <Link key={t} href={`/jobs?q=${encodeURIComponent(t)}`} className="rounded-full bg-white/10 px-3 py-1 text-white hover:bg-white/20">
                  {t}
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <section className="mt-6 grid gap-10 lg:grid-cols-[1fr_300px]">
          <div>
            <div className="mb-4 flex items-end justify-between">
              <h2 className="text-2xl">Latest jobs</h2>
              <Link href="/jobs?sort=newest" className="text-sm font-medium text-maroon-700 hover:underline">All jobs</Link>
            </div>
            {latestJobs.length ? (
              <JobList jobs={latestJobs} />
            ) : (
              <p className="rounded-panel border border-dashed border-line bg-white p-6 text-slate">New jobs appear here as soon as employers publish them.</p>
            )}
          </div>

          <aside aria-labelledby="cat-h">
            <h2 id="cat-h" className="mb-4 text-2xl">Browse by category</h2>
            <ul className="divide-y divide-line rounded-panel border border-line bg-white">
              {sortedCategories.slice(0, 12).map((c) => (
                <li key={c.id}>
                  <Link href={`/jobs?category=${c.slug}`} className="flex items-center justify-between px-4 py-2.5 text-sm hover:bg-pearl">
                    <span>{c.name}</span>
                    <span className="tabular-nums text-slate">{c.jobs}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </aside>
        </section>

        {featuredCompanies.length > 0 && (
          <section className="mt-16">
            <div className="mb-4 flex items-end justify-between">
              <h2 className="text-2xl">Employers hiring now</h2>
              <Link href="/companies" className="text-sm font-medium text-maroon-700 hover:underline">Employer directory</Link>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {featuredCompanies.map((c) => (
                <li key={c.id}>
                  <Link href={`/companies/${c.slug}`} className="flex items-center gap-3 rounded-panel border border-line bg-white p-3 hover:border-slate/40">
                    <CompanyLogo name={c.name} url={c.logoUrl} size={40} />
                    <span className="min-w-0">
                      <span className="flex items-center gap-1 truncate text-sm font-medium">
                        {c.name} {c.verified && <VerifiedMark className="size-3.5 shrink-0 text-gulf" />}
                      </span>
                      <span className="text-[13px] text-slate">{c.openJobs} open job{c.openJobs === 1 ? '' : 's'}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-16 grid gap-4 md:grid-cols-2">
          <div className="rounded-panel bg-ink p-7 text-white">
            <h2 className="text-2xl text-white">Let employers find you</h2>
            <p className="mt-2 max-w-md text-white/75">
              Build one profile, upload your CV, and choose whether verified employers can discover you. Your phone and email stay hidden unless you share them.
            </p>
            <ButtonLink href="/register" variant="secondary" className="mt-5">Create your profile</ButtonLink>
          </div>
          <div className="rounded-panel border border-dune bg-dune-50 p-7">
            <h2 className="text-2xl">Hiring in Qatar?</h2>
            <p className="mt-2 max-w-md text-slate">
              Post vacancies, manage applicants in one pipeline, and search candidates who have opted in to be found by verified employers.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <ButtonLink href="/employers/register">Register your company</ButtonLink>
              <ButtonLink href="/employers" variant="secondary">How it works</ButtonLink>
            </div>
          </div>
        </section>

        <section className="mt-16" aria-labelledby="guides-h">
          <h2 id="guides-h" className="mb-4 text-2xl">Before you apply</h2>
          <div className="grid gap-6 md:grid-cols-3">
            <Link href="/safety" className="group block">
              <h3 className="font-sans text-base font-semibold tracking-normal group-hover:text-maroon-700">Spot a fake job offer</h3>
              <p className="mt-1 text-sm text-slate">Real employers in Qatar don't ask you to pay for a visa, medical or "processing". Here's what to watch for.</p>
            </Link>
            <Link href="/faq" className="group block">
              <h3 className="font-sans text-base font-semibold tracking-normal group-hover:text-maroon-700">Who can see my CV?</h3>
              <p className="mt-1 text-sm text-slate">Only employers you apply to, unless you switch on discovery. You can see every download in your privacy page.</p>
            </Link>
            <Link href="/faq" className="group block">
              <h3 className="font-sans text-base font-semibold tracking-normal group-hover:text-maroon-700">What the verified badge means</h3>
              <p className="mt-1 text-sm text-slate">Our team has reviewed the company's details and registration before marking it verified on {appName}.</p>
            </Link>
          </div>
        </section>
      </div>
    </SiteLayout>
  )
}
