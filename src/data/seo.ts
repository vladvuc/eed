/**
 * Per-tab SEO: every tab gets its own crawlable URL, title, description, keywords and
 * schema.org Dataset. Shared by the client (document head on tab switch) and the build
 * (vite.config.ts writes one static HTML page per tab, plus sitemap.xml and robots.txt).
 *
 * Kept free of imports so vite.config.ts can load it under Node; keys mirror TabId
 * (checked in seo.test.ts).
 */

export const SITE_NAME = 'European Economic Data'

/** Public URL used when SITE_URL isn't set at build time (SITE_URL overrides it, e.g. for a staging domain). */
export const DEFAULT_SITE_URL = 'https://eed.sveska.dev'

const EUROSTAT = { name: 'Eurostat', url: 'https://ec.europa.eu/eurostat' }
const IMF = { name: 'International Monetary Fund', url: 'https://www.imf.org' }

export interface PageSeo {
  /** Path with leading and trailing slash; the first tab lives at the root. */
  path: string
  /** <title> — kept under ~60 characters before the site name. */
  title: string
  /** Meta description — roughly 140–160 characters. */
  description: string
  keywords: string[]
  /** Visible heading in the pre-rendered HTML that crawlers see before the app loads. */
  heading: string
  /** schema.org Dataset fields. */
  dataset: {
    source: { name: string; url: string }
    sourceUrl: string
    variables: string[]
    temporal: string
  }
}

/** Added to every page's keywords. */
export const COMMON_KEYWORDS = ['European economy', 'Europe economic data', 'EU countries', 'Western Balkans', 'Serbia']

