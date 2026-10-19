import type { JsonStatDataset } from './types.ts'

/** Eurostat ert_bil_eur_a: annual average US dollars per euro (ECU before 1999), 1971 onwards. */
const URL =
  'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/ert_bil_eur_a?format=JSON&lang=EN&currency=USD&statinfo=AVG'
const FETCH_TIMEOUT_MS = 30_000

export type FxRates = Record<string, number> // year → USD per EUR

/** Pure: JSON-stat with a single varying `time` dimension → { year: rate }. */
export function parseFxRates(ds: JsonStatDataset): FxRates {
  const timePos = ds.id.indexOf('time')
  if (timePos < 0) throw new Error('FX response has no time dimension')
  const idx = ds.dimension.time.category.index
  const entries = Array.isArray(idx) ? idx.map((code, i) => [code, i] as const) : Object.entries(idx)
  // All other dimensions have size 1, so the time position is the linear index.
  const out: FxRates = {}
  for (const [year, i] of entries) {
    const v = Array.isArray(ds.value) ? ds.value[i] : ds.value[String(i)]
    if (typeof v === 'number' && Number.isFinite(v) && v > 0) out[year] = v
  }
  return out
}

export async function fetchUsdPerEur(): Promise<FxRates> {
  const res = await fetch(URL, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
  if (!res.ok) throw new Error(`Eurostat FX responded ${res.status} ${res.statusText}`)
  return parseFxRates((await res.json()) as JsonStatDataset)
}
