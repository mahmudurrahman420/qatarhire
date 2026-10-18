import { Head, router, useForm } from '@inertiajs/react'
import { useState } from 'react'
import { BookmarkPlus, X } from 'lucide-react'
import AppLayout from '~/layouts/app_layout'
import { Button } from '~/components/ui/button'
import { TextField } from '~/components/ui/form'
import { Badge, Modal, Panel } from '~/components/ui/misc'
import { AccessPanel, CandidateProfileView, type CandidateDetail } from '~/components/candidates'
import { Link } from '@inertiajs/react'

type Props = { candidate: CandidateDetail; applied: boolean; saved: { id: number; listName: string; note: string | null }[] }

export default function CandidateShow({ candidate, applied, saved }: Props) {
  const [open, setOpen] = useState(false)
  const form = useForm({ listName: 'Shortlist', note: '' })
  return (
    <AppLayout>
      <Head title={candidate.headline ?? 'Candidate'} />
      <Link href="/employer/candidates" className="mb-4 inline-block text-sm text-slate hover:text-maroon-700" onClick={(e) => { if (window.history.length > 1) { e.preventDefault(); window.history.back() } }}>Back to results</Link>
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <CandidateProfileView c={candidate} showFullName={Boolean(candidate.contact)} />
        <aside className="flex flex-col gap-6 lg:sticky lg:top-20 lg:self-start">
          {applied && <p className="rounded-panel bg-gulf-50 px-4 py-3 text-sm text-gulf">This candidate has applied to one of your jobs.</p>}
          <AccessPanel c={candidate} applied={applied} />
          <Panel title="Shortlists">
            {saved.length > 0 && (
              <ul className="mb-3 flex flex-col gap-2">
                {saved.map((s) => (
                  <li key={s.id} className="flex items-start justify-between gap-2 text-sm">
                    <span><Badge tone="maroon">{s.listName}</Badge>{s.note && <span className="mt-1 block text-[13px] text-slate">{s.note}</span>}</span>
                    <button type="button" className="rounded p-1 text-slate hover:bg-pearl" aria-label={`Remove from ${s.listName}`} onClick={() => router.delete(`/employer/saved-candidates/${s.id}`, { preserveScroll: true })}><X className="size-4" /></button>
                  </li>
                ))}
              </ul>
            )}
            <Button variant="secondary" size="sm" onClick={() => setOpen(true)}><BookmarkPlus className="size-4" /> Save to a list</Button>
          </Panel>
        </aside>
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="Save candidate">
        <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); form.post(`/employer/candidates/${candidate.id}/save`, { preserveScroll: true, onSuccess: () => setOpen(false) }) }}>
          <TextField label="List" value={form.data.listName} onChange={(e) => form.setData('listName', e.target.value)} error={form.errors.listName} hint="Lists are shared with your team, e.g. 'Lusail site engineers'." />
          <TextField label="Note" optional value={form.data.note} onChange={(e) => form.setData('note', e.target.value)} error={form.errors.note} />
          <div className="flex justify-end gap-2"><Button type="button" variant="quiet" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" loading={form.processing}>Save</Button></div>
        </form>
      </Modal>
    </AppLayout>
  )
}
