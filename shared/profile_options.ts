/**
 * Option lists for the full jobseeker profile. Pure TypeScript (no imports), shared by
 * server validators and the React form. Industries, functions (job categories), skills,
 * languages and locations come from reference tables instead.
 */

function labels<const T extends readonly string[]>(values: T, map: Record<T[number], string>) {
  return { values, label: (v: T[number] | string | null | undefined) => (v ? ((map as Record<string, string>)[v] ?? v) : ''), map }
}

export const EmploymentStatus = labels(['employed', 'unemployed'] as const, {
  employed: "I'm currently employed",
  unemployed: "I'm currently unemployed",
})

export const CareerLevel = labels(['entry', 'junior', 'mid', 'senior', 'manager', 'senior_manager', 'director', 'executive'] as const, {
  entry: 'Entry Level',
  junior: 'Junior Level',
  mid: 'Mid Level',
  senior: 'Senior Level',
  manager: 'Manager',
  senior_manager: 'Senior Manager',
  director: 'Director / Head',
  executive: 'Executive / C-Level',
})

/** Notice period, mapped onto the older availability + notice_period_days fields used by search. */
export const NoticePeriod = labels(['immediate', '1_week', '2_weeks', '1_month', '2_months', '3_months_plus'] as const, {
  immediate: 'Immediate',
  '1_week': '1 Week',
  '2_weeks': '2 Weeks',
  '1_month': '1 Month',
  '2_months': '2 Months',
  '3_months_plus': '3+ Months',
})
export const NoticePeriodDays: Record<(typeof NoticePeriod.values)[number], number> = {
  immediate: 0, '1_week': 7, '2_weeks': 14, '1_month': 30, '2_months': 60, '3_months_plus': 90,
}
export function availabilityForNotice(n: string): 'immediately' | 'within_1_month' | 'within_3_months' {
  if (n === 'immediate') return 'immediately'
  if (n === '1_week' || n === '2_weeks' || n === '1_month') return 'within_1_month'
  return 'within_3_months'
}
export function noticeFromDays(days: number | null | undefined): string {
  if (days === null || days === undefined) return ''
  if (days <= 0) return 'immediate'
  if (days <= 7) return '1_week'
  if (days <= 14) return '2_weeks'
  if (days <= 30) return '1_month'
  if (days <= 60) return '2_months'
  return '3_months_plus'
}

export const DesiredEmploymentType = labels(['full_time', 'part_time', 'contract', 'temporary', 'internship', 'freelance'] as const, {
  full_time: 'Full-Time',
  part_time: 'Part-Time',
  contract: 'Contract',
  temporary: 'Temporary',
  internship: 'Internship',
  freelance: 'Freelance',
})

export const Benefit = labels(
  ['housing', 'transportation', 'end_of_service', 'bonus', 'medical', 'air_ticket', 'food', 'family_visa', 'annual_leave', 'phone', 'education', 'overtime'] as const,
  {
    housing: 'Housing Allowance',
    transportation: 'Transportation Allowance',
    end_of_service: 'End of Service Benefits',
    bonus: 'Bonus / Commission',
    medical: 'Medical Insurance',
    air_ticket: 'Annual Air Ticket',
    food: 'Food Allowance',
    family_visa: 'Family Visa / Sponsorship',
    annual_leave: 'Paid Annual Leave (30 days)',
    phone: 'Mobile / Phone Allowance',
    education: 'Children’s Education Allowance',
    overtime: 'Overtime Pay',
  }
)

