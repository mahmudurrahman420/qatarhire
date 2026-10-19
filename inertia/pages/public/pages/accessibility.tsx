import { Link } from '@inertiajs/react'
import { StaticPage } from '~/components/static_page'

export default function Accessibility({ supportEmail }: { supportEmail: string }) {
  return (
    <StaticPage
      title="Accessibility"
      intro="We want everyone to be able to find work and hire on hiremegulf.com, whatever device or assistive technology they use."
      sections={[
        { heading: 'What we do', body: <ul><li>Pages work with keyboard only, with visible focus and a "Skip to content" link.</li><li>Images have text alternatives; icons used for meaning have labels.</li><li>Text and buttons meet WCAG AA colour contrast, and layouts adapt down to small phone screens.</li><li>Animations are reduced when your device asks for reduced motion.</li></ul> },
        { heading: 'Known gaps', body: <ul><li>The Arabic, right-to-left version is not available yet.</li><li>Some uploaded documents, such as CVs, may not be accessible; they come from jobseekers in their own format.</li></ul> },
        { heading: 'Tell us about a problem', body: <p>If something doesn't work for you, email <a href={`mailto:${supportEmail}`}>{supportEmail}</a> or use the <Link href="/contact">contact form</Link>. Tell us the page and what you were trying to do.</p> },
      ]}
    />
  )
}
