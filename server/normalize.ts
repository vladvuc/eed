import type { EurostatUnit, JsonStatDataset, JsonStatDimension, Series, StatDataset } from './types.ts'
import { EUROSTAT_UNITS } from './types.ts'

/**
 * Return category codes of a dimension in positional order.
 * JSON-stat allows `index` to be either an array or a { code: position } map,
 * and the map is not guaranteed to be in positional order, so we sort by value.
 */
function orderedCodes(dim: JsonStatDimension): string[] {
  const idx = dim.category.index
  if (Array.isArray(idx)) return idx
  return Object.entries(idx)
    .sort((a, b) => a[1] - b[1])
    .map(([code]) => code)
}

/** Row-major strides: stride[i] = product of sizes after i. */
function strides(size: number[]): number[] {
  const out = new Array<number>(size.length)
  let acc = 1
  for (let i = size.length - 1; i >= 0; i--) {
    out[i] = acc
    acc *= size[i]
  }
  return out
}

function readValue(value: JsonStatDataset['value'], linear: number): number | null {
  const v = Array.isArray(value) ? value[linear] : value[String(linear)]
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

/**
 * Convert an Eurostat JSON-stat 2.0 response for nama_10_gdp (na_item=B1GQ)
 * into the compact { years, countries, measures } shape served to the client.
 *
 * Handles any dimension order by reading `id`, missing cells (sparse `value`),
 * and units that are absent from the response (they come back as empty maps).
 */
export function normalize(ds: JsonStatDataset): StatDataset {
  const pos = (name: string) => {
    const i = ds.id.indexOf(name)
    if (i < 0) throw new Error(`JSON-stat response is missing dimension "${name}"`)
    return i
  }
  const iUnit = pos('unit')
  const iGeo = pos('geo')
  const iTime = pos('time')

  const st = strides(ds.size)
  const unitCodes = orderedCodes(ds.dimension.unit)
  const geoCodes = orderedCodes(ds.dimension.geo)
  const timeCodes = orderedCodes(ds.dimension.time)
  const geoLabels = ds.dimension.geo.category.label ?? {}

  // Other dimensions (freq, na_item) have size 1, so their contribution to the
  // linear index is always position 0 → offset 0.
  const countries = geoCodes.map((code) => ({ code, name: geoLabels[code] ?? code }))

  const measures = Object.fromEntries(EUROSTAT_UNITS.map((u) => [u, {}])) as Record<
    EurostatUnit,
    Record<string, Series>
  >

  unitCodes.forEach((unit, ui) => {
    if (!(EUROSTAT_UNITS as readonly string[]).includes(unit)) return
    const target = measures[unit as EurostatUnit]
    geoCodes.forEach((geo, gi) => {
      const series: Series = new Array(timeCodes.length)
      for (let ti = 0; ti < timeCodes.length; ti++) {
        const linear = ui * st[iUnit] + gi * st[iGeo] + ti * st[iTime]
        series[ti] = readValue(ds.value, linear)
      }
      target[geo] = series
    })
  })

  return {
    source: 'eurostat',
    updated: ds.updated ?? new Date().toISOString(),
    frequency: 'A',
    periods: timeCodes,
    countries,
    measures,
  }
}
