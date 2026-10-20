import { Link, useForm } from '@inertiajs/react'
import AuthLayout from '~/layouts/auth_layout'
import { Button } from '~/components/ui/button'
import { TextField } from '~/components/ui/form'

export default function ForgotPassword({ mailEnabled = true, supportEmail = null }: { mailEnabled?: boolean; supportEmail?: string | null }) {
  const form = useForm({ email: '' })
  if (!mailEnabled)
    return (
      <AuthLayout title="Reset your password" subtitle="Password reset emails aren't available right now.">
        <div className="flex flex-col gap-4">
          <p className="text-[15px] text-ink">
            Please contact support{supportEmail && <> at <a href={`mailto:${supportEmail}`} className="text-brand-700 underline">{supportEmail}</a></>} from the email address on your account and we'll help you get back in.
          </p>
          <div className="flex items-center justify-between">
            <Link href="/login" className="text-sm text-brand-700 hover:underline">Back to sign in</Link>
            <Link href="/contact" className="text-sm text-brand-700 hover:underline">Contact support</Link>
          </div>
        </div>
      </AuthLayout>
    )
  return (
    <AuthLayout title="Reset your password" subtitle="Enter your account email and we'll send a reset link.">
      <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); form.post('/forgot-password') }}>
        <TextField label="Email" type="email" autoComplete="email" value={form.data.email} onChange={(e) => form.setData('email', e.target.value)} error={form.errors.email} required />
        <div className="flex items-center justify-between">
          <Link href="/login" className="text-sm text-brand-700 hover:underline">Back to sign in</Link>
          <Button type="submit" loading={form.processing}>Send reset link</Button>
        </div>
      </form>
    </AuthLayout>
  )
}
