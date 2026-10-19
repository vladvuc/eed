import { useCallback, useEffect, useState } from 'react'
import { fetchDataset } from '../api'
import type { Source, StatDataset } from '../types'

interface State {
  data: StatDataset | null
  error: string | null
  loading: boolean
}

const IDLE: State = { data: null, error: null, loading: true }

/** Loads one source; results are cached in api.ts so switching tabs back is instant. */
export function useDataset(source: Source): State & { retry: () => void } {
  const [state, setState] = useState<Record<string, State>>({})
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    fetchDataset(source)
      .then((data) => {
        if (!cancelled) setState((s) => ({ ...s, [source]: { data, error: null, loading: false } }))
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setState((s) => ({ ...s, [source]: { data: null, error: (err as Error).message, loading: false } }))
      })
    return () => {
      cancelled = true
    }
  }, [source, attempt])

  const retry = useCallback(() => {
    setState((s) => ({ ...s, [source]: IDLE }))
    setAttempt((n) => n + 1)
  }, [source])

  return { ...(state[source] ?? IDLE), retry }
}
