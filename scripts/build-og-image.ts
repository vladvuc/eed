/**
 * Generates public/og-image.png, the 1200×630 link preview (WhatsApp, Slack, LinkedIn, X, …):
 * the site name next to the leaderboard map of Europe, coloured by IMF real GDP growth in the
 * latest year that isn't a projection, and that year's three fastest-growing economies.
 * Also writes src/data/og-image.json (the image's alt text, read by vite.config.ts).
 *
 *   pnpm build:og
 *
 * Run it after a new WEO vintage and commit both files; the Docker build needs no network for it.
 * Data comes through the server's cached IMF loader (server/cache/imf.json, fetched if missing or stale).
 */
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { Resvg, type ResvgRenderOptions } from '@resvg/resvg-js'
import { decompress } from 'wawoff2'
import { getImf, IMF_EUROPE, projectionsFromVintage } from '../server/imf.ts'
import { displayName, KOSOVO_FOOTNOTE } from '../src/data/countries.ts'
import geometry from '../src/data/europe-map.json' with { type: 'json' }
import { IMF_GROWTH_MEASURES } from '../src/data/measures.ts'
import { SITE_NAME } from '../src/data/seo.ts'
import { mapScale } from '../src/lib/mapScale.ts'

const root = path.resolve(import.meta.dirname, '..')
const OUT_PNG = path.join(root, 'public', 'og-image.png')
const OUT_META = path.join(root, 'src', 'data', 'og-image.json')

const W = 1200
const H = 630
// Light theme, as the current preview and site icon: warm off-white paper, near-black ink.
const PAPER = '#faf9f6'
const INK = '#2b2a27'
const INK_SECONDARY = '#52514e'
const INK_MUTED = '#898781'
const MAP_EMPTY = '#c9c8c2'
const AGGREGATES = new Set(['EU', 'EURO', 'EDE'])

const growth = IMF_GROWTH_MEASURES[0]

// ---------- Data: real GDP growth in the last year that isn't a projection ----------

const { data: ds } = await getImf()
const firstProjection = Number(projectionsFromVintage(ds.updated) ?? ds.periods.at(-1))
const series = ds.measures[growth.code] ?? {}
const yearIdx = ds.periods.findLastIndex(
  (p) => Number(p) < firstProjection && Object.values(series).some((s) => s[ds.periods.indexOf(p)] != null),
)
if (yearIdx < 0) throw new Error(`No ${growth.code} data before ${firstProjection}`)
const year = ds.periods[yearIdx]

const labels = new Map(ds.countries.map((c) => [c.code, c.name]))
const values = new Map<string, number>()
for (const code of IMF_EUROPE) {
  const v = series[code]?.[yearIdx]
  if (!AGGREGATES.has(code) && v != null) values.set(code, v)
}
const scale = mapScale(growth.code, growth.isLevel, [...values.values()], 'light')
const top = [...values].sort((a, b) => b[1] - a[1]).slice(0, 3)
const countryCount = IMF_EUROPE.filter((c) => !AGGREGATES.has(c)).length
console.log(`[og] ${growth.code} ${year} (${ds.updated}): ${values.size} countries, domain ${scale.domain.join('…')}`)

// ---------- SVG ----------

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const fillOf = (code: string) => {
  const v = values.get(code)
  return v === undefined ? 'url(#no-data)' : scale.colorOf(v)
}

// The map fills the right ~60% and bleeds off the right and bottom edges.
const MAP_SCALE = 0.79
const MAP_X = 448
const MAP_Y = 4
const map = `
  <g transform="translate(${MAP_X} ${MAP_Y}) scale(${MAP_SCALE})">
    ${geometry.countries
      .map((c) => `<path d="${c.d}" fill="${fillOf(c.code)}" stroke="${PAPER}" stroke-width="0.9" stroke-linejoin="round"/>`)
      .join('')}
    ${geometry.countries
      .filter((c) => c.dot)
      .map((c) => `<circle cx="${c.cx}" cy="${c.cy}" r="5" fill="${fillOf(c.code)}" stroke="${PAPER}" stroke-width="1.5"/>`)
      .join('')}
  </g>`

const icon = `data:image/svg+xml;base64,${(await readFile(path.join(root, 'public', 'favicon.svg'))).toString('base64')}`

const X = 64
// "European Economic Data" → "European" / "Economic Data"
const [firstWord, ...restWords] = SITE_NAME.split(' ')
const titleLines = [firstWord, restWords.join(' ')]
const text = (x: number, y: number, size: number, weight: number, fill: string, body: string, extra = '') =>
  `<text x="${x}" y="${y}" font-family="SN Pro" font-size="${size}" font-weight="${weight}" fill="${fill}" ${extra}>${body}</text>`

