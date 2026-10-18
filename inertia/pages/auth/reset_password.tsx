import { useForm } from '@inertiajs/react'
import AuthLayout from '~/layouts/auth_layout'
import { Button } from '~/components/ui/button'
import { TextField } from '~/components/ui/form'

export default function ResetPassword({ token }: { token: string }) {
  const form = useForm({ password: '', passwordConfirmation: '' })
  return (
    <AuthLayout title="Choose a new password">
      <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); form.post(`/reset-password/${token}`) }}>
        <TextField label="New password" type="password" autoComplete="new-password" value={form.data.password} onChange={(e) => form.setData('password', e.target.value)} error={form.errors.password} required hint="At least 10 characters." />
        <TextField label="Confirm new password" type="password" autoComplete="new-password" value={form.data.passwordConfirmation} onChange={(e) => form.setData('passwordConfirmation', e.target.value)} error={form.errors.passwordConfirmation} required />
        <Button type="submit" loading={form.processing}>Save password</Button>
      </form>
    </AuthLayout>
  )
}
