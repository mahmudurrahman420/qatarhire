import { StaticPage } from '~/components/static_page'
import { ButtonLink } from '~/components/ui/button'

export default function About() {
  return (
    <StaticPage
      title="About QatarHire"
      intro="QatarHire is a job marketplace built for Qatar: for the people looking for work here, and the companies hiring them."
      sections={[
        { heading: 'Why we built it', body: <p>Too many job seekers in Qatar send CVs into the void, or worse, to recruiters who ask for money. Too many employers sift through hundreds of unsuitable applications. We wanted a place where employers are checked, candidates control their own data, and both sides can see where things stand.</p> },
        { heading: 'How we check employers', body: <p>Every company that registers starts as pending. Our team reviews the details it provides, including its commercial registration where given, before marking it verified. Jobs from companies still under review are checked by a person before they appear.</p> },
        { heading: 'Your profile, your choice', body: <p>Profiles are private by default. You decide whether verified employers can find you, whether they can see your contact details, and whether they can download your CV. You can see every CV download in your privacy page and change your mind at any time.</p> },
        { heading: 'Salaries in QAR', body: <p>Where employers share pay, we show it as a monthly figure in Qatari riyals so you can compare like with like.</p> },
      ]}
      aside={<div className="flex flex-col gap-2"><ButtonLink href="/register">Create a profile</ButtonLink><ButtonLink href="/employers/register" variant="secondary">Register a company</ButtonLink></div>}
    />
  )
}
