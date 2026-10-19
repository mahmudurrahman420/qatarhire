import { Head } from '@inertiajs/react'
import AppLayout from '~/layouts/app_layout'
import { ButtonLink } from '~/components/ui/button'
import { PageHeader, Panel } from '~/components/ui/misc'
import { RichText } from '~/components/jobs'
import { EmploymentType, WorkArrangement } from '#shared/enums'
import { salaryText } from '~/lib/format'
import type { JobCard } from '~/lib/types'

type Job = JobCard & { description: string; responsibilities: string | null; requirements: string | null; status: string }

export default function Preview({ job }: { job: Job }) {
  return (
    <AppLayout>
      <Head title={`Preview: ${job.title}`} />
      <PageHeader title="Preview" description="How candidates will see this job." back={{ href: `/employer/jobs/${job.id}/edit`, label: 'Back to editor' }} actions={<ButtonLink href={`/jobs/${job.slug}`} variant="secondary">Open full page</ButtonLink>} />
      <Panel>
        <article className="max-w-[70ch]">
          <h2 className="text-2xl">{job.title}</h2>
          <p className="mt-1 text-slate">{job.company?.name} — {job.location} — {EmploymentType.label(job.employmentType as never)}{job.workArrangement !== 'on_site' ? `, ${WorkArrangement.label(job.workArrangement as never)}` : ''}</p>
          {salaryText(job.salary) && <p className="mt-3 font-display text-xl font-bold text-brand-700">{salaryText(job.salary)}</p>}
          <div className="mt-6"><RichText text={job.description} /></div>
          {job.responsibilities && <><h3 className="mt-6 text-lg">What you'll do</h3><RichText text={job.responsibilities} /></>}
          {job.requirements && <><h3 className="mt-6 text-lg">What you'll need</h3><RichText text={job.requirements} /></>}
          {job.skills.length > 0 && <p className="mt-6 text-sm text-slate">Skills: {job.skills.join(', ')}</p>}
        </article>
      </Panel>
    </AppLayout>
  )
}
