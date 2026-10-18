import { useId, type ComponentProps, type ReactNode } from 'react'
import { cn } from '~/lib/cn'

export const controlClass =
  'w-full rounded-ctl border border-line bg-white px-3 text-[15px] text-ink placeholder:text-slate/60 transition-colors hover:border-slate/40 focus:border-maroon-500 focus:outline-none focus:ring-2 focus:ring-maroon-100 disabled:bg-pearl aria-[invalid=true]:border-danger'

type FieldProps = {
  label: ReactNode
  error?: string
  hint?: ReactNode
  optional?: boolean
  className?: string
  children: (id: string, describedBy: string | undefined) => ReactNode
}

export function Field({ label, error, hint, optional, className, children }: FieldProps) {
  const id = useId()
  const describedBy = error ? `${id}-err` : hint ? `${id}-hint` : undefined
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
        {optional && <span className="ms-1 font-normal text-slate">(optional)</span>}
      </label>
      {children(id, describedBy)}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-[13px] text-slate">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-err`} className="text-[13px] text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

type Base = { label: ReactNode; error?: string; hint?: ReactNode; optional?: boolean; wrapperClass?: string }

export function TextField({ label, error, hint, optional, wrapperClass, className, ...rest }: Base & ComponentProps<'input'>) {
  return (
    <Field label={label} error={error} hint={hint} optional={optional} className={wrapperClass}>
      {(id, d) => <input id={id} aria-describedby={d} aria-invalid={Boolean(error)} {...rest} className={cn(controlClass, 'h-10', className)} />}
    </Field>
  )
}

export function TextArea({ label, error, hint, optional, wrapperClass, className, ...rest }: Base & ComponentProps<'textarea'>) {
  return (
    <Field label={label} error={error} hint={hint} optional={optional} className={wrapperClass}>
      {(id, d) => <textarea id={id} aria-describedby={d} aria-invalid={Boolean(error)} rows={5} {...rest} className={cn(controlClass, 'py-2 leading-relaxed', className)} />}
    </Field>
  )
}

export type Option = { value: string | number; label: string; group?: string }

export function SelectField({
  label,
  error,
  hint,
  optional,
  wrapperClass,
  options,
  placeholder,
  className,
  ...rest
}: Base & ComponentProps<'select'> & { options: Option[]; placeholder?: string }) {
  const groups = [...new Set(options.map((o) => o.group).filter(Boolean))] as string[]
  return (
    <Field label={label} error={error} hint={hint} optional={optional} className={wrapperClass}>
      {(id, d) => (
        <select id={id} aria-describedby={d} aria-invalid={Boolean(error)} {...rest} className={cn(controlClass, 'h-10 pe-8', className)}>
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {groups.length
            ? groups.map((g) => (
                <optgroup key={g} label={g}>
                  {options.filter((o) => o.group === g).map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </optgroup>
              ))
            : options.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
        </select>
      )}
    </Field>
  )
}

export function Checkbox({ label, description, className, ...rest }: { label: ReactNode; description?: ReactNode } & ComponentProps<'input'>) {
  const id = useId()
  return (
    <div className={cn('flex items-start gap-2.5', className)}>
      <input id={id} type="checkbox" {...rest} className="mt-1 size-4 shrink-0 rounded border-line accent-maroon-600" />
      <label htmlFor={id} className="text-sm leading-snug">
        <span className="text-ink">{label}</span>
        {description && <span className="block text-[13px] text-slate">{description}</span>}
      </label>
    </div>
  )
}

export function RadioCards<T extends string>({
  name,
  value,
  onChange,
  options,
}: {
  name: string
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string; description?: string }[]
}) {
  return (
    <div role="radiogroup" className="grid gap-2">
      {options.map((o) => (
        <label
          key={o.value}
          className={cn(
            'flex cursor-pointer items-start gap-3 rounded-ctl border bg-white p-3 transition-colors',
            value === o.value ? 'border-maroon-500 bg-maroon-50/50' : 'border-line hover:border-slate/40'
          )}
        >
          <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} className="mt-1 accent-maroon-600" />
          <span>
            <span className="block text-sm font-medium">{o.label}</span>
            {o.description && <span className="block text-[13px] text-slate">{o.description}</span>}
          </span>
        </label>
      ))}
    </div>
  )
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="rounded-ctl bg-danger-50 px-3 py-2 text-sm text-danger" role="alert">{message}</p>
}
