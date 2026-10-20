/**
 * Spread label centres so neighbours are at least `gap` apart, staying inside
 * [top, bottom]. Keeps the original order; returns the nudged positions.
 */
export function spreadLabels(ys: number[], gap: number, top: number, bottom: number): number[] {
  const order = ys.map((y, i) => [y, i] as const).sort((a, b) => a[0] - b[0])
  const placed: number[] = []
  for (const [y] of order) placed.push(placed.length ? Math.max(y, placed[placed.length - 1] + gap) : Math.max(y, top))
  for (let k = placed.length - 1; k >= 0; k--) {
    const limit = k === placed.length - 1 ? bottom : placed[k + 1] - gap
    placed[k] = Math.min(placed[k], limit)
  }
  const out = new Array<number>(ys.length)
  order.forEach(([, i], k) => {
    out[i] = placed[k]
  })
  return out
}

/** "2026-Q2" → "Q2 '26" (phone labels); other periods unchanged. */
export function shortQuarter(p: string): string {
  const m = /^\d{2}(\d{2})-(Q[1-4])$/.exec(p)
  return m ? `${m[2]} '${m[1]}` : p
}
