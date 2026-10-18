import { Head, router, useForm } from '@inertiajs/react'
import AppLayout from '~/layouts/app_layout'
import { Button } from '~/components/ui/button'
import { TextField } from '~/components/ui/form'
import { Badge, PageHeader, Panel } from '~/components/ui/misc'
import { date } from '~/lib/format'
import { useShared } from '~/lib/page'

type Member = { id: number; role: string; fullName: string; email: string; pending: boolean; joinedAt: string }

export default function Team({ members }: { members: Member[] }) {
  const { auth } = useShared()
  const form = useForm({ fullName: '', email: '' })
  return (
    <AppLayout>
      <Head title="Team" />
      <PageHeader title="Team" description="Recruiters can post jobs, manage applicants and search candidates. Only you, as owner, manage company details, team and billing." />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Panel padded={false}>
          <table className="w-full text-sm">
            <thead><tr className="border-b border-line text-[13px] text-slate"><th className="px-5 py-2 text-start font-normal">Name</th><th className="px-3 py-2 text-start font-normal">Role</th><th className="px-3 py-2 text-start font-normal">Joined</th><th className="px-5 py-2" /></tr></thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-b border-line last:border-b-0">
                  <td className="px-5 py-3"><p className="font-medium">{m.fullName}</p><p className="text-[13px] text-slate">{m.email}</p></td>
                  <td className="px-3 py-3">{m.role === 'owner' ? <Badge tone="maroon">Owner</Badge> : <Badge>Recruiter</Badge>} {m.pending && <Badge tone="amber">Invite sent</Badge>}</td>
                  <td className="px-3 py-3 text-slate">{date(m.joinedAt)}</td>
                  <td className="px-5 py-3 text-end">
                    {m.role !== 'owner' && m.email !== auth?.email && (
                      <Button size="sm" variant="quiet" onClick={() => confirm(`Remove ${m.fullName}? Their account will be deleted.`) && router.delete(`/employer/team/${m.id}`, { preserveScroll: true })}>Remove</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
        <Panel title="Invite a recruiter">
          <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); form.post('/employer/team', { preserveScroll: true, onSuccess: () => form.reset() }) }}>
            <TextField label="Full name" value={form.data.fullName} onChange={(e) => form.setData('fullName', e.target.value)} error={form.errors.fullName} required />
            <TextField label="Work email" type="email" value={form.data.email} onChange={(e) => form.setData('email', e.target.value)} error={form.errors.email} required hint="They'll get a link to set a password. It expires in 7 days." />
            <div><Button type="submit" loading={form.processing}>Send invitation</Button></div>
          </form>
        </Panel>
      </div>
    </AppLayout>
  )
}
