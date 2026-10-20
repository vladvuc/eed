import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import {
  HOME_PAGE_ID,
  PAGE_SEO,
  DEFAULT_SITE_URL,
  SEO_PAGE_IDS,
  pageIdFromPath,
  renderBody,
  renderHead,
  renderRobots,
  renderSitemap,
  type OgImage,
  type SeoPageId,
} from './src/data/seo.ts'

/** Version (content hash) and alt text of public/og-image.png, written by `pnpm build:og`. */
function ogImage(): OgImage {
  const root = import.meta.dirname
  const read = (file: string) => {
    try {
      return readFileSync(path.join(root, file))
    } catch {
      return undefined
    }
  }
  const png = read('public/og-image.png')
  const meta = read('src/data/og-image.json')
  return {
    version: png && createHash('sha256').update(png).digest('hex').slice(0, 8),
    alt: meta && (JSON.parse(meta.toString('utf8')) as { alt?: string }).alt,
  }
}

/**
 * Fills the <!--seo:head--> / <!--seo:body--> markers in index.html per tab. The build
 * writes dist/<tab>/index.html for every tab, plus sitemap.xml and robots.txt, so each
 * tab is a real, crawlable URL that a plain static file server can serve.
 */
function seoPages(): Plugin {
  // `||`, not `??`: the Dockerfile sets SITE_URL to an empty string when no build argument is given.
  const siteUrl = (process.env.SITE_URL || DEFAULT_SITE_URL).replace(/\/+$/, '')
  const image = ogImage()
  let outDir = 'dist'
  let template = ''

  const render = (html: string, id: SeoPageId) =>
    html.replace('<!--seo:head-->', renderHead(id, siteUrl, image)).replace('<!--seo:body-->', renderBody(id))

  return {
    name: 'seo-pages',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir)
      if (config.command === 'build' && !process.env.SITE_URL) {
        config.logger.info(`[seo] SITE_URL is not set; canonical URLs, og:image and sitemap.xml use ${DEFAULT_SITE_URL}`)
      }
    },
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        template = html
        // Dev serves index.html for every tab path, so render the tab that was asked for.
        const id = (ctx.server && pageIdFromPath(new URL(ctx.originalUrl ?? '/', 'http://x').pathname)) || HOME_PAGE_ID
        return render(html, id)
      },
    },
    async closeBundle() {
      if (!template) return
      for (const id of SEO_PAGE_IDS) {
        const { path: pagePath } = PAGE_SEO[id]
        if (pagePath === '/') continue // dist/index.html is already rendered for the root tab
        const dir = path.join(outDir, pagePath)
        await mkdir(dir, { recursive: true })
        await writeFile(path.join(dir, 'index.html'), render(template, id))
      }
      await writeFile(path.join(outDir, 'sitemap.xml'), renderSitemap(siteUrl, new Date().toISOString().slice(0, 10)))
      await writeFile(path.join(outDir, 'robots.txt'), renderRobots(siteUrl))
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), seoPages()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    port: 5173,
    // Listen on the LAN too, so the dev app can be opened on a phone (http://<this machine's IP>:5173).
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
