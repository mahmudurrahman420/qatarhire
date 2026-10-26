/*
|--------------------------------------------------------------------------
| Routes
|--------------------------------------------------------------------------
| Authorization is enforced here (auth/role/verified/employer/candidate
| middleware) and again inside controllers (company-scoped queries,
| Bouncer policies). Never rely on hidden UI elements.
*/
import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'
import {
  applyThrottle,
  authEmailThrottle,
  candidateSearchThrottle,
  cvDownloadThrottle,
  loginThrottle,
  socialAuthThrottle,
  publicFormThrottle,
} from '#start/limiter'

const HomeController = () => import('#controllers/public/home_controller')
const JobsController = () => import('#controllers/public/jobs_controller')
const CompaniesController = () => import('#controllers/public/companies_controller')
const PagesController = () => import('#controllers/public/pages_controller')
const TalentController = () => import('#controllers/public/talent_controller')
const ContentController = () => import('#controllers/public/content_controller')
const SeoController = () => import('#controllers/public/seo_controller')
const ReportsController = () => import('#controllers/public/reports_controller')

const RegisterController = () => import('#controllers/auth/register_controller')
const SocialController = () => import('#controllers/auth/social_controller')
const CompanySetupController = () => import('#controllers/employer/company_setup_controller')
const SessionController = () => import('#controllers/auth/session_controller')
const EmailVerificationController = () => import('#controllers/auth/email_verification_controller')
const PasswordResetController = () => import('#controllers/auth/password_reset_controller')
const AccountController = () => import('#controllers/auth/account_controller')

const CandidateDashboard = () => import('#controllers/candidate/dashboard_controller')
const ProfileController = () => import('#controllers/candidate/profile_controller')
const CvsController = () => import('#controllers/candidate/cvs_controller')
const PrivacyController = () => import('#controllers/candidate/privacy_controller')
const CandidateApplications = () => import('#controllers/candidate/applications_controller')
const SavedJobsController = () => import('#controllers/candidate/saved_jobs_controller')
const CvDownloadsController = () => import('#controllers/files/cv_downloads_controller')

const EmployerDashboard = () => import('#controllers/employer/dashboard_controller')
const CompanyController = () => import('#controllers/employer/company_controller')
const TeamController = () => import('#controllers/employer/team_controller')
const EmployerJobs = () => import('#controllers/employer/jobs_controller')
const ApplicantsController = () => import('#controllers/employer/applicants_controller')
const CandidatesController = () => import('#controllers/employer/candidates_controller')

const AdminDashboard = () => import('#controllers/admin/dashboard_controller')
const AdminUsers = () => import('#controllers/admin/users_controller')
const AdminCompanies = () => import('#controllers/admin/companies_controller')
const AdminJobs = () => import('#controllers/admin/jobs_controller')
const AdminReports = () => import('#controllers/admin/reports_controller')
const AdminTaxonomy = () => import('#controllers/admin/taxonomy_controller')
const AdminSettings = () => import('#controllers/admin/settings_controller')
const AdminEmailSettings = () => import('#controllers/admin/email_settings_controller')
const AdminAudit = () => import('#controllers/admin/audit_controller')

/* ---------------------------------------------------------------- public */
router.get('/', [HomeController, 'index'])
router.get('/talent/feed', [HomeController, 'feed']).use(candidateSearchThrottle)
router.get('/talent', [TalentController, 'index']).use(candidateSearchThrottle)
router.get('/talent/:id', [TalentController, 'show']).where('id', router.matchers.number()).use(candidateSearchThrottle)
router.get('/career-tips', [ContentController, 'tips'])
router.get('/career-tips/:slug', [ContentController, 'tip'])
router.get('/courses', [ContentController, 'courses'])
router.post('/courses/interest', [ContentController, 'courseInterest']).use(publicFormThrottle)
router.get('/arabic', [ContentController, 'arabic'])
router.get('/jobs', [JobsController, 'index'])
router.get('/jobs/:slug', [JobsController, 'show'])
router.get('/companies', [CompaniesController, 'index'])
router.get('/companies/:slug', [CompaniesController, 'show'])
router.get('/contact', [PagesController, 'contact'])
router.post('/contact', [PagesController, 'sendContact']).use(publicFormThrottle)
router.post('/reports', [ReportsController, 'store']).use(publicFormThrottle)
router.get('/robots.txt', [SeoController, 'robots'])
router.get('/sitemap.xml', [SeoController, 'sitemap'])
router.get('/health', async () => ({ ok: true }))
router
  .get('/:page', [PagesController, 'show'])
  .where('page', /^(about|faq|terms|privacy|cookies|safety|employers|accessibility|help)$/)

