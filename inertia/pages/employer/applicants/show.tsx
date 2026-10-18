import { Head, useForm } from '@inertiajs/react'
import AppLayout from '~/layouts/app_layout'
import { Button } from '~/components/ui/button'
import { TextArea, TextField } from '~/components/ui/form'
import { PageHeader, Panel } from '~/components/ui/misc'
import { ApplicationStatusBadge } from '~/components/status'
import { AccessPanel, CandidateProfileView, type CandidateDetail } from '~/components/candidates'
import { RichText } from '~/components/jobs'
import { ApplicationStatus } from '#shared/enums'
import { dateTime } from '~/lib/format'
import { useState } from 'react'

type Props = {
  application: {
    id: number; status: string; coverLetter: string | null; createdAt: string; cvId: number | null; allowedTransitions: string[]
    history: { fromStatus: string | null; toStatus: string; note: string | null; createdAt: string }[]
    notes: { id: number; body: string; author: string; createdAt: string }[]
  }
  job: { id: number; title: string }
  candidate: CandidateDetail | null
}

export default function ApplicationShow({ application, job, candidate }: Props) {
  const note = useForm({ body: '' })
  const status = useForm({ status: '', note: '' })
  const [target, setTarget] = useState<string | null>(null)
  return (
    <AppLayout>
      <Head title={`Application for ${job.title}`} />
      <PageHeader title={`Application: ${job.title}`} back={{ href: `/employer/jobs/${job.id}/applicants`, label: 'All applicants' }} actions={<ApplicationStatusBadge status={application.status} />} />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="flex min-w-0 flex-col gap-6">
          {application.coverLetter && <Panel title="Cover letter"><RichText text={application.coverLetter} /></Panel>}
          {candidate ? <CandidateProfileView c={candidate} showFullName /> : <Panel><p className="text-sm text-slate">This candidate's account is no longer active.</p></Panel>}
        </div>
        <aside className="flex flex-col gap-6 lg:sticky lg:top-20 lg:self-start">
          <Panel title="Move to">
            {application.allowedTransitions.length ? (
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap gap-2">
                  {application.allowedTransitions.map((t) => (
                    <Button key={t} size="sm" variant={t === 'rejected' ? 'danger' : target === t ? 'primary' : 'secondary'} onClick={() => { setTarget(t); status.setData({ status: t, note: '' }) }}>
                      {t === 'rejected' ? 'Reject' : ApplicationStatus.label(t as never)}
                    </Button>
                  ))}
                </div>
                {target && (
                  <form className="flex flex-col gap-3 border-t border-line pt-3" onSubmit={(e) => { e.preventDefault(); status.post(`/employer/applications/${application.id}/status`, { preserveScroll: true, onSuccess: () => setTarget(null) }) }}>
                    <TextField label="Internal note" optional value={status.data.note} onChange={(e) => status.setData('note', e.target.value)} hint={target === 'rejected' ? 'Not shown to the candidate. They are told they were not selected.' : 'Not shown to the candidate.'} />
                    <div className="flex gap-2"><Button type="submit" size="sm" loading={status.processing}>Confirm: {ApplicationStatus.label(target as never)}</Button><Button type="button" size="sm" variant="quiet" onClick={() => setTarget(null)}>Cancel</Button></div>
                  </form>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate">{application.status === 'withdrawn' ? 'The candidate withdrew this application.' : 'This application is complete.'}</p>
            )}
          </Panel>
          {candidate && <AccessPanel c={candidate} applied />}
          <Panel title="Team notes">
            <form className="flex flex-col gap-2" onSubmit={(e) => { e.preventDefault(); note.post(`/employer/applications/${application.id}/notes`, { preserveScroll: true, onSuccess: () => note.reset() }) }}>
              <TextArea label="Add a note" rows={3} value={note.data.body} onChange={(e) => note.setData('body', e.target.value)} error={note.errors.body} hint="Visible only to your company." />
              <div><Button type="submit" size="sm" variant="secondary" loading={note.processing} disabled={!note.data.body.trim()}>Add note</Button></div>
            </form>
            {application.notes.length > 0 && (
              <ul className="mt-4 flex flex-col gap-3 border-t border-line pt-3">
                {application.notes.map((n) => <li key={n.id} className="text-sm"><p className="whitespace-pre-line">{n.body}</p><p className="mt-0.5 text-[12px] text-slate">{n.author}, {dateTime(n.createdAt)}</p></li>)}
              </ul>
            )}
          </Panel>
          <Panel title="History">
            <ol className="flex flex-col gap-2 text-sm">
              {application.history.map((h, i) => (
                <li key={i}><span className="font-medium">{ApplicationStatus.label(h.toStatus as never)}</span> <span className="text-[12px] text-slate">{dateTime(h.createdAt)}</span>{h.note && <p className="text-[13px] text-slate">{h.note}</p>}</li>
              ))}
            </ol>
          </Panel>
        </aside>
      </div>
    </AppLayout>
  )
}
