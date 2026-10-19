import { mix } from './color'
import type { Scheme } from './flagColors'

/**
 * Colour scales for the leaderboard map.
 *  - diverging: measures where the sign matters (growth, budget balance): red below zero, green above,
 *    neutral grey at zero, symmetric so equal distances from zero get equal colour strength.
 *  - sequential: magnitudes (inflation, debt): one blue hue, receding toward the surface at the low end.
 * The domain ends are rounded and set from the 95th percentile, so one outlier (e.g. a war year)
 * doesn't wash every other country out to grey; values beyond the end are drawn at full strength.
 */
export type MapScale = {
  kind: 'diverging' | 'sequential'
  log: boolean
  domain: [number, number]
  colorOf: (v: number) => string
  /** Evenly spaced colours along the scale, for the legend gradient. */
  stops: string[]
  /** Legend ticks as values on the scale. */
  ticks: number[]
  /** Position (0..1) of a value along the legend. */
  position: (v: number) => number
}

const DIVERGING_MEASURES = new Set(['NGDP_RPCH', 'GGXCNL_NGDP', 'QOQ_SA', 'YOY', 'NOM_YOY'])

const PALETTE: Record<Scheme, { neg: string; mid: string; pos: string; seqLow: string; seqHigh: string }> = {
  light: { neg: '#c9353a', mid: '#f0efec', pos: '#1f8a3a', seqLow: '#cde2fb', seqHigh: '#0d366b' },
  dark: { neg: '#e5534b', mid: '#383835', pos: '#3fb950', seqLow: '#1f3349', seqHigh: '#9ec5f4' },
}

/** Smallest round number (1, 1.5, 2, 2.5, 3, 4, 5, 6, 8 × 10ⁿ) at or above x: tight enough that the scale isn't washed out. */
export function niceCeil(x: number): number {
  if (x <= 0) return 1
  const p = Math.pow(10, Math.floor(Math.log10(x)))
  return [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].map((m) => Number((m * p).toPrecision(6))).find((v) => v >= x - 1e-9)!
}

function percentile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0
  const i = Math.min(sorted.length - 1, Math.max(0, Math.round(q * (sorted.length - 1))))
  return sorted[i]
}

export function mapScale(measureCode: string, isLevel: boolean, values: number[], scheme: Scheme): MapScale {
  const p = PALETTE[scheme]
  const STOPS = 11

  if (DIVERGING_MEASURES.has(measureCode)) {
    const abs = values.map(Math.abs).sort((a, b) => a - b)
    const max = niceCeil(percentile(abs, 0.95))
    const colorOf = (v: number) => (v < 0 ? mix(p.mid, p.neg, -v / max) : mix(p.mid, p.pos, v / max))
    const position = (v: number) => Math.min(1, Math.max(0, (v + max) / (2 * max)))
    return {
      kind: 'diverging',
      log: false,
      domain: [-max, max],
      colorOf,
      stops: Array.from({ length: STOPS }, (_, i) => colorOf(-max + (2 * max * i) / (STOPS - 1))),
      ticks: [-max, 0, max],
      position,
    }
  }

  const sorted = [...values].sort((a, b) => a - b)
  if (isLevel) {
    // Levels span orders of magnitude (Malta vs Germany), so position on a log scale.
    const positive = sorted.filter((v) => v > 0)
    const lo = Math.pow(10, Math.floor(Math.log10(percentile(positive, 0.05) || 1)))
    const hi = Math.pow(10, Math.ceil(Math.log10(percentile(positive, 0.95) || 10)))
    const position = (v: number) => (v <= 0 ? 0 : Math.min(1, Math.max(0, Math.log(v / lo) / Math.log(hi / lo))))
    const ticks: number[] = []
    for (let t = lo; t <= hi * 1.0001; t *= 10) ticks.push(t)
    return {
      kind: 'sequential',
      log: true,
      domain: [lo, hi],
      colorOf: (v) => mix(p.seqLow, p.seqHigh, position(v)),
      stops: Array.from({ length: STOPS }, (_, i) => mix(p.seqLow, p.seqHigh, i / (STOPS - 1))),
      ticks,
      position,
    }
  }

  const lo = (sorted[0] ?? 0) < 0 ? -niceCeil(-sorted[0]) : 0
  const hi = niceCeil(percentile(sorted, 0.95))
  const position = (v: number) => Math.min(1, Math.max(0, (v - lo) / (hi - lo || 1)))
  return {
    kind: 'sequential',
    log: false,
    domain: [lo, hi],
    colorOf: (v) => mix(p.seqLow, p.seqHigh, position(v)),
    stops: Array.from({ length: STOPS }, (_, i) => mix(p.seqLow, p.seqHigh, i / (STOPS - 1))),
    ticks: lo < 0 ? [lo, 0, hi] : [0, hi / 2, hi],
    position,
  }
}
