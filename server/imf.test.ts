import { describe, expect, it } from 'vitest'
import { deriveDebtLevels, lastYear, normalizeImf, projectionsFromVintage, truncateToYear, type ImfRaw } from './imf.ts'
import fixture from './__fixtures__/imf.small.json' with { type: 'json' }

// Real DataMapper values for NGDPD + GGXWDG_NGDP, trimmed to a few economies and years.
const raw = fixture as unknown as ImfRaw
const out = normalizeImf(raw)

describe('normalizeImf (DataMapper → compact dataset)', () => {
  it('keeps only European economies, in the configured order, with display names', () => {
    const codes = out.countries.map((c) => c.code)
    expect(codes).toEqual(['DEU', 'UVK', 'UKR', 'RUS', 'EU'])
    expect(codes).not.toContain('SDN')
    expect(out.countries.find((c) => c.code === 'RUS')?.name).toBe('Russia')
    expect(out.countries.find((c) => c.code === 'UKR')?.name).toBe('Ukraine')
  })

  it('builds a continuous year axis and aligns sparse series on it', () => {
    expect(out.frequency).toBe('A')
    expect(out.periods[0]).toBe('1992')
    expect(out.periods[out.periods.length - 1]).toBe('2031')
    expect(out.periods).toHaveLength(2031 - 1992 + 1)
    const ukr = out.measures.NGDPD.UKR
    expect(ukr[out.periods.indexOf('2024')]).toBe(raw.values.NGDPD!.UKR['2024'])
    expect(ukr[out.periods.indexOf('2000')]).toBeNull() // year absent from the trimmed fixture
  })

  it('omits a country from a measure when the IMF has no series for it', () => {
    // Russia starts in 1992 for GDP but the fixture only has debt from 1993 → still present
    expect(out.measures.GGXWDG_NGDP.RUS).toBeDefined()
    expect(out.measures.NGDP_RPCH).toEqual({}) // indicator not in fixture
  })

  it('derives the projection start from the WEO vintage', () => {
    expect(out.updated).toBe('World Economic Outlook (October 2026)')
    expect(out.projectionsFrom).toBe('2026')
    expect(projectionsFromVintage('World Economic Outlook (April 2025)')).toBe('2025')
    expect(projectionsFromVintage('nonsense')).toBeUndefined()
  })

  it('throws when nothing European is present', () => {
    expect(() => normalizeImf({ ...raw, values: { NGDPD: { SDN: { '2024': 1 } } } })).toThrow(/European/)
  })
})

describe('deriveDebtLevels', () => {
  const base = normalizeImf(raw)
  // Fixture has NGDPD (bn US$) and GGXWDG_NGDP (% of GDP) for UKR/RUS/DEU/UVK.
  const rates = { '2024': 1.0824, '2025': 1.13 }
  const out = deriveDebtLevels(base, rates)
  const i24 = out.periods.indexOf('2024')
  const i26 = out.periods.indexOf('2026')

  it('multiplies the debt ratio by nominal GDP in US$', () => {
    const ratio = raw.values.GGXWDG_NGDP!.UKR['2024']
    const gdp = raw.values.NGDPD!.UKR['2024']
    expect(out.measures.GGXWDG_USD.UKR[i24]).toBeCloseTo((ratio / 100) * gdp, 6)
    expect(out.measures.GGXWDG_USD.UKR[out.periods.indexOf('2000')]).toBeNull()
  })

  it('converts to euros with the annual rate and reuses the last rate for later years', () => {
    expect(out.measures.GGXWDG_EUR.UKR[i24]).toBeCloseTo(out.measures.GGXWDG_USD.UKR[i24]! / 1.0824, 6)
    expect(out.measures.GGXWDG_EUR.UKR[i26]).toBeCloseTo(out.measures.GGXWDG_USD.UKR[i26]! / 1.13, 6)
    expect(out.measures.GGXWDG_EUR.UKR[out.periods.indexOf('1993')]).toBeNull() // no rate that year in this fixture
    expect(out.notes?.some((n) => n.includes('2025 rate'))).toBe(true)
  })

  it('omits the euro measure when rates are unavailable', () => {
    const noFx = deriveDebtLevels(base, null)
    expect(noFx.measures.GGXWDG_EUR).toBeUndefined()
    expect(noFx.measures.GGXWDG_USD.DEU).toBeDefined()
    expect(noFx.notes?.some((n) => n.includes('unavailable'))).toBe(true)
  })
})

describe('truncateToYear', () => {
  const base = normalizeImf(raw) // 1992–2031
  it('drops every period after the cut-off and clears the projection marker', () => {
    const out = truncateToYear(base, 2026)
    expect(out.periods.at(-1)).toBe('2026')
    expect(out.periods).toHaveLength(2026 - 1992 + 1)
    expect(out.measures.NGDPD.UKR).toHaveLength(out.periods.length)
    expect(out.measures.NGDPD.UKR.at(-1)).toBe(raw.values.NGDPD!.UKR['2026'])
    expect(out.projectionsFrom).toBeUndefined()
  })

  it('is a no-op on the data when nothing exceeds the cut-off', () => {
    const out = truncateToYear(base, 2040)
    expect(out.periods).toEqual(base.periods)
    expect(out.measures).toBe(base.measures)
  })

  it('cuts at the current calendar year', () => {
    expect(lastYear(new Date('2026-10-19'))).toBe(2026)
  })
})
