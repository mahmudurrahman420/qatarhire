import { StaticPage, LEGAL_NOTICE } from '~/components/static_page'

export default function Terms() {
  return (
    <StaticPage
      title="Terms of service"
      notice={LEGAL_NOTICE}
      sections={[
        { heading: '1. Who these terms apply to', body: <p>These terms govern your use of hiremegulf.com as a job seeker, an employer user, or a visitor. By creating an account you agree to them.</p> },
        { heading: '2. Accounts', body: <p>You must give accurate information and keep your password secure. One person per candidate account. Employer accounts act on behalf of the company that registered them; the company owner is responsible for the recruiters they invite.</p> },
        { heading: '3. Job seekers', body: <ul><li>Only upload CVs and information that are yours and accurate.</li><li>Applications are sent to the employer you choose; we are not party to any employment relationship.</li></ul> },
        { heading: '4. Employers', body: <ul><li>Post only genuine vacancies you are authorised to fill, in line with the labour laws of the country where the job is based.</li><li>Never charge candidates any fee.</li><li>Use candidate data only to recruit for your own vacancies; do not export, resell or share it.</li><li>We may review, edit for format, reject or remove job posts, and suspend accounts that breach these terms.</li></ul> },
        { heading: '5. Content and moderation', body: <p>You keep ownership of what you post and give us the licence needed to display it on the platform. We may remove content that is unlawful, discriminatory, misleading or harmful.</p> },
        { heading: '6. Liability', body: <p>We check employers and moderate content, but we cannot guarantee any job, candidate or outcome. To the extent permitted by law, our liability is limited.</p> },
        { heading: '7. Changes and contact', body: <p>We will notify registered users of material changes. Questions: use the contact page.</p> },
      ]}
    />
  )
}
