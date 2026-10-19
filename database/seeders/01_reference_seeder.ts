import { BaseSeeder } from '@adonisjs/lucid/seeders'
import string from '@adonisjs/core/helpers/string'
import Industry from '#models/industry'
import JobCategory from '#models/job_category'
import Location from '#models/location'
import Skill, { skillSlug } from '#models/skill'
import Language from '#models/language'
import Plan from '#models/plan'
import { GulfCountries } from '#shared/gulf'

/** City names can repeat across countries; keep slugs unique by suffixing the country. */
async function uniqueLocationSlug(base: string, countrySlug: string) {
  const existing = await Location.findBy('slug', base)
  if (!existing) return base
  // re-seeding: same row (same country) keeps its slug
  const country = await Location.findBy('slug', countrySlug)
  if (country && existing.countryCode === country.countryCode) return base
  return `${base}-${countrySlug}`
}

const slug = (s: string) => string.slug(s, { lower: true, strict: true })

/**
 * Reference data required in every environment (idempotent).
 * Run with: node ace db:seed --files database/seeders/01_reference_seeder.ts
 */
export default class extends BaseSeeder {
  async run() {
    const industries = [
      'Oil, Gas & Energy', 'Construction & Engineering', 'Banking & Financial Services', 'Hospitality & Tourism',
      'Healthcare', 'Education', 'Information Technology', 'Telecommunications', 'Retail & Consumer Goods',
      'Logistics & Transportation', 'Aviation', 'Real Estate', 'Government & Public Sector', 'Media & Marketing',
      'Manufacturing', 'Legal Services', 'Consulting & Professional Services', 'Facilities Management',
      'Security Services', 'Sports & Events', 'Food & Beverage', 'Non-profit & NGOs',
    ]
    for (const [i, name] of industries.entries()) {
      await Industry.updateOrCreate({ slug: slug(name) }, { name, slug: slug(name), sortOrder: i, isActive: true })
    }

    const categories: Array<[string, string]> = [
      ['Accounting & Finance', 'calculator'], ['Administration & Office', 'clipboard'], ['Customer Service', 'headset'],
      ['Engineering', 'cog'], ['Healthcare & Medical', 'heart'], ['Hospitality & Food Service', 'coffee'],
      ['Human Resources', 'users'], ['IT & Software', 'code'], ['Legal', 'scale'], ['Logistics & Supply Chain', 'truck'],
      ['Marketing & Communications', 'megaphone'], ['Operations', 'layers'], ['Sales & Business Development', 'trending'],
      ['Skilled Trades & Technicians', 'wrench'], ['Teaching & Training', 'book'], ['Design & Creative', 'pen'],
      ['Project Management', 'kanban'], ['Health, Safety & Environment', 'shield'], ['Driving & Transport', 'car'],
      ['Security', 'lock'],
    ]
    for (const [i, [name, icon]] of categories.entries()) {
      await JobCategory.updateOrCreate({ slug: slug(name) }, { name, slug: slug(name), icon, sortOrder: i, isActive: true })
    }

    // Six GCC countries → main cities → notable districts / employment hubs.
    const gulf: Record<string, Record<string, string[]>> = {
      uae: {
        'Dubai': ['Business Bay', 'Dubai Marina', 'Downtown Dubai', 'Jebel Ali', 'Deira', 'Al Quoz', 'Dubai Silicon Oasis'],
        'Abu Dhabi': ['Al Reem Island', 'Mussafah', 'Khalifa City'],
        'Sharjah': [], 'Ajman': [], 'Ras Al Khaimah': [], 'Fujairah': [], 'Al Ain': [], 'Umm Al Quwain': [],
      },
      'saudi-arabia': {
        'Riyadh': ['King Abdullah Financial District', 'Olaya'],
        'Jeddah': [], 'Dammam': [], 'Al Khobar': [], 'Dhahran': [], 'Jubail': [], 'Makkah': [], 'Madinah': [], 'Tabuk': [], 'Yanbu': [],
      },
      qatar: {
        'Doha': ['West Bay', 'Msheireb', 'Al Sadd', 'Al Dafna', 'The Pearl-Qatar', 'Old Airport', 'Bin Mahmoud', 'Hamad International Airport'],
        'Al Rayyan': ['Education City', 'Industrial Area', 'Al Gharrafa', 'Aspire Zone'],
        'Lusail': [], 'Al Wakrah': [], 'Mesaieed': [], 'Al Khor': [], 'Ras Laffan': [], 'Dukhan': [], 'Umm Salal': [],
      },
      kuwait: { 'Kuwait City': ['Sharq', 'Salmiya'], 'Hawalli': [], 'Farwaniya': [], 'Ahmadi': [], 'Jahra': [], 'Mubarak Al-Kabeer': [] },
      oman: { 'Muscat': ['Ruwi', 'Al Khuwair', 'Seeb'], 'Sohar': [], 'Salalah': [], 'Nizwa': [], 'Sur': [], 'Duqm': [] },
      bahrain: { 'Manama': ['Seef', 'Bahrain Bay'], 'Muharraq': [], 'Riffa': [], 'Isa Town': [], 'Sitra': [], 'Hamad Town': [] },
    }
    let order = 0
    for (const country of GulfCountries) {
      const c = await Location.updateOrCreate(
        { slug: country.slug },
        { name: country.name, slug: country.slug, kind: 'country', parentId: null, countryCode: country.code, displayName: country.name, sortOrder: order++, isActive: true }
      )
      for (const [i, [city, areas]] of Object.entries(gulf[country.slug]).entries()) {
        const citySlug = await uniqueLocationSlug(slug(city), country.slug)
        const cityRow = await Location.updateOrCreate(
          { slug: citySlug },
          { name: city, slug: citySlug, kind: 'city', parentId: c.id, countryCode: country.code, displayName: `${city}, ${country.name}`, sortOrder: i, isActive: true }
        )
        for (const [j, area] of areas.entries()) {
          const areaSlug = await uniqueLocationSlug(slug(area), country.slug)
          await Location.updateOrCreate(
            { slug: areaSlug },
            { name: area, slug: areaSlug, kind: 'area', parentId: cityRow.id, countryCode: country.code, displayName: `${area}, ${city}, ${country.name}`, sortOrder: j, isActive: true }
          )
        }
      }
    }

    const skills = [
      'Accounting', 'IFRS', 'Financial Analysis', 'Auditing', 'Payroll', 'SAP', 'Oracle ERP', 'Excel', 'Power BI', 'Budgeting',
      'Customer Service', 'Arabic Translation', 'Data Entry', 'Office Administration', 'Document Control', 'Procurement', 'Contract Management',
      'Supply Chain Management', 'Warehouse Management', 'Logistics Coordination', 'Fleet Management',
      'Civil Engineering', 'Mechanical Engineering', 'Electrical Engineering', 'Structural Design', 'AutoCAD', 'Revit', 'Primavera P6',
      'MEP', 'HVAC', 'Quantity Surveying', 'Site Supervision', 'Process Engineering', 'Instrumentation', 'Piping Design',
      'NEBOSH', 'IOSH', 'Risk Assessment', 'Permit to Work', 'ISO 9001', 'ISO 45001',
      'Project Management', 'PMP', 'Agile', 'Scrum', 'Stakeholder Management',
      'JavaScript', 'TypeScript', 'React', 'Node.js', 'PHP', 'Laravel', 'Python', 'Java', 'C#', '.NET', 'SQL', 'MySQL', 'PostgreSQL',
      'AWS', 'Microsoft Azure', 'DevOps', 'Docker', 'Kubernetes', 'Cybersecurity', 'Network Administration', 'Cisco', 'IT Support', 'Data Analysis', 'Machine Learning',
      'Digital Marketing', 'SEO', 'Social Media Marketing', 'Content Writing', 'Public Relations', 'Graphic Design', 'Adobe Photoshop', 'Figma', 'UI/UX Design', 'Video Editing',
      'Sales', 'Business Development', 'Account Management', 'Negotiation', 'CRM', 'Salesforce', 'Retail Sales', 'Merchandising',
      'Recruitment', 'HR Operations', 'Employee Relations', 'Training & Development', 'GCC Labour Law', 'VAT', 'Financial Reporting', 'Clinical Support', 'Maintenance', 'Troubleshooting', 'Inventory', 'Team Leadership', 'Logistics', 'Customer Support', 'English',
      'Nursing', 'BLS', 'ACLS', 'Patient Care', 'Pharmacy', 'Medical Coding', 'Physiotherapy', 'Laboratory',
      'Teaching', 'Curriculum Development', 'IGCSE', 'IB Curriculum', 'Classroom Management',
      'Food Safety', 'HACCP', 'Front Office', 'Housekeeping', 'Barista', 'Culinary Arts', 'Event Management',
      'Heavy Vehicle Driving', 'Light Vehicle Driving', 'Forklift Operation', 'Welding', 'Electrical Maintenance', 'Plumbing', 'Carpentry',
      'Security Operations', 'CCTV Monitoring', 'Legal Drafting', 'Corporate Law', 'Compliance', 'Anti-Money Laundering',
    ]
    for (const name of skills) {
      await Skill.updateOrCreate({ name }, { name, slug: skillSlug(name), isApproved: true })
    }

    const languages: Array<[string, string]> = [
      ['English', 'en'], ['Arabic', 'ar'], ['Hindi', 'hi'], ['Urdu', 'ur'], ['Malayalam', 'ml'], ['Tagalog / Filipino', 'tl'],
      ['Bengali', 'bn'], ['Nepali', 'ne'], ['Tamil', 'ta'], ['Sinhala', 'si'], ['French', 'fr'], ['Spanish', 'es'],
      ['German', 'de'], ['Mandarin Chinese', 'zh'], ['Russian', 'ru'], ['Turkish', 'tr'], ['Persian', 'fa'], ['Swahili', 'sw'],
    ]
    for (const [name, code] of languages) {
      await Language.updateOrCreate({ code }, { name, code })
    }

    // Billing scaffold plans (inactive until billing is enabled and a provider is configured).
    const plans = [
      { code: 'starter', name: 'Starter', priceQar: 0, interval: 'month' as const, entitlements: { job_posting: true, candidate_search: false, featured_jobs: false } },
      { code: 'professional', name: 'Professional', priceQar: 1500, interval: 'month' as const, entitlements: { job_posting: true, candidate_search: true, featured_jobs: true } },
    ]
    for (const p of plans) await Plan.updateOrCreate({ code: p.code }, { ...p, isActive: false })
  }
}
