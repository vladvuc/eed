import { useSyncExternalStore } from 'react'
import type { Scheme } from '../lib/flagColors'

const query = () => window.matchMedia('(prefers-color-scheme: dark)')

function subscribe(onChange: () => void) {
  const mq = query()
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}

/** The OS colour scheme (main.tsx mirrors it onto the `dark` class). */
export function useColorScheme(): Scheme {
  return useSyncExternalStore(subscribe, () => (query().matches ? 'dark' : 'light'))
}