/* ---------------------------------------------------------------- auth (guests) */
router
  .group(() => {
    router.get('/register', [RegisterController, 'showCandidate'])
    router.post('/register', [RegisterController, 'storeCandidate']).use(authEmailThrottle)
    router.get('/employers/register', [RegisterController, 'showEmployer'])
    router.post('/employers/register', [RegisterController, 'storeEmployer']).use(authEmailThrottle)
    router.get('/login', [SessionController, 'show'])
    router.post('/login', [SessionController, 'store']).use(loginThrottle)
    router.get('/auth/:provider/redirect', [SocialController, 'redirect']).where('provider', /^(google|linkedin|facebook)$/).use(socialAuthThrottle)
    router.get('/auth/:provider/callback', [SocialController, 'callback']).where('provider', /^(google|linkedin|facebook)$/).use(socialAuthThrottle)
    router.get('/forgot-password', [PasswordResetController, 'showForgot'])
    router.post('/forgot-password', [PasswordResetController, 'sendLink']).use(authEmailThrottle)
    router.get('/reset-password/:token', [PasswordResetController, 'showReset'])
    router.post('/reset-password/:token', [PasswordResetController, 'reset']).use(authEmailThrottle)
    router.get('/invitations/:token', [TeamController, 'showAccept'])
    router.post('/invitations/:token', [TeamController, 'accept']).use(authEmailThrottle)
  })
  .use(middleware.guest())

router.get('/verify-email/:token', [EmailVerificationController, 'verify'])
// CV downloads authorise per request; signed-out visitors may fetch public CVs only
router.get('/files/cvs/:id', [CvDownloadsController, 'show']).where('id', router.matchers.number()).use(cvDownloadThrottle)

/* ---------------------------------------------------------------- signed-in (any role) */
router
  .group(() => {
    router.post('/logout', [SessionController, 'destroy'])
    router.get('/dashboard', [SessionController, 'dashboard'])
    router.get('/verify-email', [EmailVerificationController, 'notice'])
    router.post('/verify-email/resend', [EmailVerificationController, 'resend']).use(authEmailThrottle)
    router.get('/account', [AccountController, 'show'])
    router.put('/account', [AccountController, 'update'])
    router.put('/account/password', [AccountController, 'changePassword']).use(loginThrottle)
    router.get('/notifications', [AccountController, 'notifications'])
    router.post('/notifications/read-all', [AccountController, 'markAllRead'])
    router.post('/notifications/:id/read', [AccountController, 'markRead']).where('id', router.matchers.number())
  })
  .use(middleware.auth())

/* ---------------------------------------------------------------- candidates */
router
  .group(() => {
    router.get('/candidate', [CandidateDashboard, 'index'])
    router.get('/candidate/profile', [ProfileController, 'edit'])
    router.put('/candidate/profile', [ProfileController, 'update'])
    router.post('/candidate/photo', [ProfileController, 'uploadPhoto'])
    router.delete('/candidate/photo', [ProfileController, 'deletePhoto'])
    router.post('/candidate/experiences', [ProfileController, 'storeExperience'])
    router.put('/candidate/experiences/:id', [ProfileController, 'updateExperience'])
    router.delete('/candidate/experiences/:id', [ProfileController, 'destroyExperience'])
    router.post('/candidate/educations', [ProfileController, 'storeEducation'])
    router.put('/candidate/educations/:id', [ProfileController, 'updateEducation'])
    router.delete('/candidate/educations/:id', [ProfileController, 'destroyEducation'])
    router.post('/candidate/certifications', [ProfileController, 'storeCertification'])
    router.delete('/candidate/certifications/:id', [ProfileController, 'destroyCertification'])
    router.put('/candidate/skills', [ProfileController, 'updateSkills'])
    router.put('/candidate/languages', [ProfileController, 'updateLanguages'])

    router.post('/candidate/cvs', [CvsController, 'store'])
    router.post('/candidate/cvs/:id/primary', [CvsController, 'makePrimary'])
    router.delete('/candidate/cvs/:id', [CvsController, 'destroy'])

    router.get('/candidate/privacy', [PrivacyController, 'show'])
    router.put('/candidate/privacy', [PrivacyController, 'update'])
    router.get('/candidate/data-export', [PrivacyController, 'export'])
    router.post('/candidate/delete-account', [PrivacyController, 'destroy']).use(loginThrottle)

    router.get('/candidate/applications', [CandidateApplications, 'index'])
    router.post('/candidate/applications/:id/withdraw', [CandidateApplications, 'withdraw'])
    router.get('/jobs/:slug/apply', [CandidateApplications, 'create'])
    router.post('/jobs/:slug/apply', [CandidateApplications, 'store']).use(applyThrottle)

    router.get('/candidate/saved', [SavedJobsController, 'index'])
    router.post('/jobs/:slug/save', [SavedJobsController, 'toggle'])
    router.post('/candidate/alerts', [SavedJobsController, 'storeAlert'])
    router.delete('/candidate/alerts/:id', [SavedJobsController, 'destroyAlert'])
  })
  .use([middleware.auth(), middleware.role({ roles: ['candidate'] }), middleware.verified(), middleware.candidate()])

