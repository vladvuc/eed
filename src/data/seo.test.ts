import { describe, expect, it } from 'vitest'
import { DEFAULT_SITE_URL, PAGE_SEO, SEO_PAGE_IDS, pageIdFromPath, renderHead, renderSitemap } from './seo'
import { TABS } from './tabs'

describe('PAGE_SEO', () => {
  it('has exactly one page per tab, each on a unique path', () => {
    expect([...SEO_PAGE_IDS].sort()).toEqual(TABS.map((t) => t.id).sort())
    const paths = SEO_PAGE_IDS.map((id) => PAGE_SEO[id].path)
    expect(new Set(paths).size).toBe(paths.length)
    expect(paths.every((p) => p.startsWith('/') && p.endsWith('/'))).toBe(true)
  })

  it('keeps titles and descriptions within search-result lengths', () => {
    for (const id of SEO_PAGE_IDS) {
      expect(PAGE_SEO[id].title.length).toBeLessThanOrEqual(60)
      expect(PAGE_SEO[id].description.length).toBeLessThanOrEqual(170)
    }
  })
})

describe('pageIdFromPath', () => {
  it('matches with or without the trailing slash', () => {
    expect(pageIdFromPath('/')).toBe('leaderboard')
    expect(pageIdFromPath('/gdp-eurostat/')).toBe('eurostat')
    expect(pageIdFromPath('/inflation/')).toBe('inflation')
    expect(pageIdFromPath('/inflation')).toBe('inflation')
    expect(pageIdFromPath('/public-debt/')).toBe('debt')
    expect(pageIdFromPath('/nope/')).toBeUndefined()
  })
})

describe('rendering', () => {
  it('puts an absolute canonical URL and escaped JSON-LD in the head', () => {
    const head = renderHead('inflation', 'https://site.test')
    expect(head).toContain('<link rel="canonical" href="https://site.test/inflation/" />')
    expect(head).toContain('"@type":"Dataset"')
    expect(head).not.toMatch(/<\/script>.*<\/script>/s) // only the closing tag of the JSON-LD block
  })

  it('points the preview image at the site URL, versioned so caches refresh', () => {
    const head = renderHead('leaderboard', 'https://site.test', { version: 'ab12cd34', alt: 'Map of Europe' })
    expect(head).toContain('<meta property="og:image" content="https://site.test/og-image.png?v=ab12cd34" />')
    expect(head).toContain('<meta name="twitter:image" content="https://site.test/og-image.png?v=ab12cd34" />')
    expect(head).toContain('<meta property="og:image:type" content="image/png" />')
    expect(head).toContain('<meta property="og:image:alt" content="Map of Europe" />')
    for (const id of SEO_PAGE_IDS) expect(renderHead(id, 'https://site.test')).not.toContain(DEFAULT_SITE_URL)
  })

  it('lists every page in the sitemap', () => {
    const xml = renderSitemap('https://site.test', '2026-10-20')
    for (const id of SEO_PAGE_IDS) expect(xml).toContain(`<loc>https://site.test${PAGE_SEO[id].path}</loc>`)
  })
})
