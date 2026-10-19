import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const TTL_MS = 24 * 60 * 60 * 1000
const here = path.dirname(fileURLToPath(import.meta.url))
const CACHE_DIR = path.join(here, 'cache')

interface CacheEntry<T> {
  fetchedAt: number
  data: T
}

export interface CachedResult<T> {
  data: T
  source: 'memory' | 'disk' | 'upstream' | 'stale'
  fetchedAt: number
}

/**
 * Wraps an upstream fetcher with: fresh memory → fresh disk → upstream,
 * de-duplicated in-flight requests, and stale fallback (any cached copy)
 * when upstream fails.
 */
export function createCachedLoader<T>(name: string, fetcher: () => Promise<T>) {
  const file = path.join(CACHE_DIR, `${name}.json`)
  let memory: CacheEntry<T> | null = null
  let inflight: Promise<CacheEntry<T>> | null = null

  const isFresh = (e: CacheEntry<T> | null): e is CacheEntry<T> =>
    !!e && Date.now() - e.fetchedAt < TTL_MS

  async function readDisk(): Promise<CacheEntry<T> | null> {
    try {
      const entry = JSON.parse(await readFile(file, 'utf8')) as CacheEntry<T>
      if (entry && typeof entry.fetchedAt === 'number' && entry.data) return entry
    } catch {
      /* no cache yet */
    }
    return null
  }

  async function writeDisk(entry: CacheEntry<T>): Promise<void> {
    try {
      await mkdir(CACHE_DIR, { recursive: true })
      await writeFile(file, JSON.stringify(entry))
    } catch (err) {
      console.warn(`[${name}] could not write disk cache:`, (err as Error).message)
    }
  }

  return async function load(): Promise<CachedResult<T>> {
    if (isFresh(memory)) return { data: memory.data, source: 'memory', fetchedAt: memory.fetchedAt }

    if (!memory) {
      const disk = await readDisk()
      if (disk) {
        memory = disk
        if (isFresh(disk)) return { data: disk.data, source: 'disk', fetchedAt: disk.fetchedAt }
      }
    }

    if (!inflight) {
      inflight = (async () => {
        const data = await fetcher()
        const entry: CacheEntry<T> = { fetchedAt: Date.now(), data }
        memory = entry
        await writeDisk(entry)
        return entry
      })().finally(() => {
        inflight = null
      })
    }

    try {
      const entry = await inflight
      return { data: entry.data, source: 'upstream', fetchedAt: entry.fetchedAt }
    } catch (err) {
      if (memory) {
        console.warn(`[${name}] upstream failed, serving stale cache:`, (err as Error).message)
        return { data: memory.data, source: 'stale', fetchedAt: memory.fetchedAt }
      }
      throw err
    }
  }
}
