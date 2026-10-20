import { useCallback, useEffect, useState } from 'react'
import { fetchDataset } from '../api'
import { track } from '../lib/analytics'
import type { Source, StatDataset } from '../types'

interface State {
  data: StatDataset | null
  error: string | null
  loading: boolean
}

const IDLE: State = { data: null, error: null, loading: true }

const NONE: State = { data: null, error: null, loading: false }

/** Loads one source (null: none); results are cached in api.ts so switching tabs back is instant. */
export function useDataset(source: Source | null): State & { retry: () => void } {
  const [state, setState] = useState<Record<string, State>>({})
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!source) return
    let cancelled = false
    fetchDataset(source)
      .then((data) => {
        if (!cancelled) setState((s) => ({ ...s, [source]: { data, error: null, loading: false } }))
      })
      .catch((err: unknown) => {
        track('data_load_failed', { source, error: (err as Error).message })
        if (!cancelled)
          setState((s) => ({ ...s, [source]: { data: null, error: (err as Error).message, loading: false } }))
      })
    return () => {
      cancelled = true
    }
  }, [source, attempt])

  const retry = useCallback(() => {
    if (!source) return
    setState((s) => ({ ...s, [source]: IDLE }))
    setAttempt((n) => n + 1)
  }, [source])

  return { ...(source ? (state[source] ?? IDLE) : NONE), retry }
}
