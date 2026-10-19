import { describe, expect, it } from 'vitest'
import { FLAG_COLORS, flagColors } from '../data/flags'
import { contrast, deltaE, ensureContrast } from './color'
import { SAME_COLOR_DE, SURFACE, assignFlagColors, drawableFlagColors, primaryFlagColor } from './flagColors'

describe('flag colours', () => {
  it('maps Eurostat codes onto the same flags as IMF codes', () => {
    expect(flagColors('EL')).toEqual(FLAG_COLORS.GRC)
    expect(flagColors('UK')).toEqual(FLAG_COLORS.GBR)
    expect(flagColors('XK')).toEqual(FLAG_COLORS.UVK)
    expect(flagColors('EU27_2020')).toEqual(FLAG_COLORS.EU)
  })

  it('uses the primary flag colour when nothing clashes', () => {
    expect(assignFlagColors(['DEU'], 'dark')).toEqual({ DEU: '#d00000' })
    expect(assignFlagColors(['UKR'], 'light')).toEqual({ UKR: '#0057b7' })
  })

  it('falls to the secondary colour when the primary is already on the chart', () => {
    // Austria and Denmark share the same red; Denmark comes second, so it gets white (dark mode).
    const dark = assignFlagColors(['AUT', 'DNK'], 'dark')
    expect(dark.AUT).toBe('#c8102e')
    expect(dark.DNK).toBe('#ffffff')
    // Sweden's blue (lifted for the dark card) is free, Ukraine's blue is close to it -> Ukraine takes its yellow.
    const c = assignFlagColors(['SWE', 'UKR'], 'dark')
    expect(c.SWE).toBe('#206998')
    expect(c.UKR).toBe('#ffd700')
  })

  it('goes on to the tertiary colour when primary and secondary are both taken', () => {
    // Romania (blue, yellow, red) after Sweden (blue) and Ukraine (yellow) -> red.
    const c = assignFlagColors(['SWE', 'UKR', 'ROU'], 'dark')
    expect(c.ROU).toBe('#ce1126')
  })

  it('never repaints earlier picks when a country is added', () => {
    const before = assignFlagColors(['DEU', 'FRA', 'ITA'], 'light')
    const after = assignFlagColors(['DEU', 'FRA', 'ITA', 'ESP'], 'light')
    expect(after).toMatchObject(before)
  })

  it('uses a lighter or darker shade of its own flag once every flag colour is taken', () => {
    // Light mode: white is not drawable, so Poland only has red, which Austria already uses.
    const c = assignFlagColors(['AUT', 'POL'], 'light')
    expect(c.POL).not.toBe('#d4213d')
    expect(deltaE(c.POL, c.AUT)).toBeGreaterThanOrEqual(SAME_COLOR_DE)
    expect(contrast(c.POL, SURFACE.light)).toBeGreaterThanOrEqual(2.99)
  })

  it('only draws colours that stand out from the chart surface', () => {
    for (const scheme of ['light', 'dark'] as const)
      for (const code of Object.keys(FLAG_COLORS))
        for (const c of drawableFlagColors(code, scheme)) expect(contrast(c, SURFACE[scheme])).toBeGreaterThanOrEqual(2.99)
    // white is dropped on a white card; navy is lifted on a dark one, keeping its hue
    expect(drawableFlagColors('POL', 'light')).toEqual(['#d4213d'])
    expect(primaryFlagColor('FIN', 'dark')).not.toBe('#002f6c')
  })

  it('ensureContrast leaves colours that already pass untouched', () => {
    expect(ensureContrast('#C8102E', '#ffffff')).toBe('#C8102E')
    expect(contrast(ensureContrast('#FFD700', '#ffffff'), '#ffffff')).toBeGreaterThanOrEqual(2.99)
  })
})
