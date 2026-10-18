import { BaseSeeder } from '@adonisjs/lucid/seeders'
import app from '@adonisjs/core/services/app'
import { DateTime } from 'luxon'
import string from '@adonisjs/core/helpers/string'
import User from '#models/user'
import Company from '#models/company'
import CompanyUser from '#models/company_user'
import CompanyVerification from '#models/company_verification'
import CandidateProfile from '#models/candidate_profile'
import CandidateExperience from '#models/candidate_experience'
import CandidateEducation from '#models/candidate_education'
import Job from '#models/job'
import Skill from '#models/skill'
import Language from '#models/language'
import Location from '#models/location'
import Industry from '#models/industry'
import JobCategory from '#models/job_category'
import Application from '#models/application'
import ApplicationStatusHistory from '#models/application_status_history'
import { refreshCompleteness } from '#services/profile_completeness'

/**
 * DEVELOPMENT / DEMO DATA ONLY. Fictional companies and people.
 *   node ace db:seed --files database/seeders/02_demo_seeder.ts
 * Refuses to run in production. All demo accounts use the password "DemoPass#2026".
 */
const PASSWORD = 'DemoPass#2026'

export default class extends BaseSeeder {
  static environment = ['development']

  async run() {
    if (app.inProduction) throw new Error('Demo seeder must not run in production')
    if (await User.findBy('email', 'owner@pearlbuild.example')) return

    const loc = async (slug: string) => (await Location.findByOrFail('slug', slug)).id
    const ind = async (slug: string) => (await Industry.findByOrFail('slug', slug)).id
    const cat = async (slug: string) => (await JobCategory.findByOrFail('slug', slug)).id
    const skills = async (names: string[]) => Skill.resolveIds(names)

    const companiesSpec = [
      { name: 'Pearl Coast Construction', email: 'owner@pearlbuild.example', owner: 'Hamad Al-Kuwari', industry: 'construction-and-engineering', location: 'lusail', status: 'verified', featured: true, size: '501-1000', cr: '154872', desc: 'Contractor delivering residential towers and infrastructure across Lusail and Al Wakrah since 2004.\n\nAround 900 people in Qatar across engineering, site operations and HSE.' },
      { name: 'Sidra Health Partners', email: 'owner@sidrahealth.example', owner: 'Mariam Haddad', industry: 'healthcare', location: 'al-rayyan', status: 'verified', featured: true, size: '201-500', cr: '98214', desc: 'Network of outpatient clinics and a diagnostics laboratory in Al Rayyan and Doha.' },
      { name: 'Corniche Digital', email: 'owner@cornichedigital.example', owner: 'Omar Siddiqui', industry: 'information-technology', location: 'west-bay', status: 'verified', featured: false, size: '51-200', cr: '201377', desc: 'Product and engineering studio building apps for banks, retailers and government entities.' },
      { name: 'Al Dafna Hospitality Group', email: 'owner@dafnahotels.example', owner: 'Ana Ribeiro', industry: 'hospitality-and-tourism', location: 'al-dafna', status: 'verified', featured: false, size: '1000+', cr: '77310', desc: 'Operator of four hotels and twelve restaurants in Doha.' },
      { name: 'Gulf Freight Lines', email: 'owner@gulffreight.example', owner: 'Rajesh Menon', industry: 'logistics-and-transportation', location: 'mesaieed', status: 'pending', featured: false, size: '51-200', cr: null, desc: 'Freight forwarding and warehousing out of Mesaieed and Hamad Port.' },
    ] as const

    const companies: Company[] = []
    for (const c of companiesSpec) {
      const owner = await User.create({ fullName: c.owner, email: c.email, password: PASSWORD, role: 'employer', status: 'active', emailVerifiedAt: DateTime.now() })
      const company = await Company.create({
        name: c.name, slug: string.slug(c.name, { lower: true, strict: true }), website: `https://www.${c.email.split('@')[1]}`,
        industryId: await ind(c.industry), locationId: await loc(c.location), description: c.desc, contactName: c.owner, contactEmail: c.email,
        size: c.size, crNumber: c.cr, verificationStatus: c.status, verifiedAt: c.status === 'verified' ? DateTime.now().minus({ days: 20 }) : null, isFeatured: c.featured,
      })
      await CompanyUser.create({ companyId: company.id, userId: owner.id, role: 'owner' })
      await CompanyVerification.create({ companyId: company.id, fromStatus: null, toStatus: 'pending', note: 'Company registered' })
      if (c.status === 'verified') await CompanyVerification.create({ companyId: company.id, fromStatus: 'pending', toStatus: 'verified', note: 'CR checked' })
      companies.push(company)
    }
    const recruiter = await User.create({ fullName: 'Fatima Noor', email: 'recruiter@pearlbuild.example', password: PASSWORD, role: 'employer', status: 'active', emailVerifiedAt: DateTime.now() })
    await CompanyUser.create({ companyId: companies[0].id, userId: recruiter.id, role: 'recruiter' })

    type JobSpec = { c: number; title: string; cat: string; loc: string; type?: string; arr?: string; min?: number; max?: number; exp: number; skills: string[]; days: number; deadline?: number; status?: string; visible?: boolean }
    const jobs: JobSpec[] = [
      { c: 0, title: 'Senior Quantity Surveyor', cat: 'engineering', loc: 'lusail', min: 14000, max: 18000, exp: 8, skills: ['Quantity Surveying', 'Contract Management', 'Primavera P6'], days: 1 },
      { c: 0, title: 'MEP Site Engineer', cat: 'engineering', loc: 'lusail', min: 9000, max: 12000, exp: 4, skills: ['MEP', 'HVAC', 'Site Supervision', 'AutoCAD'], days: 3 },
      { c: 0, title: 'HSE Officer', cat: 'health-safety-and-environment', loc: 'al-wakrah-city', min: 7000, max: 9000, exp: 3, skills: ['NEBOSH', 'Risk Assessment', 'Permit to Work'], days: 5, deadline: 4 },
      { c: 0, title: 'Document Controller', cat: 'administration-and-office', loc: 'lusail', min: 5000, max: 6500, exp: 2, skills: ['Document Control', 'Microsoft Excel'], days: 9 },
      { c: 0, title: 'Planning Engineer', cat: 'project-management', loc: 'lusail', exp: 6, skills: ['Primavera P6', 'Project Management'], days: 12, visible: false, min: 13000, max: 16000 },
      { c: 1, title: 'Registered Nurse — Outpatient Clinic', cat: 'healthcare-and-medical', loc: 'al-gharrafa', min: 8000, max: 11000, exp: 2, skills: ['Nursing', 'BLS', 'Patient Care'], days: 2 },
      { c: 1, title: 'Medical Laboratory Technologist', cat: 'healthcare-and-medical', loc: 'education-city', min: 9000, max: 12500, exp: 3, skills: ['Laboratory'], days: 6 },
      { c: 1, title: 'Patient Relations Coordinator (Arabic speaker)', cat: 'customer-service', loc: 'al-sadd', min: 6000, max: 7500, exp: 1, skills: ['Customer Service', 'Arabic Translation'], days: 8 },
      { c: 1, title: 'Medical Coder', cat: 'healthcare-and-medical', loc: 'al-sadd', exp: 2, skills: ['Medical Coding'], days: 15, arr: 'hybrid' },
      { c: 2, title: 'Senior React Developer', cat: 'it-and-software', loc: 'west-bay', arr: 'hybrid', min: 18000, max: 25000, exp: 5, skills: ['React', 'TypeScript', 'Node.js'], days: 1 },
      { c: 2, title: 'Backend Engineer (Node.js)', cat: 'it-and-software', loc: 'west-bay', arr: 'hybrid', min: 16000, max: 22000, exp: 4, skills: ['Node.js', 'PostgreSQL', 'AWS', 'Docker'], days: 4 },
      { c: 2, title: 'UI/UX Designer', cat: 'design-and-creative', loc: 'west-bay', min: 12000, max: 16000, exp: 3, skills: ['Figma', 'UI/UX Design'], days: 7 },
      { c: 2, title: 'IT Support Engineer', cat: 'it-and-software', loc: 'msheireb', min: 7000, max: 9000, exp: 2, skills: ['IT Support', 'Network Administration', 'Microsoft Azure'], days: 10 },
      { c: 2, title: 'Data Analyst', cat: 'it-and-software', loc: 'west-bay', arr: 'remote', min: 13000, max: 17000, exp: 3, skills: ['SQL', 'Power BI', 'Python', 'Data Analysis'], days: 14 },
      { c: 2, title: 'Software Engineering Intern', cat: 'it-and-software', loc: 'west-bay', type: 'internship', min: 3000, max: 3000, exp: 0, skills: ['JavaScript'], days: 3 },
      { c: 3, title: 'Front Office Supervisor', cat: 'hospitality-and-food-service', loc: 'al-dafna', min: 6500, max: 8000, exp: 3, skills: ['Front Office', 'Customer Service'], days: 2 },
      { c: 3, title: 'Chef de Partie', cat: 'hospitality-and-food-service', loc: 'the-pearl-qatar', min: 5500, max: 7000, exp: 4, skills: ['Culinary Arts', 'HACCP', 'Food Safety'], days: 5 },
      { c: 3, title: 'Barista', cat: 'hospitality-and-food-service', loc: 'the-pearl-qatar', type: 'part_time', min: 2800, max: 3500, exp: 1, skills: ['Barista', 'Customer Service'], days: 6 },
      { c: 3, title: 'Events Sales Manager', cat: 'sales-and-business-development', loc: 'al-dafna', min: 15000, max: 20000, exp: 6, skills: ['Sales', 'Event Management', 'Negotiation'], days: 11 },
      { c: 3, title: 'Payroll Accountant', cat: 'accounting-and-finance', loc: 'al-dafna', min: 9000, max: 11000, exp: 4, skills: ['Payroll', 'Accounting', 'SAP'], days: 20 },
      { c: 3, title: 'Housekeeping Attendant', cat: 'hospitality-and-food-service', loc: 'al-dafna', type: 'contract', exp: 0, skills: ['Housekeeping'], days: 40, deadline: -2 },
      { c: 4, title: 'Heavy Vehicle Driver', cat: 'driving-and-transport', loc: 'mesaieed', min: 3500, max: 4500, exp: 3, skills: ['Heavy Vehicle Driving'], days: 1, status: 'pending_review' },
      { c: 4, title: 'Warehouse Supervisor', cat: 'logistics-and-supply-chain', loc: 'mesaieed', min: 6000, max: 8000, exp: 4, skills: ['Warehouse Management', 'Forklift Operation'], days: 2, status: 'pending_review' },
    ]

    const createdJobs: Job[] = []
    for (const [i, j] of jobs.entries()) {
      const company = companies[j.c]
      const job = await Job.create({
        companyId: company.id,
        title: j.title,
        slug: `${string.slug(`${j.title} ${company.name}`, { lower: true, strict: true })}`.slice(0, 200),
        categoryId: await cat(j.cat),
        industryId: company.industryId,
        locationId: await loc(j.loc),
        description: `${company.name} is hiring a ${j.title} to join our team in Qatar.\n\nYou'll work with a supportive team on projects that matter, with clear expectations and room to grow.`,
        responsibilities: '- Deliver your core responsibilities to a high standard\n- Coordinate with colleagues across departments\n- Keep accurate records and report progress weekly',
        requirements: `- ${j.exp > 0 ? `${j.exp}+ years of relevant experience` : 'No previous experience required; training provided'}\n- Good written and spoken English; Arabic is an advantage\n- Valid Qatar ID or ability to transfer sponsorship`,
        minExperience: j.exp,
        employmentType: (j.type ?? 'full_time') as Job['employmentType'],
        workArrangement: (j.arr ?? 'on_site') as Job['workArrangement'],
        salaryMin: j.min ?? null,
        salaryMax: j.max ?? null,
        salaryVisible: j.visible ?? true,
        vacancies: i % 4 === 0 ? 2 : 1,
        deadline: DateTime.now().plus({ days: j.deadline ?? 30 - (j.days % 10) }),
        applicationMethod: 'platform',
        status: (j.status ?? 'published') as Job['status'],
        publishedAt: j.status ? null : DateTime.now().minus({ days: j.days, hours: i }),
        isFeatured: i === 0 || i === 9,
        viewsCount: 40 + ((i * 37) % 300),
      })
      await job.related('skills').sync(await skills(j.skills))
      createdJobs.push(job)
    }

    const en = await Language.findByOrFail('code', 'en')
    const ar = await Language.findByOrFail('code', 'ar')
    const ml = await Language.findByOrFail('code', 'ml')
    const tl = await Language.findByOrFail('code', 'tl')

    type Cand = { name: string; email: string; headline: string; title: string; ind: string; years: number; edu: string; loc: string | null; locText?: string; pref: string; salary: number | null; avail: string; notice: number; skills: string[]; langs: [Language, string][]; vis?: 'private' | 'discoverable'; share?: boolean; cv?: boolean; auth?: string }
    const cands: Cand[] = [
      { name: 'Aisha Rahman', email: 'aisha@candidate.example', headline: 'Full-stack developer focused on React and Node.js', title: 'Software Engineer', ind: 'information-technology', years: 6, edu: 'bachelor', loc: 'al-sadd', pref: 'doha', salary: 20000, avail: 'within_1_month', notice: 30, skills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'AWS'], langs: [[en, 'native'], [ar, 'conversational']], vis: 'discoverable', share: true, cv: true, auth: 'qatar_resident_transferable' },
      { name: 'Joseph Mathew', email: 'joseph@candidate.example', headline: 'MEP site engineer, 7 years on high-rise projects', title: 'MEP Engineer', ind: 'construction-and-engineering', years: 7, edu: 'bachelor', loc: 'lusail', pref: 'al-daayen', salary: 11000, avail: 'immediately', notice: 0, skills: ['MEP', 'HVAC', 'AutoCAD', 'Site Supervision'], langs: [[en, 'professional'], [ml, 'native']], vis: 'discoverable', share: false, cv: true, auth: 'qatar_resident_transferable' },
      { name: 'Maria Santos', email: 'maria@candidate.example', headline: 'Registered nurse with outpatient and ER experience', title: 'Staff Nurse', ind: 'healthcare', years: 5, edu: 'bachelor', loc: 'al-gharrafa', pref: 'al-rayyan', salary: 9500, avail: 'within_1_month', notice: 30, skills: ['Nursing', 'BLS', 'ACLS', 'Patient Care'], langs: [[en, 'professional'], [tl, 'native']], vis: 'discoverable', share: true, cv: true, auth: 'qatar_resident_transferable' },
      { name: 'Khalid Al-Mansouri', email: 'khalid@candidate.example', headline: 'HSE officer, NEBOSH IGC certified', title: 'HSE Officer', ind: 'oil-gas-and-energy', years: 4, edu: 'diploma', loc: 'mesaieed', pref: 'al-wakrah', salary: 8500, avail: 'within_3_months', notice: 60, skills: ['NEBOSH', 'Risk Assessment', 'Permit to Work', 'ISO 45001'], langs: [[ar, 'native'], [en, 'professional']], vis: 'discoverable', share: false, cv: false, auth: 'qatari_national' },
      { name: 'Priya Nair', email: 'priya@candidate.example', headline: 'Data analyst turning messy data into decisions', title: 'Data Analyst', ind: 'banking-and-financial-services', years: 3, edu: 'master', loc: null, locText: 'Bengaluru, India', pref: 'doha', salary: 15000, avail: 'within_3_months', notice: 90, skills: ['SQL', 'Power BI', 'Python', 'Data Analysis', 'Microsoft Excel'], langs: [[en, 'native']], vis: 'discoverable', share: false, cv: true, auth: 'requires_sponsorship' },
      { name: 'Ahmed Fathy', email: 'ahmed@candidate.example', headline: 'Chef de partie — Mediterranean and Levantine cuisine', title: 'Chef de Partie', ind: 'food-and-beverage', years: 6, edu: 'diploma', loc: 'the-pearl-qatar', pref: 'doha', salary: 7000, avail: 'immediately', notice: 0, skills: ['Culinary Arts', 'HACCP', 'Food Safety'], langs: [[ar, 'native'], [en, 'conversational']], vis: 'discoverable', share: true, cv: false },
      { name: 'Grace Okafor', email: 'grace@candidate.example', headline: 'Payroll and accounts professional (SAP, IFRS)', title: 'Senior Accountant', ind: 'hospitality-and-tourism', years: 8, edu: 'bachelor', loc: 'al-sadd', pref: 'doha', salary: 12000, avail: 'within_1_month', notice: 30, skills: ['Accounting', 'Payroll', 'SAP', 'IFRS'], langs: [[en, 'native']], vis: 'private', cv: true },
      { name: 'Daniel Kim', email: 'daniel@candidate.example', headline: 'Product designer for fintech and e-commerce', title: 'UI/UX Designer', ind: 'information-technology', years: 4, edu: 'bachelor', loc: 'msheireb', pref: 'doha', salary: 14000, avail: 'within_1_month', notice: 30, skills: ['Figma', 'UI/UX Design', 'Adobe Photoshop'], langs: [[en, 'professional']], vis: 'discoverable', share: false, cv: true },
    ]

