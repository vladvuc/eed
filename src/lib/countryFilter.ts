import type { CountryGroup } from '../types'

/**
 * Pure: the groups for the leaderboard's country filter, limited to the ranked countries.
 * Former countries get their own group; anything in no group goes to "Other".
 */
export function filterGroups(codes: string[], groups: CountryGroup[], formerCodes: string[]): CountryGroup[] {
  const ranked = new Set(codes)
  const former = new Set(formerCodes)
  const out = groups
    .map((g) => ({ ...g, codes: g.codes.filter((c) => ranked.has(c) && !former.has(c)) }))
    .filter((g) => g.codes.length > 0)
  const placed = new Set(out.flatMap((g) => g.codes))
  const formerShown = codes.filter((c) => former.has(c))
  const other = codes.filter((c) => !placed.has(c) && !former.has(c))
  if (formerShown.length) out.push({ id: 'former', label: 'Former countries', codes: formerShown })
  if (other.length) out.push({ id: 'other', label: 'Other', codes: other })
  return out
}

/** Pure: shows (or hides) every code in `codes`; other hidden codes stay hidden. */
export function setShown(hidden: string[], codes: string[], shown: boolean): string[] {
  const rest = hidden.filter((c) => !codes.includes(c))
  return shown ? rest : [...rest, ...codes]
}

/** Pure: of `all`, only `codes` stay shown. */
export function showOnly(hidden: string[], all: string[], codes: string[]): string[] {
  return setShown(setShown(hidden, all, false), codes, true)
}
