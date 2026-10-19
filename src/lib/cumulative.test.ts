import { describe, expect, it } from 'vitest'
import { cumulativeFromGrowth, deriveCumulative } from './cumulative'
import type { StatDataset } from '../types'

const periods = ['2019', '2020', '2021', '2022', '2023']

describe('cumulativeFromGrowth', () => {
  it('compounds forward from the base and is 0 % at the base', () => {
    const out = cumulativeFromGrowth([2, -5, 10, 3, 2], periods, '2020', 'pct')
    expect(out[1]).toBe(0)
    expect(out[2]).toBeCloseTo(10, 9)
    expect(out[3]).toBeCloseTo((1.1 * 1.03 - 1) * 100, 9)
    expect(out[4]).toBeCloseTo((1.1 * 1.03 * 1.02 - 1) * 100, 9)
  })

  it('divides backwards for periods before the base', () => {
    const out = cumulativeFromGrowth([2, -5, 10, 3, 2], periods, '2021', 'pct')
    // 2020 → 2021 grew 10 %, so 2020 sits at 1/1.1 - 1
    expect(out[1]).toBeCloseTo((1 / 1.1 - 1) * 100, 9)
    expect(out[0]).toBeCloseTo((1 / (1.1 * 0.95) - 1) * 100, 9)
  })

  it('returns an index of 100 at the base in index mode', () => {
    const out = cumulativeFromGrowth([2, -5, 10, 3, 2], periods, '2019', 'index')
    expect(out[0]).toBe(100)
    expect(out[1]).toBeCloseTo(95, 9)
  })

  it('breaks the chain at a missing rate instead of bridging it', () => {
    const out = cumulativeFromGrowth([2, null, 10, 3, 2], periods, '2019', 'pct')
    expect(out).toEqual([0, null, null, null, null])
    const back = cumulativeFromGrowth([2, null, 10, 3, 2], periods, '2022', 'pct')
    expect(back[1]).toBeCloseTo((1 / (1.1 * 1.03) - 1) * 100, 9)
    expect(back[0]).toBeNull()
  })

  it('is all null when the country has no data around the base year', () => {
    // Series starts in 2022: base 2019 cannot be anchored, base 2021 can (growth into 2022 is known).
    const late: (number | null)[] = [null, null, null, 4, 2]
    expect(cumulativeFromGrowth(late, periods, '2019', 'pct').every((v) => v === null)).toBe(true)
    const anchored = cumulativeFromGrowth(late, periods, '2021', 'pct')
    expect(anchored.slice(0, 3)).toEqual([null, null, 0])
    expect(anchored[3]).toBeCloseTo(4, 9)
    expect(anchored[4]).toBeCloseTo((1.04 * 1.02 - 1) * 100, 9)
  })

  it('is all null when the base is not a period', () => {
    expect(cumulativeFromGrowth([1, 1, 1, 1, 1], periods, '1999', 'pct').every((v) => v === null)).toBe(true)
  })
})

describe('deriveCumulative', () => {
  it('replaces the measures with CUM_PCT and CUM_IDX for every country', () => {
    const ds: StatDataset = {
      source: 'imf',
      updated: 'x',
      frequency: 'A',
      periods,
      countries: [{ code: 'POL', name: 'Poland' }],
      measures: { NGDP_RPCH: { POL: [4, -2, 6, 5, 0] }, NGDPD: { POL: [1, 1, 1, 1, 1] } },
    }
    const out = deriveCumulative(ds, '2019')
    expect(Object.keys(out.measures)).toEqual(['CUM_PCT', 'CUM_IDX'])
    expect(out.measures.CUM_PCT.POL[4]).toBeCloseTo((0.98 * 1.06 * 1.05 - 1) * 100, 9)
    expect(out.measures.CUM_IDX.POL[0]).toBe(100)
    expect(out.notes?.[0]).toContain('2019')
  })
})
