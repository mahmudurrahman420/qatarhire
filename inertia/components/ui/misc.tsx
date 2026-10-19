import { Link } from '@inertiajs/react'
import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '~/lib/cn'

type Tone = 'neutral' | 'brand' | 'gulf' | 'amber' | 'danger' | 'dune'
const tones: Record<Tone, string> = {
  neutral: 'bg-pearl text-slate ring-line',
  brand: 'bg-brand-50 text-brand-700 ring-brand-100',
  gulf: 'bg-gulf-50 text-gulf ring-gulf/15',
  amber: 'bg-amber-50 text-amber ring-amber/15',
  danger: 'bg-danger-50 text-danger ring-danger/15',
  dune: 'bg-dune-50 text-ink ring-dune',
}

export function Badge({ tone = 'neutral', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset', tones[tone], className)}>{children}</span>
}

export function Panel({ title, actions, children, className, padded = true }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; padded?: boolean }) {
  return (
    <section className={cn('rounded-panel border border-line bg-white', className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          {title && <h2 className="font-sans text-[15px] font-semibold tracking-normal">{title}</h2>}
          {actions}
        </header>
      )}
      <div className={padded ? 'p-5' : undefined}>{children}</div>
    </section>
  )
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-2 rounded-panel border border-dashed border-line bg-white px-6 py-10">
      <p className="font-display text-lg">{title}</p>
      {children && <div className="max-w-prose text-sm text-slate">{children}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

export function Pagination({ meta, href }: { meta: { page: number; lastPage: number; total: number }; href: (page: number) => string }) {
  if (meta.lastPage <= 1) return null
  const pages: number[] = []
  for (let p = Math.max(1, meta.page - 2); p <= Math.min(meta.lastPage, meta.page + 2); p++) pages.push(p)
  const item = 'grid h-9 min-w-9 place-items-center rounded-ctl px-2 text-sm'
  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center gap-1">
      {meta.page > 1 && <Link href={href(meta.page - 1)} className={cn(item, 'hover:bg-white')} preserveScroll={false}>Previous</Link>}
      {pages[0] > 1 && <span className="px-1 text-slate">…</span>}
      {pages.map((p) =>
        p === meta.page ? (
          <span key={p} aria-current="page" className={cn(item, 'bg-ink text-white')}>{p}</span>
        ) : (
          <Link key={p} href={href(p)} className={cn(item, 'hover:bg-white')}>{p}</Link>
        )
      )}
      {pages[pages.length - 1] < meta.lastPage && <span className="px-1 text-slate">…</span>}
      {meta.page < meta.lastPage && <Link href={href(meta.page + 1)} className={cn(item, 'hover:bg-white')}>Next</Link>}
    </nav>
  )
}

/** Native <dialog> modal: focus-trapped and Esc-closable by the browser. */
export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className={cn('m-auto w-[calc(100%-2rem)] rounded-panel bg-white p-0 text-ink shadow-xl backdrop:bg-ink/40', wide ? 'max-w-2xl' : 'max-w-lg')}
    >
      <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
        <h2 className="font-sans text-base font-semibold tracking-normal">{title}</h2>
        <button type="button" onClick={onClose} className="rounded-ctl p-1 text-slate hover:bg-pearl" aria-label="Close">
          <X className="size-4" />
        </button>
      </div>
      <div className="max-h-[75vh] overflow-y-auto p-5">{open && children}</div>
    </dialog>
  )
}

const LOGO_COLORS = ['#1f6fe5', '#7c3aed', '#e0353b', '#f59e0b', '#0d9488', '#db2777', '#2563eb', '#ea580c']

/** Company logo, or a coloured initial tile (deterministic per company name). */
export function CompanyLogo({ name, url, size = 44 }: { name: string; url: string | null; size?: number }) {
  if (url) {
    return <img src={url} alt="" width={size} height={size} loading="lazy" className="shrink-0 rounded-ctl border border-line bg-white object-contain" style={{ width: size, height: size }} />
  }
  let h = 0
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return (
    <span aria-hidden className="grid shrink-0 place-items-center rounded-ctl font-display font-bold text-white" style={{ width: size, height: size, background: LOGO_COLORS[h % LOGO_COLORS.length], fontSize: size * 0.45 }}>
      {name.trim()[0]?.toUpperCase()}
    </span>
  )
}

export function PageHeader({ title, description, actions, back }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; back?: { href: string; label: string } }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {back && (
          <Link href={back.href} className="mb-2 inline-block text-sm text-slate hover:text-brand-700">
            {back.label}
          </Link>
        )}
        <h1 className="text-2xl sm:text-[28px]">{title}</h1>
        {description && <div className="mt-1.5 max-w-2xl text-slate">{description}</div>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="rounded-panel border border-line bg-white px-4 py-3.5">
      <p className="text-[13px] text-slate">{label}</p>
      <p className="mt-0.5 font-display text-2xl font-bold">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate">{hint}</p>}
    </div>
  )
}
