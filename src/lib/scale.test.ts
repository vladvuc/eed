import { describe, expect, it } from 'vitest'
import { niceZeroDomain, symlogDomain } from './scale'

describe('niceZeroDomain', () => {
  it('rounds the extent outwards to a round step and always includes zero', () => {
    expect(niceZeroDomain(-6.2, 310)).toEqual({ domain: [-100, 400], ticks: [-100, 0, 100, 200, 300, 400] })
    expect(niceZeroDomain(0.5, 8.8)).toEqual({ domain: [0, 10], ticks: [0, 2, 4, 6, 8, 10] })
    expect(niceZeroDomain(-0.6, 7.5)).toEqual({ domain: [-2, 8], ticks: [-2, 0, 2, 4, 6, 8] })
  })

  it('handles all-negative data and a flat series', () => {
    expect(niceZeroDomain(-30, -5).domain).toEqual([-30, 0])
    expect(niceZeroDomain(3, 3).domain[0]).toBe(0)
  })
})

describe('symlogDomain', () => {
  it('spans both sides of zero with 1-2-5 ticks', () => {
    expect(symlogDomain(-28.8, 12.1)).toEqual({ domain: [-50, 20], ticks: [-50, -20, -10, -5, -2, -1, 0, 1, 2, 5, 10, 20] })
  })

  it('thins to powers of ten when the range is wide, keeping the ends', () => {
    expect(symlogDomain(-5, 4200)).toEqual({ domain: [-5, 5000], ticks: [-5, -1, 0, 1, 10, 100, 1000, 5000] })
  })

  it('starts at zero for all-positive data', () => {
    expect(symlogDomain(0.4, 7).domain).toEqual([0, 10])
  })
})
