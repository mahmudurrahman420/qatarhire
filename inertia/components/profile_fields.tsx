import { useId, useState } from 'react'
import { ChevronDown, X } from 'lucide-react'
import { controlClass } from '~/components/ui/form'
import { cn } from '~/lib/cn'
import { DialCodes, splitPhone } from '#shared/profile_options'

type Opt<V> = { value: V; label: string }

/** Chips + a native select to add more (works well on phones). */
export function MultiSelect<V extends string | number>({ label, value, onChange, options, max, error, hint, required, placeholder = 'Choose…' }: {
  label: string
  value: V[]
  onChange: (v: V[]) => void
  options: Opt<V>[]
  max?: number
  error?: string
  hint?: string
  required?: boolean
  placeholder?: string
}) {
  const id = useId()
  const remaining = options.filter((o) => !value.includes(o.value))
  const full = max !== undefined && value.length >= max
  const labelOf = (v: V) => options.find((o) => o.value === v)?.label ?? String(v)
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink">{label}{required && <span className="text-danger"> *</span>}</label>
      <div className={cn(controlClass, 'relative flex min-h-10 flex-wrap items-center gap-1.5 py-1.5 pe-8', error && 'border-danger')}>
        {value.map((v) => (
          <span key={String(v)} className="inline-flex max-w-full items-center gap-1 rounded-full bg-brand-50 py-0.5 pe-1 ps-2.5 text-[13px] text-brand-700">
            <span className="truncate">{labelOf(v)}</span>
            <button type="button" onClick={() => onChange(value.filter((x) => x !== v))} aria-label={`Remove ${labelOf(v)}`} className="rounded-full p-0.5 hover:bg-brand-100"><X className="size-3" /></button>
          </span>
        ))}
        {!full && remaining.length > 0 && (
          <select
            id={id}
            value=""
            aria-invalid={Boolean(error)}
            onChange={(e) => {
              const raw = e.target.value
              const hit = remaining.find((o) => String(o.value) === raw)
              if (hit) onChange([...value, hit.value])
            }}
            className="min-w-28 flex-1 appearance-none bg-transparent py-0.5 text-[15px] text-slate outline-none"
          >
            <option value="">{value.length ? 'Add more…' : placeholder}</option>
            {remaining.map((o) => <option key={String(o.value)} value={String(o.value)}>{o.label}</option>)}
          </select>
        )}
        <ChevronDown className="pointer-events-none absolute end-2.5 top-3 size-4 text-slate" aria-hidden />
      </div>
      {error ? <p className="text-[13px] text-danger" role="alert">{error}</p> : hint ? <p className="text-[13px] text-slate">{hint}{max ? ` Up to ${max}.` : ''}</p> : null}
    </div>
  )
}

/** Yes / No radios (null = not answered). */
export function YesNo({ label, value, onChange, name }: { label: string; value: boolean | null; onChange: (v: boolean) => void; name: string }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-[15px] font-semibold text-navy">{label}</legend>
      <div className="grid grid-cols-2 gap-2">
        {[true, false].map((v) => (
          <label key={String(v)} className={cn('flex cursor-pointer items-center gap-2 rounded-ctl border bg-white px-3 py-2 text-sm', value === v ? 'border-brand-500 bg-brand-50/60' : 'border-line')}>
            <input type="radio" name={name} checked={value === v} onChange={() => onChange(v)} className="accent-brand-600" />
            {v ? 'Yes' : 'No'}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

/** Country code picker + local number. Value is stored as "+974 6699 4850". */
export function PhoneField({ label, value, onChange, error, required, fallbackDial = '+974' }: {
  label: string
  value: string
  onChange: (v: string) => void
  error?: string
  required?: boolean
  fallbackDial?: string
}) {
  const id = useId()
  const [parts, setParts] = useState(() => splitPhone(value, fallbackDial))
  const set = (dial: string, number: string) => {
    setParts({ dial, number })
    onChange(number.trim() ? `${dial} ${number.trim()}` : '')
  }
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink">{label}{required && <span className="text-danger"> *</span>}</label>
      <div className={cn(controlClass, 'flex h-10 items-center gap-0 p-0', error && 'border-danger')}>
        <select aria-label={`${label} country code`} value={parts.dial} onChange={(e) => set(e.target.value, parts.number)} className="h-full shrink-0 rounded-s-ctl border-e border-line bg-pearl ps-2 pe-1 text-[15px] outline-none">
          {DialCodes.map((d) => <option key={d.code} value={d.code}>{d.flag} {d.code}</option>)}
        </select>
        <input id={id} type="tel" inputMode="tel" autoComplete="tel-national" value={parts.number} onChange={(e) => set(parts.dial, e.target.value.replace(/[^\d\s()-]/g, ''))} placeholder="6699 4850" aria-invalid={Boolean(error)} className="h-full min-w-0 flex-1 bg-transparent px-3 text-[15px] outline-none" />
      </div>
      {error && <p className="text-[13px] text-danger" role="alert">{error}</p>}
    </div>
  )
}

export function SectionTitle({ children, id }: { children: React.ReactNode; id?: string }) {
  return <h3 id={id} className="mt-6 text-[15px] font-semibold text-navy">{children}</h3>
}
