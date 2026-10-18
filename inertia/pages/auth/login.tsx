import { Link, useForm } from '@inertiajs/react'
import AuthLayout from '~/layouts/auth_layout'
import { Button } from '~/components/ui/button'
import { TextField } from '~/components/ui/form'

export default function Login({ redirect }: { redirect: string | null }) {
  const form = useForm({ email: '', password: '', redirect: redirect ?? '' })
  return (
    <AuthLayout title="Sign in" subtitle={<>New here? <Link href="/register" className="text-maroon-700 hover:underline">Create a job seeker profile</Link> or <Link href="/employers/register" className="text-maroon-700 hover:underline">register a company</Link>.</>}>
      <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); form.post('/login', { onFinish: () => form.reset('password') }) }}>
        <TextField label="Email" type="email" autoComplete="email" value={form.data.email} onChange={(e) => form.setData('email', e.target.value)} error={form.errors.email} required autoFocus />
        <TextField label="Password" type="password" autoComplete="current-password" value={form.data.password} onChange={(e) => form.setData('password', e.target.value)} error={form.errors.password} required />
        <div className="flex items-center justify-between">
          <Link href="/forgot-password" className="text-sm text-maroon-700 hover:underline">Forgot password?</Link>
          <Button type="submit" loading={form.processing}>Sign in</Button>
        </div>
      </form>
    </AuthLayout>
  )
}
