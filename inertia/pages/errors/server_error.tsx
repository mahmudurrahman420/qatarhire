import { Head } from '@inertiajs/react'
import SiteLayout from '~/layouts/site_layout'
import { ButtonLink } from '~/components/ui/button'

export default function ServerError() {
  return (
    <SiteLayout>
      <Head title="Something went wrong" />
      <div className="mx-auto max-w-2xl px-4 py-24 sm:px-6">
        <h1 className="text-4xl">Something went wrong on our side</h1>
        <p className="mt-3 text-slate">The error has been logged. Try again in a moment; if it keeps happening, contact us and tell us what you were doing.</p>
        <div className="mt-6 flex gap-2"><ButtonLink href="/">Home</ButtonLink><ButtonLink href="/contact" variant="secondary">Contact us</ButtonLink></div>
      </div>
    </SiteLayout>
  )
}
