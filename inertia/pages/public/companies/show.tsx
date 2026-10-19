import { Head, Link, useForm } from '@inertiajs/react'
import { useState } from 'react'
import { Flag, Globe } from 'lucide-react'
import SiteLayout from '~/layouts/site_layout'
import { CompanyLogo, EmptyState, Modal } from '~/components/ui/misc'
import { JobList, RichText } from '~/components/jobs'
import { VerificationBadge } from '~/components/status'
import { Button } from '~/components/ui/button'
import { SelectField, TextArea, TextField } from '~/components/ui/form'
import { CompanySize, ReportReason } from '#shared/enums'
import { useShared } from '~/lib/page'
import type { JobCard } from '~/lib/types'

type Props = {
  company: { id: number; name: string; slug: string; logoUrl: string | null; verified: boolean; description: string | null; website: string | null; size: string | null; industry: string | null; location: string | null; verificationStatus: string; memberSince: string }
  jobs: JobCard[]
}

export default function CompanyShow({ company, jobs }: Props) {
  const { auth } = useShared()
  const [report, setReport] = useState(false)
  const form = useForm({ subjectType: 'company', subjectId: company.id, reason: 'scam', details: '', email: '' })
  return (
    <SiteLayout>
      <Head title={`${company.name} jobs`} />
      <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
        <Link href="/companies" className="text-sm text-slate hover:text-brand-700">Employers</Link>
        <header className="mt-3 flex flex-wrap items-start gap-5">
          <CompanyLogo name={company.name} url={company.logoUrl} size={80} />
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl">{company.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate">
              <VerificationBadge status={company.verificationStatus} />
              {company.industry && <span>{company.industry}</span>}
              {company.location && <span>{company.location}</span>}
              {company.size && <span>{CompanySize.label(company.size as never)}</span>}
            </div>
            {company.website && (
              <a href={company.website} target="_blank" rel="noopener noreferrer nofollow" className="mt-2 inline-flex items-center gap-1.5 text-sm text-brand-700 hover:underline">
                <Globe className="size-4" /> {company.website.replace(/^https?:\/\//, '')}
              </a>
            )}
          </div>
        </header>

        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_320px]">
          <section>
            <h2 className="mb-4 text-2xl">Open jobs ({jobs.length})</h2>
            {jobs.length ? <JobList jobs={jobs} /> : <EmptyState title={`${company.name} has no open jobs right now`}>Save a job alert for this company's industry to hear about new roles.</EmptyState>}
          </section>
          <aside>
            <h2 className="mb-3 text-xl">About</h2>
            {company.description ? <div className="text-sm text-slate"><RichText text={company.description} /></div> : <p className="text-sm text-slate">No description yet.</p>}
            <button type="button" onClick={() => setReport(true)} className="mt-6 inline-flex items-center gap-1.5 text-sm text-slate hover:text-danger">
              <Flag className="size-4" /> Report this employer
            </button>
          </aside>
        </div>
      </div>
      <Modal open={report} onClose={() => setReport(false)} title={`Report ${company.name}`}>
        <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); form.post('/reports', { preserveScroll: true, onSuccess: () => setReport(false) }) }}>
          <SelectField label="Reason" value={form.data.reason} onChange={(e) => form.setData('reason', e.target.value)} options={ReportReason.values.map((v) => ({ value: v, label: ReportReason.label(v) }))} />
          <TextArea label="Details" optional value={form.data.details} onChange={(e) => form.setData('details', e.target.value)} error={form.errors.details} />
          {!auth && <TextField label="Your email" type="email" value={form.data.email} onChange={(e) => form.setData('email', e.target.value)} error={form.errors.email} required />}
          <div className="flex justify-end gap-2"><Button type="button" variant="quiet" onClick={() => setReport(false)}>Cancel</Button><Button type="submit" loading={form.processing}>Send report</Button></div>
        </form>
      </Modal>
    </SiteLayout>
  )
}
