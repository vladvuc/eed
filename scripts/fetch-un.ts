/**
 * Refreshes public/data/un.json (leaderboard: UN GDP from 1970, incl. Yugoslavia) from the
 * UN Statistics Division's AMA download files. The UN updates them once a year (December),
 * so the app ships a snapshot instead of parsing ~9 MB of spreadsheets on the server.
 *
 *   node scripts/fetch-un.ts
 */
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fetchUsdPerEur } from '../server/fx.ts'
import { buildUnDataset, tableFromSheet } from './un.ts'
import { readFirstSheet } from './xlsx.ts'

// File ids from https://unstats.un.org/unsd/snaama/downloads (1: current national currency, 2: current US$,
// 6: constant 2020 US$, 9: per capita US$)
const FILE_URL = (id: number) => `https://unstats.un.org/unsd/amaapi/api/file/${id}`
const FILES = { current: 2, constant: 6, perCapita: 9, currentNcu: 1 }
const OUT = path.resolve(import.meta.dirname, '..', 'public', 'data', 'un.json')
const GDP = 'Gross Domestic Product (GDP)'

async function download(id: number, dir: string): Promise<string> {
  const res = await fetch(FILE_URL(id), { signal: AbortSignal.timeout(120_000) })
  if (!res.ok) throw new Error(`UN AMA file ${id} responded ${res.status} ${res.statusText}`)
  const file = path.join(dir, `ama-${id}.xlsx`)
  await writeFile(file, Buffer.from(await res.arrayBuffer()))
  return file
}

const dir = await mkdtemp(path.join(tmpdir(), 'un-ama-'))
try {
  const [current, constant, perCapita, currentNcu] = await Promise.all(
    [FILES.current, FILES.constant, FILES.perCapita, FILES.currentNcu].map((id) => download(id, dir)),
  )
  const usdPerEur = await fetchUsdPerEur()
  const ds = buildUnDataset(
    {
      current: tableFromSheet(readFirstSheet(current), GDP),
      constant: tableFromSheet(readFirstSheet(constant), GDP),
      perCapita: tableFromSheet(readFirstSheet(perCapita)),
      currentNcu: tableFromSheet(readFirstSheet(currentNcu), GDP),
      usdPerEur,
    },
    new Date().toISOString().slice(0, 10),
  )
  // Rounded to keep the snapshot small: GDP to 0.1 M US$, per capita to 0.01 US$, growth to 0.001 pp.
  const precision: Record<string, number> = { UN_NGDPD: 1e4, UN_NGDPDPC: 1e2, UN_NGDP_RPCH: 1e3, UN_DEFL_PCH: 1e3, UN_NGDP_MEUR: 10 }
  for (const [m, byGeo] of Object.entries(ds.measures)) {
    const k = precision[m] ?? 1e4
    for (const code of Object.keys(byGeo)) byGeo[code] = byGeo[code].map((v) => (v === null ? null : Math.round(v * k) / k))
  }
  await mkdir(path.dirname(OUT), { recursive: true })
  await writeFile(OUT, JSON.stringify(ds))
  console.log(`[un] ${ds.countries.length} countries × ${ds.periods.length} years (${ds.updated}) → ${path.relative(process.cwd(), OUT)}`)
  for (const n of ds.notes) console.log(`[un] ${n}`)
} finally {
  await rm(dir, { recursive: true, force: true })
}
