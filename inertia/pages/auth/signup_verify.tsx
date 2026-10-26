import { useEffect, useState } from 'react'
import { Link, useForm } from '@inertiajs/react'
import AuthLayout from '~/layouts/auth_layout'
import { Button } from '~/components/ui/button'
import { TextField } from '~/components/ui/form'

export default function SignupVerify({ email, resendIn = 0, minutes = 10 }: { email: string; resendIn?: number; minutes?: number }) {
  const form = useForm({ code: '' })
  const resend = useForm({})
  const [wait, setWait] = useState(resendIn)
  useEffect(() => setWait(resendIn), [resendIn])
  useEffect(() => {
    if (wait <= 0) return
    const t = setTimeout(() => setWait((w) => w - 1), 1000)
    return () => clearTimeout(t)
  }, [wait])
  return (
    <AuthLayout title="Verify your email" subtitle={<>We sent a 6-digit code to <strong className="text-ink">{email}</strong>.</>}>
      <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); form.post('/signup/verify', { onFinish: () => form.reset('code') }) }}>
        <TextField label="Verification code" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} value={form.data.code} onChange={(e) => form.setData('code', e.target.value.replace(/\D/g, ''))} error={form.errors.code} required hint={`The code expires in ${minutes} minutes. Check spam if you can't find it.`} />
        <Button type="submit" size="lg" loading={form.processing}>Verify and create account</Button>
      </form>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm">
        <Button type="button" variant="secondary" disabled={wait > 0} loading={resend.processing} onClick={() => resend.post('/signup/verify/resend')}>
          {wait > 0 ? `Resend code in ${wait}s` : 'Resend code'}
        </Button>
        <Link href="/register" className="text-slate hover:text-ink">Use a different email</Link>
      </div>
    </AuthLayout>
  )
}
