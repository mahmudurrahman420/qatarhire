import { Head, Link, router } from '@inertiajs/react'
import { X } from 'lucide-react'
import AppLayout from '~/layouts/app_layout'
import { ButtonLink } from '~/components/ui/button'
import { EmptyState, PageHeader } from '~/components/ui/misc'
import { CandidateResult } from '~/components/candidates'
import type { CandidateCard } from '~/lib/types'
import { cn } from '~/lib/cn'

type Props = { list: string; lists: { name: string; count: number }[]; items: { id: number; listName: string; note: string | null; candidate: CandidateCard }[]; hiddenCount: number }

export default function SavedCandidates({ list, lists, items, hiddenCount }: Props) {
  return (
    <AppLayout>
      <Head title="Saved candidates" />
      <PageHeader title="Saved candidates" description="Shortlists shared across your team." actions={<ButtonLink href="/employer/candidates" variant="secondary">Search candidates</ButtonLink>} />
      {lists.length > 0 && (
        <nav className="mb-4 flex flex-wrap gap-2" aria-label="Lists">
          <Link href="/employer/candidates/saved" className={cn('rounded-full px-3 py-1 text-sm ring-1', !list ? 'bg-ink text-white ring-ink' : 'bg-white ring-line')}>All</Link>
          {lists.map((l) => (
            <Link key={l.name} href={`/employer/candidates/saved?list=${encodeURIComponent(l.name)}`} className={cn('rounded-full px-3 py-1 text-sm ring-1', list === l.name ? 'bg-ink text-white ring-ink' : 'bg-white ring-line')}>{l.name} <span className="opacity-70">{l.count}</span></Link>
          ))}
        </nav>
      )}
      {items.length ? (
        <div className="overflow-hidden rounded-panel border border-line bg-white">
          {items.map((i) => (
            <div key={i.id} className="relative">
              <CandidateResult c={i.candidate} />
              <div className="flex items-center justify-between gap-2 border-b border-line bg-pearl/60 px-5 py-1.5 text-[13px] text-slate">
                <span>{i.listName}{i.note ? ` — ${i.note}` : ''}</span>
                <button type="button" onClick={() => router.delete(`/employer/saved-candidates/${i.id}`, { preserveScroll: true })} className="inline-flex items-center gap-1 hover:text-danger"><X className="size-3.5" /> Remove</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="No saved candidates" action={<ButtonLink href="/employer/candidates">Search candidates</ButtonLink>}>Save candidates from search results to build shortlists for your roles.</EmptyState>
      )}
      {hiddenCount > 0 && <p className="mt-4 text-sm text-slate">{hiddenCount} saved candidate{hiddenCount > 1 ? 's are' : ' is'} hidden because they made their profile private.</p>}
    </AppLayout>
  )
}
