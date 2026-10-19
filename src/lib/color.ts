/** Small sRGB / OKLab helpers for flag colours: perceptual distance and surface contrast. */

export type Oklab = { L: number; a: number; b: number }

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const fromLinear = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as [number, number, number]
}

function rgbToHex(rgb: [number, number, number]): string {
  return '#' + rgb.map((c) => Math.round(Math.min(1, Math.max(0, c)) * 255).toString(16).padStart(2, '0')).join('')
}

export function hexToOklab(hex: string): Oklab {
  const [r, g, b] = hexToRgb(hex).map(toLinear)
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  return {
    L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  }
}

/** Linear sRGB for an OKLab colour; components may fall outside 0..1 (out of gamut). */
function oklabToLinear({ L, a, b }: Oklab): [number, number, number] {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
}

const inGamut = (rgb: number[]) => rgb.every((c) => c >= -1e-4 && c <= 1 + 1e-4)

/** OKLab difference ×100 (the scale used by the dataviz palette checks). */
export function deltaE(x: string, y: string): number {
  const p = hexToOklab(x)
  const q = hexToOklab(y)
  return 100 * Math.hypot(p.L - q.L, p.a - q.a, p.b - q.b)
}

export function chroma(hex: string): number {
  const { a, b } = hexToOklab(hex)
  return Math.hypot(a, b)
}

function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map(toLinear)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** WCAG contrast ratio. */
export function contrast(x: string, y: string): number {
  const [hi, lo] = [luminance(x), luminance(y)].sort((p, q) => q - p)
  return (hi + 0.05) / (lo + 0.05)
}

/** The colour at lightness `L` with the same hue, chroma reduced only as far as the sRGB gamut requires. */
function atLightness(lab: Oklab, L: number): string {
  const c0 = Math.hypot(lab.a, lab.b)
  const h = Math.atan2(lab.b, lab.a)
  const make = (c: number) => oklabToLinear({ L, a: c * Math.cos(h), b: c * Math.sin(h) })
  let rgb = make(c0)
  if (!inGamut(rgb)) {
    let lo = 0
    let hi = c0
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2
      if (inGamut(make(mid))) lo = mid
      else hi = mid
    }
    rgb = make(lo)
  }
  return rgbToHex(rgb.map(fromLinear) as [number, number, number])
}

/**
 * Keeps the flag colour when it already reaches `min` contrast against the surface;
 * otherwise moves only its lightness (darker on light surfaces, lighter on dark ones)
 * by the smallest step that does, so the hue stays recognisable.
 */
export function ensureContrast(hex: string, surface: string, min = 3): string {
  if (contrast(hex, surface) >= min) return hex
  const lab = hexToOklab(hex)
  const darken = luminance(surface) > 0.18
  let near = lab.L // fails
  let far = darken ? 0 : 1 // passes (black / white)
  for (let i = 0; i < 24; i++) {
    const mid = (near + far) / 2
    if (contrast(atLightness(lab, mid), surface) >= min) far = mid
    else near = mid
  }
  return atLightness(lab, far)
}

/** Same hue, OKLab lightness moved by `dL` (chroma trimmed only if it leaves the sRGB gamut). */
export function shiftLightness(hex: string, dL: number): string {
  const lab = hexToOklab(hex)
  return atLightness(lab, Math.min(1, Math.max(0, lab.L + dL)))
}

/** Interpolates between two colours in OKLab (perceptually even steps), t in 0..1. */
export function mix(from: string, to: string, t: number): string {
  const a = hexToOklab(from)
  const b = hexToOklab(to)
  const k = Math.min(1, Math.max(0, t))
  const rgb = oklabToLinear({ L: a.L + (b.L - a.L) * k, a: a.a + (b.a - a.a) * k, b: a.b + (b.b - a.b) * k })
  return rgbToHex(rgb.map(fromLinear) as [number, number, number])
}
