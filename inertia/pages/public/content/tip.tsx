import { Head, Link } from '@inertiajs/react'
import SiteLayout from '~/layouts/site_layout'
import { RichText } from '~/components/jobs'

type Tip = { slug: string; title: string; summary: string; minutes: number; body?: string }

export default function TipPage({ tip, more }: { tip: Required<Tip>; more: Tip[] }) {
  return (
    <SiteLayout>
      <Head title={tip.title} />
      <div className="mx-auto grid max-w-6xl gap-10 px-4 pt-10 sm:px-6 lg:grid-cols-[1fr_280px]">
        <article className="max-w-[68ch]">
          <Link href="/career-tips" className="text-sm text-slate hover:text-brand-700">Career tips</Link>
          <h1 className="mt-2 text-[32px] font-bold leading-tight tracking-[-0.02em]">{tip.title}</h1>
          <p className="mt-2 text-[17px] text-slate">{tip.summary}</p>
          <p className="mt-1 text-[13px] text-slate">{tip.minutes} min read</p>
          <div className="mt-6"><RichText text={tip.body} /></div>
          <div className="mt-8 rounded-[12px] bg-mint p-5">
            <p className="font-display text-lg font-bold text-navy">Ready to be found?</p>
            <p className="mt-1 text-sm text-slate">Create your profile and let recruiters across the Gulf discover you.</p>
            <Link href="/register" className="mt-3 inline-flex h-10 items-center rounded-ctl bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-700">Create Profile</Link>
          </div>
        </article>
        <aside className="lg:pt-10">
          <h2 className="font-sans text-sm font-semibold tracking-normal">More tips</h2>
          <ul className="mt-3 flex flex-col gap-3">
            {more.map((t) => <li key={t.slug}><Link href={`/career-tips/${t.slug}`} className="text-sm font-medium text-navy hover:text-brand-700">{t.title}</Link></li>)}
          </ul>
        </aside>
      </div>
    </SiteLayout>
  )
}
