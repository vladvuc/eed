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