// Fastest growing: name, bar, value.
const LIST_Y = 352
const ROW = 40
const BAR_X = X + 170
const BAR_MAX = 150
const maxTop = Math.max(...top.map(([, v]) => v), 1e-9)
const list = [
  text(X, LIST_Y, 17, 600, INK_MUTED, `FASTEST GROWING IN ${year}`, 'letter-spacing="1.2"'),
  ...top.map(([code, v], i) => {
    const y = LIST_Y + 38 + i * ROW
    const w = Math.max(4, (Math.max(v, 0) / maxTop) * BAR_MAX)
    return [
      text(X, y, 22, 600, INK, esc(displayName(code, labels.get(code)))),
      `<rect x="${BAR_X}" y="${y - 14}" width="${w.toFixed(1)}" height="14" rx="3" fill="${scale.colorOf(v)}"/>`,
      text(BAR_X + w + 10, y, 20, 500, INK_SECONDARY, esc(growth.formatValue(v)), 'font-variant-numeric="tabular-nums"'),
    ].join('')
  }),
].join('')

// Diverging legend: gradient with min / 0 / max ticks, plus the no-data swatch.
const LEG_Y = 512
const LEG_W = 300
const legend = [
  `<defs><linearGradient id="legend" x1="0" x2="1" y1="0" y2="0">${scale.stops
    .map((c, i) => `<stop offset="${(i / (scale.stops.length - 1)).toFixed(3)}" stop-color="${c}"/>`)
    .join('')}</linearGradient></defs>`,
  text(X, LEG_Y, 16, 500, INK_SECONDARY, esc(`Real GDP growth ${year}, % vs previous year`)),
  `<rect x="${X}" y="${LEG_Y + 12}" width="${LEG_W}" height="10" rx="2" fill="url(#legend)"/>`,
  ...scale.ticks.map((t) => {
    const pos = scale.position(t)
    const anchor = pos === 0 ? 'start' : pos === 1 ? 'end' : 'middle'
    return text(X + pos * LEG_W, LEG_Y + 42, 14, 500, INK_MUTED, esc(growth.formatTick(t)), `text-anchor="${anchor}"`)
  }),
  `<rect x="${X + LEG_W + 20}" y="${LEG_Y + 12}" width="12" height="12" rx="2" fill="url(#no-data)" stroke="${MAP_EMPTY}" stroke-width="0.5"/>`,
  text(X + LEG_W + 36, LEG_Y + 21, 14, 500, INK_MUTED, 'no data'),
].join('')

const kosovoListed = top.some(([code]) => displayName(code, labels.get(code)).endsWith('*'))
const footer = [
  text(X, 598, 16, 500, INK_MUTED, esc(`Eurostat & IMF data · ${Math.floor(countryCount / 10) * 10}+ European countries`)),
  kosovoListed ? text(X, 618, 10, 400, INK_MUTED, esc(KOSOVO_FOOTNOTE)) : '',
].join('')

const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <pattern id="no-data" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="5" height="5" fill="${PAPER}"/>
      <rect width="2" height="5" fill="${MAP_EMPTY}"/>
    </pattern>
    <linearGradient id="fade" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0" stop-color="${PAPER}" stop-opacity="1"/>
      <stop offset="1" stop-color="${PAPER}" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="${PAPER}"/>
  ${map}
  <!-- Soften the map's western edge where it runs under the text column. -->
  <rect x="${MAP_X - 10}" y="0" width="90" height="${H}" fill="url(#fade)"/>
  <image href="${icon}" x="${X}" y="56" width="52" height="52"/>
  ${text(X, 176, 54, 700, INK, esc(titleLines[0]))}
  ${text(X, 236, 54, 700, INK, esc(titleLines[1]))}
  ${text(X, 282, 24, 500, INK_SECONDARY, 'GDP · growth · inflation · public debt')}
  ${list}
  ${legend}
  ${footer}
</svg>`

// ---------- Rasterise ----------

// resvg reads TTF/OTF only; the site ships SN Pro as WOFF2, so unpack it in memory.
const FONT_DIR = path.join(root, 'src', 'assets', 'fonts', 'sn-pro')
const fontBuffers = await Promise.all(
  ['Regular', 'Medium', 'Semibold', 'Bold'].map(async (w) =>
    Buffer.from(await decompress(await readFile(path.join(FONT_DIR, `SNPro-${w}.woff2`)))),
  ),
)
// The native binding accepts fontBuffers, but its typings only list fontFiles.
const font = { fontBuffers, loadSystemFonts: false, defaultFontFamily: 'SN Pro' } as ResvgRenderOptions['font']
const png = new Resvg(svg, { font, fitTo: { mode: 'original' } }).render().asPng()

await writeFile(OUT_PNG, png)
await writeFile(OUT_META, `${JSON.stringify({ alt: `Map of Europe coloured by real GDP growth in ${year}` }, null, 2)}\n`)
console.log(`[og] wrote ${path.relative(root, OUT_PNG)} (${(png.length / 1024).toFixed(0)} KB) and ${path.relative(root, OUT_META)}`)
