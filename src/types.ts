/** Client mirror of server/types.ts (the shape served by /api/eurostat, /api/imf, /api/imf-quarterly). */

export type Source = 'eurostat' | 'imf' | 'imf-quarterly'
export type Frequency = 'A' | 'Q'

export type Series = (number | null)[]

export interface Country {
  code: string
  name: string
}

export interface StatDataset {
  source: Source
  updated: string
  frequency: Frequency
  /** "2024" for annual data, "2024-Q1" for quarterly. */
  periods: string[]
  countries: Country[]
  measures: Record<string, Record<string, Series>>
  projectionsFrom?: string
  /** Free-text caveats shown in the footer (e.g. how derived measures were computed). */
  notes?: string[]
}

export interface CountryGroup {
  id: string
  label: string
  codes: string[]
}

export type View = 'chart' | 'table'

export type TabId = 'eurostat' | 'imf' | 'imf-quarterly' | 'growth' | 'inflation' | 'debt' | 'leaderboard' | 'latest' | 'cumulative'

/** Year of a period string ("2024" or "2024-Q3" → 2024). */
export function yearOf(period: string): number {
  return Number(period.slice(0, 4))
}
