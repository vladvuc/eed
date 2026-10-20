import { describe, expect, it } from 'vitest'
import { normalizeQnea, parseSdmxJson, withImfNames, type QneaRaw } from './imfq.ts'
import type { SdmxJsonData, StatDataset } from './types.ts'
import sa from './__fixtures__/qnea.Q.SA.XDC.json' with { type: 'json' }
import nsa from './__fixtures__/qnea.Q.NSA.XDC.json' with { type: 'json' }
import nom from './__fixtures__/qnea.V.NSA.XDC.json' with { type: 'json' }

// Real IMF SDMX-JSON 2.0 responses for DEU+UKR+RUS, 2023-Q1 onwards.
const raw: QneaRaw = {
  levels: {
    REAL_SA: parseSdmxJson(sa as unknown as SdmxJsonData),
    REAL_NSA: parseSdmxJson(nsa as unknown as SdmxJsonData),
    NOMINAL_NSA: parseSdmxJson(nom as unknown as SdmxJsonData),
  },
  countryLabels: { DEU: 'Germany', UKR: 'Ukraine', RUS: 'Russia' },
  fetchedAt: '2026-10-19T00:00:00Z',
}
const out = normalizeQnea(raw)

describe('parseSdmxJson', () => {
  it('maps series keys to country codes and observation indexes to periods', () => {
    const deu = raw.levels.REAL_SA.DEU
    expect(deu['2025-Q1']).toBeCloseTo(775197829460.56, 2)
    expect(raw.levels.REAL_SA.RUS).toBeUndefined() // no seasonally adjusted series for Russia
    expect(raw.levels.REAL_NSA.RUS['2025-Q1']).toBeTypeOf('number')
  })
})

describe('normalizeQnea', () => {
  it('builds a continuous quarterly axis including 2026', () => {
    expect(out.frequency).toBe('Q')
    expect(out.periods[0]).toBe('2023-Q1')
    expect(out.periods).toContain('2026-Q1')
    expect(out.periods.at(-1)).toBe('2026-Q2')
    expect(out.countries.map((c) => c.code)).toEqual(['DEU', 'UKR', 'RUS'])
  })

  it('computes quarter-on-quarter growth from the seasonally adjusted series', () => {
    const i = out.periods.indexOf('2025-Q2')
    const lv = raw.levels.REAL_SA.DEU
    expect(out.measures.QOQ_SA.DEU[i]).toBeCloseTo((lv['2025-Q2'] / lv['2025-Q1'] - 1) * 100, 6)
    expect(out.measures.QOQ_SA.DEU[0]).toBeNull() // no previous quarter in the fixture
    expect(out.measures.QOQ_SA.RUS).toBeUndefined()
  })

  it('computes year-on-year growth from the non-adjusted series, so Russia is covered', () => {
    const i = out.periods.indexOf('2025-Q1')
    const lv = raw.levels.REAL_NSA.RUS
    expect(out.measures.YOY.RUS[i]).toBeCloseTo((lv['2025-Q1'] / lv['2024-Q1'] - 1) * 100, 6)
    expect(out.measures.YOY.UKR[out.periods.indexOf('2023-Q4')]).toBeNull() // needs 4 earlier quarters
    expect(out.measures.NOM_YOY.UKR[i]).toBeTypeOf('number')
  })

  it('yields an all-null index when the 2015 base year is not in the data', () => {
    expect(out.measures.IDX_SA.DEU.every((v) => v === null)).toBe(true)
  })

  it('rebases to 2015 = 100 when the base year is present', () => {
    const periods = ['2015-Q1', '2015-Q2', '2015-Q3', '2015-Q4', '2016-Q1']
    const vals = [90, 100, 110, 100, 120]
    const r: QneaRaw = {
      levels: {
        REAL_SA: { DEU: Object.fromEntries(periods.map((p, i) => [p, vals[i]])) },
        REAL_NSA: {},
        NOMINAL_NSA: {},
      },
      countryLabels: {},
      fetchedAt: 'x',
    }
    const o = normalizeQnea(r)
    o.measures.IDX_SA.DEU.forEach((v, i) => expect(v).toBeCloseTo([90, 100, 110, 100, 120][i], 9))
    expect(o.measures.QOQ_SA.DEU[4]).toBeCloseTo(20, 9)
  })
})

describe('withImfNames', () => {
  it('replaces bare codes in a previously cached copy with country names', () => {
    const cached = {
      countries: [{ code: 'DNK', name: 'DNK' }, { code: 'TUR', name: 'TUR' }, { code: 'XXX', name: 'Elsewhere' }],
    } as StatDataset
    expect(withImfNames(cached).countries).toEqual([
      { code: 'DNK', name: 'Denmark' },
      { code: 'TUR', name: 'Türkiye' },
      { code: 'XXX', name: 'Elsewhere' },
    ])
  })
})
