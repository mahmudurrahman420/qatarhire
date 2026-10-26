import { Head, router, useForm } from '@inertiajs/react'
import AppLayout from '~/layouts/app_layout'
import { Button } from '~/components/ui/button'
import { TextField } from '~/components/ui/form'
import { PageHeader, Panel } from '~/components/ui/misc'

type Props = { email: { configured: boolean; source: 'env' | 'database' | null; last4: string | null; fromAddress: string; fromName: string } }

export default function AdminEmailSettings({ email }: Props) {
  const form = useForm({ zeptomail_token: '', from_address: email.fromAddress, from_name: email.fromName })
  const test = useForm({ recipient: '' })
  return (
    <AppLayout>
      <Head title="Email settings" />
      <PageHeader title="Email settings" />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Panel title="ZeptoMail (website emails)">
          <p className="mb-4 text-sm text-slate">
            Status:{' '}
            {email.configured ? (
              <strong className="text-gulf">configured{email.last4 ? ` (token ending …${email.last4})` : ''}{email.source === 'env' ? ', from server environment' : ''}</strong>
            ) : (
              <strong>not configured</strong>
            )}
            . Without a token, emails are only logged.
          </p>
          <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); form.transform((d) => ({ ...d, zeptomail_token: d.zeptomail_token || undefined })); form.post('/admin/settings/email', { preserveScroll: true, onSuccess: () => form.reset('zeptomail_token') }) }}>
            <TextField id="zeptomail_token" name="zeptomail_token" type="password" autoComplete="off" label="ZeptoMail send mail token" optional value={form.data.zeptomail_token} onChange={(e) => form.setData('zeptomail_token', e.target.value)} error={form.errors.zeptomail_token} hint={email.configured ? 'Leave empty to keep the current token.' : 'From ZeptoMail > Mail Agents > SMTP/API > Send Mail Token.'} />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField id="from_address" name="from_address" type="email" label="From address" value={form.data.from_address} onChange={(e) => form.setData('from_address', e.target.value)} error={form.errors.from_address} />
              <TextField id="from_name" name="from_name" label="From name" value={form.data.from_name} onChange={(e) => form.setData('from_name', e.target.value)} error={form.errors.from_name} />
            </div>
            <div className="flex gap-2">
              <Button type="submit" loading={form.processing}>Save</Button>
              {email.configured && email.source === 'database' && (
                <Button type="button" variant="secondary" onClick={() => { if (confirm('Remove the stored token? Emails will be log-only.')) router.post('/admin/settings/email/clear-token') }}>Remove token</Button>
              )}
            </div>
          </form>
        </Panel>
        <aside>
          <Panel title="Send test email">
            <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); test.post('/admin/settings/email/test', { preserveScroll: true }) }}>
              <TextField id="recipient" name="recipient" type="email" required label="Recipient" value={test.data.recipient} onChange={(e) => test.setData('recipient', e.target.value)} error={test.errors.recipient} />
              <div><Button type="submit" loading={test.processing} disabled={!email.configured}>Send test email</Button></div>
            </form>
          </Panel>
        </aside>
      </div>
    </AppLayout>
  )
}
