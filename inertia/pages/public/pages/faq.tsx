import { Link } from '@inertiajs/react'
import { StaticPage } from '~/components/static_page'

export default function Faq() {
  return (
    <StaticPage
      title="Questions and answers"
      sections={[
        { heading: 'Is hiremegulf.com free for job seekers?', body: <p>Yes. Searching, building a profile, uploading CVs and applying are free. No employer on hiremegulf.com is allowed to charge you to apply, interview or process a visa. If one does, please <Link href="/safety">report it</Link>.</p> },
        { heading: 'Who can see my profile and CV?', body: <><p>You choose one of three settings in your <Link href="/candidate/privacy">privacy page</Link>:</p><ul><li><strong>Private</strong> (default): only employers you apply to see your profile and the CV you send them.</li><li><strong>Verified employers</strong>: verified employers can also find a summary of your profile in their search.</li><li><strong>Public</strong>: anyone can see your profile card on the homepage and in Find Talent, including your photo, name, position wanted and skills. If you also allow CV downloads, anyone can download your main CV — remember it usually contains your phone and email.</li></ul><p>Your phone and email are never shown on profile cards. Every CV download is listed in your privacy page.</p></> },
        { heading: 'What does the verified badge mean?', body: <p>Our team reviewed the company's details before approving it. It is a meaningful check, not a guarantee — always use your judgement, and never send money or original documents to a recruiter.</p> },
        { heading: 'Why can\'t I search candidates as an employer?', body: <p>Candidate search is available once your company is verified. Until then you can post jobs (they go through review) and manage applicants who apply to you.</p> },
        { heading: 'How long do jobs stay up?', body: <p>Until the application deadline the employer sets, or until they close the job. Expired jobs are removed from search automatically.</p> },
        { heading: 'Can I delete my account?', body: <p>Yes. From your privacy page you can download a copy of your data and permanently delete your account, profile, applications and CV files.</p> },
        { heading: 'What file types can I upload?', body: <p>CVs in PDF or Word (.docx) format, up to 5 MB. You can keep up to three versions and choose which one to send with each application.</p> },
      ]}
    />
  )
}