export const PAGE_SEO = {
  leaderboard: {
    path: '/',
    title: 'European Countries Ranked — Growth, Inflation and Debt',
    description:
      'Every European country ranked for one year by GDP growth, inflation or public debt (IMF), and by GDP back to 1970 incl. Yugoslavia (UN).',
    keywords: ['European countries ranking', 'fastest growing economies Europe', 'highest inflation Europe', 'most indebted countries Europe', 'Yugoslavia GDP', 'SFRY economy'],
    heading: 'European countries ranked by growth, inflation and debt',
    dataset: {
      source: IMF,
      sourceUrl: 'https://www.imf.org/external/datamapper/datasets/WEO',
      variables: [
        'Real GDP growth, % vs previous year',
        'Inflation, average consumer prices (% change)',
        'General government gross debt (% of GDP)',
      ],
      temporal: '1980/..',
    },
  },
  latest: {
    path: '/latest-quarter/',
    title: 'Latest Quarterly GDP Growth for Every European Country',
    description:
      'The most recent published quarter of real GDP growth for each European country, ranked, from IMF quarterly national accounts.',
    keywords: ['latest GDP figures', 'latest quarter GDP', 'GDP growth this quarter', 'quarterly GDP ranking Europe'],
    heading: 'Latest quarterly GDP growth for every European country',
    dataset: {
      source: IMF,
      sourceUrl: 'https://data.imf.org/en/datasets/IMF.STA:QNEA',
      variables: [
        'Real GDP, % change vs previous quarter (seasonally adjusted)',
        'Real GDP, % change vs same quarter a year earlier',
      ],
      temporal: '1995/..',
    },
  },
  eurostat: {
    path: '/gdp-eurostat/',
    title: 'European GDP by Country — Eurostat National Accounts',
    description:
      'Compare GDP of EU, Western Balkan and EFTA countries with Eurostat national accounts: current prices in euro, PPS, real GDP and annual growth, as charts and tables.',
    keywords: ['GDP Europe', 'Eurostat GDP', 'nama_10_gdp', 'GDP in euro', 'GDP PPS', 'real GDP', 'EU GDP by country'],
    heading: 'GDP of European countries — Eurostat national accounts',
    dataset: {
      source: EUROSTAT,
      sourceUrl: 'https://ec.europa.eu/eurostat/databrowser/view/nama_10_gdp/default/table',
      variables: [
        'GDP, current prices (€)',
        'GDP, current prices (PPS)',
        'Real GDP, chain-linked 2015 (€)',
        'Real GDP, volume index (2015 = 100)',
        'Real GDP growth, % vs previous year',
      ],
      temporal: '1975/..',
    },
  },
  imf: {
    path: '/gdp-imf/',
    title: 'GDP and GDP per Capita of European Countries — IMF',
    description:
      'Nominal GDP and GDP per capita for every European economy from the IMF World Economic Outlook, in US dollars and PPP international dollars, with charts and tables.',
    keywords: ['GDP per capita Europe', 'IMF GDP', 'World Economic Outlook', 'GDP PPP', 'nominal GDP US dollars', 'GDP ranking Europe'],
    heading: 'GDP and GDP per capita of European countries — IMF World Economic Outlook',
    dataset: {
      source: IMF,
      sourceUrl: 'https://www.imf.org/external/datamapper/datasets/WEO',
      variables: [
        'GDP, current prices (US$)',
        'GDP, PPP (international $)',
        'GDP per capita, current prices (US$)',
        'GDP per capita, PPP (international $)',
      ],
      temporal: '1980/..',
    },
  },
  'imf-quarterly': {
    path: '/quarterly-gdp/',
    title: 'Quarterly GDP Growth in Europe — IMF National Accounts',
    description:
      'Quarter-on-quarter and year-on-year real GDP growth for European countries from IMF quarterly national accounts, seasonally adjusted, as interactive charts.',
    keywords: ['quarterly GDP growth', 'GDP q/q', 'GDP y/y', 'seasonally adjusted GDP', 'IMF QNEA', 'recession Europe'],
    heading: 'Quarterly GDP growth in Europe — IMF national accounts',
    dataset: {
      source: IMF,
      sourceUrl: 'https://data.imf.org/en/datasets/IMF.STA:QNEA',
      variables: [
        'Real GDP, % change vs previous quarter (seasonally adjusted)',
        'Real GDP, % change vs same quarter a year earlier',
        'Nominal GDP, % change vs same quarter a year earlier',
        'Real GDP, volume index (2015 = 100, seasonally adjusted)',
      ],
      temporal: '1995/..',
    },
  },
  growth: {
    path: '/gdp-growth/',
    title: 'Real GDP Growth Rates in Europe by Country — IMF',
    description:
      'Annual real GDP growth for every European country from the IMF World Economic Outlook. Compare economic growth across the EU, Balkans and Eastern Europe.',
    keywords: ['GDP growth rate', 'economic growth Europe', 'real GDP growth', 'IMF growth forecast', 'GDP growth by country'],
    heading: 'Real GDP growth in European countries — IMF World Economic Outlook',
    dataset: {
      source: IMF,
      sourceUrl: 'https://www.imf.org/external/datamapper/datasets/WEO',
      variables: ['Real GDP growth, % vs previous year'],
      temporal: '1980/..',
    },
  },
  inflation: {
    path: '/inflation/',
    title: 'Inflation in Europe by Country — Consumer Prices (IMF)',
    description:
      'Consumer price inflation for every European country from the IMF World Economic Outlook: annual average and end-of-period CPI change, as charts and tables.',
    keywords: ['inflation Europe', 'inflation rate by country', 'CPI inflation', 'consumer prices', 'inflation Serbia', 'eurozone inflation'],
    heading: 'Inflation in European countries — IMF World Economic Outlook',
    dataset: {
      source: IMF,
      sourceUrl: 'https://www.imf.org/external/datamapper/datasets/WEO',
      variables: [
        'Inflation, average consumer prices (% change)',
        'Inflation, end-of-period consumer prices (% change)',
      ],
      temporal: '1980/..',
    },
  },
  debt: {
    path: '/public-debt/',
    title: 'Public Debt in Europe — Government Debt to GDP (IMF)',
    description:
      'General government gross debt for European countries as % of GDP, in euro and US dollars, plus the budget balance, from the IMF World Economic Outlook.',
    keywords: ['public debt Europe', 'government debt to GDP', 'debt to GDP ratio', 'national debt by country', 'budget deficit'],
    heading: 'Public debt in European countries — IMF World Economic Outlook',
    dataset: {
      source: IMF,
      sourceUrl: 'https://www.imf.org/external/datamapper/datasets/WEO',
      variables: [
        'General government gross debt (% of GDP)',
        'General government gross debt (€)',
        'General government gross debt (US$)',
        'Government net lending (+) / borrowing (−) (% of GDP)',
      ],
      temporal: '1980/..',
    },
  },
  cumulative: {
    path: '/cumulative-growth/',
    title: 'Cumulative GDP Growth in Europe Since Any Base Year',
    description:
      'How much each European economy has grown since a base year you choose: cumulative real GDP change and index, computed from IMF World Economic Outlook data.',
    keywords: ['cumulative GDP growth', 'GDP index', 'economic convergence', 'GDP since 2000', 'growth comparison Europe'],
    heading: 'Cumulative real GDP growth in Europe since a base year',
    dataset: {
      source: IMF,
      sourceUrl: 'https://www.imf.org/external/datamapper/datasets/WEO',
      variables: ['Real GDP, cumulative % change since base year', 'Real GDP, index (base year = 100)'],
      temporal: '1980/..',
    },
  },
} satisfies Record<string, PageSeo>

export type SeoPageId = keyof typeof PAGE_SEO

