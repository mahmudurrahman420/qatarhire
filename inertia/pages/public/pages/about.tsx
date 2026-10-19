import { StaticPage } from '~/components/static_page'
import { ButtonLink } from '~/components/ui/button'

export default function About() {
  return (
    <StaticPage
      title="About hiremegulf.com"
      intro="hiremegulf.com is a talent marketplace for the Gulf. Jobseekers publish professional profiles and CVs so recruiters in the UAE, Saudi Arabia, Qatar, Kuwait, Oman and Bahrain can find them."
      sections={[
        { heading: 'Why we built it', body: <p>Too many jobseekers in the Gulf send CVs into the void, or worse, to recruiters who ask for money. Too many employers sift through hundreds of unsuitable applications. We wanted a place where employers are checked, candidates control their own data, and both sides can see where things stand.</p> },
        { heading: 'How we check employers', body: <p>Every company that registers starts as pending. Our team reviews the details it provides, including its commercial registration where given, before marking it verified. Jobs from companies still under review are checked by a person before they appear.</p> },
        { heading: 'Your profile, your choice', body: <p>Profiles are private by default. You decide whether to show your profile publicly on the homepage, only to verified employers, or to no one, whether they can see your contact details, and whether they can download your CV. You can see every CV download in your privacy page and change your mind at any time.</p> },
        { heading: 'Salaries in local currency', body: <p>Where employers share pay, we show it as a monthly figure in the currency of the job's country (AED, SAR, QAR, KWD, OMR or BHD).</p> },
      ]}
      aside={<div className="flex flex-col gap-2"><ButtonLink href="/register">Create a profile</ButtonLink><ButtonLink href="/employers/register" variant="secondary">Register a company</ButtonLink></div>}
    />
  )
}
