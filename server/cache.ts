import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const TTL_MS = 24 * 60 * 60 * 1000
/** After a failed upstream fetch, serve the cached copy for this long before trying upstream again. */
const RETRY_AFTER_MS = 10 * 60 * 1000
const here = path.dirname(fileURLToPath(import.meta.url))
// CACHE_DIR lets a deployment put the cache on a persistent volume.
const CACHE_DIR = process.env.CACHE_DIR ? path.resolve(process.env.CACHE_DIR) : path.join(here, 'cache')

interface CacheEntry<T> {
  fetchedAt: number
  data: T
}

export interface CachedResult<T> {
  data: T
  source: 'memory' | 'disk' | 'upstream' | 'stale' | 'seed'
  fetchedAt: number
}

export interface LoaderOptions {
  /**
   * Snapshot shipped with the app, in the disk-cache format ({ fetchedAt, data }). Served when
   * upstream fails and nothing is cached yet, e.g. when the upstream blocks the server's IP.
   */
  seedFile?: string
}

async function readEntry<T>(file: string): Promise<CacheEntry<T> | null> {
  try {
    const entry = JSON.parse(await readFile(file, 'utf8')) as CacheEntry<T>
    if (entry && typeof entry.fetchedAt === 'number' && entry.data) return entry
  } catch {
    /* no such file */
  }
  return null
}

/**
 * Wraps an upstream fetcher with: fresh memory → fresh disk → upstream,
 * de-duplicated in-flight requests, and stale fallback (any cached copy, else the
 * seed snapshot) when upstream fails. After a failure, upstream is retried at most
 * every RETRY_AFTER_MS while there is something to serve.
 */
export function createCachedLoader<T>(name: string, fetcher: () => Promise<T>, options: LoaderOptions = {}) {
  const file = path.join(CACHE_DIR, `${name}.json`)
  let memory: CacheEntry<T> | null = null
  let memoryIsSeed = false
  let failedAt = 0
  let inflight: Promise<CacheEntry<T>> | null = null

  const isFresh = (e: CacheEntry<T> | null): e is CacheEntry<T> =>
    !!e && Date.now() - e.fetchedAt < TTL_MS
  const stale = (e: CacheEntry<T>): CachedResult<T> => ({
    data: e.data,
    source: memoryIsSeed ? 'seed' : 'stale',
    fetchedAt: e.fetchedAt,
  })

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
      const disk = await readEntry<T>(file)
      if (disk) {
        memory = disk
        if (isFresh(disk)) return { data: disk.data, source: 'disk', fetchedAt: disk.fetchedAt }
      } else if (options.seedFile) {
        memory = await readEntry<T>(options.seedFile)
        memoryIsSeed = !!memory
      }
    }

    if (memory && Date.now() - failedAt < RETRY_AFTER_MS) return stale(memory)

    if (!inflight) {
      inflight = (async () => {
        const data = await fetcher()
        const entry: CacheEntry<T> = { fetchedAt: Date.now(), data }
        memory = entry
        memoryIsSeed = false
        failedAt = 0
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
      failedAt = Date.now()
      if (memory) {
        console.warn(
          `[${name}] upstream failed, serving ${memoryIsSeed ? 'bundled snapshot' : 'stale cache'} (retry in ${RETRY_AFTER_MS / 60_000} min):`,
          (err as Error).message,
        )
        return stale(memory)
      }
      throw err
    }
  }
}
