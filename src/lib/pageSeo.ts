import { COMMON_KEYWORDS, PAGE_SEO, fullTitle, type SeoPageId } from '../data/seo'

/** Client: keep the head in sync when the user switches tabs without a page load. */
export function applyPageSeo(id: SeoPageId): void {
  const page = PAGE_SEO[id]
  const title = fullTitle(page)
  document.title = title
  const set = (selector: string, attr: 'content' | 'href', value: string) =>
    document.head.querySelector(selector)?.setAttribute(attr, value)

  // Keep the build-time origin (SITE_URL) and swap only the path.
  const canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  const url = canonical ? new URL(page.path, canonical.href).href : undefined
  if (url) {
    canonical!.href = url
    set('meta[property="og:url"]', 'content', url)
  }
  set('meta[name="description"]', 'content', page.description)
  set('meta[name="keywords"]', 'content', [...page.keywords, ...COMMON_KEYWORDS].join(', '))
  set('meta[property="og:title"]', 'content', title)
  set('meta[property="og:description"]', 'content', page.description)
  set('meta[name="twitter:title"]', 'content', title)
  set('meta[name="twitter:description"]', 'content', page.description)
}
