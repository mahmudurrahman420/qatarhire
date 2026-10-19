import { BaseSeeder } from '@adonisjs/lucid/seeders'
import app from '@adonisjs/core/services/app'
import drive from '@adonisjs/drive/services/main'
import { readFile } from 'node:fs/promises'
import { DateTime } from 'luxon'
import string from '@adonisjs/core/helpers/string'
import User from '#models/user'
import Company from '#models/company'
import CompanyUser from '#models/company_user'
import CompanyVerification from '#models/company_verification'
import CandidateProfile from '#models/candidate_profile'
import CandidateExperience from '#models/candidate_experience'
import CandidateEducation from '#models/candidate_education'
import CandidateCv from '#models/candidate_cv'
import Job from '#models/job'
import Skill from '#models/skill'
import Language from '#models/language'
import Location from '#models/location'
import Industry from '#models/industry'
import JobCategory from '#models/job_category'
import Application from '#models/application'
import ApplicationStatusHistory from '#models/application_status_history'
import { refreshCompleteness } from '#services/profile_completeness'
import { countryByCode, currencyFor } from '#shared/gulf'

/**
 * DEVELOPMENT / DEMO DATA ONLY. Fictional companies and people.
 *   node ace db:seed --files database/seeders/02_demo_seeder.ts
 * Refuses to run in production. All demo accounts use the password "DemoPass#2026".
 * Portraits come from the homepage design mockup (public/images/demo).
 */
const PASSWORD = 'DemoPass#2026'

/** A minimal one-page PDF so demo "View CV" buttons download a real file. */
function demoCvPdf(name: string, title: string) {
  const text = `${name} - ${title} (sample CV for demo purposes)`.replace(/[()\\]/g, '')
  const stream = `BT /F1 16 Tf 72 720 Td (${text}) Tj ET`
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ]
  let out = '%PDF-1.4\n'
  const offsets: number[] = []
  objs.forEach((o, i) => {
    offsets.push(out.length)
    out += `${i + 1} 0 obj\n${o}\nendobj\n`
  })
  const xref = out.length
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return Buffer.from(out)
}

export default class extends BaseSeeder {
  static environment = ['development']

