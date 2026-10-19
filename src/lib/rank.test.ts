import { describe, expect, it } from 'vitest'
import type { StatDataset } from '../types'
import { rankCountries, rankLatest } from './rank'

const ds: StatDataset = {
  source: 'imf',
  updated: 'x',
  frequency: 'A',
  periods: ['2023', '2024', '2025'],
  countries: [
    { code: 'POL', name: 'Poland' },
    { code: 'DEU', name: 'Germany' },
    { code: 'UKR', name: 'Ukraine' },
    { code: 'EU', name: 'European Union' },
  ],
  measures: {
    NGDP_RPCH: {
      POL: [0.1, 2.9, 3.3],
      DEU: [-0.3, 0, 0.2],
      UKR: [5.3, 3.2, null],
      EU: [0.5, 1.4, 1.4],
    },
  },
  projectionsFrom: '2026',
}

describe('rankCountries', () => {
  it('ranks biggest first with 1-based ranks and the previous-period value', () => {
    const rows = rankCountries(ds, ['POL', 'DEU', 'UKR'], 'NGDP_RPCH', '2024')
    expect(rows.map((r) => [r.rank, r.code, r.value, r.previous])).toEqual([
      [1, 'UKR', 3.2, 5.3],
      [2, 'POL', 2.9, 0.1],
      [3, 'DEU', 0, -0.3],
    ])
  })

  it('drops countries without a value for that period and ignores codes not in the list', () => {
    const rows = rankCountries(ds, ['POL', 'DEU', 'UKR'], 'NGDP_RPCH', '2025')
    expect(rows.map((r) => r.code)).toEqual(['POL', 'DEU'])
    expect(rows.find((r) => r.code === 'EU')).toBeUndefined()
  })

  it('has no previous value in the first period and returns nothing for unknown periods', () => {
    expect(rankCountries(ds, ['POL'], 'NGDP_RPCH', '2023')[0].previous).toBeNull()
    expect(rankCountries(ds, ['POL'], 'NGDP_RPCH', '1999')).toEqual([])
  })
})

describe('rankLatest', () => {
  it('uses each country\'s most recent value and reports its period', () => {
    const rows = rankLatest(ds, ['POL', 'DEU', 'UKR'], 'NGDP_RPCH')
    expect(rows.map((r) => [r.rank, r.code, r.value, r.previous, r.period])).toEqual([
      [1, 'POL', 3.3, 2.9, '2025'],
      [2, 'UKR', 3.2, 5.3, '2024'], // 2025 is null, so Ukraine's latest is 2024
      [3, 'DEU', 0.2, 0, '2025'],
    ])
  })

  it('skips countries with no values at all', () => {
    expect(rankLatest({ ...ds, measures: { X: { POL: [null, null, null] } } }, ['POL', 'DEU'], 'X')).toEqual([])
  })
})
