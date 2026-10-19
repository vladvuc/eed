import { useCallback, useMemo, useState } from 'react'

export const MAX_SERIES = 8

/** Selected codes in the order they were picked (that order decides who gets a flag colour first). */
export type Picks = string[]

/** Pure transitions (exported for tests). */
export function togglePick(prev: Picks, code: string): Picks {
  if (prev.includes(code)) return prev.filter((c) => c !== code)
  return prev.length >= MAX_SERIES ? prev : [...prev, code]
}

export function addPicks(prev: Picks, codes: string[]): Picks {
  const next = [...prev]
  for (const code of codes) {
    if (next.length >= MAX_SERIES) break
    if (!next.includes(code)) next.push(code)
  }
  return next
}

export function removePicks(prev: Picks, codes: string[]): Picks {
  return prev.filter((c) => !codes.includes(c))
}

/** Up to MAX_SERIES selected countries, kept in pick order. */
export function useSelection(initial: string[]) {
  const [selected, setSelected] = useState<Picks>(() => initial.slice(0, MAX_SERIES))

  const isFull = selected.length >= MAX_SERIES

  const toggle = useCallback((code: string) => setSelected((prev) => togglePick(prev, code)), [])
  const addMany = useCallback((codes: string[]) => setSelected((prev) => addPicks(prev, codes)), [])
  const removeMany = useCallback((codes: string[]) => setSelected((prev) => removePicks(prev, codes)), [])
  const clearAll = useCallback(() => setSelected([]), [])

  return useMemo(
    () => ({ selected, isFull, toggle, addMany, removeMany, clearAll }),
    [selected, isFull, toggle, addMany, removeMany, clearAll],
  )
}
