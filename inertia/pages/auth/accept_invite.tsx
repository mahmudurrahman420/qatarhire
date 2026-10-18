import { useForm } from '@inertiajs/react'
import AuthLayout from '~/layouts/auth_layout'
import { Button } from '~/components/ui/button'
import { TextField } from '~/components/ui/form'

export default function AcceptInvite({ token, fullName, email, companyName }: { token: string; fullName: string; email: string; companyName: string }) {
  const form = useForm({ fullName, password: '', passwordConfirmation: '' })
  return (
    <AuthLayout title={`Join ${companyName}`} subtitle={<>Set up your recruiter account for <strong className="text-ink">{email}</strong>.</>}>
      <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); form.post(`/invitations/${token}`) }}>
        <TextField label="Full name" value={form.data.fullName} onChange={(e) => form.setData('fullName', e.target.value)} error={form.errors.fullName} required />
        <TextField label="Password" type="password" autoComplete="new-password" value={form.data.password} onChange={(e) => form.setData('password', e.target.value)} error={form.errors.password} required hint="At least 10 characters." />
        <TextField label="Confirm password" type="password" autoComplete="new-password" value={form.data.passwordConfirmation} onChange={(e) => form.setData('passwordConfirmation', e.target.value)} error={form.errors.passwordConfirmation} required />
        <Button type="submit" loading={form.processing}>Join team</Button>
      </form>
    </AuthLayout>
  )
}
