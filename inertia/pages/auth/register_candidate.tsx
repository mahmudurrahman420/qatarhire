import { Link, useForm } from '@inertiajs/react'
import AuthLayout from '~/layouts/auth_layout'
import { Button } from '~/components/ui/button'
import { Checkbox, TextField } from '~/components/ui/form'

export default function RegisterCandidate() {
  const form = useForm({ fullName: '', email: '', password: '', passwordConfirmation: '', acceptTerms: false })
  return (
    <AuthLayout
      title="Create your job seeker profile"
      subtitle={<>Free, and private until you choose otherwise. Hiring? <Link href="/employers/register" className="text-brand-700 hover:underline">Register a company instead</Link>.</>}
    >
      <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); form.post('/register', { onFinish: () => form.reset('password', 'passwordConfirmation') }) }}>
        <TextField label="Full name" autoComplete="name" value={form.data.fullName} onChange={(e) => form.setData('fullName', e.target.value)} error={form.errors.fullName} required />
        <TextField label="Email" type="email" autoComplete="email" value={form.data.email} onChange={(e) => form.setData('email', e.target.value)} error={form.errors.email} required hint="We'll send a link to confirm it." />
        <TextField label="Password" type="password" autoComplete="new-password" minLength={10} value={form.data.password} onChange={(e) => form.setData('password', e.target.value)} error={form.errors.password} required hint="At least 10 characters." />
        <TextField label="Confirm password" type="password" autoComplete="new-password" value={form.data.passwordConfirmation} onChange={(e) => form.setData('passwordConfirmation', e.target.value)} error={form.errors.passwordConfirmation} required />
        <Checkbox
          checked={form.data.acceptTerms}
          onChange={(e) => form.setData('acceptTerms', e.target.checked)}
          label={<>I agree to the <Link href="/terms" target="_blank" className="text-brand-700 underline">terms</Link> and <Link href="/privacy" target="_blank" className="text-brand-700 underline">privacy policy</Link></>}
        />
        {form.errors.acceptTerms && <p className="text-[13px] text-danger">Please accept the terms to continue.</p>}
        <Button type="submit" size="lg" loading={form.processing}>Create profile</Button>
        <p className="text-center text-sm text-slate">Already registered? <Link href="/login" className="text-brand-700 hover:underline">Sign in</Link></p>
      </form>
    </AuthLayout>
  )
}
