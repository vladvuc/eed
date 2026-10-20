import { createCachedLoader } from './cache.ts'
import { IMF_EUROPE, IMF_NAMES } from './imf.ts'
import type { SdmxJsonData, Series, StatDataset } from './types.ts'

/**
 * IMF Quarterly National Accounts (IMF.STA:QNEA), GDP at market prices (B1GQ).
 * The dataset publishes levels in national currency only, so every measure we
 * serve is computed here: quarter-on-quarter and year-on-year % change, and a
 * volume index rebased to 2015 = 100.
 */
const BASE = 'https://api.imf.org/external/sdmx/3.0/data/dataflow/IMF.STA/QNEA/~'
const START = '1995-Q1'
const FETCH_TIMEOUT_MS = 60_000

/** Series keys: PRICE_TYPE.S_ADJUSTMENT.TYPE_OF_TRANSFORMATION */
export const QNEA_KEYS = {
  REAL_SA: 'Q.SA.XDC', // chain-linked volumes, seasonally adjusted
  REAL_NSA: 'Q.NSA.XDC', // chain-linked volumes, not adjusted
  NOMINAL_NSA: 'V.NSA.XDC', // current prices, not adjusted
} as const

export type QneaKey = keyof typeof QNEA_KEYS

export const QUARTERLY_MEASURES = ['QOQ_SA', 'YOY', 'NOM_YOY', 'IDX_SA'] as const
export type QuarterlyMeasure = (typeof QUARTERLY_MEASURES)[number]

/** Countries that exist in QNEA (ISO3). Aggregates are not published there. */
const QNEA_EUROPE = IMF_EUROPE.filter((c) => !['EU', 'EURO', 'EDE'].includes(c))

export interface Level {
  periods: string[]
  values: Record<string, Series> // country → aligned with periods
}

/** Parse an SDMX-JSON 2.0 message into country → period → value. */
export function parseSdmxJson(msg: SdmxJsonData): Record<string, Record<string, number>> {
  const ds = msg.data.dataSets[0]
  const st = msg.data.structures[0]
  const countryPos = st.dimensions.series.findIndex((d) => d.id === 'COUNTRY')
  if (countryPos < 0) throw new Error('SDMX message has no COUNTRY dimension')
  const countries = st.dimensions.series[countryPos].values.map((v) => v.id ?? v.value ?? '')
  const timeDim = st.dimensions.observation.find((d) => d.id === 'TIME_PERIOD')
  if (!timeDim) throw new Error('SDMX message has no TIME_PERIOD dimension')
  const periods = timeDim.values.map((v) => v.value ?? v.id ?? '')

  const out: Record<string, Record<string, number>> = {}
  for (const [key, series] of Object.entries(ds.series ?? {})) {
    const country = countries[Number(key.split(':')[countryPos])]
    if (!country) continue
    const target = (out[country] ??= {})
    for (const [obsIdx, obs] of Object.entries(series.observations ?? {})) {
      const period = periods[Number(obsIdx)]
      const v = Number(obs[0])
      if (period && Number.isFinite(v)) target[period] = v
    }
  }
  return out
}

/** "2024-Q3" → sortable integer. */
function quarterIndex(p: string): number {
  const m = /^(\d{4})-Q([1-4])$/.exec(p)
  if (!m) return NaN
  return Number(m[1]) * 4 + Number(m[2]) - 1
}

function periodFromIndex(i: number): string {
  return `${Math.floor(i / 4)}-Q${(i % 4) + 1}`
}

function pctChange(series: Series, lag: number): Series {
  return series.map((v, i) => {
    const prev = series[i - lag]
    if (v === null || prev === null || prev === undefined || prev === 0) return null
    return (v / prev - 1) * 100
  })
}

