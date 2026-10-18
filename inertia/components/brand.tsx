import { Link } from '@inertiajs/react'

/** Wordmark: the serrated "Q" mark echoes the flag; name is configurable via APP_NAME. */
export function Wordmark({ appName, inverted }: { appName: string; inverted?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label={`${appName} home`}>
      <svg viewBox="0 0 32 32" className="size-8" aria-hidden>
        <rect width="32" height="32" rx="7" fill={inverted ? '#fff' : '#8A1538'} />
        <path d="M8 6h6v20H8z" fill={inverted ? '#8A1538' : '#fff'} />
        <path d="M14 6l4 2.2-4 2.2 4 2.2-4 2.2 4 2.2-4 2.2 4 2.2-4 2.2V6z" fill={inverted ? '#8A1538' : '#fff'} />
      </svg>
      <span className={`font-display text-xl font-bold tracking-tight ${inverted ? 'text-white' : 'text-ink'}`}>{appName}</span>
    </Link>
  )
}
