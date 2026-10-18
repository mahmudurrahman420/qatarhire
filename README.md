# QatarHire — Qatar job portal

A recruitment platform for Qatar: job seekers build private profiles and apply for jobs; employers register, get verified, post vacancies, run an applicant pipeline and search a consent-based candidate database; administrators verify employers, moderate jobs and handle reports.

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

All use the password `DemoPass#2026`. The demo seeder refuses to run in production.

| Role | Email |
|---|---|
| Employer owner (verified) | `owner@pearlbuild.example` |
| Recruiter (same company) | `recruiter@pearlbuild.example` |
| Employer owner (pending verification) | `owner@gulffreight.example` |
| Candidate (discoverable, shares contact) | `aisha@candidate.example` |
| Candidate (private profile) | `grace@candidate.example` |

## Tests

```bash
npm test             # 79 tests: unit + functional HTTP tests against an SQLite test database
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

## Renaming the brand

Set `APP_NAME` in `.env` and update the wordmark in `inertia/components/brand.tsx` and `public/favicon.svg`. A few static pages mention the name in their copy (`inertia/pages/public/pages/*`).
