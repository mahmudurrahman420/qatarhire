import { Head, Link } from '@inertiajs/react'
import SiteLayout from '~/layouts/site_layout'

type Tip = { slug: string; title: string; summary: string; minutes: number }

export default function Tips({ tips }: { tips: Tip[] }) {
  return (
    <SiteLayout>
      <Head title="Career tips" />
      <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
        <h1 className="text-[32px] font-bold tracking-[-0.02em]">Career tips</h1>
        <p className="mt-2 max-w-2xl text-slate">Practical advice for finding work in the Gulf, from writing your CV to understanding an offer.</p>
        <ul className="mt-8 grid gap-4 md:grid-cols-2">
          {tips.map((t) => (
            <li key={t.slug}>
              <Link href={`/career-tips/${t.slug}`} className="block h-full rounded-[12px] border border-line bg-white p-5 hover:border-brand-200 hover:bg-mint/40">
                <h2 className="text-xl font-bold">{t.title}</h2>
                <p className="mt-2 text-sm text-slate">{t.summary}</p>
                <p className="mt-3 text-[13px] font-medium text-brand-700">{t.minutes} min read</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </SiteLayout>
  )
}
