import { Head } from '@inertiajs/react'
import SiteLayout from '~/layouts/site_layout'
import { ButtonLink } from '~/components/ui/button'

const steps = [
  ['Register your company', 'Tell us who you are. Adding your trade licence or CR number speeds up verification.'],
  ['Get verified', 'Our team reviews your company. Until then you can draft jobs; each one is checked before it goes live.'],
  ['Post jobs and review applicants', 'Every applicant lands in one pipeline: review, shortlist, interview, offer — with private notes for your team.'],
  ['Search candidates', 'Once verified, search people who have chosen to be discoverable, filter by skills, experience and availability, and save shortlists.'],
] as const

export default function Employers() {
  return (
    <SiteLayout>
      <Head title="Hire in the Gulf" />
      <div className="mx-auto max-w-6xl px-4 pt-12 sm:px-6">
        <h1 className="max-w-3xl text-[34px] sm:text-[44px]">Hire across the Gulf from candidates who want to be found.</h1>
        <p className="mt-4 max-w-2xl text-[17px] text-slate">
          Post vacancies, run your hiring pipeline, and search a database of candidates who opted in to be discovered by verified employers.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <ButtonLink href="/employers/register" size="lg">Register your company</ButtonLink>
          <ButtonLink href="/login" variant="secondary" size="lg">Sign in</ButtonLink>
        </div>

        <ol className="mt-14 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {steps.map(([title, body], i) => (
            <li key={title} className="border-t-2 border-brand-600 pt-4">
              <span className="font-display text-sm font-bold text-brand-700">Step {i + 1}</span>
              <h2 className="mt-1 text-lg">{title}</h2>
              <p className="mt-1.5 text-sm text-slate">{body}</p>
            </li>
          ))}
        </ol>

        <section className="mt-16 grid gap-6 rounded-panel bg-dune-50 p-7 md:grid-cols-2">
          <div>
            <h2 className="text-2xl">Built around candidate consent</h2>
            <p className="mt-2 text-slate">
              You see contact details and CVs only when a candidate applies to you or has chosen to share them. Every download is logged and visible to the candidate. That transparency is why candidates keep their profiles up to date.
            </p>
          </div>
          <ul className="grid gap-2 text-sm">
            <li className="rounded-ctl bg-white p-3">Team accounts: invite recruiters, keep company settings with the owner.</li>
            <li className="rounded-ctl bg-white p-3">Saved searches and named shortlists across your team.</li>
            <li className="rounded-ctl bg-white p-3">Salaries shown in each country's currency; hide them from the listing if you prefer.</li>
            <li className="rounded-ctl bg-white p-3">Job pages structured for Google for Jobs.</li>
          </ul>
        </section>
      </div>
    </SiteLayout>
  )
}