/** Qualification → the coarse education level the search filters use. */
export const Qualifications = [
  { value: 'High School / Secondary School', level: 'secondary' },
  { value: 'Vocational / Technical Certificate', level: 'diploma' },
  { value: 'Diploma', level: 'diploma' },
  { value: 'Associate Degree', level: 'diploma' },
  { value: "Bachelor's Degree", level: 'bachelor' },
  { value: 'Postgraduate Diploma', level: 'bachelor' },
  { value: "Master's Degree", level: 'master' },
  { value: 'MBA', level: 'master' },
  { value: 'PhD / Doctorate', level: 'doctorate' },
] as const
export const QualificationValues = Qualifications.map((q) => q.value) as string[]
const LevelRank: Record<string, number> = { none: 0, secondary: 1, diploma: 2, bachelor: 3, master: 4, doctorate: 5 }
export function highestLevel(quals: string[]): string | null {
  let best: string | null = null
  for (const q of quals) {
    const lvl = Qualifications.find((x) => x.value === q)?.level
    if (lvl && (!best || LevelRank[lvl] > LevelRank[best])) best = lvl
  }
  return best
}

export const Majors = [
  'Accounting', 'Agriculture', 'Arabic Language and Literature', 'Architecture', 'Arts & Humanities', 'Aviation', 'Banking & Finance',
  'Biology', 'Biomedical Engineering', 'Business Administration', 'Chemical Engineering', 'Chemistry', 'Civil Engineering',
  'Commerce', 'Communications & Media', 'Computer Engineering', 'Computer Science', 'Culinary Arts', 'Cybersecurity', 'Data Science',
  'Dentistry', 'Economics', 'Education', 'Electrical Engineering', 'Electronics & Telecommunication', 'English Language and Literature',
  'Environmental Science', 'Fashion & Textile Design', 'Fine Arts', 'Food & Beverage Management', 'General Studies (Science)',
  'General Studies (Commerce)', 'General Studies (Arts)', 'Geology', 'Graphic Design', 'Healthcare Management', 'History',
  'Hospitality & Hotel Management', 'Human Resources', 'Industrial Engineering', 'Information Technology', 'Interior Design',
  'International Relations', 'Islamic Studies', 'Journalism', 'Law', 'Logistics & Supply Chain', 'Marine Engineering', 'Marketing',
  'Mathematics', 'Mechanical Engineering', 'Mechatronics', 'Medical Laboratory Science', 'Medicine', 'Nursing', 'Nutrition & Dietetics',
  'Petroleum Engineering', 'Pharmacy', 'Physics', 'Physiotherapy', 'Political Science', 'Project Management', 'Psychology',
  'Public Administration', 'Quantity Surveying', 'Radiology', 'Sales', 'Social Work', 'Sociology', 'Software Engineering',
  'Statistics', 'Tourism', 'Other',
]

export const Institutes = [
  'Qatar University', 'Hamad Bin Khalifa University', 'Carnegie Mellon University in Qatar', 'Georgetown University in Qatar',
  'Texas A&M University at Qatar', 'Weill Cornell Medicine-Qatar', 'University of Doha for Science and Technology', 'Community College of Qatar',
  'United Arab Emirates University', 'Khalifa University', 'American University of Sharjah', 'University of Sharjah', 'Zayed University',
  'American University in Dubai', 'University of Dubai', 'Higher Colleges of Technology', 'Heriot-Watt University Dubai', 'University of Wollongong in Dubai',
  'King Saud University', 'King Abdulaziz University', 'King Fahd University of Petroleum and Minerals', 'King Abdullah University of Science and Technology',
  'Imam Abdulrahman Bin Faisal University', 'Prince Sultan University', 'Kuwait University', 'American University of Kuwait', 'Gulf University for Science and Technology',
  'Sultan Qaboos University', 'German University of Technology in Oman', 'University of Bahrain', 'Arabian Gulf University', 'Royal University for Women',
  'University of Mumbai', 'University of Delhi', 'University of Kerala', 'Anna University', 'University of Calicut', 'Mahatma Gandhi University',
  'University of the Punjab', 'University of Karachi', 'University of Dhaka', 'University of Chittagong', 'Bangladesh University of Engineering and Technology',
  'Tribhuvan University', 'University of Colombo', 'University of the Philippines', 'University of Santo Tomas', 'Cairo University', 'Ain Shams University',
  'University of Jordan', 'American University of Beirut', 'University of Lagos', 'University of Nairobi',
]

