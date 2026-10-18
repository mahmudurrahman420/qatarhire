import { useId, useState, type KeyboardEvent } from 'react'
import { X } from 'lucide-react'
import { controlClass } from '~/components/ui/form'
import { cn } from '~/lib/cn'

/** Free-text tags with suggestions (skills). Enter or comma adds; Backspace removes the last tag. */
export function TagInput({ value, onChange, suggestions, max = 30, placeholder, label, error, hint }: {
  value: string[]
  onChange: (v: string[]) => void
  suggestions: string[]
  max?: number
  placeholder?: string
  label: string
  error?: string
  hint?: string
}) {
  const [draft, setDraft] = useState('')
  const id = useId()
  const add = (raw: string) => {
    const t = raw.trim().replace(/\s+/g, ' ')
    if (!t || value.length >= max) return
    if (value.some((v) => v.toLowerCase() === t.toLowerCase())) return
    onChange([...value, suggestions.find((s) => s.toLowerCase() === t.toLowerCase()) ?? t])
    setDraft('')
  }
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      add(draft)
    } else if (e.key === 'Backspace' && !draft && value.length) {
      onChange(value.slice(0, -1))
    }
  }
  const matches = draft.length >= 1 ? suggestions.filter((s) => s.toLowerCase().includes(draft.toLowerCase()) && !value.includes(s)).slice(0, 8) : []
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">{label}</label>
      <div className={cn(controlClass, 'flex min-h-10 flex-wrap items-center gap-1.5 py-1.5')}>
        {value.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-full bg-maroon-50 py-0.5 pe-1 ps-2.5 text-[13px] text-maroon-700">
            {t}
            <button type="button" onClick={() => onChange(value.filter((v) => v !== t))} aria-label={`Remove ${t}`} className="rounded-full p-0.5 hover:bg-maroon-100">
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          onBlur={() => draft && add(draft)}
          list={`${id}-list`}
          placeholder={value.length ? '' : placeholder}
          className="min-w-32 flex-1 bg-transparent py-0.5 outline-none"
        />
        <datalist id={`${id}-list`}>
          {matches.map((m) => <option key={m} value={m} />)}
        </datalist>
      </div>
      {hint && !error && <p className="text-[13px] text-slate">{hint}</p>}
      {error && <p className="text-[13px] text-danger">{error}</p>}
    </div>
  )
}
