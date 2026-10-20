import { describe, expect, it } from 'vitest'
import { periodName } from './countries'

describe('periodName', () => {
  it('calls Germany "West Germany" for rates up to 1990', () => {
    expect(periodName('DEU', 'Germany', '1975', false)).toBe('West Germany')
    expect(periodName('DEU', 'Germany', '1990', false)).toBe('West Germany')
    expect(periodName('DEU', 'Germany', '1991', false)).toBe('Germany')
  })

  it('keeps "Germany" for GDP levels, which cover the whole territory', () => {
    expect(periodName('DEU', 'Germany', '1980', true)).toBe('Germany')
    expect(periodName('FRA', 'France', '1980', false)).toBe('France')
  })
})
