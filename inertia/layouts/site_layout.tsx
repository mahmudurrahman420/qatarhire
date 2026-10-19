import { Link, router, usePage } from '@inertiajs/react'
import { useState, type ReactNode } from 'react'
import { Bell, Menu, X } from 'lucide-react'
import { useShared } from '~/lib/page'
import { Wordmark } from '~/components/brand'
import { Flash } from '~/components/flash'
import { ButtonLink } from '~/components/ui/button'
import { GulfCountries } from '#shared/gulf'
import { cn } from '~/lib/cn'

function dashboardHref(role: string) {
  return role === 'admin' ? '/admin' : role === 'employer' ? '/employer' : '/candidate'
}

const NAV = [
  { href: '/talent', label: 'Find Talent' },
  { href: '/jobs', label: 'Find Jobs' },
  { href: '/courses', label: 'Courses & Training' },
  { href: '/career-tips', label: 'Career Tips' },
]

/**
 * Country row. On job and talent search it filters the current listing;
 * everywhere else it switches the homepage to that country.
 */
function CountryRow() {
  const { url } = usePage()
  const [path, query = ''] = url.split('?')
  const params = new URLSearchParams(query)
  const listing = path === '/jobs' || path === '/talent'
  const current = listing ? params.get('location') ?? '' : path === '/' ? params.get('country') ?? '' : ''
  const href = (slug: string) => {
    if (listing) {
      const p = new URLSearchParams(query)
      p.delete('page')
      if (slug) p.set('location', slug)
      else p.delete('location')
      const qs = p.toString()
      return `${path}${qs ? `?${qs}` : ''}`
    }
    return slug ? `/?country=${slug}` : '/'
  }
  const items = [{ slug: '', name: 'All Gulf' }, ...GulfCountries.map((c) => ({ slug: c.slug, name: c.name }))]
  const isActive = (slug: string) => (slug ? current === slug : !GulfCountries.some((c) => c.slug === current))
  return (
    <nav aria-label="Country" className="border-b border-line bg-white">
      <ul className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 sm:px-6">
        {items.map((c) => (
          <li key={c.name}>
            <Link
              href={href(c.slug)}
              aria-current={isActive(c.slug) ? 'page' : undefined}
              className={cn(
                '-mb-px inline-block whitespace-nowrap border-b-2 px-3 py-2 text-[13px] font-medium transition-colors',
                isActive(c.slug) ? 'border-brand-600 text-brand-600' : 'border-transparent text-navy/80 hover:text-navy'
              )}
            >
              {c.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export function SiteHeader() {
  const { auth } = useShared()
  const { url } = usePage()
  const [open, setOpen] = useState(false)
  const path = url.split('?')[0]
  const link = (href: string) =>
    cn('rounded-ctl px-3 py-2 text-sm font-medium transition-colors', path.startsWith(href) ? 'text-brand-600' : 'text-navy hover:text-brand-600')

  return (
    <header className="relative z-20 bg-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Wordmark />
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={link(n.href)}>{n.label}</Link>
          ))}
        </nav>
        <div className="hidden items-center gap-3 lg:flex">
          <span className="text-sm font-medium text-navy">
            English <span className="text-slate">/</span>{' '}
            <Link href="/arabic" lang="ar" className="font-normal text-slate hover:text-brand-600">العربية</Link>
          </span>
          <span className="h-5 w-px bg-line" aria-hidden />
          {auth ? (
            <>
              <Link href="/notifications" className="relative rounded-ctl p-2 text-navy hover:bg-pearl" aria-label={`Notifications (${auth.unreadNotifications} unread)`}>
                <Bell className="size-5" />
                {auth.unreadNotifications > 0 && <span className="absolute end-1 top-1 size-2 rounded-full bg-amber ring-2 ring-white" />}
              </Link>
              <ButtonLink href={dashboardHref(auth.role)} size="sm">My dashboard</ButtonLink>
            </>
          ) : (
            <>
              <Link href="/login" className="px-2 text-sm font-medium text-navy hover:text-brand-600">Log in</Link>
              <ButtonLink href="/register" className="h-10 px-5">Create Profile</ButtonLink>
            </>
          )}
        </div>
        <button type="button" className="rounded-ctl p-2 text-navy lg:hidden" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Menu">
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>
      {open && (
        <div className="border-t border-line bg-white px-4 pb-4 pt-2 lg:hidden">
          <nav className="flex flex-col" aria-label="Mobile">
            {NAV.map((n) => <Link key={n.href} href={n.href} className={link(n.href)}>{n.label}</Link>)}
            <Link href="/arabic" lang="ar" className={link('/arabic')}>العربية</Link>
          </nav>
          <div className="mt-3 flex gap-2">
            {auth ? (
              <>
                <ButtonLink href={dashboardHref(auth.role)} size="sm">My dashboard</ButtonLink>
                <button type="button" onClick={() => router.post('/logout')} className={link('/logout')}>Sign out</button>
              </>
            ) : (
              <>
                <ButtonLink href="/register" size="sm">Create Profile</ButtonLink>
                <ButtonLink href="/login" size="sm" variant="secondary">Log in</ButtonLink>
              </>
            )}
          </div>
        </div>
      )}
      <div className="border-t border-line"><CountryRow /></div>
    </header>
  )
}

export function SiteFooter() {
  const links = [
    ['/about', 'About'],
    ['/help', 'Help Centre'],
    ['/contact', 'Contact'],
    ['/privacy', 'Privacy'],
    ['/terms', 'Terms'],
    ['/safety', 'Safety'],
    ['/accessibility', 'Accessibility'],
  ]
  return (
    <footer className="border-t border-line bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-10 gap-y-4 px-4 py-5 sm:px-6">
        <Wordmark compact />
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-[13px]">
          {links.map(([href, label]) => (
            <Link key={href} href={href} className="text-slate hover:text-brand-600">{label}</Link>
          ))}
        </nav>
        <p className="text-xs text-slate">© {new Date().getFullYear()} hiremegulf.com</p>
      </div>
    </footer>
  )
}

export default function SiteLayout({ children }: { children: ReactNode; header?: string }) {
  const { siteNotice } = useShared()
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:z-50 focus:rounded-ctl focus:bg-white focus:px-3 focus:py-2">Skip to content</a>
      {siteNotice && <div className="bg-sunrise px-4 py-2 text-center text-sm">{siteNotice}</div>}
      <SiteHeader />
      <main id="main" className="flex-1">{children}</main>
      <SiteFooter />
      <Flash />
    </div>
  )
}
