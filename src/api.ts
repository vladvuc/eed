import type { Source, StatDataset } from './types'

const inflight = new Map<Source, Promise<StatDataset>>()

export function fetchDataset(source: Source): Promise<StatDataset> {
  const cached = inflight.get(source)
  if (cached) return cached
  const p = (async () => {
    const res = await fetch(`/api/${source}`)
    if (!res.ok) {
      let detail = `${res.status} ${res.statusText}`
      try {
        const body = (await res.json()) as { error?: string; detail?: string }
        detail = body.detail ?? body.error ?? detail
      } catch {
        /* ignore non-JSON error bodies */
      }
      throw new Error(detail)
    }
    return (await res.json()) as StatDataset
  })()
  inflight.set(source, p)
  p.catch(() => inflight.delete(source))
  return p
}