  async run() {
    if (app.inProduction) throw new Error('Demo seeder must not run in production')
    if (await User.findBy('email', 'owner@crescenttrading.example')) return

    const loc = async (slug: string) => Location.findByOrFail('slug', slug)
    const ind = async (slug: string) => (await Industry.findByOrFail('slug', slug)).id
    const cat = async (slug: string) => (await JobCategory.findByOrFail('slug', slug)).id

    // ------------------------------------------------------------------ employers
    const companiesSpec = [
      { name: 'Crescent Trading', email: 'owner@crescenttrading.example', owner: 'Khalid Al Mansoori', industry: 'retail-and-consumer-goods', location: 'dubai', status: 'verified', featured: true, size: '201-500', desc: 'Distributor of consumer electronics and home appliances across the UAE and Oman.' },
      { name: 'Horizon Projects', email: 'owner@horizonprojects.example', owner: 'Hamad Al-Kuwari', industry: 'construction-and-engineering', location: 'doha', status: 'verified', featured: true, size: '501-1000', desc: 'Contractor delivering towers and infrastructure in Doha and Lusail since 2004.\n\nAround 900 people across engineering, site operations and HSE.' },
      { name: 'CarePoint Clinic', email: 'owner@carepoint.example', owner: 'Mariam Haddad', industry: 'healthcare', location: 'muscat', status: 'verified', featured: true, size: '51-200', desc: 'Family medicine and specialist outpatient clinics in Muscat and Sohar.' },
      { name: 'Atlas Logistics', email: 'owner@atlaslogistics.example', owner: 'Rajesh Menon', industry: 'logistics-and-transportation', location: 'dammam', status: 'verified', featured: true, size: '201-500', desc: 'Freight forwarding, warehousing and last-mile delivery in the Eastern Province.' },
      { name: 'Corniche Digital', email: 'owner@cornichedigital.example', owner: 'Omar Siddiqui', industry: 'information-technology', location: 'manama', status: 'verified', featured: false, size: '51-200', desc: 'Product and engineering studio building apps for banks and retailers across the GCC.' },
      { name: 'Gulf Coast Hospitality', email: 'owner@gulfcoasthotels.example', owner: 'Ana Ribeiro', industry: 'hospitality-and-tourism', location: 'kuwait-city', status: 'pending', featured: false, size: '1000+', desc: 'Operator of hotels and restaurants in Kuwait and Bahrain.' },
    ] as const

    const companies: Company[] = []
    for (const c of companiesSpec) {
      const owner = await User.create({ fullName: c.owner, email: c.email, password: PASSWORD, role: 'employer', status: 'active', emailVerifiedAt: DateTime.now() })
      const company = await Company.create({
        name: c.name, slug: string.slug(c.name, { lower: true, strict: true }), website: `https://www.${c.email.split('@')[1]}`,
        industryId: await ind(c.industry), locationId: (await loc(c.location)).id, description: c.desc, contactName: c.owner, contactEmail: c.email,
        size: c.size, crNumber: c.status === 'verified' ? String(100000 + companies.length * 7919) : null, verificationStatus: c.status,
        verifiedAt: c.status === 'verified' ? DateTime.now().minus({ days: 20 }) : null, isFeatured: c.featured,
      })
      await CompanyUser.create({ companyId: company.id, userId: owner.id, role: 'owner' })
      await CompanyVerification.create({ companyId: company.id, fromStatus: null, toStatus: 'pending', note: 'Company registered' })
      if (c.status === 'verified') await CompanyVerification.create({ companyId: company.id, fromStatus: 'pending', toStatus: 'verified', note: 'Trade licence checked' })
      companies.push(company)
    }
    const recruiter = await User.create({ fullName: 'Fatima Noor', email: 'recruiter@horizonprojects.example', password: PASSWORD, role: 'employer', status: 'active', emailVerifiedAt: DateTime.now() })
    await CompanyUser.create({ companyId: companies[1].id, userId: recruiter.id, role: 'recruiter' })

    // ------------------------------------------------------------------ jobs
    type JobSpec = { c: number; title: string; cat: string; loc: string; type?: string; arr?: string; min?: number; max?: number; exp: number; skills: string[]; days: number; deadline?: number; status?: string }
    const jobs: JobSpec[] = [
      { c: 0, title: 'Sales Executive', cat: 'sales-and-business-development', loc: 'dubai', min: 7000, max: 10000, exp: 2, skills: ['Sales', 'CRM', 'Negotiation'], days: 2 },
      { c: 1, title: 'Civil Engineer', cat: 'engineering', loc: 'doha', min: 12000, max: 16000, exp: 5, skills: ['AutoCAD', 'Site Supervision', 'Project Management'], days: 3 },
      { c: 2, title: 'Registered Nurse', cat: 'healthcare-and-medical', loc: 'muscat', min: 700, max: 950, exp: 3, skills: ['Nursing', 'BLS', 'Patient Care'], days: 5 },
      { c: 3, title: 'Warehouse Supervisor', cat: 'logistics-and-supply-chain', loc: 'dammam', min: 6500, max: 9000, exp: 5, skills: ['Warehouse Management', 'Inventory', 'Team Leadership'], days: 6 },
      { c: 0, title: 'Accountant', cat: 'accounting-and-finance', loc: 'business-bay', min: 9000, max: 13000, exp: 4, skills: ['VAT', 'Excel', 'Financial Reporting'], days: 7 },
      { c: 1, title: 'HVAC Technician', cat: 'skilled-trades-and-technicians', loc: 'lusail', min: 4500, max: 6000, exp: 3, skills: ['HVAC', 'Maintenance', 'Troubleshooting'], days: 8 },
      { c: 1, title: 'HSE Officer', cat: 'health-safety-and-environment', loc: 'al-wakrah', min: 7000, max: 9000, exp: 3, skills: ['NEBOSH', 'Risk Assessment', 'Permit to Work'], days: 9, deadline: 4 },
      { c: 4, title: 'Senior React Developer', cat: 'it-and-software', loc: 'seef', arr: 'hybrid', min: 1400, max: 1900, exp: 5, skills: ['React', 'TypeScript', 'Node.js'], days: 9 },
      { c: 4, title: 'Data Analyst', cat: 'it-and-software', loc: 'manama', arr: 'remote', min: 1100, max: 1500, exp: 3, skills: ['SQL', 'Power BI', 'Python'], days: 12 },
      { c: 2, title: 'Medical Receptionist', cat: 'customer-service', loc: 'sohar', min: 350, max: 450, exp: 1, skills: ['Customer Support', 'English'], days: 10 },
      { c: 3, title: 'Heavy Vehicle Driver', cat: 'driving-and-transport', loc: 'jubail', min: 3500, max: 4500, exp: 3, skills: ['Heavy Vehicle Driving'], days: 11 },
      { c: 0, title: 'Customer Service Executive', cat: 'customer-service', loc: 'abu-dhabi', min: 5500, max: 7000, exp: 2, skills: ['Customer Support', 'CRM', 'English'], days: 14 },
      { c: 0, title: 'Merchandiser', cat: 'sales-and-business-development', loc: 'sharjah', type: 'contract', exp: 0, skills: ['Merchandising'], days: 40, deadline: -2 },
      { c: 5, title: 'Front Office Supervisor', cat: 'hospitality-and-food-service', loc: 'salmiya', min: 400, max: 550, exp: 3, skills: ['Front Office', 'Customer Service'], days: 1, status: 'pending_review' },
    ]
    const createdJobs: Job[] = []
    for (const [i, j] of jobs.entries()) {
      const company = companies[j.c]
      const location = await loc(j.loc)
      const job = await Job.create({
        companyId: company.id,
        title: j.title,
        slug: string.slug(`${j.title} ${company.name} ${location.name}`, { lower: true, strict: true }).slice(0, 200),
        categoryId: await cat(j.cat),
        industryId: company.industryId,
        locationId: location.id,
        description: `${company.name} is hiring a ${j.title} in ${location.shortName}.\n\nYou'll join a supportive team with clear expectations and room to grow.`,
        responsibilities: '- Deliver your core responsibilities to a high standard\n- Coordinate with colleagues across departments\n- Keep accurate records and report progress weekly',
        requirements: `- ${j.exp > 0 ? `${j.exp}+ years of relevant experience` : 'No previous experience required; training provided'}\n- Good written and spoken English; Arabic is an advantage\n- Valid residence visa or ability to transfer sponsorship`,
        minExperience: j.exp,
        employmentType: (j.type ?? 'full_time') as Job['employmentType'],
        workArrangement: (j.arr ?? 'on_site') as Job['workArrangement'],
        salaryMin: j.min ?? null,
        salaryMax: j.max ?? null,
        salaryCurrency: currencyFor(location.countryCode),
        salaryVisible: true,
        vacancies: i % 4 === 0 ? 2 : 1,
        deadline: DateTime.now().plus({ days: j.deadline ?? 30 - (j.days % 10) }),
        applicationMethod: 'platform',
        status: (j.status ?? 'published') as Job['status'],
        publishedAt: j.status ? null : DateTime.now().minus({ days: j.days, hours: i }),
        isFeatured: i === 1,
        viewsCount: 40 + ((i * 37) % 300),
      })
      await job.related('skills').sync(await Skill.resolveIds(j.skills))
      createdJobs.push(job)
    }

    // ------------------------------------------------------------------ candidates
    const lang = async (code: string) => Language.findByOrFail('code', code)
    const [en, ar, ml, tl, hi, ur] = await Promise.all(['en', 'ar', 'ml', 'tl', 'hi', 'ur'].map(lang))

    type Cand = {
      name: string; email: string; photo?: string; gender: 'male' | 'female'; position: string; headline: string; title: string; ind: string; years: number
      edu: string; loc: string; pref: string; salary: number | null; avail: string; notice: number; skills: string[]; langs: [Language, string][]
      vis: 'private' | 'discoverable' | 'public'; share?: boolean; cv?: boolean; auth?: string; daysAgo: number
    }
    const cands: Cand[] = [
      { name: 'Aisha Khan', email: 'aisha@candidate.example', photo: 'aisha-khan', gender: 'female', position: 'Accountant', headline: 'Chartered accountant focused on VAT and month-end close', title: 'Senior Accountant', ind: 'banking-and-financial-services', years: 5, edu: 'bachelor', loc: 'dubai', pref: 'uae', salary: 12000, avail: 'immediately', notice: 0, skills: ['VAT', 'Excel', 'Financial Reporting'], langs: [[en, 'native'], [ur, 'native'], [ar, 'conversational']], vis: 'public', share: true, cv: true, auth: 'gulf_resident_transferable', daysAgo: 0 },
      { name: 'Ahmed Hassan', email: 'ahmed@candidate.example', photo: 'ahmed-hassan', gender: 'male', position: 'Civil Engineer', headline: 'Civil engineer, 6 years on high-rise and road projects', title: 'Site Engineer', ind: 'construction-and-engineering', years: 6, edu: 'bachelor', loc: 'abu-dhabi', pref: 'uae', salary: 15000, avail: 'immediately', notice: 0, skills: ['AutoCAD', 'Project Management', 'Site Supervision'], langs: [[ar, 'native'], [en, 'professional']], vis: 'public', share: false, cv: true, auth: 'gulf_resident_transferable', daysAgo: 1 },
      { name: 'Mohammed Ali', email: 'mohammed@candidate.example', photo: 'mohammed-ali', gender: 'male', position: 'HVAC Technician', headline: 'HVAC technician for commercial chillers and VRF systems', title: 'HVAC Technician', ind: 'facilities-management', years: 7, edu: 'diploma', loc: 'doha', pref: 'qatar', salary: 5500, avail: 'immediately', notice: 0, skills: ['Maintenance', 'Troubleshooting', 'HVAC'], langs: [[hi, 'native'], [en, 'conversational']], vis: 'public', share: false, cv: true, auth: 'gulf_resident_transferable', daysAgo: 2 },
      { name: 'Priya Nair', email: 'priya@candidate.example', photo: 'priya-nair', gender: 'female', position: 'Registered Nurse', headline: 'Registered nurse with outpatient and ER experience', title: 'Staff Nurse', ind: 'healthcare', years: 6, edu: 'bachelor', loc: 'muscat', pref: 'oman', salary: 900, avail: 'immediately', notice: 0, skills: ['Patient Care', 'BLS', 'Clinical Support'], langs: [[en, 'professional'], [ml, 'native']], vis: 'public', share: true, cv: true, auth: 'gulf_resident_transferable', daysAgo: 3 },
      { name: 'Maria Santos', email: 'maria@candidate.example', photo: 'maria-santos', gender: 'female', position: 'Customer Service Executive', headline: 'Customer service lead for retail and telecom', title: 'Customer Service Team Lead', ind: 'telecommunications', years: 4, edu: 'bachelor', loc: 'riyadh', pref: 'saudi-arabia', salary: 6000, avail: 'immediately', notice: 0, skills: ['Customer Support', 'CRM', 'English'], langs: [[en, 'professional'], [tl, 'native']], vis: 'public', share: false, cv: true, auth: 'gulf_resident_transferable', daysAgo: 4 },
      { name: 'Daniel Reyes', email: 'daniel@candidate.example', photo: 'daniel-reyes', gender: 'male', position: 'Warehouse Supervisor', headline: 'Warehouse supervisor running 24/7 distribution centres', title: 'Warehouse Supervisor', ind: 'logistics-and-transportation', years: 8, edu: 'diploma', loc: 'kuwait-city', pref: 'kuwait', salary: 650, avail: 'immediately', notice: 0, skills: ['Inventory', 'Team Leadership', 'Logistics'], langs: [[en, 'professional'], [tl, 'native']], vis: 'public', share: false, cv: true, auth: 'gulf_resident_transferable', daysAgo: 5 },
      { name: 'Joseph Mathew', email: 'joseph@candidate.example', gender: 'male', position: 'MEP Engineer', headline: 'MEP site engineer, 7 years on high-rise projects', title: 'MEP Engineer', ind: 'construction-and-engineering', years: 7, edu: 'bachelor', loc: 'lusail', pref: 'qatar', salary: 11000, avail: 'within_1_month', notice: 30, skills: ['MEP', 'HVAC', 'AutoCAD'], langs: [[en, 'professional'], [ml, 'native']], vis: 'public', share: false, cv: true, auth: 'gulf_resident_transferable', daysAgo: 8 },
      { name: 'Grace Okafor', email: 'grace@candidate.example', gender: 'female', position: 'Payroll Accountant', headline: 'Payroll and accounts professional (SAP, IFRS)', title: 'Senior Accountant', ind: 'hospitality-and-tourism', years: 8, edu: 'bachelor', loc: 'manama', pref: 'bahrain', salary: 1000, avail: 'within_1_month', notice: 30, skills: ['Accounting', 'Payroll', 'SAP'], langs: [[en, 'native']], vis: 'private', cv: true, daysAgo: 12 },
    ]

    const profiles: CandidateProfile[] = []
    for (const [i, c] of cands.entries()) {
      const user = await User.create({ fullName: c.name, email: c.email, password: PASSWORD, role: 'candidate', status: 'active', emailVerifiedAt: DateTime.now() })
      const current = await loc(c.loc)
      const preferred = await loc(c.pref)
      let photoKey: string | null = null
      if (c.photo) {
        photoKey = `photos/demo-${c.photo}.jpg`
        await drive.use('public').put(photoKey, await readFile(app.makePath(`public/images/demo/${c.photo}.jpg`)))
      }
      const profile = await CandidateProfile.create({
        userId: user.id, headline: c.headline, desiredPosition: c.position, gender: c.gender, currentJobTitle: c.title, photoKey,
        summary: `${c.headline}. I have ${c.years} years of experience and I'm looking for a ${c.position.toLowerCase()} role in the Gulf where I can take on more responsibility.`,
        phone: `${['+971 50', '+966 55', '+974 55', '+965 66', '+968 92', '+973 36'][i % 6]} ${String(1000000 + i * 73117).slice(0, 7)}`, contactEmail: c.email,
        industryId: await ind(c.ind), yearsExperience: c.years, educationLevel: c.edu as CandidateProfile['educationLevel'],
        currentLocationId: current.id, preferredLocationId: preferred.id, expectedSalary: c.salary, expectedSalaryCurrency: c.salary ? currencyFor(preferred.countryCode) : null,
        availability: c.avail as CandidateProfile['availability'], noticePeriodDays: c.notice, workAuthorization: (c.auth ?? null) as CandidateProfile['workAuthorization'],
        visibility: c.vis, contactSharing: c.share ? 'verified_employers' : 'on_application', cvSearchable: Boolean(c.cv),
        profileUpdatedAt: DateTime.now().minus({ days: c.daysAgo, hours: i }),
      })
      await CandidateExperience.create({ candidateProfileId: profile.id, jobTitle: c.title, companyName: 'Previous Employer LLC', location: current.shortName, startDate: DateTime.now().minus({ years: Math.min(c.years, 3) }), isCurrent: true, description: '- Led day-to-day delivery\n- Trained two junior colleagues' })
      if (c.years > 3) await CandidateExperience.create({ candidateProfileId: profile.id, jobTitle: `Junior ${c.position}`, companyName: 'Earlier Company W.L.L.', startDate: DateTime.now().minus({ years: c.years }), endDate: DateTime.now().minus({ years: 3 }), isCurrent: false })
      await CandidateEducation.create({ candidateProfileId: profile.id, institution: 'University of Mumbai', qualification: c.edu === 'diploma' ? 'Diploma' : 'BSc', fieldOfStudy: c.position, endYear: 2026 - c.years - 1 })
      await profile.related('skills').sync(await Skill.resolveIds(c.skills))
      const langMap: Record<number, { proficiency: string }> = {}
      for (const [l, p] of c.langs) langMap[l.id] = { proficiency: p }
      await profile.related('languages').sync(langMap)
      if (c.cv) {
        const key = `cvs/demo/${string.slug(c.name, { lower: true })}.pdf`
        const pdf = demoCvPdf(c.name, c.position)
        await drive.use('private').put(key, pdf)
        await CandidateCv.create({ candidateProfileId: profile.id, label: `${c.position} CV`, storageKey: key, originalName: `${c.name.replace(/\s+/g, '-')}-CV.pdf`, mimeType: 'application/pdf', sizeBytes: pdf.length, isPrimary: true, scanStatus: 'not_scanned' })
      }
      const rich = richProfiles[c.email]
      if (rich) await applyRichProfile(profile, rich)
      // keep the seeded "updated" dates rather than now()
      await refreshCompleteness(profile)
      await CandidateProfile.query().where('id', profile.id).update({ profile_updated_at: DateTime.now().minus({ days: c.daysAgo, hours: i }).toSQL({ includeOffset: false }) })
      profiles.push(profile)
    }

    // ------------------------------------------------------------------ applications at different stages
    const apps: Array<[number, number, string[]]> = [
      [1, 1, ['submitted', 'under_review', 'shortlisted', 'interview']],
      [0, 4, ['submitted']],
      [2, 5, ['submitted', 'under_review', 'shortlisted']],
      [3, 2, ['submitted', 'under_review']],
      [5, 3, ['submitted']],
      [4, 11, ['submitted', 'under_review', 'rejected']],
    ]
    for (const [p, j, path] of apps) {
      const app = await Application.create({ jobId: createdJobs[j].id, candidateProfileId: profiles[p].id, coverLetter: 'I would welcome the chance to discuss how my experience fits this role.', status: path[path.length - 1] as Application['status'], statusChangedAt: DateTime.now().minus({ days: 1 }) })
      let prev: string | null = null
      for (const [k, st] of path.entries()) {
        await ApplicationStatusHistory.create({ applicationId: app.id, fromStatus: prev, toStatus: st, createdAt: DateTime.now().minus({ days: path.length - k }) })
        prev = st
      }
    }
  }
}

