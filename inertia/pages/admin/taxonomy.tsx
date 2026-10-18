import { Head, Link, router, useForm } from '@inertiajs/react'
import { useState } from 'react'
import AppLayout from '~/layouts/app_layout'
import { Button } from '~/components/ui/button'
import { SelectField, TextField } from '~/components/ui/form'
import { Badge, PageHeader, Panel } from '~/components/ui/misc'
import { cn } from '~/lib/cn'

type Item = { id: number; name: string; slug: string; active: boolean; parentId: number | null; kind: string | null }
type Props = { type: string; pendingOnly: boolean; items: Item[]; municipalities: { id: number; name: string }[] }
const TYPES = [['categories', 'Job categories'], ['industries', 'Industries'], ['locations', 'Locations'], ['skills', 'Skills']] as const

function Row({ item, type }: { item: Item; type: string }) {
  const [editing, setEditing] = useState(false)
  const form = useForm({ name: item.name, active: item.active })
  if (editing)
    return (
      <li className="flex flex-wrap items-center gap-2 px-5 py-2">
        <input aria-label="Name" className="h-9 flex-1 rounded-ctl border border-line px-3 text-sm" value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} />
        <Button size="sm" onClick={() => form.put(`/admin/taxonomy/${type}/${item.id}`, { preserveScroll: true, onSuccess: () => setEditing(false) })}>Save</Button>
        <Button size="sm" variant="quiet" onClick={() => setEditing(false)}>Cancel</Button>
      </li>
    )
  return (
    <li className="flex items-center justify-between gap-2 px-5 py-2 text-sm">
      <span className={cn(item.kind === 'area' && 'ps-4 text-slate')}>{item.name} {!item.active && <Badge tone="amber">{type === 'skills' ? 'Unreviewed' : 'Hidden'}</Badge>}</span>
      <span className="flex gap-1">
        <Button size="sm" variant="quiet" onClick={() => setEditing(true)}>Rename</Button>
        <Button size="sm" variant="quiet" onClick={() => router.put(`/admin/taxonomy/${type}/${item.id}`, { name: item.name, active: !item.active }, { preserveScroll: true })}>{item.active ? (type === 'skills' ? 'Unapprove' : 'Hide') : type === 'skills' ? 'Approve' : 'Show'}</Button>
        <Button size="sm" variant="quiet" onClick={() => confirm(`Delete "${item.name}"?`) && router.delete(`/admin/taxonomy/${type}/${item.id}`, { preserveScroll: true })}>Delete</Button>
      </span>
    </li>
  )
}

export default function Taxonomy({ type, pendingOnly, items, municipalities }: Props) {
  const form = useForm({ name: '', parentId: '' })
  const ordered = type === 'locations'
    ? municipalities.flatMap((m) => [items.find((i) => i.id === m.id)!, ...items.filter((i) => i.parentId === m.id)]).filter(Boolean)
    : items
  return (
    <AppLayout>
      <Head title="Categories & lists" />
      <PageHeader title="Categories & lists" description="Lists used in search filters and forms. Items in use can be hidden but not deleted." />
      <nav className="mb-4 flex gap-1 overflow-x-auto border-b border-line">
        {TYPES.map(([v, l]) => <Link key={v} href={`/admin/taxonomy/${v}`} className={cn('-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm', type === v ? 'border-maroon-600 font-medium text-maroon-700' : 'border-transparent text-slate hover:text-ink')}>{l}</Link>)}
      </nav>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Panel padded={false} title={`${items.length} items`} actions={type === 'skills' && <Link href={pendingOnly ? '/admin/taxonomy/skills' : '/admin/taxonomy/skills?pending=1'} className="text-sm text-maroon-700 hover:underline">{pendingOnly ? 'Show all' : 'Show user-added (unreviewed)'}</Link>}>
          <ul className="max-h-[70vh] divide-y divide-line overflow-y-auto">{ordered.map((i) => <Row key={i.id} item={i} type={type} />)}</ul>
        </Panel>
        <Panel title="Add">
          <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); form.transform((d) => ({ name: d.name, parentId: d.parentId ? Number(d.parentId) : undefined })); form.post(`/admin/taxonomy/${type}`, { preserveScroll: true, onSuccess: () => form.reset() }) }}>
            <TextField label="Name" value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} error={form.errors.name} required />
            {type === 'locations' && <SelectField label="Inside municipality" placeholder="None (new municipality)" value={form.data.parentId} onChange={(e) => form.setData('parentId', e.target.value)} options={municipalities.map((m) => ({ value: m.id, label: m.name }))} />}
            <div><Button type="submit" loading={form.processing}>Add</Button></div>
          </form>
        </Panel>
      </div>
    </AppLayout>
  )
}
