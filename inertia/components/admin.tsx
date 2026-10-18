import { Link, router } from '@inertiajs/react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { Search } from 'lucide-react'
import { controlClass } from '~/components/ui/form'
import { cn } from '~/lib/cn'
import { toQuery } from '~/lib/format'

export function FilterTabs({ base, current, param = 'status', tabs, extra = {} }: { base: string; current: string; param?: string; tabs: [string, string][]; extra?: Record<string, unknown> }) {
  return (
    <nav className="mb-4 flex gap-1 overflow-x-auto border-b border-line">
      {tabs.map(([v, l]) => (
        <Link key={v} href={`${base}?${toQuery({ ...extra, [param]: v || 'all' })}`} aria-current={current === v || (!v && current === 'all') ? 'page' : undefined} className={cn('-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm', current === v || (!v && current === 'all') ? 'border-maroon-600 font-medium text-maroon-700' : 'border-transparent text-slate hover:text-ink')}>
          {l}
        </Link>
      ))}
    </nav>
  )
}

export function SearchBox({ base, value, params, placeholder }: { base: string; value: string; params: Record<string, unknown>; placeholder: string }) {
  const [q, setQ] = useState(value)
  return (
    <form className="mb-4 max-w-sm" role="search" onSubmit={(e: FormEvent) => { e.preventDefault(); router.get(`${base}?${toQuery({ ...params, q })}`) }}>
      <label className="relative block">
        <span className="sr-only">{placeholder}</span>
        <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-slate" aria-hidden />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} className={cn(controlClass, 'h-10 ps-9')} />
      </label>
    </form>
  )
}

export function Table({ head, children, minWidth = 640 }: { head: ReactNode[]; children: ReactNode; minWidth?: number }) {
  return (
    <div className="overflow-x-auto rounded-panel border border-line bg-white">
      <table className="w-full text-sm" style={{ minWidth }}>
        <thead><tr className="border-b border-line text-[13px] text-slate">{head.map((h, i) => <th key={i} className="px-4 py-2 text-start font-normal">{h}</th>)}</tr></thead>
        <tbody className="[&>tr]:border-b [&>tr]:border-line [&>tr:last-child]:border-b-0 [&_td]:px-4 [&_td]:py-2.5 [&_td]:align-top">{children}</tbody>
      </table>
    </div>
  )
}
