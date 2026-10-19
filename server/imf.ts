import { createCachedLoader } from './cache.ts'
import { fetchUsdPerEur, type FxRates } from './fx.ts'
import type {
  ImfCountriesPayload,
  ImfIndicator,
  ImfIndicatorsPayload,
  ImfValuesPayload,
  Series,
  StatDataset,
} from './types.ts'
import { IMF_INDICATORS } from './types.ts'

const BASE = 'https://www.imf.org/external/datamapper/api/v1'
const FETCH_TIMEOUT_MS = 30_000

/**
 * European economies in the IMF WEO (ISO3 codes), plus the IMF's own aggregates.
 * Everything else in the DataMapper payload is dropped server-side.
 */
export const IMF_EUROPE: string[] = [
  // EU-27
  'AUT','BEL','BGR','HRV','CYP','CZE','DNK','EST','FIN','FRA','DEU','GRC','HUN','IRL','ITA','LVA','LTU','LUX','MLT','NLD','POL','PRT','ROU','SVK','SVN','ESP','SWE',
  // Western Balkans
  'ALB','BIH','MNE','MKD','SRB','UVK',
  // EFTA & UK
  'ISL','LIE','NOR','CHE','GBR',
  // Eastern Europe
  'UKR','RUS','BLR','MDA',
  // Caucasus & Türkiye
  'GEO','ARM','AZE','TUR',
  // Microstates
  'AND','SMR','MCO',
  // Aggregates
  'EU','EURO','EDE',
]

const NAME_OVERRIDES: Record<string, string> = {
  RUS: 'Russia',
  TUR: 'Türkiye',
  EU: 'European Union',
  EURO: 'Euro area',
  EDE: 'Emerging & developing Europe',
}

export interface ImfRaw {
  values: Partial<Record<ImfIndicator, Record<string, Record<string, number>>>>
  countryLabels: Record<string, string>
  /** e.g. "World Economic Outlook (October 2026)" */
  vintage: string
}

/** "World Economic Outlook (October 2026)" → "2026"; projections start in the vintage year. */
export function projectionsFromVintage(vintage: string): string | undefined {
  const m = /\b((?:19|20)\d{2})\b/.exec(vintage)
  return m ? m[1] : undefined
}

/**
 * The WEO extends five years into the future. We stop at the current year: the axis
 * always ends at "now", and no projection shading is needed.
 */
export function lastYear(now: Date = new Date()): number {
  return now.getFullYear()
}

/** Pure: drops periods after `maxYear` and clears the projection marker. */
export function truncateToYear(ds: StatDataset, maxYear: number): StatDataset {
  const keep = ds.periods.map((p) => Number(p.slice(0, 4)) <= maxYear)
  const n = keep.filter(Boolean).length
  if (n === ds.periods.length) return { ...ds, projectionsFrom: undefined }
  const measures: StatDataset['measures'] = {}
  for (const [m, byGeo] of Object.entries(ds.measures)) {
    measures[m] = Object.fromEntries(Object.entries(byGeo).map(([code, s]) => [code, s.filter((_, i) => keep[i])]))
  }
  return { ...ds, periods: ds.periods.filter((_, i) => keep[i]), measures, projectionsFrom: undefined }
}

/** Pure: trims DataMapper payloads to Europe and aligns every series on a common year axis. */
export function normalizeImf(raw: ImfRaw, keep: string[] = IMF_EUROPE): StatDataset {
  const present = new Set<string>()
  let minYear = Infinity
  let maxYear = -Infinity

  for (const ind of IMF_INDICATORS) {
    const byCountry = raw.values[ind] ?? {}
    for (const code of keep) {
      const ys = byCountry[code]
      if (!ys) continue
      present.add(code)
      for (const y of Object.keys(ys)) {
        const n = Number(y)
        if (!Number.isFinite(n)) continue
        if (n < minYear) minYear = n
        if (n > maxYear) maxYear = n
      }
    }
  }
  if (!Number.isFinite(minYear)) throw new Error('IMF payload contained no European data')

  const periods: string[] = []
  for (let y = minYear; y <= maxYear; y++) periods.push(String(y))

  const countries = keep
    .filter((c) => present.has(c))
    .map((code) => ({
      code,
      name: NAME_OVERRIDES[code] ?? (raw.countryLabels[code] ?? code).trim(),
    }))

  const measures: Record<string, Record<string, Series>> = {}
  for (const ind of IMF_INDICATORS) {
    const byCountry = raw.values[ind] ?? {}
    const out: Record<string, Series> = {}
    for (const { code } of countries) {
      const ys = byCountry[code]
      if (!ys) continue
      out[code] = periods.map((p) => {
        const v = ys[p]
        return typeof v === 'number' && Number.isFinite(v) ? v : null
      })
    }
    measures[ind] = out
  }

  return {
    source: 'imf',
    updated: raw.vintage,
    frequency: 'A',
    periods,
    countries,
    measures,
    projectionsFrom: projectionsFromVintage(raw.vintage),
  }
}

