import { createCachedLoader } from './cache.ts'
import { normalize } from './normalize.ts'
import type { JsonStatDataset, StatDataset } from './types.ts'
import { EUROSTAT_UNITS } from './types.ts'

const BASE = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/nama_10_gdp'
const FETCH_TIMEOUT_MS = 30_000

export function buildUrl(): string {
  const params = new URLSearchParams({ format: 'JSON', lang: 'EN', na_item: 'B1GQ' })
  for (const u of EUROSTAT_UNITS) params.append('unit', u)
  return `${BASE}?${params.toString()}`
}

async function fetchFromEurostat(): Promise<StatDataset> {
  const started = Date.now()
  const res = await fetch(buildUrl(), { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
  if (!res.ok) throw new Error(`Eurostat responded ${res.status} ${res.statusText}`)
  const json = (await res.json()) as JsonStatDataset
  const data = normalize(json)
  console.log(
    `[eurostat] fetched ${data.countries.length} countries × ${data.periods.length} years in ${Date.now() - started} ms`,
  )
  return data
}

export const getEurostat = createCachedLoader<StatDataset>('eurostat', fetchFromEurostat)
