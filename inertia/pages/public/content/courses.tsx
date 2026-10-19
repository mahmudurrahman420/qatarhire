import { Head, useForm } from '@inertiajs/react'
import SiteLayout from '~/layouts/site_layout'
import { Button } from '~/components/ui/button'
import { TextField } from '~/components/ui/form'
import { useShared } from '~/lib/page'

const TOPICS = ['Safety certifications (NEBOSH, IOSH)', 'Accounting and VAT in the GCC', 'Customer service and Arabic for work', 'Digital skills (Excel, Power BI)', 'Healthcare licensing exams']

export default function Courses() {
  const { auth } = useShared()
  const form = useForm({ name: auth?.fullName ?? '', email: auth?.email ?? '', topic: '', website: '' })
  return (
    <SiteLayout>
      <Head title="Courses & training" />
      <div className="mx-auto grid max-w-6xl gap-10 px-4 pt-10 sm:px-6 lg:grid-cols-[1fr_360px]">
        <div className="max-w-[64ch]">
          <span className="inline-block rounded-full bg-sunrise px-3 py-1 text-[13px] font-medium text-amber">Coming soon</span>
          <h1 className="mt-3 text-[32px] font-bold tracking-[-0.02em]">Courses & training</h1>
          <p className="mt-3 text-[17px] text-slate">
            We're partnering with training providers across the Gulf to list courses that employers here ask for. Tell us what you'd like to learn and we'll email you when it's available.
          </p>
          <h2 className="mt-8 text-lg font-bold">Topics we're planning</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {TOPICS.map((t) => (
              <li key={t}>
                <button type="button" onClick={() => form.setData('topic', t)} className="rounded-full bg-sky-tag px-3 py-1.5 text-[13px] font-medium text-sky-ink hover:bg-brand-50 hover:text-brand-700">{t}</button>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-[12px] border border-line bg-white p-5">
          <h2 className="text-lg font-bold">Notify me</h2>
          <form className="mt-4 flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); form.post('/courses/interest', { preserveScroll: true, onSuccess: () => form.reset('topic') }) }}>
            <TextField label="Your name" value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} error={form.errors.name} required />
            <TextField label="Email" type="email" value={form.data.email} onChange={(e) => form.setData('email', e.target.value)} error={form.errors.email} required />
            <TextField label="What do you want to learn?" value={form.data.topic} onChange={(e) => form.setData('topic', e.target.value)} error={form.errors.topic} required placeholder="Pick a topic or type your own" />
            <input type="text" className="hidden" tabIndex={-1} autoComplete="off" aria-hidden value={form.data.website} onChange={(e) => form.setData('website', e.target.value)} />
            <Button type="submit" loading={form.processing}>Notify me</Button>
          </form>
        </div>
      </div>
    </SiteLayout>
  )
}
