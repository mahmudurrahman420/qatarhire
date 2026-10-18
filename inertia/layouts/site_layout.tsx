import { Link, router } from '@inertiajs/react'
import { useState, type ReactNode } from 'react'
import { Bell, Menu, X } from 'lucide-react'
import { useShared } from '~/lib/page'
import { Wordmark } from '~/components/brand'
import { Flash } from '~/components/flash'
import { ButtonLink } from '~/components/ui/button'
import { cn } from '~/lib/cn'

function dashboardHref(role: string) {
  return role === 'admin' ? '/admin' : role === 'employer' ? '/employer' : '/candidate'
}

export function SiteHeader({ tone = 'light' }: { tone?: 'light' | 'maroon' }) {
  const { auth, appName } = useShared()
  const [open, setOpen] = useState(false)
  const dark = tone === 'maroon'
  const link = cn('rounded-ctl px-3 py-2 text-sm font-medium transition-colors', dark ? 'text-white/85 hover:text-white hover:bg-white/10' : 'text-slate hover:text-ink hover:bg-white')

  const nav = (
    <>
      <Link href="/jobs" className={link}>Find jobs</Link>
      <Link href="/companies" className={link}>Companies</Link>
      {(!auth || auth.role !== 'candidate') && <Link href="/employers" className={link}>For employers</Link>}
    </>
  )

  return (
    <header className={cn('relative z-20', dark ? 'bg-maroon-600' : 'border-b border-line bg-pearl/90 backdrop-blur')}>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Wordmark appName={appName} inverted={dark} />
        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">{nav}</nav>
        <div className="hidden items-center gap-2 md:flex">
          {auth ? (
            <>
              <Link href="/notifications" className={cn('relative rounded-ctl p-2', dark ? 'text-white hover:bg-white/10' : 'text-slate hover:bg-white')} aria-label={`Notifications (${auth.unreadNotifications} unread)`}>
                <Bell className="size-5" />
                {auth.unreadNotifications > 0 && <span className="absolute end-1 top-1 size-2 rounded-full bg-amber ring-2 ring-white" />}
              </Link>
              <ButtonLink href={dashboardHref(auth.role)} variant={dark ? 'secondary' : 'primary'} size="sm">
                My dashboard
              </ButtonLink>
            </>
          ) : (
            <>
              <Link href="/login" className={link}>Sign in</Link>
              <ButtonLink href="/register" variant={dark ? 'secondary' : 'primary'} size="sm">Create profile</ButtonLink>
            </>
          )}
        </div>
        <button type="button" className={cn('rounded-ctl p-2 md:hidden', dark ? 'text-white' : 'text-ink')} onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Menu">
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>
      {open && (
        <div className={cn('border-t px-4 pb-4 pt-2 md:hidden', dark ? 'border-white/15' : 'border-line bg-pearl')}>
          <nav className="flex flex-col" aria-label="Mobile">{nav}</nav>
          <div className="mt-3 flex gap-2">
            {auth ? (
              <>
                <ButtonLink href={dashboardHref(auth.role)} size="sm" variant={dark ? 'secondary' : 'primary'}>My dashboard</ButtonLink>
                <button type="button" onClick={() => router.post('/logout')} className={link}>Sign out</button>
              </>
            ) : (
              <>
                <ButtonLink href="/register" size="sm" variant={dark ? 'secondary' : 'primary'}>Create profile</ButtonLink>
                <Link href="/login" className={link}>Sign in</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}

export function SiteFooter() {
  const { appName } = useShared()
  const col = 'flex flex-col gap-2 text-sm'
  const a = 'text-slate hover:text-maroon-700'
  return (
    <footer className="mt-20 border-t border-line bg-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Wordmark appName={appName} />
          <p className="mt-3 max-w-xs text-sm text-slate">
            Jobs in Qatar from employers we check, and a candidate database that only shows what you choose to share.
          </p>
        </div>
        <div className={col}>
          <p className="font-medium">Job seekers</p>
          <Link className={a} href="/jobs">Search jobs</Link>
          <Link className={a} href="/register">Create a profile</Link>
          <Link className={a} href="/safety">Stay safe while job hunting</Link>
        </div>
        <div className={col}>
          <p className="font-medium">Employers</p>
          <Link className={a} href="/employers">Hiring on {appName}</Link>
          <Link className={a} href="/employers/register">Register your company</Link>
          <Link className={a} href="/companies">Employer directory</Link>
        </div>
        <div className={col}>
          <p className="font-medium">{appName}</p>
          <Link className={a} href="/about">About us</Link>
          <Link className={a} href="/faq">Questions and answers</Link>
          <Link className={a} href="/contact">Contact</Link>
          <Link className={a} href="/privacy">Privacy policy</Link>
          <Link className={a} href="/terms">Terms of service</Link>
          <Link className={a} href="/cookies">Cookies</Link>
        </div>
      </div>
      <div className="border-t border-line">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-slate sm:px-6">
          © {new Date().getFullYear()} {appName}. Legitimate employers never charge candidates for applications, interviews or visas.
        </p>
      </div>
    </footer>
  )
}

export default function SiteLayout({ children, header = 'light' }: { children: ReactNode; header?: 'light' | 'maroon' | 'none' }) {
  const { siteNotice } = useShared()
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:z-50 focus:rounded-ctl focus:bg-white focus:px-3 focus:py-2">Skip to content</a>
      {siteNotice && <div className="bg-dune px-4 py-2 text-center text-sm">{siteNotice}</div>}
      {header !== 'none' && <SiteHeader tone={header} />}
      <main id="main" className="flex-1">{children}</main>
      <SiteFooter />
      <Flash />
    </div>
  )
}
