import { Link, useForm } from '@inertiajs/react'
import AuthLayout from '~/layouts/auth_layout'
import { Button } from '~/components/ui/button'
import { Checkbox, SelectField, TextField } from '~/components/ui/form'

type Props = {
  contact: { fullName: string; email: string }
  industries: { id: number; name: string }[]
  locations: { id: number; name: string }[]
}

/** Second step for employers who signed up with Google / LinkedIn / Facebook. */
export default function EmployerSetup({ contact, industries, locations }: Props) {
  const form = useForm({ companyName: '', website: '', industryId: '', locationId: '', phone: '', crNumber: '', acceptTerms: false })
  const submit = () =>
    (form.transform((d) => ({
      ...d,
      industryId: d.industryId ? Number(d.industryId) : undefined,
      locationId: d.locationId ? Number(d.locationId) : undefined,
      website: d.website || undefined, phone: d.phone || undefined, crNumber: d.crNumber || undefined,
    })), form).post('/employer/setup')

  return (
    <AuthLayout wide title="Add your company" subtitle={<>Signed in as <strong>{contact.email}</strong>. Your company starts as pending until our team reviews it.</>}>
      <form className="flex flex-col gap-6" onSubmit={(e) => { e.preventDefault(); submit() }}>
        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-3 font-display text-lg">Company</legend>
          <TextField wrapperClass="sm:col-span-2" label="Company name" value={form.data.companyName} onChange={(e) => form.setData('companyName', e.target.value)} error={form.errors.companyName} required autoComplete="organization" autoFocus />
          <SelectField label="Industry" placeholder="Choose an industry" value={form.data.industryId} onChange={(e) => form.setData('industryId', e.target.value)} options={industries.map((i) => ({ value: i.id, label: i.name }))} error={form.errors.industryId} />
          <SelectField label="Main location" placeholder="Choose a city" value={form.data.locationId} onChange={(e) => form.setData('locationId', e.target.value)} options={locations.map((i) => ({ value: i.id, label: i.name }))} error={form.errors.locationId} />
          <TextField label="Website" optional type="url" placeholder="https://" value={form.data.website} onChange={(e) => form.setData('website', e.target.value)} error={form.errors.website} />
          <TextField label="Trade licence / CR number" optional value={form.data.crNumber} onChange={(e) => form.setData('crNumber', e.target.value)} error={form.errors.crNumber} hint="Helps us verify you faster." />
          <TextField wrapperClass="sm:col-span-2" label="Business telephone" optional type="tel" autoComplete="tel" value={form.data.phone} onChange={(e) => form.setData('phone', e.target.value)} error={form.errors.phone} placeholder="+974 4412 3456" />
        </fieldset>
        <Checkbox
          checked={form.data.acceptTerms}
          onChange={(e) => form.setData('acceptTerms', e.target.checked)}
          label={<>I'm authorised to recruit for this company and agree to the <Link href="/terms" target="_blank" className="text-brand-700 underline">terms</Link>, including never charging candidates fees.</>}
        />
        {form.errors.acceptTerms && <p className="text-[13px] text-danger">Please accept the terms to continue.</p>}
        <div className="flex justify-end">
          <Button type="submit" size="lg" loading={form.processing}>Save company</Button>
        </div>
      </form>
    </AuthLayout>
  )
}
