import { describe, expect, it } from 'vitest'
import { MAX_SERIES, addPicks, removePicks, togglePick } from './useSelection'

describe('selection pick order', () => {
  it('appends new picks and removes deselected ones', () => {
    const s = togglePick(togglePick(togglePick([], 'AL'), 'BA'), 'ME')
    expect(s).toEqual(['AL', 'BA', 'ME'])
    expect(togglePick(s, 'BA')).toEqual(['AL', 'ME'])
    // a re-added country goes to the back of the queue
    expect(togglePick(togglePick(s, 'AL'), 'AL')).toEqual(['BA', 'ME', 'AL'])
  })

  it('ignores additions beyond the cap', () => {
    const full = ['1', '2', '3', '4', '5', '6', '7', '8']
    expect(full).toHaveLength(MAX_SERIES)
    expect(togglePick(full, 'DE')).toBe(full)
  })

  it('adds a group up to the cap, skipping existing picks', () => {
    const out = addPicks(['AL', 'BA'], ['AL', 'DE', 'FR', 'IT', 'ES', 'NL', 'PL', 'SE'])
    expect(out).toEqual(['AL', 'BA', 'DE', 'FR', 'IT', 'ES', 'NL', 'PL'])
  })

  it('removes a group and keeps the order of the rest', () => {
    expect(removePicks(['AL', 'DE', 'BA', 'FR'], ['AL', 'BA'])).toEqual(['DE', 'FR'])
  })
})
