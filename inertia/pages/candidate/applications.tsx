import { Head, Link, router } from '@inertiajs/react'
import AppLayout from '~/layouts/app_layout'
import { Button, ButtonLink } from '~/components/ui/button'
import { CompanyLogo, EmptyState, PageHeader } from '~/components/ui/misc'
import { ApplicationStatusBadge } from '~/components/status'
import { ApplicationStatus } from '#shared/enums'
import { date } from '~/lib/format'
import type { JobCard } from '~/lib/types'

type App = {
  id: number; status: string; createdAt: string; statusChangedAt: string | null; canWithdraw: boolean
  job: JobCard; cv: { label: string; originalName: string } | null; history: { toStatus: string; createdAt: string }[]
}

export default function Applications({ applications }: { applications: App[] }) {
  return (
    <AppLayout>
      <Head title="My applications" />
      <PageHeader title="Applications" description="Every application and where it stands. Employers update the status as they review." />
      {applications.length ? (
        <ul className="flex flex-col gap-3">
          {applications.map((a) => (
            <li key={a.id} className="rounded-panel border border-line bg-white p-5">
              <div className="flex flex-wrap items-start gap-4">
                {a.job.company && <CompanyLogo name={a.job.company.name} url={a.job.company.logoUrl} />}
                <div className="min-w-0 flex-1">
                  <Link href={`/jobs/${a.job.slug}`} className="font-medium hover:text-maroon-700">{a.job.title}</Link>
                  <p className="text-sm text-slate">{a.job.company?.name}{a.job.location ? `, ${a.job.location}` : ''}</p>
                  <p className="mt-1 text-[13px] text-slate">Applied {date(a.createdAt)}{a.cv ? ` with "${a.cv.label}"` : ' without a CV'}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <ApplicationStatusBadge status={a.status} />
                  {a.canWithdraw && (
                    <Button size="sm" variant="quiet" onClick={() => confirm('Withdraw this application? You won\'t be able to apply to this job again.') && router.post(`/candidate/applications/${a.id}/withdraw`, {}, { preserveScroll: true })}>
                      Withdraw
                    </Button>
                  )}
                </div>
              </div>
              <ol className="mt-4 flex flex-wrap gap-x-5 gap-y-1 border-t border-line pt-3 text-[13px] text-slate" aria-label="Status history">
                {a.history.map((h, i) => (
                  <li key={i}><span className="text-ink">{ApplicationStatus.label(h.toStatus as never)}</span> {date(h.createdAt, { day: 'numeric', month: 'short' })}</li>
                ))}
              </ol>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="No applications yet" action={<ButtonLink href="/jobs">Find jobs</ButtonLink>}>
          When you apply for a job on QatarHire it appears here with live status updates from the employer.
        </EmptyState>
      )}
    </AppLayout>
  )
}