export const SEO_PAGE_IDS = Object.keys(PAGE_SEO) as SeoPageId[]

/** The page on the root path (the homepage). */
export const HOME_PAGE_ID = SEO_PAGE_IDS.find((id) => PAGE_SEO[id].path === '/') as SeoPageId

export function pageIdFromPath(pathname: string): SeoPageId | undefined {
  const normalized = `/${pathname.split('/').filter(Boolean).join('/')}/`.replace('//', '/')
  return SEO_PAGE_IDS.find((id) => PAGE_SEO[id].path === normalized)
}

export function fullTitle(page: PageSeo): string {
  return `${page.title} | ${SITE_NAME}`
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** JSON inside <script> must not be able to close the tag. */
const safeJson = (v: unknown) => JSON.stringify(v).replace(/</g, '\\u003c')

function jsonLd(page: PageSeo, url: string, siteUrl: string): unknown {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebSite', '@id': `${siteUrl}/#website`, name: SITE_NAME, url: `${siteUrl}/`, inLanguage: 'en' },
      {
        '@type': 'WebPage',
        '@id': `${url}#webpage`,
        url,
        name: page.title,
        description: page.description,
        isPartOf: { '@id': `${siteUrl}/#website` },
        inLanguage: 'en',
      },
      {
        '@type': 'Dataset',
        name: page.heading,
        description: page.description,
        url,
        keywords: page.keywords,
        variableMeasured: page.dataset.variables,
        spatialCoverage: { '@type': 'Place', name: 'Europe' },
        temporalCoverage: page.dataset.temporal,
        isBasedOn: page.dataset.sourceUrl,
        creator: { '@type': 'Organization', name: page.dataset.source.name, url: page.dataset.source.url },
        isAccessibleForFree: true,
      },
    ],
  }
}

/** The link-preview image, public/og-image.png (generated by scripts/build-og-image.ts). */
export interface OgImage {
  /** Short content hash, appended as ?v= so WhatsApp, LinkedIn and Facebook refetch a regenerated image. */
  version?: string
  alt?: string
}

/** Tags injected at <!--seo:head--> in index.html. */
export function renderHead(id: SeoPageId, siteUrl: string, ogImage: OgImage = {}): string {
  const page = PAGE_SEO[id]
  const url = `${siteUrl}${page.path}`
  const title = escapeHtml(fullTitle(page))
  const description = escapeHtml(page.description)
  const image = `${siteUrl}/og-image.png${ogImage.version ? `?v=${encodeURIComponent(ogImage.version)}` : ''}`
  const imageAlt = escapeHtml(ogImage.alt ?? SITE_NAME)
  return [
    `<title>${title}</title>`,
    `<meta name="description" content="${description}" />`,
    `<meta name="keywords" content="${escapeHtml([...page.keywords, ...COMMON_KEYWORDS].join(', '))}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:locale" content="en_GB" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:image" content="${image}" />`,
    `<meta property="og:image:type" content="image/png" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="${imageAlt}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${title}" />`,
    `<meta name="twitter:description" content="${description}" />`,
    `<meta name="twitter:image" content="${image}" />`,
    `<meta name="twitter:image:alt" content="${imageAlt}" />`,
    `<script type="application/ld+json">${safeJson(jsonLd(page, url, siteUrl))}</script>`,
  ].join('\n    ')
}

/**
 * Plain HTML injected at <!--seo:body--> inside #root: what crawlers and no-JS visitors
 * see. React replaces it on mount.
 */
export function renderBody(id: SeoPageId): string {
  const page = PAGE_SEO[id]
  const links = SEO_PAGE_IDS.map(
    (other) => `<li><a href="${PAGE_SEO[other].path}">${escapeHtml(PAGE_SEO[other].heading)}</a></li>`,
  ).join('')
  return [
    `<div class="seo-fallback">`,
    `<h1>${escapeHtml(page.heading)}</h1>`,
    `<p>${escapeHtml(page.description)}</p>`,
    `<p>Source: <a href="${page.dataset.sourceUrl}">${escapeHtml(page.dataset.source.name)}</a>. Loading interactive charts…</p>`,
    `<nav aria-label="Pages"><ul>${links}</ul></nav>`,
    `</div>`,
  ].join('')
}

export function renderSitemap(siteUrl: string, lastmod: string): string {
  const urls = SEO_PAGE_IDS.map(
    (id) =>
      `  <url>\n    <loc>${siteUrl}${PAGE_SEO[id].path}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>${id === HOME_PAGE_ID ? '1.0' : '0.8'}</priority>\n  </url>`,
  ).join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
}

export function renderRobots(siteUrl: string): string {
  return `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${siteUrl}/sitemap.xml\n`
}
