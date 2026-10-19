import { Head, Link, router } from '@inertiajs/react'
import { useState, type FormEvent } from 'react'
import { Search } from 'lucide-react'
import SiteLayout from '~/layouts/site_layout'
import { CompanyLogo, EmptyState, Pagination } from '~/components/ui/misc'
import { Button, ButtonLink } from '~/components/ui/button'
import { controlClass } from '~/components/ui/form'
import { VerifiedMark } from '~/components/status'
import { toQuery } from '~/lib/format'
import { cn } from '~/lib/cn'

type Company = { id: number; name: string; slug: string; logoUrl: string | null; verified: boolean; industry: string | null; location: string | null; openJobs: number; isFeatured: boolean }
type Props = {
  filters: { q: string; industry: string; page: number }
  companies: { data: Company[]; meta: { total: number; page: number; lastPage: number } }
  industries: { id: number; name: string; slug: string }[]
}

export default function CompaniesIndex({ filters, companies, industries }: Props) {
  const [q, setQ] = useState(filters.q)
  const go = (patch: Partial<Props['filters']>) => {
    const qs = toQuery({ ...filters, ...patch, page: patch.page && patch.page > 1 ? patch.page : '' })
    router.get(`/companies${qs ? `?${qs}` : ''}`, {}, { preserveState: true })
  }
  const submit = (e: FormEvent) => {
    e.preventDefault()
    go({ q, page: 1 })
  }
  return (
    <SiteLayout>
      <Head title="Employers hiring in the Gulf" />
      <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
        <h1 className="text-3xl">Employers in the Gulf</h1>
        <p className="mt-2 max-w-2xl text-slate">Companies hiring across the UAE, Saudi Arabia, Qatar, Kuwait, Oman and Bahrain. The verified mark means our team has reviewed the company's details.</p>
        <form onSubmit={submit} className="mt-6 flex flex-wrap gap-2" role="search">
          <label className="relative min-w-60 flex-1">
            <span className="sr-only">Company name</span>
            <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-slate" aria-hidden />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Company name" className={cn(controlClass, 'h-11 ps-9')} />
          </label>
          <select value={filters.industry} onChange={(e) => go({ industry: e.target.value, page: 1 })} className={cn(controlClass, 'h-11 w-auto')} aria-label="Industry">
            <option value="">All industries</option>
            {industries.map((i) => <option key={i.slug} value={i.slug}>{i.name}</option>)}
          </select>
          <Button type="submit" size="lg" className="h-11">Search</Button>
        </form>

        <p className="mt-6 text-sm text-slate">{companies.meta.total} employer{companies.meta.total === 1 ? '' : 's'}</p>
        {companies.data.length ? (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {companies.data.map((c) => (
              <li key={c.id}>
                <Link href={`/companies/${c.slug}`} className="flex h-full gap-3 rounded-panel border border-line bg-white p-4 hover:border-slate/40">
                  <CompanyLogo name={c.name} url={c.logoUrl} size={48} />
                  <div className="min-w-0">
                    <p className="flex items-center gap-1 font-medium">
                      <span className="truncate">{c.name}</span>
                      {c.verified && <VerifiedMark className="size-4 shrink-0 text-gulf" />}
                    </p>
                    <p className="truncate text-[13px] text-slate">{[c.industry, c.location].filter(Boolean).join(', ') || 'Gulf'}</p>
                    <p className="mt-1.5 text-[13px] font-medium text-brand-700">{c.openJobs ? `${c.openJobs} open job${c.openJobs > 1 ? 's' : ''}` : 'No open jobs right now'}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-3">
            <EmptyState title="No employers match" action={<ButtonLink href="/companies" variant="secondary">Show all employers</ButtonLink>}>
              Check the spelling, or try the company's short name.
            </EmptyState>
          </div>
        )}
        <div className="mt-6"><Pagination meta={companies.meta} href={(p) => `/companies?${toQuery({ ...filters, page: p > 1 ? p : '' })}`} /></div>
      </div>
    </SiteLayout>
  )
}
