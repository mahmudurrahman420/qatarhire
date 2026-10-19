import { Head, Link, useForm } from '@inertiajs/react'
import { FileText } from 'lucide-react'
import AppLayout from '~/layouts/app_layout'
import { Button, ButtonLink } from '~/components/ui/button'
import { TextArea } from '~/components/ui/form'
import { CompanyLogo, PageHeader, Panel } from '~/components/ui/misc'
import { date, fileSize, salaryText } from '~/lib/format'
import type { CvBrief, JobCard } from '~/lib/types'
import { cn } from '~/lib/cn'

export default function Apply({ job, cvs, completeness }: { job: JobCard; cvs: CvBrief[]; completeness: number }) {
  const form = useForm({ cvId: cvs.find((c) => c.isPrimary)?.id ?? cvs[0]?.id ?? null, coverLetter: '' })
  return (
    <AppLayout>
      <Head title={`Apply: ${job.title}`} />
      <PageHeader title="Apply for this job" back={{ href: `/jobs/${job.slug}`, label: 'Back to job' }} />
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <form
          className="flex flex-col gap-6"
          onSubmit={(e) => {
            e.preventDefault()
            void (form.transform((d) => ({ cvId: d.cvId ?? undefined, coverLetter: d.coverLetter || undefined })), form).post(`/jobs/${job.slug}/apply`)
          }}
        >
          <Panel title="CV to send">
            {cvs.length ? (
              <fieldset className="grid gap-2">
                <legend className="sr-only">Choose a CV</legend>
                {cvs.map((cv) => (
                  <label key={cv.id} className={cn('flex cursor-pointer items-center gap-3 rounded-ctl border p-3', form.data.cvId === cv.id ? 'border-brand-500 bg-brand-50/40' : 'border-line')}>
                    <input type="radio" name="cv" className="accent-brand-600" checked={form.data.cvId === cv.id} onChange={() => form.setData('cvId', cv.id)} />
                    <FileText className="size-5 text-slate" aria-hidden />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">{cv.label}</span>
                      <span className="block truncate text-[13px] text-slate">{cv.originalName} — {fileSize(cv.sizeBytes)}, {date(cv.createdAt)}</span>
                    </span>
                  </label>
                ))}
                {form.errors.cvId && <p className="text-[13px] text-danger">{form.errors.cvId}</p>}
                <Link href="/candidate/profile" className="text-sm text-brand-700 hover:underline">Upload a different CV</Link>
              </fieldset>
            ) : (
              <div className="flex flex-col items-start gap-3">
                <p className="text-sm text-slate">You haven't uploaded a CV. You can still apply with your profile, but most employers expect one.</p>
                <ButtonLink href="/candidate/profile" variant="secondary" size="sm">Upload a CV first</ButtonLink>
              </div>
            )}
          </Panel>

          <Panel title="Cover letter">
            <TextArea label="Message to the employer" optional rows={8} maxLength={5000} value={form.data.coverLetter} onChange={(e) => form.setData('coverLetter', e.target.value)} error={form.errors.coverLetter} hint="A few lines on why you're a fit for this role." />
          </Panel>

          <div className="flex flex-col gap-2 rounded-panel border border-line bg-white p-5">
            <p className="text-sm text-slate">
              By applying, you share your profile, contact details and the selected CV with {job.company?.name}. You can withdraw the application later from your dashboard.
            </p>
            <div><Button type="submit" size="lg" loading={form.processing}>Send application</Button></div>
          </div>
        </form>

        <aside>
          <Panel>
            <div className="flex gap-3">
              {job.company && <CompanyLogo name={job.company.name} url={job.company.logoUrl} />}
              <div>
                <p className="font-medium">{job.title}</p>
                <p className="text-sm text-slate">{job.company?.name}</p>
                <p className="mt-1 text-[13px] text-slate">{job.location}</p>
                {salaryText(job.salary) && <p className="mt-1 text-sm font-medium">{salaryText(job.salary)}</p>}
              </div>
            </div>
            {completeness < 60 && (
              <p className="mt-4 rounded-ctl bg-amber-50 px-3 py-2 text-[13px] text-amber">
                Your profile is {completeness}% complete. <Link href="/candidate/profile" className="underline">Add more detail</Link> to stand out.
              </p>
            )}
          </Panel>
        </aside>
      </div>
    </AppLayout>
  )
}
