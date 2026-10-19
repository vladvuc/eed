import express, { type NextFunction, type Request, type Response } from 'express'
import type { CachedResult } from './cache.ts'
import { getEurostat } from './eurostat.ts'
import { getImf } from './imf.ts'
import { getImfQuarterly } from './imfq.ts'
import type { StatDataset } from './types.ts'

const app = express()
const PORT = Number(process.env.PORT ?? 3001)

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() })
})

function send(res: Response, route: string, result: CachedResult<StatDataset>) {
  const { data, source, fetchedAt } = result
  console.log(`[api] GET ${route} → ${source} (fetched ${new Date(fetchedAt).toISOString()})`)
  res.setHeader('X-Cache', source)
  res.setHeader('Cache-Control', 'no-cache')
  res.json(data)
}

app.get('/api/eurostat', async (_req, res) => send(res, '/api/eurostat', await getEurostat()))
app.get('/api/imf', async (_req, res) => send(res, '/api/imf', await getImf()))
app.get('/api/imf-quarterly', async (_req, res) =>
  send(res, '/api/imf-quarterly', await getImfQuarterly()),
)

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[api] error:', err.message)
  res.status(502).json({ error: 'Could not load data from the upstream source', detail: err.message })
})

app.listen(PORT, () => {
  console.log(`[api] listening on http://localhost:${PORT}`)
})
