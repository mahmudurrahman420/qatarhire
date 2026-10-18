import { Link } from '@inertiajs/react'
import { StaticPage } from '~/components/static_page'

export default function Faq() {
  return (
    <StaticPage
      title="Questions and answers"
      sections={[
        { heading: 'Is QatarHire free for job seekers?', body: <p>Yes. Searching, building a profile, uploading CVs and applying are free. No employer on QatarHire is allowed to charge you to apply, interview or process a visa. If one does, please <Link href="/safety">report it</Link>.</p> },
        { heading: 'Who can see my CV and contact details?', body: <><p>By default, only employers you apply to. They can see the CV you attached to that application and your contact details.</p><p>If you switch your profile to "discoverable", verified employers can find your profile in search. Your phone and email stay hidden unless you also allow contact sharing, and your CV stays hidden unless you allow CV downloads. You'll see each download listed in your <Link href="/candidate/privacy">privacy page</Link>.</p></> },
        { heading: 'What does the verified badge mean?', body: <p>Our team reviewed the company's details before approving it. It is a meaningful check, not a guarantee — always use your judgement, and never send money or original documents to a recruiter.</p> },
        { heading: 'Why can\'t I search candidates as an employer?', body: <p>Candidate search is available once your company is verified. Until then you can post jobs (they go through review) and manage applicants who apply to you.</p> },
        { heading: 'How long do jobs stay up?', body: <p>Until the application deadline the employer sets, or until they close the job. Expired jobs are removed from search automatically.</p> },
        { heading: 'Can I delete my account?', body: <p>Yes. From your privacy page you can download a copy of your data and permanently delete your account, profile, applications and CV files.</p> },
        { heading: 'What file types can I upload?', body: <p>CVs in PDF or Word (.docx) format, up to 5 MB. You can keep up to three versions and choose which one to send with each application.</p> },
      ]}
    />
  )
}
