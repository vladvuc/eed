import { describe, expect, it } from 'vitest'
import { normalize } from './normalize.ts'
import type { JsonStatDataset } from './types.ts'
import fixture from './__fixtures__/nama_10_gdp.small.json' with { type: 'json' }

// Real Eurostat response: units CLV_I15 + CP_MEUR, geo DE/AL/XK, years 2007/2008/2023.
const ds = fixture as unknown as JsonStatDataset
const out = normalize(ds)

describe('normalize (JSON-stat 2.0 → compact dataset)', () => {
  it('reads years and countries in positional order, with labels', () => {
    expect(out.periods).toEqual(['2007', '2008', '2023'])
    expect(out.frequency).toBe('A')
    expect(out.countries).toEqual([
      { code: 'DE', name: 'Germany' },
      { code: 'AL', name: 'Albania' },
      { code: 'XK', name: 'Kosovo*' },
    ])
    expect(out.updated).toBe('2026-10-19T11:00:00+0200')
    expect(out.source).toBe('eurostat')
  })

  it('uses dimension strides correctly (unit > geo > time)', () => {
    // CP_MEUR is unit position 1, AL geo position 1, 2023 time position 2 → linear 9+3+2=14
    expect(out.measures.CP_MEUR.AL[2]).toBe(21738.8)
    expect(out.measures.CP_MEUR.DE).toEqual([2542220, 2589280, 4254930])
    expect(out.measures.CLV_I15.AL).toEqual([80.422, 85.977, 130.451])
  })

  it('maps missing cells to null', () => {
    expect(out.measures.CP_MEUR.XK).toEqual([null, 3537.6, 9680.1])
    expect(out.measures.CLV_I15.XK[0]).toBeNull()
  })

  it('returns empty maps for units absent from the response', () => {
    expect(out.measures.CLV_PCH_PRE).toEqual({})
    expect(out.measures.CP_MPPS_EU27_2020).toEqual({})
    expect(out.measures.CLV15_MEUR).toEqual({})
  })

  it('does not depend on the dimension order in `id`', () => {
    // Re-express the same data with dimensions reordered to geo, time, unit (freq/na_item first).
    const reordered: JsonStatDataset = {
      ...ds,
      id: ['freq', 'na_item', 'geo', 'time', 'unit'],
      size: [1, 1, 3, 3, 2],
      value: {},
    }
    const value: Record<string, number> = {}
    const orig = ds.value as Record<string, number>
    for (const [k, v] of Object.entries(orig)) {
      const lin = Number(k)
      const ui = Math.floor(lin / 9)
      const gi = Math.floor((lin % 9) / 3)
      const ti = lin % 3
      value[String(gi * 6 + ti * 2 + ui)] = v
    }
    reordered.value = value
    const out2 = normalize(reordered)
    expect(out2.measures).toEqual(out.measures)
  })

  it('accepts array-form category index', () => {
    const arrayIdx: JsonStatDataset = {
      ...ds,
      dimension: {
        ...ds.dimension,
        geo: {
          ...ds.dimension.geo,
          category: { ...ds.dimension.geo.category, index: ['DE', 'AL', 'XK'] },
        },
      },
    }
    expect(normalize(arrayIdx).measures.CP_MEUR.AL).toEqual(out.measures.CP_MEUR.AL)
  })

  it('throws a clear error when a required dimension is missing', () => {
    expect(() => normalize({ ...ds, id: ['freq', 'unit', 'na_item', 'time'] })).toThrow(/geo/)
  })
})
