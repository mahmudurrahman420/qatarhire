import { Head } from '@inertiajs/react'
import type { ReactNode } from 'react'
import SiteLayout from '~/layouts/site_layout'

export type Section = { heading: string; body: ReactNode }

export function StaticPage({ title, intro, sections, notice, aside }: { title: string; intro?: ReactNode; sections: Section[]; notice?: ReactNode; aside?: ReactNode }) {
  return (
    <SiteLayout>
      <Head title={title} />
      <div className="mx-auto grid max-w-6xl gap-10 px-4 pt-10 sm:px-6 lg:grid-cols-[1fr_280px]">
        <article className="max-w-[68ch]">
          <h1 className="text-[32px] sm:text-[40px]">{title}</h1>
          {notice && <div className="mt-4 rounded-ctl border border-amber/20 bg-amber-50 px-4 py-3 text-sm text-amber">{notice}</div>}
          {intro && <div className="mt-4 text-[17px] text-slate">{intro}</div>}
          {sections.map((s) => (
            <section key={s.heading} className="mt-9">
              <h2 className="text-xl">{s.heading}</h2>
              <div className="mt-2 space-y-3 leading-relaxed text-ink/90 [&_a]:text-maroon-700 [&_a]:underline [&_li]:ms-5 [&_li]:list-disc">{s.body}</div>
            </section>
          ))}
        </article>
        {aside && <aside className="lg:pt-16">{aside}</aside>}
      </div>
    </SiteLayout>
  )
}

export const LEGAL_NOTICE = 'This page is a starting template. It must be reviewed and adapted by a qualified lawyer in Qatar before the platform launches.'
