import { Link } from '@inertiajs/react'

export type SocialProvider = 'google' | 'linkedin' | 'facebook'
type Intent = 'login' | 'candidate' | 'employer'

const NAMES: Record<SocialProvider, string> = { google: 'Google', linkedin: 'LinkedIn', facebook: 'Facebook' }

function Logo({ p }: { p: SocialProvider }) {
  if (p === 'google')
    return (
      <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
        <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
      </svg>
    )
  if (p === 'linkedin')
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <rect width="24" height="24" rx="4" fill="#0A66C2" />
        <path fill="#fff" d="M7.1 9.5h2.5V18H7.1V9.5zm1.25-4a1.45 1.45 0 110 2.9 1.45 1.45 0 010-2.9zM11.2 9.5h2.4v1.2h.03c.34-.63 1.15-1.3 2.37-1.3 2.53 0 3 1.67 3 3.83V18h-2.5v-4.2c0-1 0-2.3-1.4-2.3s-1.6 1.1-1.6 2.2V18h-2.5V9.5z" />
      </svg>
    )
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <circle cx="12" cy="12" r="12" fill="#1877F2" />
      <path fill="#fff" d="M15.1 12.6l.4-2.7h-2.6V8.2c0-.7.4-1.5 1.5-1.5h1.2V4.4s-1.1-.2-2.1-.2c-2.2 0-3.6 1.3-3.6 3.7v2h-2.4v2.7h2.4V20h2.9v-7.4h2.3z" />
    </svg>
  )
}

/** "Continue with Google / LinkedIn / Facebook". Renders nothing when no provider is configured. */
export function SocialButtons({ providers, intent, position = 'top' }: { providers?: SocialProvider[]; intent: Intent; position?: 'top' | 'bottom' }) {
  if (!providers?.length) return null
  const divider = (
    <div className="flex items-center gap-3 text-[13px] text-slate" role="separator">
      <span className="h-px flex-1 bg-line" />
      <span>{position === 'top' ? 'or use your email' : 'or'}</span>
      <span className="h-px flex-1 bg-line" />
    </div>
  )
  return (
    <div className="flex flex-col gap-4">
      {position === 'bottom' && divider}
      <div className="flex flex-col gap-2.5">
        {providers.map((p) => (
          // full page navigation: the provider's consent screen is on another origin
          <a
            key={p}
            href={`/auth/${p}/redirect?intent=${intent}`}
            data-provider={p}
            className="flex h-11 w-full items-center justify-center gap-3 rounded-lg border border-line bg-white px-4 text-[15px] font-medium text-ink transition hover:bg-pearl focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600"
          >
            <Logo p={p} />
            Continue with {NAMES[p]}
          </a>
        ))}
      </div>
      {intent !== 'login' && (
        <p className="text-center text-[12px] text-slate">
          By continuing you agree to the <Link href="/terms" className="underline">terms</Link> and <Link href="/privacy" className="underline">privacy policy</Link>.
        </p>
      )}
      {position === 'top' && divider}
    </div>
  )
}
