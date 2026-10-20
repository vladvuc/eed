import { EUROSTAT_TO_ISO3 } from '../data/flags'
import type { FormerCountry, StatDataset } from '../types'

type Target = 'imf' | 'eurostat'

/**
 * Yugoslavia, the USSR and Czechoslovakia (UN data, public/data/un.json) on IMF and Eurostat tabs:
 * the measure each one stands in for, by the UN measure it is taken from.
 */
const UN_FOR: Record<Target, Record<string, string>> = {
  imf: {
    NGDPD: 'UN_NGDPD',
    NGDPDPC: 'UN_NGDPDPC',
    NGDP_RPCH: 'UN_NGDP_RPCH',
    // The UN has no CPI: its inflation is the GDP deflator.
    PCPIPCH: 'UN_DEFL_PCH',
  },
  eurostat: { CP_MEUR: 'UN_NGDP_MEUR', CLV_PCH_PRE: 'UN_NGDP_RPCH' },
}

/** Eurostat-tab codes: the ISO 3166 alpha-2 codes these countries had. */
const EUROSTAT_FORMER: Record<string, string> = { YUG: 'YU', SUN: 'SU', CSK: 'CS' }
const ISO3_TO_EUROSTAT = Object.fromEntries(Object.entries(EUROSTAT_TO_ISO3).map(([e, iso3]) => [iso3, e]))

export const FORMER_NOTE_PREFIX = 'Former countries'

/** Pure: adds the former countries to an annual IMF or Eurostat dataset, aligned on its years. */
export function mergeFormerCountries(base: StatDataset, un: StatDataset, target: Target = 'imf'): StatDataset {
  if (!un.former?.length) return base
  const codeOf = (iso3: string) => (target === 'eurostat' ? (EUROSTAT_FORMER[iso3] ?? ISO3_TO_EUROSTAT[iso3] ?? iso3) : iso3)
  const former = un.former.map((f) => ({ ...f, code: codeOf(f.code), successors: f.successors.map(codeOf) }))
  const at = base.periods.map((p) => un.periods.indexOf(p.slice(0, 4)))
  const measures = { ...base.measures }
  for (const [code, unCode] of Object.entries(UN_FOR[target])) {
    if (!measures[code]) continue
    const src = un.measures[unCode] ?? {}
    const added = Object.fromEntries(
      un.former.filter((f) => src[f.code]).map((f) => [codeOf(f.code), at.map((j) => (j >= 0 ? src[f.code][j] : null))]),
    )
    measures[code] = { ...measures[code], ...added }
  }
  const unNote = un.notes?.find((n) => n.startsWith(FORMER_NOTE_PREFIX))
  const notes = [...(base.notes ?? []), ...(unNote ? [unNote] : [])]
  if (target === 'eurostat') {
    notes.push(`${FORMER_NOTE_PREFIX} in €: converted from US$ at Eurostat's annual average rate (ECU before 1999).`)
  }
  const formerCodes = new Set(un.former.map((f) => f.code))
  return {
    ...base,
    countries: [
      ...base.countries,
      ...un.countries.filter((c) => formerCodes.has(c.code)).map((c) => ({ ...c, code: codeOf(c.code) })),
    ],
    measures,
    former,
    notes,
  }
}

/**
 * Pure (leaderboard): years before the IMF data starts, back to `fromYear`, filled from the UN for
 * every country in the measures the UN covers; other measures get no values for those years.
 */
export function extendBackWithUn(base: StatDataset, un: StatDataset, fromYear: number): StatDataset {
  const first = Number(base.periods[0]?.slice(0, 4))
  const early: string[] = []
  for (let y = fromYear; y < first; y++) if (un.periods.includes(String(y))) early.push(String(y))
  if (!early.length) return base
  const at = early.map((p) => un.periods.indexOf(p))
  const measures: StatDataset['measures'] = {}
  for (const [m, byGeo] of Object.entries(base.measures)) {
    const src = UN_FOR.imf[m] ? (un.measures[UN_FOR.imf[m]] ?? {}) : {}
    measures[m] = Object.fromEntries(
      Object.entries(byGeo).map(([code, s]) => [code, [...at.map((j) => src[code]?.[j] ?? null), ...s]]),
    )
  }
  return { ...base, periods: [...early, ...base.periods], measures, unBefore: base.periods[0] }
}

/** Former countries with a value for `measureCode` in `period` (their successors stay out meanwhile). */
export function activeFormer(data: StatDataset, measureCode: string, period: string): FormerCountry[] {
  const i = data.periods.indexOf(period)
  const year = Number(period.slice(0, 4))
  return (data.former ?? []).filter(
    (f) => year <= f.lastYear && i >= 0 && (data.measures[measureCode]?.[f.code]?.[i] ?? null) !== null,
  )
}

/** Successor code → the former country it was part of (for the map). */
export function successorAliases(former: FormerCountry[]): Record<string, string> {
  return Object.fromEntries(former.flatMap((f) => f.successors.map((s) => [s, f.code])))
}

/** Last year any former country is shown (the picker group appears for ranges starting up to then). */
export function lastFormerYear(data: StatDataset | null): number | null {
  const years = (data?.former ?? []).map((f) => f.lastYear)
  return years.length ? Math.max(...years) : null
}
