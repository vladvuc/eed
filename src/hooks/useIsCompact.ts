import { useSyncExternalStore } from 'react'

// Tailwind's `md` breakpoint: below it the layout is the single-column phone version.
const query = () => window.matchMedia('(max-width: 767px)')

function subscribe(onChange: () => void) {
  const mq = query()
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}

/** True on phone-width screens, where charts use tighter axes and shorter labels. */
export function useIsCompact(): boolean {
  return useSyncExternalStore(subscribe, () => query().matches)
}
