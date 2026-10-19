import { ApplicationStatus, JobStatus, VerificationStatus } from '#shared/enums'
import { Badge } from '~/components/ui/misc'
import { BadgeCheck } from 'lucide-react'

export function JobStatusBadge({ status, expired }: { status: string; expired?: boolean }) {
  if (status === 'published' && expired) return <Badge tone="amber">Expired</Badge>
  const tone = ({ published: 'gulf', pending_review: 'amber', rejected: 'danger', draft: 'neutral', paused: 'dune', closed: 'neutral', archived: 'neutral' } as const)[status as 'draft'] ?? 'neutral'
  return <Badge tone={tone}>{JobStatus.label(status as never)}</Badge>
}

export function ApplicationStatusBadge({ status }: { status: string }) {
  const tone = ({ submitted: 'neutral', under_review: 'dune', shortlisted: 'brand', interview: 'brand', offer: 'gulf', hired: 'gulf', rejected: 'neutral', withdrawn: 'neutral' } as const)[status as 'submitted'] ?? 'neutral'
  return <Badge tone={tone}>{ApplicationStatus.label(status as never)}</Badge>
}

export function VerificationBadge({ status }: { status: string }) {
  if (status === 'verified')
    return (
      <Badge tone="gulf">
        <BadgeCheck className="size-3.5" aria-hidden /> Verified employer
      </Badge>
    )
  const tone = ({ pending: 'amber', rejected: 'danger', suspended: 'danger' } as const)[status as 'pending'] ?? 'neutral'
  return <Badge tone={tone}>{VerificationStatus.label(status as never)}</Badge>
}

export function VerifiedMark({ className }: { className?: string }) {
  return <BadgeCheck className={className ?? 'size-4 text-gulf'} aria-label="Verified employer" role="img" />
}
