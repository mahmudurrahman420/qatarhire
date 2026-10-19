import type { Taxonomy } from '~/lib/types'
import type { Option } from '~/components/ui/form'

type Locs = Taxonomy['locations']

/** <optgroup>s of slug values for search filters: whole country, cities, districts. */
export function LocationSlugOptions({ locations, anyLabel = 'All of the Gulf' }: { locations: Locs; anyLabel?: string }) {
  return (
    <>
      <option value="">{anyLabel}</option>
      {locations.map((c) => (
        <optgroup key={c.slug} label={c.name}>
          <option value={c.slug}>All of {c.name}</option>
          {c.cities.flatMap((city) => [
            <option key={city.slug} value={city.slug}>{city.name}</option>,
            ...city.areas.map((a) => (
              <option key={a.slug} value={a.slug}>{`  ${a.name}, ${city.name}`}</option>
            )),
          ])}
        </optgroup>
      ))}
    </>
  )
}

/** Id options for forms (a job, profile or company location), grouped by country. */
export function locationIdOptions(locations: Locs, opts: { includeCountry?: boolean } = {}): Option[] {
  return locations.flatMap((c) => [
    ...(opts.includeCountry ? [{ value: c.id, label: `Anywhere in ${c.name}`, group: c.name }] : []),
    ...c.cities.flatMap((city) => [
      { value: city.id, label: city.name, group: c.name },
      ...city.areas.map((a) => ({ value: a.id, label: `${a.name}, ${city.name}`, group: c.name })),
    ]),
  ])
}

/** Countries only (e.g. preferred work country). */
export function countryIdOptions(locations: Locs): Option[] {
  return locations.map((c) => ({ value: c.id, label: c.name }))
}
