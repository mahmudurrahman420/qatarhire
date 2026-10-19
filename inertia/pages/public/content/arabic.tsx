import { Head, Link } from '@inertiajs/react'
import SiteLayout from '~/layouts/site_layout'

export default function Arabic() {
  return (
    <SiteLayout>
      <Head title="العربية" />
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <section lang="ar" dir="rtl" className="text-start">
          <span className="inline-block rounded-full bg-sunrise px-3 py-1 text-[13px] font-medium text-amber">قريبًا</span>
          <h1 className="mt-3 text-[32px] font-bold">النسخة العربية قادمة قريبًا</h1>
          <p className="mt-3 text-[17px] leading-relaxed text-slate">نعمل على ترجمة الموقع بالكامل إلى اللغة العربية. يمكنك حاليًا استخدام الموقع باللغة الإنجليزية، وستتمكن من التبديل إلى العربية من أعلى الصفحة عند إطلاقها.</p>
        </section>
        <section className="mt-10 border-t border-line pt-6">
          <h2 className="text-xl font-bold">Arabic version coming soon</h2>
          <p className="mt-2 text-slate">We're translating the whole site into Arabic. Until then, the site is available in English.</p>
          <Link href="/" className="mt-4 inline-flex h-10 items-center rounded-ctl bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-700">Back to homepage</Link>
        </section>
      </div>
    </SiteLayout>
  )
}
