/**
 * A "nice" linear domain that always contains zero, with round tick values.
 * Used for rate charts (growth, inflation, cumulative change) where the exact
 * data extent would produce ticks like -6 / 75 / 155.
 */
export function niceZeroDomain(min: number, max: number, targetTicks = 5): { domain: [number, number]; ticks: number[] } {
  const lo = Math.min(0, min)
  const hi = Math.max(0, max)
  const range = hi - lo || 1
  const rough = range / targetTicks
  const p = Math.pow(10, Math.floor(Math.log10(rough)))
  const r = rough / p
  const step = r >= 5 ? 10 * p : r >= 2 ? 5 * p : r >= 1 ? 2 * p : p
  const start = Math.floor(lo / step) * step
  const end = Math.ceil(hi / step) * step
  const ticks: number[] = []
  for (let t = start; t <= end + step / 2; t += step) ticks.push(Number(t.toFixed(10)))
  return { domain: [start, end], ticks }
}

const niceAbove = (x: number) => {
  if (x <= 1) return 1
  const p = Math.pow(10, Math.floor(Math.log10(x)))
  return [1, 2, 5, 10].map((m) => m * p).find((v) => v >= x - 1e-9) ?? 10 * p
}

/**
 * Domain and ticks for a symmetric-log axis (log-like on both sides of zero, linear near it),
 * used when "Log scale" is on for rates that include zero or negative values.
 * Ticks are 0 and ±1, 2, 5 × 10ⁿ; when that gets crowded, only 0 and ±10ⁿ.
 */
export function symlogDomain(min: number, max: number): { domain: [number, number]; ticks: number[] } {
  const lo = min < 0 ? -niceAbove(-min) : 0
  const hi = max > 0 ? niceAbove(max) : 0
  const steps = (limit: number, mults: number[]) => {
    const out: number[] = []
    for (let p = 1; p <= limit; p *= 10) for (const m of mults) if (m * p <= limit + 1e-9) out.push(m * p)
    return out
  }
  const build = (mults: number[]) => [
    ...steps(-lo, mults).reverse().map((v) => -v),
    0,
    ...steps(hi, mults),
  ]
  let ticks = build([1, 2, 5])
  if (ticks.length > 13) ticks = build([1])
  // keep the rounded ends as ticks so the axis is labelled at both edges
  if (!ticks.includes(lo)) ticks.unshift(lo)
  if (!ticks.includes(hi)) ticks.push(hi)
  return { domain: [lo, hi], ticks }
}