/* ------------------------------------------------------------------ full profiles for a few demo candidates */

type Rich = {
  employment: 'employed' | 'unemployed'; career: string; gcc: boolean; licence: boolean; notice: string; types: string[]; salaryRange: string
  benefits: string[]; functions: string[]; industries: string[]; prefPositions: string[]; prefCities: string[]; whatsapp?: boolean
  linkedin?: string; about: string
  education: { qualification: string; major: string; institution: string; custom?: boolean; start: string; end: string }[]
  jobs: { title: string; company: string; type: string; location: string; start: string; end?: string; about: string }[]
}

const richProfiles: Record<string, Rich> = {
  'aisha@candidate.example': {
    employment: 'employed', career: 'senior', gcc: true, licence: true, notice: '1_month', types: ['full_time', 'contract'], salaryRange: '10000-15000',
    benefits: ['housing', 'transportation', 'medical', 'air_ticket', 'end_of_service'], functions: ['accounting-and-finance'], industries: ['banking-and-financial-services', 'consulting-and-professional-services'],
    prefPositions: ['Senior Accountant', 'Finance Manager', 'VAT Specialist'], prefCities: ['dubai', 'abu-dhabi'], whatsapp: true,
    linkedin: 'https://www.linkedin.com/in/aisha-khan-demo/',
    about: '<p>I am a <b>chartered accountant</b> with five years of experience in the UAE, focused on VAT compliance, month-end close and management reporting.</p><ul><li>Cut month-end close from 10 to 6 working days</li><li>Led two FTA VAT audits with no penalties</li><li>Built Power BI dashboards for the CFO</li></ul><p>I am looking for a senior accounting or finance manager role in Dubai or Abu Dhabi.</p>',
    education: [
      { qualification: "Bachelor's Degree", major: 'Accounting', institution: 'University of the Punjab', start: '2014-09-01', end: '2018-06-30' },
      { qualification: 'Postgraduate Diploma', major: 'Banking & Finance', institution: 'Heriot-Watt University Dubai', start: '2019-09-01', end: '2020-06-30' },
    ],
    jobs: [
      { title: 'Senior Accountant', company: 'Crescent Trading', type: 'full_time', location: 'Dubai, UAE', start: '2022-03-01', about: '<ul><li>Own VAT returns and FTA correspondence for three entities</li><li>Lead month-end close and intercompany reconciliations</li></ul>' },
      { title: 'Accountant', company: 'Al Noor Auditing', type: 'full_time', location: 'Sharjah, UAE', start: '2019-01-01', end: '2022-02-28', about: '<p>Statutory audits and bookkeeping for SME clients in retail and logistics.</p>' },
    ],
  },
  'ahmed@candidate.example': {
    employment: 'employed', career: 'mid', gcc: true, licence: true, notice: '2_months', types: ['full_time'], salaryRange: '10000-15000',
    benefits: ['housing', 'transportation', 'medical', 'end_of_service'], functions: ['engineering', 'project-management'], industries: ['construction-and-engineering'],
    prefPositions: ['Civil Engineer', 'Site Engineer'], prefCities: ['abu-dhabi', 'dubai'],
    about: '<p>Civil engineer with six years on high-rise and road projects in Abu Dhabi. Comfortable leading subcontractors, preparing method statements and coordinating with consultants.</p><p><b>Looking for:</b> a senior site engineer role on a major project.</p>',
    education: [{ qualification: "Bachelor's Degree", major: 'Civil Engineering', institution: 'Cairo University', start: '2014-09-01', end: '2019-06-30' }],
    jobs: [
      { title: 'Site Engineer', company: 'Horizon Projects', type: 'full_time', location: 'Abu Dhabi, UAE', start: '2021-05-01', about: '<ul><li>Supervise structure works on a 32-floor residential tower</li><li>Prepare daily progress reports and look-ahead schedules</li></ul>' },
      { title: 'Junior Civil Engineer', company: 'Delta Roads Contracting', type: 'contract', location: 'Cairo, Egypt', start: '2019-08-01', end: '2021-04-30', about: '<p>Road and drainage works, quantity take-off and site testing.</p>' },
    ],
  },
  'mohammed@candidate.example': {
    employment: 'unemployed', career: 'mid', gcc: true, licence: false, notice: 'immediate', types: ['full_time', 'temporary'], salaryRange: '4000-5000',
    benefits: ['housing', 'transportation', 'food', 'medical'], functions: ['skilled-trades-and-technicians'], industries: ['facilities-management'],
    prefPositions: ['HVAC Technician', 'Maintenance Technician'], prefCities: ['doha', 'lusail'], whatsapp: true,
    about: '<p>HVAC technician with seven years maintaining commercial chillers, AHUs and VRF systems in Doha. Available to join immediately with a transferable visa.</p>',
    education: [{ qualification: 'Diploma', major: 'Mechanical Engineering', institution: 'Government Polytechnic, Lucknow', custom: true, start: '2013-07-01', end: '2016-05-31' }],
    jobs: [{ title: 'HVAC Technician', company: 'Pearl Facilities Services', type: 'full_time', location: 'Doha, Qatar', start: '2018-02-01', end: '2026-08-31', about: '<ul><li>Preventive maintenance on 40+ chillers and AHUs</li><li>Fault finding on VRF and split systems</li></ul>' }],
  },
}