/**
 * Pure: adds gross government debt as a money amount, derived from the WEO's own
 * debt ratio and nominal GDP (billion US$), and converted to euros with the annual
 * average USD/EUR rate. Years beyond the last available rate reuse the last rate.
 */
export function deriveDebtLevels(ds: StatDataset, rates: FxRates | null): StatDataset {
  const ratio = ds.measures.GGXWDG_NGDP ?? {}
  const gdpUsd = ds.measures.NGDPD ?? {}
  const usd: Record<string, Series> = {}
  const eur: Record<string, Series> = {}

  const rateYears = rates ? Object.keys(rates).sort() : []
  const lastRateYear = rateYears.at(-1)
  const rateFor = (year: string): number | null => {
    if (!rates || !lastRateYear) return null
    return rates[year] ?? (year > lastRateYear ? rates[lastRateYear] : null)
  }

  for (const code of Object.keys(ratio)) {
    const g = gdpUsd[code]
    if (!g) continue
    usd[code] = ratio[code].map((r, i) => {
      const gdp = g[i]
      return r === null || gdp === null || gdp === undefined ? null : (r / 100) * gdp
    })
    if (rates) {
      eur[code] = usd[code].map((v, i) => {
        const rate = rateFor(ds.periods[i])
        return v === null || rate === null ? null : v / rate
      })
    }
  }

  const measures = { ...ds.measures, GGXWDG_USD: usd }
  const notes = [...(ds.notes ?? [])]
  const est = projectionsFromVintage(ds.updated)
  if (est) notes.push(`Values for ${est} are IMF estimates from the ${ds.updated}.`)
  notes.push('Debt in US$ = gross debt (% of GDP) × GDP at current prices (US$), both from the WEO.')
  if (rates && lastRateYear) {
    Object.assign(measures, { GGXWDG_EUR: eur })
    notes.push(
      `Debt in € converts the US$ amount at Eurostat's annual average USD/EUR rate (ert_bil_eur_a); years after ${lastRateYear} use the ${lastRateYear} rate.`,
    )
  } else {
    notes.push('Debt in € is unavailable because the Eurostat exchange-rate series could not be loaded.')
  }
  return { ...ds, measures, notes }
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
  if (!res.ok) throw new Error(`IMF responded ${res.status} ${res.statusText} for ${url}`)
  return (await res.json()) as T
}

async function fetchFromImf(): Promise<StatDataset> {
  const started = Date.now()
  const [indicators, countries, rates, ...payloads] = await Promise.all([
    getJson<ImfIndicatorsPayload>(`${BASE}/indicators`),
    getJson<ImfCountriesPayload>(`${BASE}/countries`),
    fetchUsdPerEur().catch((err: Error) => {
      console.warn('[imf] could not load USD/EUR rates, debt in € disabled:', err.message)
      return null
    }),
    ...IMF_INDICATORS.map((ind) => getJson<ImfValuesPayload>(`${BASE}/${ind}`)),
  ])

  const values: ImfRaw['values'] = {}
  IMF_INDICATORS.forEach((ind, i) => {
    values[ind] = payloads[i].values[ind] ?? {}
  })

  const vintage =
    indicators.indicators[IMF_INDICATORS[0]]?.source ?? `World Economic Outlook (${new Date().getFullYear()})`
  const countryLabels = Object.fromEntries(
    Object.entries(countries.countries).map(([code, c]) => [code, c?.label ?? code]),
  )

  const data = truncateToYear(deriveDebtLevels(normalizeImf({ values, countryLabels, vintage }), rates), lastYear())
  console.log(
    `[imf] fetched ${IMF_INDICATORS.length} indicators, kept ${data.countries.length} economies × ${data.periods.length} years in ${Date.now() - started} ms (${vintage})`,
  )
  return data
}

export const getImf = createCachedLoader<StatDataset>('imf', fetchFromImf)
