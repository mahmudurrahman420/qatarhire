import { Head } from '@inertiajs/react'
import SiteLayout from '~/layouts/site_layout'
import { ButtonLink } from '~/components/ui/button'

export default function NotFound() {
  return (
    <SiteLayout>
      <Head title="Page not found" />
      <div className="mx-auto max-w-2xl px-4 py-24 sm:px-6">
        <h1 className="text-4xl">This page isn't here</h1>
        <p className="mt-3 text-slate">The job may have closed, or the link may be mistyped. Jobs that have expired are removed from the site.</p>
        <div className="mt-6 flex gap-2"><ButtonLink href="/jobs">Search jobs</ButtonLink><ButtonLink href="/" variant="secondary">Home</ButtonLink></div>
      </div>
    </SiteLayout>
  )
}