async function applyRichProfile(profile: CandidateProfile, r: Rich) {
  const industries = await Industry.query().whereIn('slug', [...r.industries])
  const functions = await JobCategory.query().whereIn('slug', r.functions)
  const cities = await Location.query().whereIn('slug', r.prefCities).where('kind', 'city')
  const country = cities[0] ? await Location.findBy('slug', countryByCode(cities[0].countryCode)?.slug ?? '') : null
  profile.merge({
    employmentStatus: r.employment, careerLevel: r.career, hasGccExperience: r.gcc, hasDrivingLicence: r.licence, hasDisability: false,
    noticePeriod: r.notice, desiredEmploymentTypes: r.types, currentSalaryRange: r.salaryRange, currentSalaryCurrency: country ? currencyFor(country.countryCode) : 'QAR',
    benefits: r.benefits, industryIds: industries.map((i) => i.id), functionIds: functions.map((f) => f.id), preferredPositions: r.prefPositions,
    preferredIndustryIds: industries.map((i) => i.id), preferredCityIds: cities.map((c) => c.id), preferredLocationId: country?.id ?? profile.preferredLocationId,
    whatsapp: r.whatsapp ? profile.phone : null, linkedinUrl: r.linkedin ?? null, summary: r.about, openToRelocation: true,
  })
  await profile.save()
  await CandidateEducation.query().where('candidate_profile_id', profile.id).delete()
  await CandidateExperience.query().where('candidate_profile_id', profile.id).delete()
  for (const e of r.education) {
    const start = DateTime.fromISO(e.start)
    const end = DateTime.fromISO(e.end)
    await CandidateEducation.create({ candidateProfileId: profile.id, qualification: e.qualification, fieldOfStudy: e.major, institution: e.institution, isCustomInstitute: Boolean(e.custom), startDate: start, endDate: end, startYear: start.year, endYear: end.year })
  }
  for (const j of r.jobs) {
    await CandidateExperience.create({ candidateProfileId: profile.id, jobTitle: j.title, companyName: j.company, employmentType: j.type, location: j.location, startDate: DateTime.fromISO(j.start), endDate: j.end ? DateTime.fromISO(j.end) : null, isCurrent: !j.end, description: j.about })
  }
}
