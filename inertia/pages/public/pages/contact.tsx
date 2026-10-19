import { Head, useForm } from '@inertiajs/react'
import SiteLayout from '~/layouts/site_layout'
import { Button } from '~/components/ui/button'
import { SelectField, TextArea, TextField } from '~/components/ui/form'
import { useShared } from '~/lib/page'

export default function Contact({ supportEmail }: { supportEmail: string }) {
  const { auth } = useShared()
  const form = useForm({ name: auth?.fullName ?? '', email: auth?.email ?? '', topic: 'general', message: '', website: '' })
  return (
    <SiteLayout>
      <Head title="Contact us" />
      <div className="mx-auto grid max-w-6xl gap-10 px-4 pt-10 sm:px-6 lg:grid-cols-[1fr_320px]">
        <div className="max-w-xl">
          <h1 className="text-[32px]">Contact us</h1>
          <p className="mt-2 text-slate">Questions about your account, verifying your company, or something that doesn't look right. We usually reply within two working days.</p>
          <form
            className="mt-8 flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault()
              form.post('/contact', { preserveScroll: true, onSuccess: () => form.reset('message') })
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Your name" value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} error={form.errors.name} required autoComplete="name" />
              <TextField label="Email" type="email" value={form.data.email} onChange={(e) => form.setData('email', e.target.value)} error={form.errors.email} required autoComplete="email" />
            </div>
            <SelectField
              label="Topic"
              value={form.data.topic}
              onChange={(e) => form.setData('topic', e.target.value)}
              options={[
                { value: 'general', label: 'General question' },
                { value: 'candidate', label: 'My job seeker account' },
                { value: 'employer', label: 'Employer account or verification' },
                { value: 'privacy', label: 'Privacy or my data' },
                { value: 'report', label: 'Report a scam or abuse' },
              ]}
            />
            <TextArea label="Message" rows={6} value={form.data.message} onChange={(e) => form.setData('message', e.target.value)} error={form.errors.message} required />
            <input type="text" name="website" value={form.data.website} onChange={(e) => form.setData('website', e.target.value)} className="hidden" tabIndex={-1} autoComplete="off" aria-hidden />
            <div><Button type="submit" loading={form.processing}>Send message</Button></div>
          </form>
        </div>
        <aside className="lg:pt-16">
          <h2 className="font-sans text-base font-semibold tracking-normal">Email</h2>
          <a href={`mailto:${supportEmail}`} className="text-brand-700 hover:underline">{supportEmail}</a>
          <p className="mt-4 text-sm text-slate">Reporting a fraudulent job? Use the report link on the job itself so we can act on it faster.</p>
        </aside>
      </div>
    </SiteLayout>
  )
}
