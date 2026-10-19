import { Link } from '@inertiajs/react'
import { StaticPage } from '~/components/static_page'

export default function Safety() {
  return (
    <StaticPage
      title="Job seeker and employer safety"
      intro="Most employers are genuine. These are the signs that one isn't, and what to do."
      sections={[
        { heading: 'Never pay to get a job', body: <><p>Legitimate employers in the Gulf do not charge candidates for applications, interviews, training, medical tests, visas or "processing". A request for money — even a small one, even "refundable" — is the clearest sign of a scam.</p></> },
        { heading: 'Warning signs', body: <ul><li>An offer without any interview, or one that comes within minutes of applying.</li><li>Pressure to decide immediately or keep the offer secret.</li><li>Requests for your passport, bank details or ID before a written offer.</li><li>Communication only through personal messaging apps or free email addresses that don't match the company.</li><li>A salary far above the norm for the role.</li></ul> },
        { heading: 'Protect your documents', body: <p>Share copies, not originals, and only once you have a written offer from a company you've verified. Your phone number and email stay private on hiremegulf.com until you choose to share them.</p> },
        { heading: 'For employers', body: <p>Only contact candidates about real vacancies, use candidate data only for recruitment, and never forward CVs to third parties without the candidate's consent. Misuse of candidate data leads to suspension.</p> },
        { heading: 'Report a problem', body: <p>Use "Report this job" on any job page, "Report this employer" on company pages, or <Link href="/contact">contact us</Link>. If you have been defrauded, also contact the Ministry of Interior's Economic and Cyber Crimes Combating Department.</p> },
      ]}
    />
  )
}
