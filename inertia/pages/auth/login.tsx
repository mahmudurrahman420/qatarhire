import { Link, useForm } from '@inertiajs/react'
import AuthLayout from '~/layouts/auth_layout'
import { Button } from '~/components/ui/button'
import { TextField } from '~/components/ui/form'
import { SocialButtons, type SocialProvider } from '~/components/social_buttons'

type Props = { redirect: string | null; portal?: 'user' | 'admin'; socialProviders?: SocialProvider[] }

export default function Login({ redirect, portal = 'user', socialProviders = [] }: Props) {
  const admin = portal === 'admin'
  const form = useForm({ email: '', password: '', redirect: redirect ?? '', portal })
  return (
    <AuthLayout
      title={admin ? 'Administrator sign in' : 'Sign in'}
      subtitle={
        admin ? (
          'Restricted area. Only HireMeGulf administrator accounts can sign in here.'
        ) : (
          <>New here? <Link href="/register" className="text-brand-700 hover:underline">Create a job seeker profile</Link> or <Link href="/employers/register" className="text-brand-700 hover:underline">register a company</Link>.</>
        )
      }
    >
      {!admin && (
        <div className="mb-5">
          <SocialButtons providers={socialProviders} intent="login" />
        </div>
      )}
      <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); form.post('/login', { onFinish: () => form.reset('password') }) }}>
        <TextField label="Email" type="email" autoComplete="email" value={form.data.email} onChange={(e) => form.setData('email', e.target.value)} error={form.errors.email} required autoFocus={!socialProviders.length || admin} />
        <TextField label="Password" type="password" autoComplete="current-password" value={form.data.password} onChange={(e) => form.setData('password', e.target.value)} error={form.errors.password} required />
        <div className="flex items-center justify-between">
          <Link href="/forgot-password" className="text-sm text-brand-700 hover:underline">Forgot password?</Link>
          <Button type="submit" loading={form.processing}>Sign in</Button>
        </div>
      </form>
    </AuthLayout>
  )
}