export const LanguageLimit = 5

/** Country dialling codes offered by the phone pickers (GCC first). */
export const DialCodes = [
  { code: '+974', flag: '🇶🇦', name: 'Qatar' },
  { code: '+971', flag: '🇦🇪', name: 'UAE' },
  { code: '+966', flag: '🇸🇦', name: 'Saudi Arabia' },
  { code: '+965', flag: '🇰🇼', name: 'Kuwait' },
  { code: '+968', flag: '🇴🇲', name: 'Oman' },
  { code: '+973', flag: '🇧🇭', name: 'Bahrain' },
  { code: '+91', flag: '🇮🇳', name: 'India' },
  { code: '+92', flag: '🇵🇰', name: 'Pakistan' },
  { code: '+880', flag: '🇧🇩', name: 'Bangladesh' },
  { code: '+63', flag: '🇵🇭', name: 'Philippines' },
  { code: '+977', flag: '🇳🇵', name: 'Nepal' },
  { code: '+94', flag: '🇱🇰', name: 'Sri Lanka' },
  { code: '+20', flag: '🇪🇬', name: 'Egypt' },
  { code: '+962', flag: '🇯🇴', name: 'Jordan' },
  { code: '+961', flag: '🇱🇧', name: 'Lebanon' },
  { code: '+234', flag: '🇳🇬', name: 'Nigeria' },
  { code: '+254', flag: '🇰🇪', name: 'Kenya' },
  { code: '+44', flag: '🇬🇧', name: 'United Kingdom' },
  { code: '+1', flag: '🇺🇸', name: 'USA / Canada' },
] as const

/** Split a stored "+974 6699 4850" into dial code and local number. */
export function splitPhone(v: string | null | undefined, fallback = '+974') {
  const s = (v ?? '').trim()
  if (!s) return { dial: fallback, number: '' }
  const match = [...DialCodes].sort((a, b) => b.code.length - a.code.length).find((d) => s.replace(/\s/g, '').startsWith(d.code))
  if (match) {
    const rest = s.startsWith(match.code) ? s.slice(match.code.length) : s.replace(/\s/g, '').slice(match.code.length)
    return { dial: match.code, number: rest.trim() }
  }
  return { dial: fallback, number: s }
}

/** Salary range buckets (monthly). Lower-value currencies (KWD, OMR, BHD) use a tenth of the scale. */
const BIG = [0, 1000, 2000, 3000, 4000, 5000, 7500, 10000, 15000, 20000, 30000, 50000]
const SMALL = [0, 100, 200, 300, 400, 500, 750, 1000, 1500, 2000, 3000, 5000]
export function salaryRanges(currency: string) {
  const steps = ['KWD', 'OMR', 'BHD'].includes(currency) ? SMALL : BIG
  const fmt = (n: number) => n.toLocaleString('en-US')
  const out: { value: string; label: string }[] = []
  for (let i = 0; i < steps.length - 1; i++) {
    out.push({ value: `${steps[i]}-${steps[i + 1]}`, label: i === 0 ? `Below ${fmt(steps[1])}` : `${fmt(steps[i])} – ${fmt(steps[i + 1])}` })
  }
  const last = steps[steps.length - 1]
  out.push({ value: `${last}+`, label: `${fmt(last)}+` })
  return out
}
export function salaryRangeLabel(value: string | null | undefined, currency: string | null | undefined) {
  if (!value) return null
  const hit = salaryRanges(currency ?? 'QAR').find((r) => r.value === value)
  return `${hit?.label ?? value} ${currency ?? ''}`.trim()
}
export const SalaryRangePattern = /^\d{1,7}(-\d{1,7}|\+)$/

/** Max visible characters for About Me. */
export const AboutMeMax = 2000
export const AboutJobMax = 2000
