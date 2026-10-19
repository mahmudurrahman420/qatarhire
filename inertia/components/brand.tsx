import { Link } from '@inertiajs/react'

/**
 * Logo: the green-and-navy "H" mark from the approved design, plus the
 * hiremegulf.com wordmark set in the site's display face.
 */
export function Wordmark({ inverted, compact }: { appName?: string; inverted?: boolean; compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label="hiremegulf.com home">
      <img src="/images/logo-mark.png" alt="" width={44} height={42} className={compact ? 'h-7 w-auto' : 'h-9 w-auto'} />
      <span className={`font-display font-bold tracking-tight ${compact ? 'text-lg' : 'text-[22px]'}`}>
        <span className={inverted ? 'text-white' : 'text-brand-600'}>hireme</span>
        <span className={inverted ? 'text-white' : 'text-navy'}>gulf.com</span>
      </span>
    </Link>
  )
}
