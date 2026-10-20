import { describe, expect, it } from 'vitest'
import { buildUnDataset, tableFromSheet, type UnTable } from './un.ts'

// Yugoslavia (890) reported until 1990, its 7 successors from 1990; the federation is shown until 1992.
const YEARS = [1989, 1990, 1991, 1992, 1993]
const SUCCESSORS = [705, 191, 70, 688, 499, 807, 412] // SVN HRV BIH SRB MNE MKD UVK
type Row = [number, (number | null)[]]
const table = (yu: (number | null)[], aut: number[], succ: (number | null)[]): UnTable => ({
  years: YEARS,
  byId: new Map<number, (number | null)[]>([[890, yu], [40, aut], ...SUCCESSORS.map((id): Row => [id, succ])]),
})

const ds = buildUnDataset(
  {
    current: table([80e9, 88e9, null, null, null], [100e9, 110e9, 120e9, 130e9, 140e9], [null, 13e9, 12e9, 11e9, 10e9]),
    constant: table([150e9, 140e9, null, null, null], [200e9, 210e9, 220e9, 230e9, 240e9], [null, 20e9, 18e9, 16e9, 15e9]),
    perCapita: table([3500, 3700, null, null, null], [13000, 14000, 15000, 16000, 17000], [null, 4000, 3000, 2750, 2500]),
    // National currency: Yugoslavia's nominal GDP doubles in 1990; each successor's rises 50 % in 1991.
    currentNcu: table([100, 200, null, null, null], [100, 105, 110, 115, 120], [null, 10, 15, 15, 15]),
  },
  '2026-10-20',
)
const at = (m: string, code: string, year: number) => ds.measures[m][code][YEARS.indexOf(year)]

describe('buildUnDataset', () => {
  it('uses the UN figures for Yugoslavia while it is reported', () => {
    expect(at('UN_NGDPD', 'YUG', 1990)).toBeCloseTo(88)
    expect(at('UN_NGDP_RPCH', 'YUG', 1990)).toBeCloseTo((140 / 150 - 1) * 100)
  })

  it('adds up the successors from 1991 until the split, then stops', () => {
    expect(at('UN_NGDPD', 'YUG', 1991)).toBeCloseTo(7 * 12)
    expect(at('UN_NGDPD', 'YUG', 1992)).toBeCloseTo(7 * 11)
    expect(at('UN_NGDPD', 'YUG', 1993)).toBeNull()
    // Combined per capita = total GDP / total population (population = GDP / per capita).
    expect(at('UN_NGDPDPC', 'YUG', 1991)).toBeCloseTo(3000)
  })

  it('derives inflation from the GDP deflator: nominal growth over real growth', () => {
    expect(at('UN_DEFL_PCH', 'YUG', 1990)).toBeCloseTo((2 / (140 / 150) - 1) * 100)
    // Combined: the successors' own inflation, weighted by GDP in US$ (all equal here).
    expect(at('UN_DEFL_PCH', 'YUG', 1991)).toBeCloseTo((1.5 / (18 / 20) - 1) * 100)
    expect(at('UN_DEFL_PCH', 'YUG', 1993)).toBeNull()
  })

  it('takes growth from one source on each side of the switch', () => {
    expect(at('UN_NGDP_RPCH', 'YUG', 1991)).toBeCloseTo((18 / 20 - 1) * 100) // not 7×18 vs SFRY's 140
    expect(at('UN_NGDP_RPCH', 'AUT', 1991)).toBeCloseTo((220 / 210 - 1) * 100)
  })

  it("keeps the successors' own data and lists them for the app to hide", () => {
    expect(at('UN_NGDPD', 'SRB', 1991)).toBeCloseTo(12)
    expect(ds.former).toEqual([{ code: 'YUG', lastYear: 1992, successors: ['SVN', 'HRV', 'BIH', 'SRB', 'MNE', 'MKD', 'UVK'] }])
    expect(ds.notes[0]).toMatch(/UN data to 1990.*Yugoslavia 1992/)
  })
})

describe('tableFromSheet', () => {
  it('reads the year columns and filters by indicator', () => {
    const rows = [
      ['GDP at current prices', null, null, null],
      ['CountryID', 'Country', 'IndicatorName', 1970, 1971],
      [890, 'Yugoslavia (Former)', 'Exports of goods and services', 1, 2],
      [890, 'Yugoslavia (Former)', 'Gross Domestic Product (GDP)', 14.5, null],
    ]
    const t = tableFromSheet(rows, 'Gross Domestic Product (GDP)')
    expect(t.years).toEqual([1970, 1971])
    expect(t.byId.get(890)).toEqual([14.5, null])
  })
})
