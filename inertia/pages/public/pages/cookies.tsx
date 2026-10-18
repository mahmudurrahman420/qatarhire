import { StaticPage } from '~/components/static_page'

export default function Cookies() {
  return (
    <StaticPage
      title="Cookies"
      intro="QatarHire uses only strictly necessary cookies. There are no advertising or third-party tracking cookies, so there is nothing to opt in to."
      sections={[
        { heading: 'Cookies we set', body: <ul><li><strong>qh_session</strong> — keeps you signed in and remembers short messages between pages. Expires after 12 hours of inactivity.</li><li><strong>XSRF-TOKEN</strong> — protects forms against cross-site request forgery.</li></ul> },
        { heading: 'Fonts', body: <p>Typefaces are loaded from Google Fonts, which receives your IP address as part of the request but sets no cookies.</p> },
        { heading: 'If we add analytics later', body: <p>We would ask for your consent first and add a preference control on this page.</p> },
      ]}
    />
  )
}
