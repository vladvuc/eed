import { displayName } from '../data/countries'
import type { Country, StatDataset } from '../types'

export interface RankedRow {
  rank: number
  code: string
  name: string
  value: number
  /** Same measure one period earlier, if available. */
  previous: number | null
  /** The period `value` refers to. */
  period: string
}

/** Rank `codes` by a measure in one period, biggest value first; countries without a value are dropped. */
export function rankCountries(
  data: StatDataset,
  codes: string[],
  measureCode: string,
  period: string,
): RankedRow[] {
  const byGeo = data.measures[measureCode] ?? {}
  const i = data.periods.indexOf(period)
  if (i < 0) return []
  const labels = new Map(data.countries.map((c: Country) => [c.code, c.name]))
  const rows = codes
    .map((code) => ({ code, value: byGeo[code]?.[i] ?? null, previous: byGeo[code]?.[i - 1] ?? null }))
    .filter((r): r is { code: string; value: number; previous: number | null } => r.value !== null)
    .sort((a, b) => b.value - a.value)
  return rows.map((r, idx) => ({ ...r, rank: idx + 1, period, name: displayName(r.code, labels.get(r.code)) }))
}

/**
 * Rank `codes` by each country's most recent non-null value (countries publish at
 * different speeds, so the reference period varies per row), biggest value first.
 */
export function rankLatest(data: StatDataset, codes: string[], measureCode: string): RankedRow[] {
  const byGeo = data.measures[measureCode] ?? {}
  const labels = new Map(data.countries.map((c: Country) => [c.code, c.name]))
  const rows: Omit<RankedRow, 'rank' | 'name'>[] = []
  for (const code of codes) {
    const s = byGeo[code]
    if (!s) continue
    let i = s.length - 1
    while (i >= 0 && s[i] === null) i--
    if (i < 0) continue
    rows.push({ code, value: s[i] as number, previous: i > 0 ? s[i - 1] : null, period: data.periods[i] })
  }
  rows.sort((a, b) => b.value - a.value)
  return rows.map((r, idx) => ({ ...r, rank: idx + 1, name: displayName(r.code, labels.get(r.code)) }))
}

