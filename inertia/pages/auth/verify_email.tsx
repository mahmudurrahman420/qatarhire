import { router, useForm } from '@inertiajs/react'
import AuthLayout from '~/layouts/auth_layout'
import { Button } from '~/components/ui/button'

export default function VerifyEmail({ email }: { email: string }) {
  const form = useForm({})
  return (
    <AuthLayout title="Check your email" subtitle={<>We sent a confirmation link to <strong className="text-ink">{email}</strong>.</>}>
      <p className="text-sm text-slate">Open the link to activate your account. It expires in 48 hours. Can't find it? Check spam, or send a new one.</p>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="secondary" loading={form.processing} onClick={() => form.post('/verify-email/resend')}>Send a new link</Button>
        <button type="button" onClick={() => router.post('/logout')} className="text-sm text-slate hover:text-ink">Sign out</button>
      </div>
    </AuthLayout>
  )
}
