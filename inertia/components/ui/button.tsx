import { Link } from '@inertiajs/react'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '~/lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'quiet'
type Size = 'sm' | 'md' | 'lg'

const variants: Record<Variant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 disabled:bg-brand-200',
  secondary: 'bg-white text-ink border border-line hover:border-slate/50 hover:bg-pearl disabled:text-slate/60',
  ghost: 'text-brand-700 hover:bg-brand-50 disabled:text-slate/60',
  danger: 'bg-white text-danger border border-danger/30 hover:bg-danger-50',
  quiet: 'text-slate hover:text-ink hover:bg-pearl',
}
const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-[15px] gap-2',
}

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', extra?: string) {
  return cn(
    'inline-flex items-center justify-center rounded-ctl font-medium transition-colors whitespace-nowrap disabled:cursor-not-allowed',
    variants[variant],
    sizes[size],
    extra
  )
}

type Common = { variant?: Variant; size?: Size; className?: string; children: ReactNode }

export function Button({ variant, size, className, loading, children, ...rest }: Common & ComponentProps<'button'> & { loading?: boolean }) {
  return (
    <button {...rest} disabled={rest.disabled || loading} aria-busy={loading || undefined} className={buttonClass(variant, size, className)}>
      {loading && <span className="size-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" aria-hidden />}
      {children}
    </button>
  )
}

export function ButtonLink({ variant, size, className, children, ...rest }: Common & Omit<ComponentProps<typeof Link>, keyof Common>) {
  return (
    <Link {...rest} className={buttonClass(variant, size, className)}>
      {children}
    </Link>
  )
}
