import { Head, Link } from '@inertiajs/react'
import AppLayout from '~/layouts/app_layout'
import { PageHeader, Panel } from '~/components/ui/misc'

export default function Billing({ billingEnabled }: { billingEnabled: boolean }) {
  return (
    <AppLayout>
      <Head title="Billing" />
      <PageHeader title="Billing" />
      <Panel>
        {billingEnabled ? (
          <p className="text-sm text-slate">Paid plans are being introduced. Online payment isn't available in your account yet — <Link href="/contact" className="text-maroon-700 underline">contact us</Link> to discuss a plan.</p>
        ) : (
          <>
            <p className="font-medium">All features are currently free.</p>
            <p className="mt-1 text-sm text-slate">Job posting, applicant management and candidate search (for verified companies) are included at no cost. We'll give you notice before any paid plans start.</p>
          </>
        )}
      </Panel>
    </AppLayout>
  )
}
