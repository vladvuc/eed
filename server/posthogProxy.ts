import type { NextFunction, Request, Response } from 'express'
import { POSTHOG_API_HOST, POSTHOG_ASSET_HOST } from './analytics.ts'

/**
 * Reverse proxy for the browser SDK (mounted on /rly, see src/lib/analytics.ts): ad blockers block
 * posthog.com but not this site's own paths. Follows https://posthog.com/docs/advanced/proxy/node.
 */

// Not forwarded: credentials for this site, hop-by-hop headers, and the proxy chain in front of us
// (Cloudflare's cdn-loop would make PostHog's own Cloudflare reject the request as a loop).
const DROP_REQUEST = new Set([
  'host', 'cookie', 'authorization', 'connection', 'content-length', 'transfer-encoding',
  'forwarded', 'via', 'cdn-loop', 'x-real-ip',
])
// fetch has already decoded the body, so its encoding and length no longer apply.
const DROP_RESPONSE = new Set(['content-encoding', 'content-length', 'transfer-encoding', 'connection'])
const TIMEOUT_MS = 15_000

/** The visitor's IP (Cloudflare → Traefik → us), so PostHog's GeoIP sees the visitor, not this server. */
function clientIp(req: Request): string | undefined {
  const cf = req.headers['cf-connecting-ip']
  if (typeof cf === 'string') return cf
  const xff = req.headers['x-forwarded-for']
  const first = (Array.isArray(xff) ? xff[0] : xff)?.split(',')[0]?.trim()
  return first || req.socket.remoteAddress
}

export async function posthogProxy(req: Request, res: Response, next: NextFunction) {
  const host = /^\/(static|array)\//.test(req.url) ? POSTHOG_ASSET_HOST : POSTHOG_API_HOST

  const headers = new Headers()
  for (const [name, value] of Object.entries(req.headers)) {
    if (value === undefined || DROP_REQUEST.has(name) || name.startsWith('cf-') || name.startsWith('x-forwarded-')) continue
    headers.set(name, Array.isArray(value) ? value.join(', ') : value)
  }
  const ip = clientIp(req)
  if (ip) {
    headers.set('x-forwarded-for', ip)
    headers.set('x-real-ip', ip)
  }
  if (req.headers.host) headers.set('x-forwarded-host', req.headers.host)

  try {
    let body: Buffer | undefined
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const chunks: Buffer[] = []
      for await (const chunk of req) chunks.push(chunk as Buffer)
      body = Buffer.concat(chunks)
    }
    const upstream = await fetch(`https://${host}${req.url}`, {
      method: req.method,
      headers,
      body,
      redirect: 'manual',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    upstream.headers.forEach((value, name) => {
      if (!DROP_RESPONSE.has(name)) res.setHeader(name, value)
    })
    res.status(upstream.status).send(Buffer.from(await upstream.arrayBuffer()))
  } catch (err) {
    console.warn(`[posthog-proxy] ${req.method} ${req.url} failed:`, (err as Error).message)
    if (res.headersSent) return next(err)
    res.status(502).end()
  }
}
