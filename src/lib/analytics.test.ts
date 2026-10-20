import { describe, expect, it } from 'vitest'
import { notrackParam } from './analytics'

describe('notrackParam', () => {
  it('opts out with ?notrack or ?notrack=1, back in with ?notrack=0', () => {
    expect(notrackParam('?notrack')).toBe(true)
    expect(notrackParam('?notrack=1')).toBe(true)
    expect(notrackParam('?year=1993&notrack=true')).toBe(true)
    expect(notrackParam('?notrack=0')).toBe(false)
    expect(notrackParam('?notrack=false')).toBe(false)
    expect(notrackParam('')).toBeNull()
    expect(notrackParam('?year=1993')).toBeNull()
  })
})
