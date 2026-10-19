import type { Series, StatDataset } from '../types'

/**
 * Compound annual growth rates (%) into cumulative change relative to a base period.
 * Result at the base is 0 (pct) or 100 (index); later periods multiply (1 + g/100)
 * forward, earlier periods divide backwards. A missing rate anywhere in the chain
 * breaks it (null) from that point on, so gaps are never silently bridged.
 */
export function cumulativeFromGrowth(
  growth: Series,
  periods: string[],
  base: string,
  mode: 'pct' | 'index',
): Series {
  const out: Series = new Array(periods.length).fill(null)
  const b = periods.indexOf(base)
  if (b < 0) return out
  // The base point only exists if the country's level in the base year is known,
  // i.e. there is a growth rate into or out of that year.
  const known = (i: number) => growth[i] !== null && growth[i] !== undefined
  if (!known(b) && !known(b + 1)) return out
  const toOut = (factor: number) => (mode === 'index' ? factor * 100 : (factor - 1) * 100)
  out[b] = toOut(1)
  let f = 1
  for (let i = b + 1; i < periods.length; i++) {
    const g = growth[i]
    if (g === null || g === undefined) break
    f *= 1 + g / 100
    out[i] = toOut(f)
  }
  f = 1
  for (let i = b - 1; i >= 0; i--) {
    const g = growth[i + 1]
    if (g === null || g === undefined) break
    f /= 1 + g / 100
    out[i] = toOut(f)
  }
  return out
}

export const CUMULATIVE_SOURCE_MEASURE = 'NGDP_RPCH'

/** Derive a dataset whose measures are cumulative growth since `base`, for every country with a growth series. */
export function deriveCumulative(data: StatDataset, base: string): StatDataset {
  const growth = data.measures[CUMULATIVE_SOURCE_MEASURE] ?? {}
  const pct: Record<string, Series> = {}
  const idx: Record<string, Series> = {}
  for (const [code, s] of Object.entries(growth)) {
    pct[code] = cumulativeFromGrowth(s, data.periods, base, 'pct')
    idx[code] = cumulativeFromGrowth(s, data.periods, base, 'index')
  }
  return {
    ...data,
    measures: { CUM_PCT: pct, CUM_IDX: idx },
    notes: [
      `Compounded from the WEO's annual real GDP growth rates, so ${base} is the reference point (0 % / index 100). A missing year breaks the chain.`,
    ],
  }
}
