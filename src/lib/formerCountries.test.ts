import { describe, expect, it } from 'vitest'
import type { StatDataset } from '../types'
import { activeFormer, extendBackWithUn, lastFormerYear, mergeFormerCountries, successorAliases } from './formerCountries'

const imf: StatDataset = {
  source: 'imf',
  updated: 'WEO',
  frequency: 'A',
  periods: ['1990', '1991', '1992', '1993'],
  countries: [{ code: 'SRB', name: 'Serbia' }],
  measures: {
    NGDPD: { SRB: [null, null, null, 20] },
    PCPIPCH: { SRB: [null, null, null, 9] },
  },
  notes: ['Debt in US$ = …'],
}

const un: StatDataset = {
  source: 'un',
  updated: 'data to 2024',
  frequency: 'A',
  periods: ['1989', '1990', '1991', '1992', '1993'],
  countries: [
    { code: 'YUG', name: 'Yugoslavia' },
    { code: 'SRB', name: 'Serbia' },
  ],
  measures: {
    UN_NGDPD: { YUG: [94, 88, 79, 65, null], SRB: [null, 41, 37, 27, 19] },
    UN_DEFL_PCH: { YUG: [1365, 78, 99, 4073, null], SRB: [null, null, 122, 8926, 1e11] },
  },
  notes: ['Former countries: UN data to 1990, …', 'Real GDP growth …'],
  former: [{ code: 'YUG', lastYear: 1992, successors: ['SRB', 'HRV'] }],
}

describe('mergeFormerCountries', () => {
  const out = mergeFormerCountries(imf, un)

  it('adds the former countries on the IMF years, for the measures the UN covers', () => {
    expect(out.measures.NGDPD.YUG).toEqual([88, 79, 65, null])
    expect(out.measures.NGDPD.SRB).toEqual([null, null, null, 20]) // IMF data untouched
    expect(out.measures.PCPIPCH.YUG).toEqual([78, 99, 4073, null]) // GDP deflator stands in for CPI
    expect(out.countries.map((c) => c.code)).toEqual(['SRB', 'YUG'])
  })

  it('carries the federation list and its note', () => {
    expect(out.former).toEqual(un.former)
    expect(out.notes).toEqual(['Debt in US$ = …', 'Former countries: UN data to 1990, …'])
  })
})

describe('activeFormer', () => {
  const data = mergeFormerCountries(imf, un)
  it('is active up to its last year when it has a value', () => {
    expect(activeFormer(data, 'NGDPD', '1992').map((f) => f.code)).toEqual(['YUG'])
    expect(activeFormer(data, 'NGDPD', '1993')).toEqual([])
    expect(activeFormer(data, 'GGXWDG_NGDP', '1991')).toEqual([]) // no UN debt
  })

  it('maps successors to the federation and reports the last year', () => {
    expect(successorAliases(activeFormer(data, 'NGDPD', '1991'))).toEqual({ SRB: 'YUG', HRV: 'YUG' })
    expect(lastFormerYear(data)).toBe(1992)
    expect(lastFormerYear(imf)).toBeNull()
  })
})

describe('extendBackWithUn', () => {
  it('prepends the missing early years from the UN, empty where the UN has no measure', () => {
    const base = { ...imf, periods: ['1990', '1991'], measures: { NGDPD: { SRB: [5, 6] }, GGXWDG_NGDP: { SRB: [50, 60] } } }
    const out = extendBackWithUn(base, un, 1985)
    expect(out.periods).toEqual(['1989', '1990', '1991']) // the UN data starts in 1989
    expect(out.measures.NGDPD.SRB).toEqual([null, 5, 6]) // UN has no Serbia in 1989
    expect(out.measures.GGXWDG_NGDP.SRB).toEqual([null, 50, 60])
    expect(out.unBefore).toBe('1990')
    expect(extendBackWithUn(base, un, 1990)).toBe(base)
  })
})

describe('mergeFormerCountries for the Eurostat tab', () => {
  const eurostat: StatDataset = {
    source: 'eurostat',
    updated: '2026-10-19',
    frequency: 'A',
    periods: ['1990', '1991'],
    countries: [{ code: 'RS', name: 'Serbia' }],
    measures: { CP_MEUR: { RS: [null, null] }, CLV_I15: { RS: [null, null] } },
  }
  const out = mergeFormerCountries(eurostat, { ...un, measures: { ...un.measures, UN_NGDP_MEUR: { YUG: [80, 70, 60, 50, null] } } }, 'eurostat')

  it('uses the historical two-letter codes and € values', () => {
    expect(out.measures.CP_MEUR.YU).toEqual([70, 60])
    expect(out.measures.CLV_I15.YU).toBeUndefined()
    expect(out.countries.at(-1)).toEqual({ code: 'YU', name: 'Yugoslavia' })
    expect(out.former?.[0]).toEqual({ code: 'YU', lastYear: 1992, successors: ['RS', 'HR'] })
    expect(out.notes?.at(-1)).toMatch(/^Former countries in €/)
  })
})
