import { createCachedLoader } from './cache.ts'
import { normalize } from './normalize.ts'
import type { JsonStatDataset, Series, StatDataset } from './types.ts'
import { EUROSTAT_UNITS } from './types.ts'

const API = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data'
const BASE = `${API}/nama_10_gdp`

/**
 * Russia is not in nama_10_gdp. Eurostat publishes it in naida_10_gdp
 * ("GDP and main aggregates - international data cooperation"), with fewer units:
 * current prices in million euro, real growth, and a volume index with 2010 = 100.
 */
const SUPPLEMENT_DATASET = 'naida_10_gdp'
const SUPPLEMENT_GEOS = ['RU'] as const
const SUPPLEMENT_UNITS = ['CP_MEUR', 'CLV_PCH_PRE', 'CLV_I10'] as const
const SUPPLEMENT_NAMES: Record<string, string> = { RU: 'Russia' }
const FETCH_TIMEOUT_MS = 30_000

export function buildUrl(): string {
  const params = new URLSearchParams({ format: 'JSON', lang: 'EN', na_item: 'B1GQ' })
  for (const u of EUROSTAT_UNITS) params.append('unit', u)
  return `${BASE}?${params.toString()}`
}

export function buildSupplementUrl(): string {
  const params = new URLSearchParams({ format: 'JSON', lang: 'EN', na_item: 'B1GQ' })
  for (const g of SUPPLEMENT_GEOS) params.append('geo', g)
  for (const u of SUPPLEMENT_UNITS) params.append('unit', u)
  return `${API}/${SUPPLEMENT_DATASET}?${params.toString()}`
}

/** Rebase an index series so the mean of `base` equals 100 (all-null if the base year is missing). */
function rebaseIndex(series: Series, periods: string[], base: string): Series {
  const i = periods.indexOf(base)
  const b = i >= 0 ? series[i] : null
  if (b === null || b === undefined || b === 0) return series.map(() => null)
  return series.map((v) => (v === null ? null : (v / b) * 100))
}

/**
 * Pure: merges supplementary countries (from naida_10_gdp) into the main nama_10_gdp
 * dataset. Values are aligned on the main period axis; the 2010-based volume index is
 * rebased to 2015 = 100 so it sits on the same scale as CLV_I15. Units Eurostat does
 * not publish for these countries (PPS, chain-linked euro) are left absent.
 */
export function mergeSupplement(main: StatDataset, supp: StatDataset): StatDataset {
  const added = supp.countries.filter((c) => !main.countries.some((m) => m.code === c.code))
  if (added.length === 0) return main
  const align = (s: Series) => main.periods.map((p) => {
    const j = supp.periods.indexOf(p)
    return j >= 0 ? (s[j] ?? null) : null
  })
  const measures = { ...main.measures }
  for (const { code } of added) {
    const put = (unit: string, s: Series | undefined) => {
      if (!s || !s.some((v) => v !== null)) return
      measures[unit] = { ...measures[unit], [code]: s }
    }
    put('CP_MEUR', supp.measures.CP_MEUR?.[code] && align(supp.measures.CP_MEUR[code]))
    put('CLV_PCH_PRE', supp.measures.CLV_PCH_PRE?.[code] && align(supp.measures.CLV_PCH_PRE[code]))
    const idx = supp.measures.CLV_I10?.[code]
    if (idx) put('CLV_I15', align(rebaseIndex(idx, supp.periods, '2015')))
  }
  const names = added.map((c) => SUPPLEMENT_NAMES[c.code] ?? c.name)
  const last = (unit: string) => {
    let y: string | null = null
    for (const { code } of added) {
      const s = measures[unit]?.[code]
      if (!s) continue
      for (let i = s.length - 1; i >= 0; i--) if (s[i] !== null) { if (!y || main.periods[i] > y) y = main.periods[i]; break }
    }
    return y
  }
  return {
    ...main,
    countries: [...main.countries, ...added.map((c) => ({ code: c.code, name: SUPPLEMENT_NAMES[c.code] ?? c.name }))],
    measures,
    notes: [
      ...(main.notes ?? []),
      `${names.join(', ')}: from Eurostat ${SUPPLEMENT_DATASET} (GDP and main aggregates – international data cooperation), which ends in ${last('CP_MEUR') ?? '–'} for current prices and ${last('CLV_PCH_PRE') ?? '–'} for growth. Its volume index is rebased from 2010 = 100 to 2015 = 100; PPS and chain-linked euro values are not published.`,
    ],
  }
}

async function fetchSupplement(): Promise<StatDataset | null> {
  try {
    const res = await fetch(buildSupplementUrl(), { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
    if (!res.ok) throw new Error(`Eurostat ${SUPPLEMENT_DATASET} responded ${res.status} ${res.statusText}`)
    return normalize((await res.json()) as JsonStatDataset, SUPPLEMENT_UNITS)
  } catch (err) {
    console.warn(`[eurostat] could not load ${SUPPLEMENT_DATASET}, Russia omitted:`, (err as Error).message)
    return null
  }
}

async function fetchFromEurostat(): Promise<StatDataset> {
  const started = Date.now()
  const [res, supp] = await Promise.all([
    fetch(buildUrl(), { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) }),
    fetchSupplement(),
  ])
  if (!res.ok) throw new Error(`Eurostat responded ${res.status} ${res.statusText}`)
  const json = (await res.json()) as JsonStatDataset
  const base = normalize(json)
  const data = supp ? mergeSupplement(base, supp) : base
  console.log(
    `[eurostat] fetched ${data.countries.length} countries × ${data.periods.length} years in ${Date.now() - started} ms`,
  )
  return data
}

export const getEurostat = createCachedLoader<StatDataset>('eurostat', fetchFromEurostat)
