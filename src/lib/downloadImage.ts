import { toPng } from 'html-to-image'

/** Marks the part of the page the Download button saves (chart or table, plus the source footer). */
export const EXPORT_ROOT_ATTR = 'data-export-root'
/** Controls inside the export root that shouldn't appear in the image (CSV buttons, the pool). */
export const EXPORT_IGNORE_ATTR = 'data-export-ignore'

/** Saves what is on screen in the export root as a PNG (2× for sharp text), on the page background. */
export async function downloadVisibleChart(filename: string): Promise<void> {
  const node = document.querySelector<HTMLElement>(`[${EXPORT_ROOT_ATTR}]`)
  if (!node) return
  const dataUrl = await toPng(node, {
    pixelRatio: 2,
    backgroundColor: getComputedStyle(document.body).backgroundColor,
    preferredFontFormat: 'woff2',
    filter: (el) => !(el instanceof HTMLElement && el.hasAttribute(EXPORT_IGNORE_ATTR)),
    // Pad the edges so cards don't touch the image border.
    style: { padding: '16px' },
    width: node.offsetWidth + 32,
    height: node.offsetHeight + 32,
  })
  const link = document.createElement('a')
  link.download = filename
  link.href = dataUrl
  link.click()
}

/** "GDP, current prices (€)" → "gdp-current-prices" for file names. */
export function slug(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
