# hiremegulf.com — Architecture

Gulf-wide talent marketplace (originally built as a Qatar-only portal, then rebranded and extended to all six GCC countries).

## 1. Repository inspection (Phase 1 findings)

- No existing project was found: the build workspace was empty, the owner's GitHub had no job-portal repository, and no local folder was attached.
- The preferred Laravel stack could not be used because the build environment cannot reach Packagist (PHP's package registry). With the owner's approval the platform is built on **AdonisJS 6**, the closest Node.js equivalent to Laravel (migrations, Lucid ORM, policies, validation, CSRF, rate limiting, mail, Inertia adapter). The architecture in the master prompt maps one-to-one.
- **Version note:** the app targets AdonisJS 6 / Node 22 because the v7 starter (Node 24) could not be fetched in the build environment. AdonisJS 6 carries open `npm audit` advisories fixed only in v7; upgrading is the first item in `CHECKLIST.md`.

## 2. Stack

| Concern | Choice |
|---|---|
| Runtime | Node.js 20.6+ (22 or 24 LTS recommended) |
| Backend | AdonisJS 6 (TypeScript), Lucid ORM |
| Frontend | React 19 via Inertia.js 2, Tailwind CSS 4, Vite 6 |
| Database | MySQL 8 in production; SQLite for local development and automated tests |
| Auth | Session guard (`@adonisjs/auth`), scrypt password hashing, email verification and password reset tokens |
| Authorization | `@adonisjs/bouncer` policies on every protected resource, plus route-level role middleware |
| Files | `@adonisjs/drive`: `public` disk (logos, photos) and `private` disk (CVs, never web-served) |
| Mail | `@adonisjs/mail` (SMTP in production, `log` transport in development writes previews to `storage/mail-previews`) delivered through a database-backed job queue |
| Rate limiting | `@adonisjs/limiter` with the database store |
| Security headers / CSRF | `@adonisjs/shield` |
| Tests | Japa (unit + functional, real HTTP requests against an SQLite test database) |

## 3. Modules

```
app/
  controllers/
    public/        homepage, job search, job details, employer directory, static pages, SEO (sitemap, robots)
    auth/          register (candidate / employer), login, logout, email verification, password reset
    candidate/     dashboard, profile + sections, CVs, applications, saved jobs, privacy, data export, deletion
    employer/      company profile, team, jobs, applicants, candidate search, saved candidates/searches, analytics
    admin/         dashboard, users, companies + verification queue, job moderation, reports, taxonomy, settings, audit log
    files/         authorised CV download controller
  models/          Lucid models (see ERD)
  policies/        JobPolicy, CompanyPolicy, ApplicationPolicy, CandidateProfilePolicy, CvPolicy
  services/        CandidateSearchService, JobSearchService, CvStorageService, MalwareScanner, AuditLogger,
                   NotificationService, SettingsService, EntitlementService (billing hook), ProfileCompleteness
  jobs/            database job queue + worker command (`node ace queue:work`)
  validators/      VineJS request validators
```

## 4. Roles and security boundaries

| Role | Stored as | Can |
|---|---|---|
| Administrator | `users.role = 'admin'` | Everything in `/admin`; never bypasses audit logging |
| Employer owner | `users.role = 'employer'` + `company_users.role = 'owner'` | Manage company profile, team, billing, all company jobs/applicants |
| Employer recruiter | `users.role = 'employer'` + `company_users.role = 'recruiter'` | Manage company jobs/applicants, search candidates; cannot manage team or company settings |
| Job seeker | `users.role = 'candidate'` | Own profile, CVs, applications, saved jobs |

Boundaries enforced on the server (never only in the UI):

1. **Role gate** — route groups use `role:admin|employer|candidate` middleware.
2. **Tenant isolation** — every employer query is scoped by `company_id` of the signed-in user's membership. Policies re-check that the target job/application belongs to that company (IDOR protection). Records are looked up by ID *and* company, so foreign IDs return 404.
3. **Candidate privacy** — profiles default to `private`. Three levels: `private` (only employers applied to), `discoverable` (verified employers' search; first name + initial, no photo), `public` (homepage, Find Talent and profile pages for anyone, with full name, photo, gender, city, experience and skills). Contact details never appear on cards.
4. **Contact and CV consent** — contact details are visible to an employer only when the candidate applied to that company, or opted in (`contact_sharing = 'verified_employers'`). CVs: attached to an application, or the primary CV when `cv_searchable = true` — for verified employers on discoverable profiles, and for **anyone, signed in or not**, on public profiles (owner's explicit choice, with a warning that CVs contain contact details). Anonymous downloads are rate-limited and logged. Withdrawing consent takes effect on the next request.
5. **Private files** — CVs are stored on the private disk under random keys; downloads go through `GET /files/cvs/:id` which authorises, logs to `candidate_access_logs` and `audit_logs`, and streams with `Content-Disposition: attachment`. No storage path is ever sent to the browser.
6. **Uploads** — CVs: PDF/DOCX only, 5 MB max, magic-byte check (not just extension), optional ClamAV scan (`CLAMAV_HOST`). Images: JPG/PNG/WebP, 2 MB.
7. **Rate limits** — login, registration, password reset, applications, CV downloads, candidate search.

## 5. Entity relationships

```
users 1─1 candidate_profiles 1─* candidate_experiences
                             1─* candidate_educations
                             1─* candidate_certifications
                             *─* skills        (candidate_skills)
                             *─* languages     (candidate_languages, with proficiency)
                             1─* candidate_cvs (versions; one is_primary)
users *─* companies (company_users: owner | recruiter)
companies 1─* company_verifications (decision history)
companies 1─* jobs *─* skills (job_skills)
jobs  *─1 job_categories, industries, locations
applications: job ─ candidate_profile (UNIQUE job_id + candidate_profile_id), optional candidate_cv
applications 1─* application_status_histories, application_notes (company-private)
saved_jobs (candidate ↔ job), saved_candidates (company ↔ candidate, list name + note), saved_searches (company user)
reports (polymorphic: job | company | candidate), audit_logs, candidate_access_logs
notifications (in-app), user_tokens (email verify / password reset, hashed)
platform_settings (key/value), plans / subscriptions / payments (billing scaffold, disabled by default)
queued_jobs (database queue), rate_limits (limiter store)
```

### Design decisions

- **Privacy settings live on `candidate_profiles`** (`visibility`, `contact_sharing`, `cv_searchable`) rather than a separate table: they are 1:1, always read with the profile, and filtered on in search, so a join would only cost performance.
- **Salaries** are whole units per month with a currency code (`jobs.salary_currency`, `candidate_profiles.expected_salary_currency`). A job's currency always follows its country (AED, SAR, QAR, KWD, OMR, BHD). Salary filters only compare within one currency (chosen, or the selected country's); without a currency the job salary filter is ignored. Hidden salaries are filterable but never revealed.
- **Timestamps** are stored in UTC. Deadlines are inclusive in UTC+3 (the westernmost Gulf zone), so a job stays open until midnight everywhere; JobPosting `validThrough` uses the job country's offset.
- **Duplicate applications** are prevented by a unique index on `(job_id, candidate_profile_id)` plus a friendly pre-check. A withdrawn application cannot be resubmitted (product decision; documented so it can be revisited).
- **Soft deletes** are used only on `jobs` (`archived` status) and `companies` (`suspended`); candidates who delete their account are hard-deleted with their files, as privacy requires. Audit rows keep the user id but no personal content.
- **Taxonomy** (industries, categories, Qatar locations, skills, languages) is admin-managed data, not enums, so it can grow without deployments. Locations are a tree: country → city → district, each row carrying `country_code` and a `display_name` ("Business Bay, Dubai, UAE") so filters and labels never need to walk the tree. A country slug matches everything inside it.
- **Search** uses indexed columns and `LIKE` keyword matching through `CandidateSearchService` / `JobSearchService`. On MySQL a FULLTEXT index is added for keyword relevance. Controllers only talk to the service interface, so swapping in Meilisearch/OpenSearch later means replacing one class plus an indexing listener.
- **Billing** tables and an `EntitlementService` exist but billing is disabled (`billing_enabled = false`). While disabled every check returns "allowed". No payment provider is integrated or simulated.
- **CV parsing** is designed but not implemented: `candidate_cvs.parse_status` and `parsed_data` (JSON) are reserved so a parser can store extracted data for the candidate to review before it touches the profile.

## 6. Status machines

Jobs: `draft → pending_review → published ⇄ paused → closed → archived`; `pending_review → rejected → (edit) → pending_review`. A published job past its deadline is treated as expired everywhere (search, apply, structured data) and closed by the scheduled `jobs:expire` command.

Applications: `submitted → under_review → shortlisted → interview → offer → hired`; any open state → `rejected`; candidate may `withdraw` before `offer`. Every change writes `application_status_histories`.

Companies: `pending → verified | rejected`; `verified → suspended → verified`. Only an administrator decision changes status.
