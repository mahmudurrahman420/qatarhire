import { useEffect, useState } from 'react'
import { CheckCircle2, AlertCircle, X } from 'lucide-react'
import { useShared } from '~/lib/page'

/** Shows the server's flash message once per visit; errors stay until dismissed. */
export function Flash() {
  const { flash } = useShared()
  const [visible, setVisible] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (flash.error) setVisible({ kind: 'error', text: flash.error })
    else if (flash.success) setVisible({ kind: 'success', text: flash.success })
    else setVisible(null)
  }, [flash.success, flash.error])

  useEffect(() => {
    if (visible?.kind !== 'success') return
    const t = setTimeout(() => setVisible(null), 6000)
    return () => clearTimeout(t)
  }, [visible])

  if (!visible) return null
  const ok = visible.kind === 'success'
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
      <div
        role={ok ? 'status' : 'alert'}
        className={`pointer-events-auto flex max-w-lg items-start gap-3 rounded-panel border px-4 py-3 shadow-lg ${ok ? 'border-gulf/20 bg-white' : 'border-danger/25 bg-white'}`}
      >
        {ok ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-gulf" /> : <AlertCircle className="mt-0.5 size-5 shrink-0 text-danger" />}
        <p className="text-sm">{visible.text}</p>
        <button type="button" className="-me-1 rounded p-0.5 text-slate hover:bg-pearl" onClick={() => setVisible(null)} aria-label="Dismiss">
          <X className="size-4" />
        </button>
      </div>
    </div>
  )
}
