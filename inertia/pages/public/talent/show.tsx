import { Head, Link } from '@inertiajs/react'
import { Bookmark, BookmarkCheck, FileText } from 'lucide-react'
import SiteLayout from '~/layouts/site_layout'
import { AccessPanel, CandidateProfileView, type CandidateDetail } from '~/components/candidates'
import { useSaveCandidate } from '~/components/talent'
import { Panel } from '~/components/ui/misc'
import { ButtonLink } from '~/components/ui/button'

type Props = { candidate: CandidateDetail & { publicCvUrl: string | null; photoUrl: string | null }; isOwner: boolean; isEmployer: boolean; saved: { id: number; listName: string }[] }

export default function TalentShow({ candidate, isOwner, isEmployer, saved }: Props) {
  const { canSave, toggle } = useSaveCandidate()
  const isSaved = saved.length > 0
  return (
    <SiteLayout>
      <Head title={`${candidate.fullName}${candidate.desiredPosition ? ` — ${candidate.desiredPosition}` : ''}`} />
      <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
        <Link href="/talent" className="text-sm text-slate hover:text-brand-700">Find talent</Link>
        {isOwner && (
          <p className="mt-3 rounded-ctl bg-mint px-4 py-2.5 text-sm text-navy">
            This is how your profile looks to others. <Link href="/candidate/profile" className="font-semibold text-brand-700 underline">Edit profile</Link> or <Link href="/candidate/privacy" className="font-semibold text-brand-700 underline">change who can see it</Link>.
          </p>
        )}
        <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="flex min-w-0 flex-col gap-4">
            <CandidateProfileView c={candidate} showFullName />
          </div>
          <aside className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
            <Panel>
              <div className="flex flex-col gap-2">
                {candidate.publicCvUrl ? (
                  <a href={candidate.publicCvUrl} className="inline-flex h-11 items-center justify-center gap-2 rounded-ctl bg-brand-600 font-semibold text-white hover:bg-brand-700">
                    <FileText className="size-4" aria-hidden /> View CV
                  </a>
                ) : (
                  !isEmployer && <p className="text-sm text-slate">This jobseeker hasn't made their CV public.</p>
                )}
                {canSave && !isOwner && (
                  <button type="button" onClick={() => toggle(candidate.id)} aria-pressed={isSaved} className="inline-flex h-11 items-center justify-center gap-2 rounded-ctl border border-line bg-white font-semibold text-navy hover:bg-pearl">
                    {isSaved ? <BookmarkCheck className="size-4 text-brand-600" /> : <Bookmark className="size-4" />} {isSaved ? 'Saved to shortlist' : 'Save'}
                  </button>
                )}
              </div>
            </Panel>
            {isEmployer ? (
              <AccessPanel c={candidate} applied={false} />
            ) : (
              !isOwner && (
                <Panel title="Want to contact this jobseeker?">
                  <p className="text-sm text-slate">Contact details are shared only with verified employers the candidate chooses.</p>
                  <ButtonLink href="/employers/register" variant="secondary" size="sm" className="mt-3">Register your company</ButtonLink>
                </Panel>
              )
            )}
          </aside>
        </div>
      </div>
    </SiteLayout>
  )
}
