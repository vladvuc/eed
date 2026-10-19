import { describe, expect, it } from 'vitest'
import { spreadLabels } from './labels'

describe('spreadLabels', () => {
  it('leaves well-separated labels where they are', () => {
    expect(spreadLabels([10, 50, 90], 13, 0, 200)).toEqual([10, 50, 90])
  })

  it('pushes colliding labels apart while keeping their order', () => {
    const out = spreadLabels([100, 102, 104], 13, 0, 200)
    expect(out[0]).toBeLessThan(out[1])
    expect(out[1]).toBeLessThan(out[2])
    expect(out[1] - out[0]).toBeGreaterThanOrEqual(13)
    expect(out[2] - out[1]).toBeGreaterThanOrEqual(13)
  })

  it('respects the bottom bound by shifting the stack upwards', () => {
    const out = spreadLabels([195, 198, 199], 13, 0, 200)
    expect(Math.max(...out)).toBeLessThanOrEqual(200)
    expect(out[2] - out[1]).toBeGreaterThanOrEqual(13)
  })

  it('handles unsorted input and preserves index mapping', () => {
    const out = spreadLabels([80, 20, 81], 13, 0, 200)
    expect(out[1]).toBe(20)
    expect(out[2] - out[0]).toBeGreaterThanOrEqual(13)
  })
})
