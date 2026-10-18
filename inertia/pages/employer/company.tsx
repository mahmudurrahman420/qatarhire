import { Head, Link, router, useForm } from '@inertiajs/react'
import { useRef } from 'react'
import AppLayout from '~/layouts/app_layout'
import { Button } from '~/components/ui/button'
import { SelectField, TextArea, TextField } from '~/components/ui/form'
import { CompanyLogo, PageHeader, Panel } from '~/components/ui/misc'
import { VerificationBadge } from '~/components/status'
import { CompanySize, VerificationStatus } from '#shared/enums'
import { date } from '~/lib/format'
import type { Taxonomy } from '~/lib/types'

type Props = {
  company: { id: number; name: string; slug: string; website: string | null; industryId: number | null; locationId: number | null; description: string | null; address: string | null; contactName: string; contactEmail: string; phone: string | null; size: string | null; crNumber: string | null; verificationStatus: string; logoUrl: string | null }
  verificationHistory: { toStatus: string; note: string | null; createdAt: string }[]
  industries: Taxonomy['industries']
  locations: Taxonomy['locations']
}
const s = (v: unknown) => (v === null || v === undefined ? '' : String(v))

export default function CompanyPage({ company, verificationHistory, industries, locations }: Props) {
  const form = useForm({
    name: company.name, website: s(company.website), industryId: s(company.industryId), locationId: s(company.locationId), description: s(company.description),
    address: s(company.address), contactName: company.contactName, contactEmail: company.contactEmail, phone: s(company.phone), size: s(company.size), crNumber: s(company.crNumber),
  })
  const logoInput = useRef<HTMLInputElement>(null)
  const save = () => {
    form.transform((d) => ({
      ...d,
      website: d.website || undefined, industryId: d.industryId ? Number(d.industryId) : undefined, locationId: d.locationId ? Number(d.locationId) : undefined,
      description: d.description || undefined, address: d.address || undefined, phone: d.phone || undefined, size: d.size || undefined, crNumber: d.crNumber || undefined,
    }))
    form.put('/employer/company', { preserveScroll: true })
  }
  return (
    <AppLayout>
      <Head title="Company profile" />
      <PageHeader title="Company profile" description={<>Shown on your <Link href={`/companies/${company.slug}`} className="text-maroon-700 underline">public company page</Link> and every job you post.</>} />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Panel>
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); save() }}>
            <div className="flex items-center gap-4 sm:col-span-2">
              <CompanyLogo name={company.name} url={company.logoUrl} size={64} />
              <div>
                <Button type="button" size="sm" variant="secondary" onClick={() => logoInput.current?.click()}>{company.logoUrl ? 'Change logo' : 'Upload logo'}</Button>
                <p className="mt-1 text-[13px] text-slate">Square JPG, PNG or WebP, up to 2 MB.</p>
                {form.errors['logo' as 'name'] && <p className="text-[13px] text-danger">{form.errors['logo' as 'name']}</p>}
              </div>
              <input ref={logoInput} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => {
                const f = e.target.files?.[0]; e.target.value = ''
                if (f) router.post('/employer/company/logo', { logo: f }, { forceFormData: true, preserveScroll: true })
              }} />
            </div>
            <TextField wrapperClass="sm:col-span-2" label="Company name" value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} error={form.errors.name} required />
            <SelectField label="Industry" placeholder="Choose" value={form.data.industryId} onChange={(e) => form.setData('industryId', e.target.value)} options={industries.map((i) => ({ value: i.id, label: i.name }))} />
            <SelectField label="Company size" placeholder="Choose" value={form.data.size} onChange={(e) => form.setData('size', e.target.value)} options={CompanySize.values.map((v) => ({ value: v, label: CompanySize.label(v) }))} />
            <SelectField label="Location" placeholder="Choose" value={form.data.locationId} onChange={(e) => form.setData('locationId', e.target.value)} options={locations.map((m) => ({ value: m.id, label: m.name }))} />
            <TextField label="Website" optional type="url" placeholder="https://" value={form.data.website} onChange={(e) => form.setData('website', e.target.value)} error={form.errors.website} />
            <TextField wrapperClass="sm:col-span-2" label="Address" optional value={form.data.address} onChange={(e) => form.setData('address', e.target.value)} error={form.errors.address} />
            <TextArea wrapperClass="sm:col-span-2" label="About the company" optional rows={6} value={form.data.description} onChange={(e) => form.setData('description', e.target.value)} error={form.errors.description} hint="What you do, how many people you employ in Qatar, what it's like to work there." />
            <TextField label="Contact person" value={form.data.contactName} onChange={(e) => form.setData('contactName', e.target.value)} error={form.errors.contactName} required hint="Private. Used by our team only." />
            <TextField label="Contact email" type="email" value={form.data.contactEmail} onChange={(e) => form.setData('contactEmail', e.target.value)} error={form.errors.contactEmail} required />
            <TextField label="Business telephone" optional type="tel" value={form.data.phone} onChange={(e) => form.setData('phone', e.target.value)} error={form.errors.phone} />
            <TextField label="Commercial registration (CR) number" optional value={form.data.crNumber} onChange={(e) => form.setData('crNumber', e.target.value)} error={form.errors.crNumber} />
            <div className="sm:col-span-2"><Button type="submit" loading={form.processing}>Save company profile</Button></div>
          </form>
        </Panel>
        <aside className="flex flex-col gap-6">
          <Panel title="Verification">
            <VerificationBadge status={company.verificationStatus} />
            <p className="mt-3 text-sm text-slate">
              {company.verificationStatus === 'verified' ? 'Your company is verified. Candidate search is available and jobs publish per platform moderation settings.'
                : company.verificationStatus === 'pending' ? 'Our team is reviewing your company. This usually takes one to two working days.'
                : company.verificationStatus === 'rejected' ? 'Verification was not approved. Update your details (especially the CR number) to resubmit.'
                : 'Your company is suspended. Contact us to resolve it.'}
            </p>
            {verificationHistory.length > 0 && (
              <ol className="mt-4 flex flex-col gap-2 border-t border-line pt-3 text-[13px]">
                {verificationHistory.map((h, i) => (
                  <li key={i}><span className="font-medium">{VerificationStatus.label(h.toStatus as never)}</span> <span className="text-slate">{date(h.createdAt)}</span>{h.note && <p className="text-slate">{h.note}</p>}</li>
                ))}
              </ol>
            )}
          </Panel>
        </aside>
      </div>
    </AppLayout>
  )
}
