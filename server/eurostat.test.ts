import { describe, expect, it } from 'vitest'
import { mergeSupplement } from './eurostat.ts'
import { normalize } from './normalize.ts'
import type { JsonStatDataset } from './types.ts'
import main from './__fixtures__/nama_10_gdp.small.json' with { type: 'json' }
import ru from './__fixtures__/naida_10_gdp.ru.small.json' with { type: 'json' }

// Real Eurostat responses: nama_10_gdp (DE/AL/XK; 2007, 2008, 2023) and
// naida_10_gdp for Russia (CP_MEUR, CLV_PCH_PRE, CLV_I10; 2014–2016, 2020, 2021).
const base = normalize(main as unknown as JsonStatDataset)
const supp = normalize(ru as unknown as JsonStatDataset, ['CP_MEUR', 'CLV_PCH_PRE', 'CLV_I10'])

describe('mergeSupplement (Russia from naida_10_gdp)', () => {
  // Put both on a shared axis so alignment is exercised.
  const mainWide = { ...base, periods: ['2014', '2015', '2016', '2020', '2021'], measures: {} }
  const out = mergeSupplement(mainWide, supp)

  it('adds Russia to the country list with a short display name', () => {
    expect(out.countries.map((c) => c.code)).toContain('RU')
    expect(out.countries.find((c) => c.code === 'RU')?.name).toBe('Russia')
  })

  it('copies current prices and growth as published, aligned to the main axis', () => {
    const iRaw = supp.periods.indexOf('2015')
    expect(out.measures.CP_MEUR.RU[1]).toBe(supp.measures.CP_MEUR.RU[iRaw])
    expect(out.measures.CLV_PCH_PRE.RU[1]).toBe(supp.measures.CLV_PCH_PRE.RU[iRaw])
    expect(out.measures.CP_MEUR.RU[4]).toBeNull() // Eurostat has no Russian data for 2021
  })

  it('rebases the 2010-based volume index so 2015 = 100', () => {
    expect(out.measures.CLV_I15.RU[1]).toBeCloseTo(100, 9)
    const raw = supp.measures.CLV_I10.RU
    const i14 = supp.periods.indexOf('2014')
    const i15 = supp.periods.indexOf('2015')
    expect(out.measures.CLV_I15.RU[0]).toBeCloseTo(((raw[i14] as number) / (raw[i15] as number)) * 100, 9)
  })

  it('does not invent units Eurostat does not publish for Russia', () => {
    expect(out.measures.CP_MPPS_EU27_2020?.RU).toBeUndefined()
    expect(out.measures.CLV15_MEUR?.RU).toBeUndefined()
  })

  it('adds a source note and leaves countries already present untouched', () => {
    expect(out.notes?.[0]).toMatch(/naida_10_gdp/)
    expect(out.notes?.[0]).toMatch(/2020/)
    const again = mergeSupplement(out, supp)
    expect(again.countries.filter((c) => c.code === 'RU')).toHaveLength(1)
  })
})
