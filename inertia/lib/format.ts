import type { Salary } from '~/lib/types'

const TZ = 'Asia/Qatar'
const nf = new Intl.NumberFormat('en-QA')

export function qar(n: number) {
  return `QAR ${nf.format(n)}`
}

export function salaryText(s: Salary) {
  if (!s) return null
  if (s.min !== null && s.max !== null && s.min !== s.max) return `QAR ${nf.format(s.min)}–${nf.format(s.max)} / month`
  const v = s.max ?? s.min
  return v === null ? null : `QAR ${nf.format(v)} / month`
}

export function date(iso: string | null | undefined, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!iso) return ''
  const d = iso.length === 10 ? new Date(`${iso}T12:00:00+03:00`) : new Date(iso)
  return new Intl.DateTimeFormat('en-GB', { timeZone: TZ, ...opts }).format(d)
}

export function dateTime(iso: string | null | undefined) {
  return date(iso, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

/** "today", "3 days ago", "2 months ago" in Qatar time. */
export function ago(iso: string | null | undefined) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const day = 86_400_000
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min ago`
  if (diff < day) return `${Math.floor(diff / 3_600_000)} h ago`
  const days = Math.floor(diff / day)
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days} days ago`
  const months = Math.floor(days / 30)
  return months < 12 ? `${months} month${months > 1 ? 's' : ''} ago` : `${Math.floor(months / 12)} year${months >= 24 ? 's' : ''} ago`
}

/** Days until a YYYY-MM-DD deadline (inclusive, Qatar time). */
export function daysLeft(deadline: string | null) {
  if (!deadline) return null
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date())
  return Math.round((new Date(deadline).getTime() - new Date(today).getTime()) / 86_400_000)
}

export function fileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('')
}

/** Builds a query string from a filter object, dropping empty values. */
export function toQuery(filters: Record<string, unknown>) {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(filters)) {
    if (v === null || v === undefined || v === '' || v === false) continue
    if (Array.isArray(v)) v.forEach((x) => qs.append(k, String(x)))
    else qs.set(k, String(v))
  }
  return qs.toString()
}
