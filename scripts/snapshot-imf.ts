/**
 * Refreshes server/seed/imf.json, the IMF WEO snapshot the server falls back to when
 * www.imf.org (behind Akamai) blocks its requests, as it does from many server IPs.
 * The WEO is published twice a year (April and October), so run this after each release
 * and commit the file:
 *
 *   pnpm snapshot:imf
 */
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fetchFromImf, IMF_SEED_FILE } from '../server/imf.ts'

const data = await fetchFromImf()
await mkdir(path.dirname(IMF_SEED_FILE), { recursive: true })
await writeFile(IMF_SEED_FILE, JSON.stringify({ fetchedAt: Date.now(), data }))
console.log(`[snapshot] wrote ${path.relative(process.cwd(), IMF_SEED_FILE)} (${data.updated})`)
