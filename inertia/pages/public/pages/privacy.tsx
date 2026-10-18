import { Link } from '@inertiajs/react'
import { StaticPage, LEGAL_NOTICE } from '~/components/static_page'

export default function Privacy({ supportEmail }: { supportEmail: string }) {
  return (
    <StaticPage
      title="Privacy policy"
      notice={LEGAL_NOTICE}
      intro="This explains what we collect, why, who sees it, and the choices you have. It is written to reflect how the platform actually works."
      sections={[
        { heading: 'What we collect', body: <ul><li>Account details: name, email, password (stored only as a one-way hash).</li><li>Profile details you choose to add: work history, education, skills, languages, location preferences, salary expectations, availability, and optionally work-authorisation status.</li><li>CV files you upload, stored in private storage that is never publicly accessible.</li><li>Activity needed to run the service: applications, saved jobs, notifications, and security logs (such as sign-ins and CV downloads).</li></ul> },
        { heading: 'Who can see your information', body: <><p><strong>Employers you apply to</strong> see your profile, contact details and the CV you attach.</p><p><strong>Other verified employers</strong> see your profile only if you make it discoverable, and your contact details and CV only if you allow them in <Link href="/candidate/privacy">privacy settings</Link>. Search results never show phone numbers, email addresses or CV links.</p><p><strong>Our administrators</strong> can access data to operate and protect the platform; such access to CVs is logged.</p></> },
        { heading: 'How long we keep it', body: <p>For as long as your account exists. When you delete your account we delete your profile, applications and CV files. Security logs that reference your account id are kept for a limited period to investigate abuse.</p> },
        { heading: 'Your choices', body: <ul><li>Change visibility, contact sharing and CV downloads at any time; changes apply immediately.</li><li>See which employers viewed or downloaded your details.</li><li>Download a copy of your data, and delete your account, from your privacy page.</li><li>Choose which emails you receive in account settings.</li></ul> },
        { heading: 'Cookies', body: <p>We use only cookies needed to keep you signed in and to protect forms against forgery. See the <Link href="/cookies">cookie page</Link>.</p> },
        { heading: 'Contact', body: <p>Privacy questions or requests: <a href={`mailto:${supportEmail}`}>{supportEmail}</a>.</p> },
      ]}
    />
  )
}
