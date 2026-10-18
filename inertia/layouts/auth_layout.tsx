import type { ReactNode } from 'react'
import { Head } from '@inertiajs/react'
import { useShared } from '~/lib/page'
import { Wordmark } from '~/components/brand'
import { Flash } from '~/components/flash'

export default function AuthLayout({ title, subtitle, children, wide }: { title: string; subtitle?: ReactNode; children: ReactNode; wide?: boolean }) {
  const { appName } = useShared()
  return (
    <div className="min-h-screen bg-pearl">
      <Head title={title} />
      <div className="mx-auto flex max-w-6xl items-center px-4 py-5 sm:px-6"><Wordmark appName={appName} /></div>
      <main id="main" className={`mx-auto px-4 pb-16 pt-6 sm:px-6 ${wide ? 'max-w-2xl' : 'max-w-md'}`}>
        <h1 className="text-[28px]">{title}</h1>
        {subtitle && <div className="mt-2 text-slate">{subtitle}</div>}
        <div className="mt-7 rounded-panel border border-line bg-white p-6 sm:p-7">{children}</div>
      </main>
      <Flash />
    </div>
  )
}