function rebase(series: Series, periods: string[], baseYear: string): Series {
  const base = periods
    .map((p, i) => (p.startsWith(baseYear) ? series[i] : null))
    .filter((v): v is number => v !== null)
  if (base.length !== 4) return series.map(() => null)
  const mean = base.reduce((a, b) => a + b, 0) / 4
  return series.map((v) => (v === null ? null : (v / mean) * 100))
}

export interface QneaRaw {
  levels: Record<QneaKey, Record<string, Record<string, number>>>
  countryLabels: Record<string, string>
  fetchedAt: string
}

/** Pure: builds the quarterly dataset from parsed level series. */
export function normalizeQnea(raw: QneaRaw, keep: string[] = QNEA_EUROPE): StatDataset {
  let min = Infinity
  let max = -Infinity
  const present = new Set<string>()
  for (const byCountry of Object.values(raw.levels)) {
    for (const code of keep) {
      const ys = byCountry[code]
      if (!ys) continue
      present.add(code)
      for (const p of Object.keys(ys)) {
        const q = quarterIndex(p)
        if (!Number.isFinite(q)) continue
        if (q < min) min = q
        if (q > max) max = q
      }
    }
  }
  if (!Number.isFinite(min)) throw new Error('QNEA payload contained no European data')

  const periods: string[] = []
  for (let q = min; q <= max; q++) periods.push(periodFromIndex(q))

  const countries = keep
    .filter((c) => present.has(c))
    .map((code) => ({ code, name: raw.countryLabels[code] ?? code }))

  const align = (key: QneaKey, code: string): Series | null => {
    const ys = raw.levels[key]?.[code]
    if (!ys) return null
    return periods.map((p) => (typeof ys[p] === 'number' ? ys[p] : null))
  }

  const measures: Record<QuarterlyMeasure, Record<string, Series>> = {
    QOQ_SA: {},
    YOY: {},
    NOM_YOY: {},
    IDX_SA: {},
  }

  for (const { code } of countries) {
    const sa = align('REAL_SA', code)
    const nsa = align('REAL_NSA', code)
    const nom = align('NOMINAL_NSA', code)
    if (sa) {
      measures.QOQ_SA[code] = pctChange(sa, 1)
      measures.IDX_SA[code] = rebase(sa, periods, '2015')
    }
    const realForYoy = nsa ?? sa
    if (realForYoy) measures.YOY[code] = pctChange(realForYoy, 4)
    if (nom) measures.NOM_YOY[code] = pctChange(nom, 4)
  }

  return {
    source: 'imf-quarterly',
    updated: raw.fetchedAt,
    frequency: 'Q',
    periods,
    countries,
    measures,
  }
}

async function fetchKey(key: string): Promise<SdmxJsonData> {
  const url = `${BASE}/${QNEA_EUROPE.join('+')}.B1GQ.${key}.Q?c%5BTIME_PERIOD%5D=ge:${START}`
  const res = await fetch(url, {
    headers: { Accept: 'application/vnd.sdmx.data+json;version=2.0.0' },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  })
  if (!res.ok) throw new Error(`IMF QNEA responded ${res.status} ${res.statusText} for ${key}`)
  return (await res.json()) as SdmxJsonData
}

async function fetchFromQnea(): Promise<StatDataset> {
  const started = Date.now()
  const keys = Object.keys(QNEA_KEYS) as QneaKey[]
  const msgs = await Promise.all(keys.map((k) => fetchKey(QNEA_KEYS[k])))

  const levels = {} as QneaRaw['levels']
  keys.forEach((k, i) => {
    levels[k] = parseSdmxJson(msgs[i])
  })

  const data = normalizeQnea({ levels, countryLabels: IMF_NAMES, fetchedAt: new Date().toISOString() })
  console.log(
    `[imf-quarterly] fetched ${keys.length} series × ${data.countries.length} economies, ${data.periods[0]}–${data.periods.at(-1)} in ${Date.now() - started} ms`,
  )
  return data
}

export const getImfQuarterly = createCachedLoader<StatDataset>('imf-quarterly', fetchFromQnea)
