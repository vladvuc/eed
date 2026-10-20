import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'

// cache.ts reads CACHE_DIR when it loads, so point it at an empty directory first.
const dir = await mkdtemp(path.join(tmpdir(), 'cache-test-'))
process.env.CACHE_DIR = dir
const { createCachedLoader } = await import('./cache.ts')

const failing = () => vi.fn(async (): Promise<string> => {
  throw new Error('IMF responded 403 Forbidden')
})

describe('createCachedLoader', () => {
  it('serves the seed snapshot when upstream fails and nothing is cached', async () => {
    const seedFile = path.join(dir, 'seed.json')
    await writeFile(seedFile, JSON.stringify({ fetchedAt: 1, data: 'snapshot' }))
    const fetcher = failing()
    const load = createCachedLoader('seeded', fetcher, { seedFile })

    expect(await load()).toEqual({ data: 'snapshot', source: 'seed', fetchedAt: 1 })
    // A blocked upstream isn't retried on every request.
    expect(await load()).toMatchObject({ source: 'seed' })
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('still fails without a seed or cache', async () => {
    const load = createCachedLoader('unseeded', failing())
    await expect(load()).rejects.toThrow('403')
  })

  it('prefers upstream over the seed when it works', async () => {
    const seedFile = path.join(dir, 'seed.json')
    const load = createCachedLoader('live', async () => 'live', { seedFile })
    expect(await load()).toMatchObject({ data: 'live', source: 'upstream' })
  })
})
