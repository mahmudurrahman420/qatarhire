import { Head, Link, useForm } from '@inertiajs/react'
import { useState } from 'react'
import { Download } from 'lucide-react'
import AppLayout from '~/layouts/app_layout'
import { Button } from '~/components/ui/button'
import { Checkbox, RadioCards, TextField } from '~/components/ui/form'
import { Modal, PageHeader, Panel } from '~/components/ui/misc'
import { ContactSharing, ProfileVisibility, type ContactSharingValue, type ProfileVisibilityValue } from '#shared/enums'
import { dateTime } from '~/lib/format'

type Props = {
  settings: { visibility: ProfileVisibilityValue; contactSharing: ContactSharingValue; cvSearchable: boolean }
  accessLog: { id: number; action: string; company: { name: string; slug: string } | null; createdAt: string }[]
}
const actionLabel: Record<string, string> = { profile_view: 'Viewed your profile', cv_download: 'Downloaded your CV', contact_view: 'Saw your contact details' }

export default function Privacy({ settings, accessLog }: Props) {
  const form = useForm(settings)
  const del = useForm({ password: '', confirm: '' })
  const [deleting, setDeleting] = useState(false)
  const discoverable = form.data.visibility === 'discoverable'
  return (
    <AppLayout>
      <Head title="Privacy & data" />
      <PageHeader title="Privacy & data" description="Decide who can find you and what they can see. Changes apply immediately." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Profile visibility">
          <form className="flex flex-col gap-5" onSubmit={(e) => { e.preventDefault(); form.put('/candidate/privacy', { preserveScroll: true }) }}>
            <RadioCards
              name="visibility"
              value={form.data.visibility}
              onChange={(v) => form.setData('visibility', v)}
              options={[
                { value: 'private', label: ProfileVisibility.label('private'), description: 'Only employers you apply to can see your profile.' },
                { value: 'discoverable', label: ProfileVisibility.label('discoverable'), description: 'Verified employers can find a summary of your profile — headline, skills, experience and general location. Never your name in full, phone or email.' },
              ]}
            />
            <fieldset disabled={!discoverable} className="flex flex-col gap-4 disabled:opacity-50">
              <legend className="mb-2 text-sm font-medium">When an employer finds you in search</legend>
              <RadioCards
                name="contact"
                value={form.data.contactSharing}
                onChange={(v) => form.setData('contactSharing', v)}
                options={ContactSharing.values.map((v) => ({ value: v, label: ContactSharing.label(v), description: v === 'on_application' ? 'Contact details stay hidden until you apply.' : 'They can see your phone and email to contact you.' }))}
              />
              <Checkbox label="Let verified employers download my main CV" description="You'll be notified each time it's downloaded." checked={form.data.cvSearchable} onChange={(e) => form.setData('cvSearchable', e.target.checked)} />
            </fieldset>
            <div><Button type="submit" loading={form.processing} disabled={!form.isDirty}>Save privacy settings</Button></div>
          </form>
        </Panel>

        <Panel title="Who accessed your profile" padded={false}>
          {accessLog.length ? (
            <ul className="max-h-[420px] divide-y divide-line overflow-y-auto">
              {accessLog.map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                  <span>
                    {l.company ? <Link href={`/companies/${l.company.slug}`} className="font-medium hover:text-maroon-700">{l.company.name}</Link> : 'An employer'}{' '}
                    <span className="text-slate">{actionLabel[l.action] ?? l.action}</span>
                  </span>
                  <span className="shrink-0 text-xs text-slate">{dateTime(l.createdAt)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-4 text-sm text-slate">No employer has viewed your profile yet.</p>
          )}
          <p className="border-t border-line px-5 py-3 text-[13px] text-slate">Something wrong? <Link href="/contact" className="text-maroon-700 underline">Tell us</Link> and we'll investigate the employer.</p>
        </Panel>

        <Panel title="Your data">
          <p className="text-sm text-slate">Download everything we hold about you as a JSON file: account, profile, applications and access history.</p>
          <a href="/candidate/data-export" className="mt-3 inline-flex h-10 items-center gap-2 rounded-ctl border border-line bg-white px-4 text-sm font-medium hover:bg-pearl"><Download className="size-4" /> Download my data</a>
        </Panel>

        <Panel title="Delete account">
          <p className="text-sm text-slate">Permanently deletes your account, profile, applications and CV files. Employers will lose access to your applications. This can't be undone.</p>
          <Button variant="danger" className="mt-3" onClick={() => setDeleting(true)}>Delete my account</Button>
        </Panel>
      </div>

      <Modal open={deleting} onClose={() => setDeleting(false)} title="Delete your account">
        <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); del.post('/candidate/delete-account') }}>
          <p className="text-sm">This removes everything immediately. Download your data first if you need it.</p>
          <TextField label="Your password" type="password" autoComplete="current-password" value={del.data.password} onChange={(e) => del.setData('password', e.target.value)} error={del.errors.password} required />
          <TextField label='Type "DELETE" to confirm' value={del.data.confirm} onChange={(e) => del.setData('confirm', e.target.value)} error={del.errors.confirm} required />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="quiet" onClick={() => setDeleting(false)}>Cancel</Button>
            <Button type="submit" variant="danger" loading={del.processing} disabled={del.data.confirm !== 'DELETE'}>Delete account permanently</Button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  )
}
