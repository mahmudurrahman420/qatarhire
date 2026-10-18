import { Head, useForm } from '@inertiajs/react'
import AppLayout from '~/layouts/app_layout'
import { Button } from '~/components/ui/button'
import { Checkbox, TextField } from '~/components/ui/form'
import { PageHeader, Panel } from '~/components/ui/misc'
import { EmailNotificationPrefs, type EmailNotificationPref } from '#shared/enums'
import { useShared } from '~/lib/page'

export default function AccountSettings({ prefs }: { prefs: Record<EmailNotificationPref, boolean> }) {
  const { auth } = useShared()
  const profile = useForm({ fullName: auth!.fullName, prefs })
  const pw = useForm({ currentPassword: '', password: '', passwordConfirmation: '' })
  const relevant = EmailNotificationPrefs.values.filter((p) => (auth!.role === 'employer' ? p === 'employer_activity' : p !== 'employer_activity'))
  return (
    <AppLayout>
      <Head title="Account settings" />
      <PageHeader title="Account settings" description={`Signed in as ${auth!.email}`} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Name and email notifications">
          <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); profile.put('/account', { preserveScroll: true }) }}>
            <TextField label="Full name" value={profile.data.fullName} onChange={(e) => profile.setData('fullName', e.target.value)} error={profile.errors.fullName} required />
            <fieldset className="flex flex-col gap-3">
              <legend className="mb-2 text-sm font-medium">Email me about</legend>
              {relevant.map((p) => (
                <Checkbox key={p} label={EmailNotificationPrefs.label(p)} checked={profile.data.prefs[p]} onChange={(e) => profile.setData('prefs', { ...profile.data.prefs, [p]: e.target.checked })} />
              ))}
              <p className="text-[13px] text-slate">Security emails (verification, password reset) are always sent. In-app notifications are always on.</p>
            </fieldset>
            <div><Button type="submit" loading={profile.processing}>Save settings</Button></div>
          </form>
        </Panel>
        <Panel title="Change password">
          <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); pw.put('/account/password', { preserveScroll: true, onSuccess: () => pw.reset() }) }}>
            <TextField label="Current password" type="password" autoComplete="current-password" value={pw.data.currentPassword} onChange={(e) => pw.setData('currentPassword', e.target.value)} error={pw.errors.currentPassword} required />
            <TextField label="New password" type="password" autoComplete="new-password" value={pw.data.password} onChange={(e) => pw.setData('password', e.target.value)} error={pw.errors.password} required hint="At least 10 characters." />
            <TextField label="Confirm new password" type="password" autoComplete="new-password" value={pw.data.passwordConfirmation} onChange={(e) => pw.setData('passwordConfirmation', e.target.value)} error={pw.errors.passwordConfirmation} required />
            <div><Button type="submit" loading={pw.processing}>Update password</Button></div>
          </form>
        </Panel>
      </div>
    </AppLayout>
  )
}
