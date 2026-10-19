import { flagColors } from '../data/flags'
import { chroma, contrast, deltaE, ensureContrast, hexToOklab, shiftLightness } from './color'

export type Scheme = 'light' | 'dark'

/** Chart surfaces (the card colour): white in light mode, oklch(0.205 0 0) in dark mode. */
export const SURFACE: Record<Scheme, string> = { light: '#ffffff', dark: '#171717' }

/** Below this OKLab distance (×100) two lines are treated as "the same colour". */
export const SAME_COLOR_DE = 15

/** Minimum contrast against the chart surface for a line or bar (WCAG non-text contrast). */
const MIN_CONTRAST = 3

/**
 * The flag colours of a country as they can be drawn on the given surface.
 * Chromatic colours that are too faint (e.g. yellow on white, navy on near-black) keep their hue and
 * shift lightness until they reach 3:1; white/black that blend into the surface are dropped instead.
 */
export function drawableFlagColors(code: string, scheme: Scheme): string[] {
  const surface = SURFACE[scheme]
  const out: string[] = []
  for (const hex of flagColors(code)) {
    const usable = chroma(hex) < 0.03 ? (contrast(hex, surface) >= MIN_CONTRAST ? hex : null) : ensureContrast(hex, surface, MIN_CONTRAST)
    if (usable && !out.some((c) => deltaE(c, usable) < 1)) out.push(usable.toLowerCase())
  }
  return out.length ? out : [ensureContrast(flagColors(code)[0], surface, MIN_CONTRAST).toLowerCase()]
}

const SHADE_STEPS = [0.12, -0.12, 0.22, -0.22]

/**
 * Lighter/darker variants of the chromatic flag colours that still read on the surface
 * and still look like the hue (not near-black navy or washed-out pastel).
 */
function shadesOf(options: string[], scheme: Scheme): string[] {
  const surface = SURFACE[scheme]
  return SHADE_STEPS.flatMap((dL) =>
    options.filter((c) => chroma(c) >= 0.03).map((c) => shiftLightness(c, dL)),
  ).filter((c) => {
    const { L } = hexToOklab(c)
    return contrast(c, surface) >= MIN_CONTRAST && chroma(c) >= 0.05 && L >= 0.32 && L <= 0.88
  })
}

/** A country's primary flag colour on the given surface. */
export function primaryFlagColor(code: string, scheme: Scheme): string {
  return drawableFlagColors(code, scheme)[0]
}

/**
 * Colours for the selected countries, in the order they were picked.
 * Each takes its primary flag colour unless an earlier pick already uses (nearly) that colour,
 * then its secondary, then its tertiary. If all of them clash (e.g. a red-and-white flag when the reds
 * are taken), it falls back to a lighter or darker shade of its own flag colours, and only then to
 * whichever of those clashes least.
 */
export function assignFlagColors(codes: readonly string[], scheme: Scheme): Record<string, string> {
  const out: Record<string, string> = {}
  const used: string[] = []
  for (const code of codes) {
    const options = drawableFlagColors(code, scheme)
    const nearest = (c: string) => Math.min(Infinity, ...used.map((u) => deltaE(c, u)))
    const clear = (c: string) => nearest(c) >= SAME_COLOR_DE
    const shades = shadesOf(options, scheme)
    const pick =
      options.find(clear) ??
      shades.find(clear) ??
      [...options, ...shades].reduce((best, c) => (nearest(c) > nearest(best) ? c : best))
    out[code] = pick
    used.push(pick)
  }
  return out
}
