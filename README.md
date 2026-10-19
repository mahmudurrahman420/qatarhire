# hiremegulf.com — Gulf talent marketplace

A talent marketplace for the UAE, Saudi Arabia, Qatar, Kuwait, Oman and Bahrain: jobseekers publish profiles and CVs (private, employer-only or public) so recruiters can find them, and apply for jobs; employers register, get verified, post vacancies, run an applicant pipeline and search a consent-based candidate database; administrators verify employers, moderate jobs and handle reports.

Built with **AdonisJS 6** (TypeScript), **React 19 + Inertia**, **Tailwind CSS 4**, **MySQL 8** (SQLite for local development and tests).

- Architecture, data model and security boundaries: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- What's done and what's left: [`docs/CHECKLIST.md`](docs/CHECKLIST.md)
- Production deployment: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)

## Requirements

- Node.js **22 LTS** (`.nvmrc`). Node 24 is not supported by AdonisJS 6's command loader.
- MySQL 8 for production. Nothing extra for local development (SQLite).

## Run locally

```bash
npm install
cp .env.example .env
node ace generate:key                      # writes APP_KEY into .env
mkdir -p tmp
node ace migration:run
node ace db:seed                           # reference data + fictional demo data
ADMIN_PASSWORD='choose-a-long-one' node ace admin:create --email=you@example.com --name="Your Name"
npm run dev                                # http://localhost:3333
```

With `MAIL_MAILER=log` (the default in `.env.example`), emails such as verification and password-reset links are written to `storage/mail-previews/*.html` instead of being sent.

### Demo accounts (development seed only)

All use the password `DemoPass#2026`. The demo seeder refuses to run in production. Portraits are taken from the approved homepage mockup.

| Role | Email |
|---|---|
| Employer owner (verified, Doha) | `owner@horizonprojects.example` |
| Recruiter (same company) | `recruiter@horizonprojects.example` |
| Employer owner (verified, Dubai) | `owner@crescenttrading.example` |
| Employer owner (pending verification) | `owner@gulfcoasthotels.example` |
| Candidate, public profile with public CV | `aisha@candidate.example` |
| Candidate, private profile | `grace@candidate.example` |

## Tests

```bash
npm test             # 87 tests: unit + functional HTTP tests against an SQLite test database
npm run typecheck    # server and client TypeScript
npm run build        # production build into ./build
```

The functional suite covers registration, email verification, password reset, CSRF, rate limiting, role access, cross-company isolation (IDOR), CV upload/replace/delete and protected downloads, candidate privacy and consent withdrawal, employer verification, job moderation and publication, job and candidate search filters, applications and status transitions, and admin actions.

## Useful commands

| Command | What it does |
|---|---|
| `node ace admin:create` | Create or update an administrator |
| `node ace queue:work` | Process queued emails and background jobs (when `QUEUE_DRIVER=database`) |
| `node ace jobs:expire` | Close jobs past their deadline, send expiry reminders, prune tokens (daily) |
| `node ace alerts:send` | Email candidates new jobs matching their saved alerts (hourly or daily) |

## Brand assets

The logo mark, hero skyline, recruiter illustration and demo portraits in `public/images/` were taken from the approved homepage mockup. Fonts (Bricolage Grotesque, IBM Plex Sans / Arabic) are self-hosted via `@fontsource`, so no third-party font requests are made.
