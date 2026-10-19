import { describe, expect, it } from 'vitest'
import { MAX_SERIES, addManySlots, initialSlots, removeManySlots, toggleSlot } from './useSelection'

describe('selection colour slots', () => {
  it('seeds the initial selection into the first slots', () => {
    expect(initialSlots(['AL', 'XK'])).toEqual(['AL', 'XK', null, null, null, null, null, null])
  })

  it('keeps colours stable when another country is deselected', () => {
    const s1 = initialSlots(['AL', 'BA', 'ME'])
    const s2 = toggleSlot(s1, 'BA') // deselect the middle one
    expect(s2[0]).toBe('AL')
    expect(s2[1]).toBeNull()
    expect(s2[2]).toBe('ME')
    // the freed slot is reused by the next addition
    expect(toggleSlot(s2, 'DE')[1]).toBe('DE')
  })

  it('refuses a 9th country while full', () => {
    const full = initialSlots(['1', '2', '3', '4', '5', '6', '7', '8'])
    expect(full.filter(Boolean)).toHaveLength(MAX_SERIES)
    expect(toggleSlot(full, 'DE')).toBe(full)
  })

  it('adds a group only up to the cap and skips already-selected codes', () => {
    const s = initialSlots(['AL', 'BA'])
    const out = addManySlots(s, ['AL', 'DE', 'FR', 'IT', 'ES', 'NL', 'PL', 'SE'])
    expect(out).toEqual(['AL', 'BA', 'DE', 'FR', 'IT', 'ES', 'NL', 'PL'])
  })

  it('removes a group without touching other slots', () => {
    const s = initialSlots(['AL', 'DE', 'BA'])
    expect(removeManySlots(s, ['AL', 'BA'])).toEqual([null, 'DE', null, null, null, null, null, null])
  })
})
