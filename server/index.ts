import compression from 'compression'
import express, { type NextFunction, type Request, type Response } from 'express'
import { existsSync } from 'node:fs'
import path from 'node:path'
import type { CachedResult } from './cache.ts'
import { getEurostat } from './eurostat.ts'
import { getImf } from './imf.ts'
import { getImfQuarterly } from './imfq.ts'
import type { StatDataset } from './types.ts'

const app = express()
const PORT = Number(process.env.PORT ?? 3001)
const PRODUCTION = process.env.NODE_ENV === 'production'

// The datasets are a few hundred KB of JSON; gzip roughly halves that.
app.use(compression())

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

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Not found' })
})

// In production this one process also serves the built client (`pnpm build` → dist/).
// Tabs live in the URL hash, so no history fallback is needed. Hashed assets are cached for a year;
// index.html is always revalidated so a redeploy shows up immediately.
const DIST = path.resolve(import.meta.dirname, '..', 'dist')
if (PRODUCTION) {
  if (!existsSync(path.join(DIST, 'index.html'))) {
    console.error(`[web] ${DIST}/index.html not found — run \`pnpm build\` first`)
    process.exit(1)
  }
  app.use(
    express.static(DIST, {
      setHeaders(res, file) {
        res.setHeader(
          'Cache-Control',
          file.includes(`${path.sep}assets${path.sep}`) ? 'public, max-age=31536000, immutable' : 'no-cache',
        )
      },
    }),
  )
}

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[api] error:', err.message)
  res.status(502).json({ error: 'Could not load data from the upstream source', detail: err.message })
})

const server = app.listen(PORT, () => {
  console.log(`[api] listening on http://localhost:${PORT}${PRODUCTION ? ' (serving dist/)' : ''}`)
})

// Containers stop with SIGTERM: finish open requests, then exit.
process.on('SIGTERM', () => server.close(() => process.exit(0)))