    const profiles: CandidateProfile[] = []
    for (const [i, c] of cands.entries()) {
      const user = await User.create({ fullName: c.name, email: c.email, password: PASSWORD, role: 'candidate', status: 'active', emailVerifiedAt: DateTime.now() })
      const profile = await CandidateProfile.create({
        userId: user.id, headline: c.headline, currentJobTitle: c.title, summary: `${c.headline}. I have ${c.years} years of experience and I'm looking for my next role in Qatar where I can take on more responsibility and keep learning.`,
        phone: `+974 55${String(100000 + i * 7311).slice(0, 6)}`, contactEmail: c.email, industryId: await ind(c.ind), yearsExperience: c.years,
        educationLevel: c.edu as CandidateProfile['educationLevel'], currentLocationId: c.loc ? await loc(c.loc) : null, currentLocationText: c.locText ?? null,
        preferredLocationId: await loc(c.pref), expectedSalary: c.salary, availability: c.avail as CandidateProfile['availability'], noticePeriodDays: c.notice,
        workAuthorization: (c.auth ?? null) as CandidateProfile['workAuthorization'], visibility: c.vis ?? 'private', contactSharing: c.share ? 'verified_employers' : 'on_application', cvSearchable: Boolean(c.cv),
        profileUpdatedAt: DateTime.now().minus({ days: i * 4 }),
      })
      await CandidateExperience.create({ candidateProfileId: profile.id, jobTitle: c.title, companyName: 'Previous Employer W.L.L.', location: 'Doha', startDate: DateTime.now().minus({ years: Math.min(c.years, 3) }), isCurrent: true, description: '- Led day-to-day delivery\n- Trained two junior colleagues' })
      if (c.years > 3) await CandidateExperience.create({ candidateProfileId: profile.id, jobTitle: `Junior ${c.title}`, companyName: 'Earlier Company LLC', startDate: DateTime.now().minus({ years: c.years }), endDate: DateTime.now().minus({ years: 3 }), isCurrent: false })
      await CandidateEducation.create({ candidateProfileId: profile.id, institution: 'University of Calicut', qualification: c.edu === 'master' ? 'MSc' : c.edu === 'diploma' ? 'Diploma' : 'BSc', fieldOfStudy: c.title.includes('Nurse') ? 'Nursing' : 'Engineering', endYear: 2026 - c.years - 1 })
      await profile.related('skills').sync(await skills(c.skills))
      const langMap: Record<number, { proficiency: string }> = {}
      for (const [l, p] of c.langs) langMap[l.id] = { proficiency: p }
      await profile.related('languages').sync(langMap)
      await refreshCompleteness(profile)
      profiles.push(profile)
    }

    // A few applications at different pipeline stages (without CV files).
    const apps: Array<[number, number, string[]]> = [
      [0, 9, ['submitted', 'under_review', 'shortlisted', 'interview']],
      [0, 10, ['submitted']],
      [1, 1, ['submitted', 'under_review', 'shortlisted']],
      [2, 5, ['submitted', 'under_review']],
      [5, 16, ['submitted']],
      [6, 19, ['submitted', 'under_review', 'rejected']],
      [7, 11, ['submitted']],
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
