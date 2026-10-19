/**
 * Minimal rich text for profile "About" fields. Shared by server and client (no imports).
 * The editor produces a tiny HTML subset; the server re-sanitises with an allowlist
 * (no attributes at all), so stored/rendered HTML can only contain these tags.
 */
const ALLOWED = new Set(['p', 'br', 'b', 'strong', 'i', 'em', 'u', 'ul', 'ol', 'li'])
const BLOCK_ALIASES: Record<string, string> = { div: 'p', h1: 'p', h2: 'p', h3: 'p', h4: 'p', blockquote: 'p' }
const DROP_WITH_CONTENT = /<(script|style|iframe|object|embed|template|noscript|svg|math|head|title)\b[\s\S]*?<\/\1\s*>/gi

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" }
function decodeEntities(s: string) {
  return s.replace(/&(#x?[0-9a-f]+|[a-z]+|#39);/gi, (m, e: string) => {
    const k = e.toLowerCase()
    if (ENTITIES[k] !== undefined) return ENTITIES[k]
    if (k.startsWith('#x')) return String.fromCodePoint(Number.parseInt(k.slice(2), 16) || 32)
    if (k.startsWith('#')) return String.fromCodePoint(Number.parseInt(k.slice(1), 10) || 32)
    return m
  })
}
export function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function looksLikeHtml(s: string | null | undefined) {
  return Boolean(s && /<\/?(p|br|b|strong|i|em|u|ul|ol|li|div)\b[^>]*>/i.test(s))
}

/** Keep only allowlisted tags, without attributes; escape all text. Unclosed tags are closed. */
export function sanitizeHtml(input: string) {
  const src = input.replace(/<!--[\s\S]*?-->/g, '').replace(DROP_WITH_CONTENT, '')
  const out: string[] = []
  const stack: string[] = []
  const re = /<\s*(\/?)\s*([a-z0-9]+)[^>]*>|([^<]+)|(<)/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(src))) {
    if (m[3] !== undefined || m[4] !== undefined) {
      out.push(escapeHtml(decodeEntities(m[3] ?? '<')))
      continue
    }
    const closing = m[1] === '/'
    let tag = m[2].toLowerCase()
    tag = BLOCK_ALIASES[tag] ?? tag
    if (!ALLOWED.has(tag)) continue
    if (tag === 'br') { if (!closing) out.push('<br>'); continue }
    if (!closing) {
      // keep nesting valid: blocks never sit inside <p>, and a new <li> closes the previous one
      const top = stack[stack.length - 1]
      if ((tag === 'p' || tag === 'ul' || tag === 'ol') && top === 'p') out.push(`</${stack.pop()}>`)
      else if (tag === 'li' && top === 'li') out.push(`</${stack.pop()}>`)
      stack.push(tag)
      out.push(`<${tag}>`)
      continue
    }
    const at = stack.lastIndexOf(tag)
    if (at === -1) continue
    while (stack.length > at) out.push(`</${stack.pop()}>`)
  }
  while (stack.length) out.push(`</${stack.pop()}>`)
  return out.join('').replace(/<p>(\s|<br>)*<\/p>/g, '').trim()
}

/** Plain text (old profiles): blank-line paragraphs, "- " bullet blocks. */
export function plainToHtml(text: string) {
  return text
    .trim()
    .split(/\n{2,}/)
    .map((b) => {
      const lines = b.split('\n')
      if (lines.every((l) => /^\s*[-•*]\s+/.test(l))) return `<ul>${lines.map((l) => `<li>${escapeHtml(l.replace(/^\s*[-•*]\s+/, ''))}</li>`).join('')}</ul>`
      return `<p>${lines.map(escapeHtml).join('<br>')}</p>`
    })
    .join('')
}

/** Safe HTML for display, whatever was stored. */
export function toSafeHtml(v: string | null | undefined) {
  if (!v) return null
  const html = looksLikeHtml(v) ? sanitizeHtml(v) : plainToHtml(v)
  return html || null
}

/** Visible text of stored rich text (for counters, search snippets, validation). */
export function htmlToText(v: string | null | undefined) {
  if (!v) return ''
  if (!looksLikeHtml(v)) return v
  return decodeEntities(
    v.replace(/<\/(p|li|div)>|<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '')
  ).replace(/\n{3,}/g, '\n\n').trim()
}

const EMAIL = /[\w.+-]+\s*(@|\(at\)|\[at\])\s*[\w-]+(\.[\w-]+)+/i
const URL = /(https?:\/\/|www\.)\S+/i
// bare domains: lowercase TLD only, so "experience.In 2019" is not mistaken for a link
const DOMAIN = /\b[\w-]{2,}\.(com|net|org|info|biz|io|me|co|qa|ae|sa|kw|om|bh|in|pk|bd|ph|uk|us|link|ly|site|online)\b/
const LONG_DIGITS = /\+?\d(?:[\s().-]?\d){8,}/ // 9+ digits, e.g. +974 6699 4850, 0501234567
const EIGHT_DIGITS = /(?<!\d)(\d{4})[\s-]?(\d{4})(?!\d)/g // Qatar/Bahrain local numbers, but not "2018-2020"

/** True when the text contains an email address, a link or a phone number. */
export function containsContactInfo(text: string) {
  if (EMAIL.test(text) || URL.test(text) || DOMAIN.test(text) || LONG_DIGITS.test(text)) return true
  for (const m of text.matchAll(EIGHT_DIGITS)) {
    const isYears = /^(19|20)\d\d$/.test(m[1]) && /^(19|20)\d\d$/.test(m[2])
    if (!isYears) return true
  }
  return false
}
