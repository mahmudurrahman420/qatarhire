/**
 * The six GCC markets the platform serves. Shared by server and client.
 * `slug` matches the country row in the `locations` table.
 */
export const GulfCountries = [
  { code: 'ae', slug: 'uae', name: 'UAE', fullName: 'United Arab Emirates', currency: 'AED', tz: 'Asia/Dubai', offset: '+04:00', dial: '+971' },
  { code: 'sa', slug: 'saudi-arabia', name: 'Saudi Arabia', fullName: 'Saudi Arabia', currency: 'SAR', tz: 'Asia/Riyadh', offset: '+03:00', dial: '+966' },
  { code: 'qa', slug: 'qatar', name: 'Qatar', fullName: 'Qatar', currency: 'QAR', tz: 'Asia/Qatar', offset: '+03:00', dial: '+974' },
  { code: 'kw', slug: 'kuwait', name: 'Kuwait', fullName: 'Kuwait', currency: 'KWD', tz: 'Asia/Kuwait', offset: '+03:00', dial: '+965' },
  { code: 'om', slug: 'oman', name: 'Oman', fullName: 'Oman', currency: 'OMR', tz: 'Asia/Muscat', offset: '+04:00', dial: '+968' },
  { code: 'bh', slug: 'bahrain', name: 'Bahrain', fullName: 'Bahrain', currency: 'BHD', tz: 'Asia/Bahrain', offset: '+03:00', dial: '+973' },
] as const

export type GulfCountry = (typeof GulfCountries)[number]
export type CountryCode = GulfCountry['code']
export const Currencies = GulfCountries.map((c) => c.currency)
export type Currency = (typeof Currencies)[number]

export function countryByCode(code: string | null | undefined) {
  return GulfCountries.find((c) => c.code === code) ?? null
}
export function countryBySlug(slug: string | null | undefined) {
  return GulfCountries.find((c) => c.slug === slug) ?? null
}
export function currencyFor(code: string | null | undefined): Currency {
  return countryByCode(code)?.currency ?? 'AED'
}

/**
 * Deadlines are compared against "today" in the latest Gulf time zone (UTC+3),
 * so a job stays open until midnight everywhere in the region.
 */
export const PLATFORM_TZ = 'Asia/Riyadh'
