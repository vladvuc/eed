import { useCallback, useMemo, useState } from 'react'

export const MAX_SERIES = 8

export type Slots = (string | null)[]

export function initialSlots(codes: string[]): Slots {
  const slots: Slots = new Array(MAX_SERIES).fill(null)
  codes.slice(0, MAX_SERIES).forEach((c, i) => {
    slots[i] = c
  })
  return slots
}

/** Pure slot transitions (exported for tests). */
export function toggleSlot(prev: Slots, code: string): Slots {
  const i = prev.indexOf(code)
  const next = [...prev]
  if (i >= 0) {
    next[i] = null
    return next
  }
  const free = prev.indexOf(null)
  if (free < 0) return prev
  next[free] = code
  return next
}

export function addManySlots(prev: Slots, codes: string[]): Slots {
  const next = [...prev]
  for (const code of codes) {
    if (next.includes(code)) continue
    const free = next.indexOf(null)
    if (free < 0) break
    next[free] = code
  }
  return next
}

export function removeManySlots(prev: Slots, codes: string[]): Slots {
  return prev.map((c) => (c !== null && codes.includes(c) ? null : c))
}

/**
 * Selected countries occupy fixed color slots (0..MAX_SERIES-1).
 * A country keeps its slot while selected; deselecting frees the slot;
 * other selections never recolor.
 */
export function useSelection(initial: string[]) {
  const [slots, setSlots] = useState<Slots>(() => initialSlots(initial))

  const selected = useMemo(() => slots.filter((c): c is string => c !== null), [slots])
  const slotOf = useCallback((code: string) => slots.indexOf(code), [slots])
  const isFull = selected.length >= MAX_SERIES

  const toggle = useCallback((code: string) => setSlots((prev) => toggleSlot(prev, code)), [])
  const addMany = useCallback((codes: string[]) => setSlots((prev) => addManySlots(prev, codes)), [])
  const removeMany = useCallback(
    (codes: string[]) => setSlots((prev) => removeManySlots(prev, codes)),
    [],
  )

  const clearAll = useCallback(() => setSlots(new Array(MAX_SERIES).fill(null)), [])

  return { slots, selected, slotOf, isFull, toggle, addMany, removeMany, clearAll }
}
