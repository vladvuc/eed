import { describe, expect, it } from 'vitest'
import { niceZeroDomain } from './scale'

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
