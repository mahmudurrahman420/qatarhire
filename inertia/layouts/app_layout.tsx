import { Link, router, usePage } from '@inertiajs/react'
import { useState, type ReactNode } from 'react'
import {
  Bell, Briefcase, Building2, ClipboardList, Flag, Gauge, Heart, LayoutDashboard, ListChecks, LogOut, Menu,
  Search, Settings, Shield, Tags, UserRound, Users, X, Receipt, ScrollText, BookmarkCheck, Mail,
} from 'lucide-react'
import { useShared } from '~/lib/page'
import { Wordmark } from '~/components/brand'
import { Flash } from '~/components/flash'
import { cn } from '~/lib/cn'
import { VerificationBadge } from '~/components/status'

type Item = { href: string; label: string; icon: typeof Bell; exact?: boolean }

function navFor(role: string, memberRole?: string): Item[] {
  if (role === 'admin')
    return [
      { href: '/admin', label: 'Overview', icon: Gauge, exact: true },
      { href: '/admin/companies', label: 'Employer verification', icon: Building2 },
      { href: '/admin/jobs', label: 'Job moderation', icon: Briefcase },
      { href: '/admin/reports', label: 'Reports', icon: Flag },
      { href: '/admin/users', label: 'Users', icon: Users },
      { href: '/admin/taxonomy/categories', label: 'Categories & lists', icon: Tags },
      { href: '/admin/audit', label: 'Audit log', icon: ScrollText },
      { href: '/admin/settings', label: 'Platform settings', icon: Settings, exact: true },
      { href: '/admin/settings/email', label: 'Email settings', icon: Mail },
    ]
  if (role === 'employer')
    return [
      { href: '/employer', label: 'Overview', icon: LayoutDashboard, exact: true },
      { href: '/employer/jobs', label: 'Jobs', icon: Briefcase },
      { href: '/employer/candidates', label: 'Search candidates', icon: Search, exact: true },
      { href: '/employer/candidates/saved', label: 'Saved candidates', icon: BookmarkCheck },
      ...(memberRole === 'owner'
        ? [
            { href: '/employer/company', label: 'Company profile', icon: Building2 },
            { href: '/employer/team', label: 'Team', icon: Users },
            { href: '/employer/billing', label: 'Billing', icon: Receipt },
          ]
        : []),
    ]
  return [
    { href: '/candidate', label: 'Overview', icon: LayoutDashboard, exact: true },
    { href: '/candidate/profile', label: 'Profile & CV', icon: UserRound },
    { href: '/candidate/applications', label: 'Applications', icon: ClipboardList },
    { href: '/candidate/saved', label: 'Saved jobs & alerts', icon: Heart },
    { href: '/candidate/privacy', label: 'Privacy & data', icon: Shield },
    { href: '/jobs', label: 'Find jobs', icon: Search },
  ]
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const { auth, appName, siteNotice } = useShared()
  const { url } = usePage()
  const [open, setOpen] = useState(false)
  if (!auth) return <>{children}</>
  const items = navFor(auth.role, auth.company?.memberRole)
  const path = url.split('?')[0]
  const active = (i: Item) => (i.exact ? path === i.href : path === i.href || path.startsWith(`${i.href}/`))

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center px-5">
        <Wordmark appName={appName} />
      </div>
      {auth.company && (
        <div className="mx-3 mb-3 rounded-ctl bg-pearl px-3 py-2.5">
          <p className="truncate text-sm font-medium">{auth.company.name}</p>
          <div className="mt-1"><VerificationBadge status={auth.company.verificationStatus} /></div>
        </div>
      )}
      <nav className="flex flex-1 flex-col gap-0.5 px-3" aria-label="Dashboard">
        {items.map((i) => (
          <Link
            key={i.href}
            href={i.href}
            onClick={() => setOpen(false)}
            aria-current={active(i) ? 'page' : undefined}
            className={cn(
              'flex items-center gap-3 rounded-ctl px-3 py-2 text-sm transition-colors',
              active(i) ? 'bg-brand-50 font-medium text-brand-700' : 'text-slate hover:bg-pearl hover:text-ink'
            )}
          >
            <i.icon className="size-4 shrink-0" aria-hidden />
            {i.label}
          </Link>
        ))}
      </nav>
      <div className="border-t border-line p-3">
        <Link href="/account" className="flex items-center gap-3 rounded-ctl px-3 py-2 text-sm text-slate hover:bg-pearl hover:text-ink">
          <ListChecks className="size-4" aria-hidden /> Account settings
        </Link>
        <button type="button" onClick={() => router.post('/logout')} className="flex w-full items-center gap-3 rounded-ctl px-3 py-2 text-sm text-slate hover:bg-pearl hover:text-ink">
          <LogOut className="size-4" aria-hidden /> Sign out
        </button>
        <p className="truncate px-3 pt-2 text-xs text-slate">{auth.email}</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen lg:ps-64">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:z-50 focus:rounded-ctl focus:bg-white focus:px-3 focus:py-2">Skip to content</a>
      <aside className="fixed inset-y-0 start-0 z-30 hidden w-64 border-e border-line bg-white lg:block">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink/30" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 start-0 w-72 bg-white shadow-xl">{sidebar}</aside>
        </div>
      )}
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-line bg-pearl/90 px-4 backdrop-blur sm:px-6">
        <button type="button" className="rounded-ctl p-2 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
        <p className="hidden text-sm text-slate lg:block">Signed in as {auth.fullName}</p>
        <div className="flex items-center gap-1">
          <Link href="/" className="rounded-ctl px-3 py-1.5 text-sm text-slate hover:bg-white hover:text-ink">Public site</Link>
          <Link href="/notifications" className="relative rounded-ctl p-2 text-slate hover:bg-white" aria-label={`Notifications (${auth.unreadNotifications} unread)`}>
            <Bell className="size-5" />
            {auth.unreadNotifications > 0 && (
              <span className="absolute -end-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-brand-600 px-1 text-[10px] font-semibold text-white">
                {auth.unreadNotifications > 9 ? '9+' : auth.unreadNotifications}
              </span>
            )}
          </Link>
        </div>
      </header>
      {siteNotice && <div className="bg-dune px-4 py-2 text-sm sm:px-6">{siteNotice}</div>}
      <main id="main" className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      <Flash />
    </div>
  )
}
