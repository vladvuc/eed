import { describe, expect, it } from 'vitest'
import { filterGroups, setShown, showOnly } from './countryFilter'

const groups = [
  { id: 'wb', label: 'Western Balkan', codes: ['SRB', 'MNE', 'UVK'] },
  { id: 'micro', label: 'Microstates', codes: ['AND', 'MCO'] },
]

describe('filterGroups', () => {
  it('keeps ranked countries only, with former countries and the rest in their own groups', () => {
    expect(filterGroups(['SRB', 'MNE', 'YUG', 'FRA'], groups, ['YUG'])).toEqual([
      { id: 'wb', label: 'Western Balkan', codes: ['SRB', 'MNE'] },
      { id: 'former', label: 'Former countries', codes: ['YUG'] },
      { id: 'other', label: 'Other', codes: ['FRA'] },
    ])
  })
})

describe('showing and hiding', () => {
  it('changes only the given codes', () => {
    expect(setShown(['AND', 'XXX'], ['AND', 'MCO'], true)).toEqual(['XXX'])
    expect(setShown(['XXX'], ['AND', 'MCO'], false)).toEqual(['XXX', 'AND', 'MCO'])
  })

  it('shows just one group, keeping codes outside the ranking hidden', () => {
    expect(showOnly(['XXX'], ['SRB', 'MNE', 'AND'], ['SRB', 'MNE']).sort()).toEqual(['AND', 'XXX'])
  })
})
