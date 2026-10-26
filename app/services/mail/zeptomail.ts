export type ZeptoMessage = {
  token: string
  from: { address: string; name?: string }
  to: { address: string; name?: string }[]
  subject: string
  html?: string
  text?: string
}

export class ZeptoMailError extends Error {}

/** ZeptoMail v1.1 send API (HTTPS 443: works where SMTP ports are blocked). */
export async function sendViaZeptoMail(msg: ZeptoMessage) {
  const raw = msg.token.trim()
  const auth = /^zoho-enczapikey\s+/i.test(raw) ? raw.replace(/^zoho-enczapikey\s+/i, 'Zoho-enczapikey ') : `Zoho-enczapikey ${raw}`
  const body: Record<string, unknown> = {
    from: { address: msg.from.address, ...(msg.from.name ? { name: msg.from.name } : {}) },
    to: msg.to.map((t) => ({ email_address: { address: t.address, ...(t.name ? { name: t.name } : {}) } })),
    subject: msg.subject,
  }
  if (msg.html) body.htmlbody = msg.html
  if (msg.text) body.textbody = msg.text
  if (!msg.html && !msg.text) body.textbody = ' '
  const res = await fetch('https://api.zeptomail.com/v1.1/email', {
    method: 'POST',
    headers: { 'Authorization': auth, 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  })
  const text = await res.text()
  let json: any = null
  try { json = JSON.parse(text) } catch {}
  if (!res.ok) {
    const e = json?.error
    const details = Array.isArray(e?.details) ? e.details.map((d: any) => [d.code, d.message, d.target].filter(Boolean).join(' ')).join('; ') : ''
    throw new ZeptoMailError(`ZeptoMail ${res.status}: ${[e?.code, e?.message, details].filter(Boolean).join(' - ') || text.slice(0, 300)}`)
  }
  return json
}
