import { useEffect, useRef, useState } from 'react'
import { Bold, Italic, List, ListOrdered, RemoveFormatting, Underline } from 'lucide-react'
import { cn } from '~/lib/cn'
import { containsContactInfo, htmlToText, sanitizeHtml } from '#shared/rich_text'

/** Renders HTML that the server already sanitised (allowlisted tags, no attributes). */
export function SafeHtml({ html, className }: { html: string; className?: string }) {
  return <div className={cn('prose-job text-[15px] leading-relaxed', className)} dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }} />
}

const TOOLS = [
  { cmd: 'bold', icon: Bold, label: 'Bold' },
  { cmd: 'italic', icon: Italic, label: 'Italic' },
  { cmd: 'underline', icon: Underline, label: 'Underline' },
  { cmd: 'insertUnorderedList', icon: List, label: 'Bulleted list' },
  { cmd: 'insertOrderedList', icon: ListOrdered, label: 'Numbered list' },
  { cmd: 'removeFormat', icon: RemoveFormatting, label: 'Clear formatting' },
] as const

/**
 * Small rich text editor (bold, italic, underline, lists) with a character counter.
 * Output is sanitised on every change and again on the server.
 */
export function RichTextEditor({ label, value, onChange, max = 2000, error, placeholder, note = 'Emails, phone numbers and links are not allowed' }: {
  label: string
  value: string
  onChange: (html: string) => void
  max?: number
  error?: string
  placeholder?: string
  note?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [count, setCount] = useState(() => htmlToText(value).length)
  const [warn, setWarn] = useState(false)
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (el && el.innerHTML !== value && document.activeElement !== el) el.innerHTML = sanitizeHtml(value)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const sync = () => {
    const el = ref.current
    if (!el) return
    const html = sanitizeHtml(el.innerHTML)
    const text = htmlToText(html)
    setCount(text.length)
    setWarn(containsContactInfo(text))
    onChange(text.trim() ? html : '')
  }
  const exec = (cmd: string) => {
    ref.current?.focus()
    document.execCommand(cmd, false)
    sync()
  }
  const over = count > max
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-ink">{label}</span>
      <div className={cn('overflow-hidden rounded-ctl border bg-white transition-colors', error || over ? 'border-danger' : focused ? 'border-brand-500 ring-2 ring-brand-100' : 'border-line')}>
        <p className="border-b border-line bg-pearl px-3 py-1.5 text-[12px] italic text-slate">{note}</p>
        <div role="toolbar" aria-label={`${label} formatting`} className="flex flex-wrap gap-0.5 border-b border-line px-1.5 py-1">
          {TOOLS.map(({ cmd, icon: Icon, label: l }) => (
            <button key={cmd} type="button" title={l} aria-label={l} onMouseDown={(e) => e.preventDefault()} onClick={() => exec(cmd)} className="grid size-8 place-items-center rounded text-ink hover:bg-pearl">
              <Icon className="size-4" />
            </button>
          ))}
        </div>
        <div
          ref={ref}
          role="textbox"
          aria-multiline="true"
          aria-label={label}
          aria-invalid={Boolean(error) || over}
          contentEditable
          suppressContentEditableWarning
          data-placeholder={placeholder}
          onInput={sync}
          onBlur={() => { setFocused(false); sync() }}
          onFocus={() => setFocused(true)}
          onPaste={(e) => {
            e.preventDefault()
            document.execCommand('insertText', false, e.clipboardData.getData('text/plain'))
          }}
          className="rte-content prose-job min-h-36 px-3 py-2.5 text-[15px] leading-relaxed outline-none"
        />
        <p className={cn('border-t border-line px-3 py-1.5 text-end text-[12px]', over ? 'text-danger' : 'text-slate')}>{count} / {max} characters</p>
      </div>
      {error ? <p className="text-[13px] text-danger" role="alert">{error}</p> : warn ? <p className="text-[13px] text-amber">Remove emails, phone numbers and links before saving.</p> : null}
    </div>
  )
}