/* ---------------------------------------------------------------- employers */
// first-time company details for employers who signed up without one (e.g. via Google)
router
  .group(() => {
    router.get('/setup', [CompanySetupController, 'show'])
    router.post('/setup', [CompanySetupController, 'store'])
  })
  .prefix('/employer')
  .use([middleware.auth(), middleware.role({ roles: ['employer'] }), middleware.verified()])

router
  .group(() => {
    router.get('/', [EmployerDashboard, 'index'])
    router.get('/jobs', [EmployerJobs, 'index'])
    router.get('/jobs/create', [EmployerJobs, 'create'])
    router.post('/jobs', [EmployerJobs, 'store'])
    router.get('/jobs/:id/edit', [EmployerJobs, 'edit'])
    router.put('/jobs/:id', [EmployerJobs, 'update'])
    router.get('/jobs/:id/preview', [EmployerJobs, 'preview'])
    router.post('/jobs/:id/status', [EmployerJobs, 'status'])
    router.post('/jobs/:id/duplicate', [EmployerJobs, 'duplicate'])
    router.get('/jobs/:id/applicants', [ApplicantsController, 'index'])
    router.get('/applications/:id', [ApplicantsController, 'show'])
    router.post('/applications/:id/status', [ApplicantsController, 'updateStatus'])
    router.post('/applications/:id/notes', [ApplicantsController, 'storeNote'])

    router.get('/candidates', [CandidatesController, 'index']).use(candidateSearchThrottle)
    router.get('/candidates/saved', [CandidatesController, 'saved'])
    router.get('/candidates/:id', [CandidatesController, 'show']).where('id', router.matchers.number()).use(candidateSearchThrottle)
    router.post('/candidates/:id/save', [CandidatesController, 'save'])
    router.post('/candidates/:id/toggle-save', [CandidatesController, 'toggleSave'])
    router.delete('/saved-candidates/:savedId', [CandidatesController, 'unsave'])
    router.post('/saved-searches', [CandidatesController, 'storeSearch'])
    router.delete('/saved-searches/:id', [CandidatesController, 'destroySearch'])
  })
  .prefix('/employer')
  .use([middleware.auth(), middleware.role({ roles: ['employer'] }), middleware.verified(), middleware.employer()])

// owner-only company administration
router
  .group(() => {
    router.get('/company', [CompanyController, 'edit'])
    router.put('/company', [CompanyController, 'update'])
    router.post('/company/logo', [CompanyController, 'uploadLogo'])
    router.get('/team', [TeamController, 'index'])
    router.post('/team', [TeamController, 'invite']).use(authEmailThrottle)
    router.delete('/team/:id', [TeamController, 'remove'])
    router.get('/billing', [EmployerDashboard, 'billing'])
  })
  .prefix('/employer')
  .use([middleware.auth(), middleware.role({ roles: ['employer'] }), middleware.verified(), middleware.employer({ ownerOnly: true })])

/* ---------------------------------------------------------------- administrators */
// dedicated admin sign-in: same form, admin accounts only (handles already-signed-in users itself)
router.get('/admin/login', [SessionController, 'showAdmin'])

router
  .group(() => {
    router.get('/', [AdminDashboard, 'index'])
    router.get('/users', [AdminUsers, 'index'])
    router.post('/users/:id/status', [AdminUsers, 'setStatus'])
    router.get('/companies', [AdminCompanies, 'index'])
    router.get('/companies/:id', [AdminCompanies, 'show'])
    router.post('/companies/:id/verification', [AdminCompanies, 'decide'])
    router.post('/companies/:id/featured', [AdminCompanies, 'toggleFeatured'])
    router.get('/jobs', [AdminJobs, 'index'])
    router.get('/jobs/:id', [AdminJobs, 'show'])
    router.post('/jobs/:id/moderate', [AdminJobs, 'moderate'])
    router.post('/jobs/:id/takedown', [AdminJobs, 'takedown'])
    router.post('/jobs/:id/featured', [AdminJobs, 'toggleFeatured'])
    router.get('/reports', [AdminReports, 'index'])
    router.put('/reports/:id', [AdminReports, 'update'])
    router.get('/taxonomy/:type', [AdminTaxonomy, 'index'])
    router.post('/taxonomy/:type', [AdminTaxonomy, 'store'])
    router.put('/taxonomy/:type/:id', [AdminTaxonomy, 'update'])
    router.delete('/taxonomy/:type/:id', [AdminTaxonomy, 'destroy'])
    router.get('/settings', [AdminSettings, 'show'])
    router.put('/settings', [AdminSettings, 'update'])
    router.get('/settings/email', [AdminEmailSettings, 'show'])
    router.post('/settings/email', [AdminEmailSettings, 'update'])
    router.post('/settings/email/test', [AdminEmailSettings, 'test'])
    router.post('/settings/email/clear-token', [AdminEmailSettings, 'clearToken'])
    router.post('/queue/:id/retry', [AdminSettings, 'retryJob'])
    router.get('/audit', [AdminAudit, 'index'])
  })
  .prefix('/admin')
  .use([middleware.auth(), middleware.role({ roles: ['admin'] })])
