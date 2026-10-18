import { Head, router } from '@inertiajs/react'
import AppLayout from '~/layouts/app_layout'
import { Button } from '~/components/ui/button'
import { EmptyState, PageHeader, Pagination } from '~/components/ui/misc'
import { ago } from '~/lib/format'
import { cn } from '~/lib/cn'

type N = { id: number; type: string; title: string; body: string | null; url: string | null; readAt: string | null; createdAt: string }
type Props = { notifications: { data: N[]; meta: { total: number; currentPage: number; lastPage: number } } }

export default function Notifications({ notifications }: Props) {
  const unread = notifications.data.some((n) => !n.readAt)
  return (
    <AppLayout>
      <Head title="Notifications" />
      <PageHeader title="Notifications" actions={unread && <Button variant="secondary" size="sm" onClick={() => router.post('/notifications/read-all', {}, { preserveScroll: true })}>Mark all as read</Button>} />
      {notifications.data.length ? (
        <ul className="overflow-hidden rounded-panel border border-line bg-white">
          {notifications.data.map((n) => (
            <li key={n.id} className={cn('border-b border-line last:border-b-0', !n.readAt && 'bg-maroon-50/40')}>
              <button type="button" onClick={() => router.post(`/notifications/${n.id}/read`)} className="flex w-full items-start gap-3 px-5 py-4 text-start hover:bg-pearl">
                <span className={cn('mt-2 size-2 shrink-0 rounded-full', n.readAt ? 'bg-transparent' : 'bg-maroon-600')} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className={cn('block text-sm', !n.readAt && 'font-semibold')}>{n.title}</span>
                  {n.body && <span className="mt-0.5 block whitespace-pre-line text-sm text-slate">{n.body}</span>}
                </span>
                <span className="shrink-0 text-xs text-slate">{ago(n.createdAt)}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="No notifications yet">Application updates, verification decisions and job alerts will appear here.</EmptyState>
      )}
      <div className="mt-6">
        <Pagination meta={{ page: notifications.meta.currentPage, lastPage: notifications.meta.lastPage, total: notifications.meta.total }} href={(p) => `/notifications?page=${p}`} />
      </div>
    </AppLayout>
  )
}
