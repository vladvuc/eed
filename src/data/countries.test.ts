import { describe, expect, it } from 'vitest'
import { displayName, periodName } from './countries'

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

describe('displayName', () => {
  it('names countries a dataset leaves unnamed', () => {
    expect(displayName('AND', undefined)).toBe('Andorra')
    expect(displayName('SMR', 'San Marino')).toBe('San Marino')
    expect(displayName('UVK', 'Kosovo')).toBe('Kosovo*')
    expect(displayName('XYZ', undefined)).toBe('XYZ')
  })
})
