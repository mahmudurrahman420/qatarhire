# Implementation checklist

Status as of the first delivery. ✅ done and covered by tests or verified in a browser · 🟡 partial · ⬜ not started.

## Before launch (priority order)

1. ⬜ **Upgrade to AdonisJS 7.** The app runs on AdonisJS 6 because the build environment couldn't fetch the v7 starter. `npm audit` reports advisories in `@adonisjs/http-server` (open redirect, regex resource consumption) that are fixed only in v7, which requires Node 24. The open redirect is mitigated in `container_bindings_middleware.ts` and nodemailer is patched via `overrides`; the regex issue is not mitigated. Upgrade path: the official v6→v7 guide; the code uses standard APIs throughout.
2. ⬜ **Run the test suite against MySQL 8.** Everything was developed and tested on SQLite; migrations were reviewed for MySQL (index lengths, utf8mb4, FULLTEXT, UTC timestamps without offsets) but not executed on MySQL.
3. ⬜ **Legal review** of Terms, Privacy and Cookies pages against Qatar's Personal Data Privacy Protection Law (Law No. 13 of 2016) and labour rules. Pages display a "template" notice until then (`LEGAL_NOTICE` in `inertia/components/static_page.tsx`).
4. ⬜ Configure SMTP, SPF/DKIM, backups, monitoring (see `DEPLOYMENT.md`).
5. ⬜ Final brand name, logo and domain.

## Foundation

- ✅ Project scaffold: AdonisJS 6, React 19 + Inertia 2, Tailwind 4, Vite 6, Node 22
- ✅ MySQL production config, SQLite dev/test config
- ✅ 9 migrations, 31 models, foreign keys, unique constraints, search indexes, MySQL FULLTEXT
- ✅ Roles (admin, employer owner, employer recruiter, candidate) with server-side middleware + Bouncer policies
- ✅ Reference data: 8 Qatar municipalities + 29 districts, 22 industries, 20 categories, 126 skills, 18 languages
- ✅ Environment validation; secrets only via `.env`

## Authentication and security

- ✅ Registration (candidate, employer + company), login, logout, scrypt hashing
- ✅ Email verification (hashed single-use tokens, 48h), password reset (60 min, no account enumeration)
- ✅ CSRF (XSRF cookie for Inertia), CSP + HSTS + X-Frame-Options in production
- ✅ Rate limiting: login, registration, resets, applications, CV downloads, candidate search, public forms
- ✅ Session regeneration on login; suspended users signed out on next request; DB session store for production
- ✅ Object-level access control; foreign ids return 404 (tested)
- ✅ Open-redirect guards on login `redirect` and on "back" redirects
- ✅ Audit log of security and admin actions
- ✅ Dependency audit run; nodemailer overridden to 10.x
- 🟡 Account deletion: candidates ✅ (with file cleanup); employer owners must contact support

## Candidates

- ✅ Profile with all requested fields, employment history, education, certifications, skills, languages
- ✅ Profile completeness score and hints
- ✅ CV upload (PDF/DOCX by content inspection, 5 MB), up to 3 versions, primary CV, replace, delete
- ✅ Private storage; authorised download controller; no storage paths exposed; access logged
- ✅ ClamAV integration (fails closed when configured) — 🟡 not exercised against a real clamd
- ✅ Visibility (private / discoverable), contact sharing, CV-download consent; changes immediate
- ✅ "Who accessed my profile" log; notifications on CV download
- ✅ Apply with CV choice and cover letter; history and live status; withdraw before offer
- ✅ Saved jobs, job alerts (email via `alerts:send`)
- ✅ JSON data export
- 🟡 CV parsing: schema fields reserved (`parse_status`, `parsed_data`), parser not built
- 🟡 Profile photo stored as uploaded (no resizing/compression)

## Employers

- ✅ Company profile, logo, CR number; verification states with history; never auto-verified
- ✅ Team invites (7-day links), owner/recruiter permissions, member removal
- ✅ Jobs: all requested fields, draft, preview, publish (with moderation), pause, close, reopen, archive, duplicate
- ✅ Validation: salary range, deadline window (≤180 days), conditional application URL/email
- ✅ Double-submit guard; audit trail of field changes; edits to live jobs re-reviewed when moderation applies
- ✅ Applicant pipeline with filters, status transitions, history, private team notes
- ✅ Candidate search: keywords, title, skills (all/any), industry, experience, education, certification, languages, current & preferred location, salary, availability, notice, work authorisation, updated date, completeness, has CV; sorting; pagination; result counts
- ✅ Saved candidate lists and saved searches
- ✅ Dashboard: job and pipeline counts, 30-day applications chart, recent applicants
- 🟡 Saved candidate searches store an "alerts" flag but no email alert sender yet
- 🟡 Interview scheduling is a pipeline stage only (no calendar)

## Public site

- ✅ Homepage, job search with filters and shareable URLs, job details, related jobs, report job
- ✅ Employer directory and company pages, report employer
- ✅ About, FAQ, Contact (with honeypot), Terms, Privacy, Cookies, Safety, For employers
- ✅ SEO: server-rendered titles/descriptions, canonical URLs, `noindex` for filtered/expired pages, JobPosting JSON-LD with `validThrough`, sitemap (live jobs only), robots.txt
- ✅ Responsive layouts checked at 390px and 1280px; skip links, focus styles, reduced motion
- 🟡 Arabic/RTL: `lang`/`dir` on the document, logical CSS properties, Arabic-capable fonts; no translations or language switcher yet
- 🟡 No server-side rendering (meta and structured data are server-rendered; page body is client-rendered)

## Admin

- ✅ Overview stats; user search, suspend/reactivate; employer verification queue and decisions; featured employers
- ✅ Job moderation (approve / request changes), takedown, featured jobs
- ✅ Reports queue; taxonomy management (in-use items can't be deleted); platform settings; failed background jobs with retry
- ✅ Audit log and candidate-data access log views

## Notifications and background work

- ✅ In-app notifications with unread badge; email notifications with per-user preferences
- ✅ Database-backed queue with retries/backoff (`queue:work`), sync driver for development
- ✅ `jobs:expire` (closes expired jobs, 3-day reminders, token pruning), `alerts:send`

## Monetisation

- 🟡 Plans/subscriptions/payments tables and `EntitlementService` hook; billing disabled. No payment provider integrated (requires choosing a provider available in Qatar and commercial setup).

## Testing

- ✅ 79 automated tests (unit + functional HTTP), all passing on SQLite
- ✅ Production build compiles; compiled app smoke-tested with CSP enabled
- ⬜ MySQL test run (see above)
- ⬜ End-to-end browser tests
