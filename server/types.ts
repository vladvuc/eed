/** Shared shape served by GET /api/eurostat and GET /api/imf. Mirrored in src/types.ts. */

export type Source = 'eurostat' | 'imf' | 'imf-quarterly'
export type Frequency = 'A' | 'Q'

export type Series = (number | null)[]

export interface StatDataset {
  source: Source
  /** Human-readable vintage / last update, e.g. ISO date or "October 2026". */
  updated: string
  frequency: Frequency
  /** Time axis: "2024" for annual data, "2024-Q1" for quarterly. */
  periods: string[]
  countries: { code: string; name: string }[]
  /** measure code → geo code → values aligned with `periods` (null = no data). */
  measures: Record<string, Record<string, Series>>
  /** First period that is a forecast rather than an outturn (IMF WEO only). */
  projectionsFrom?: string
  /** Free-text caveats shown in the footer (e.g. how derived measures were computed). */
  notes?: string[]
}

export const EUROSTAT_UNITS = [
  'CP_MEUR',
  'CP_MPPS_EU27_2020',
  'CLV15_MEUR',
  'CLV_I15',
  'CLV_PCH_PRE',
] as const

export type EurostatUnit = (typeof EUROSTAT_UNITS)[number]

export const IMF_INDICATORS = [
  'NGDPD',
  'PPPGDP',
  'NGDPDPC',
  'PPPPC',
  'NGDP_RPCH',
  'PCPIPCH',
  'PCPIEPCH',
  'GGXWDG_NGDP',
  'GGXCNL_NGDP',
] as const

export type ImfIndicator = (typeof IMF_INDICATORS)[number]

/** Minimal JSON-stat 2.0 subset used by the Eurostat normalizer. */
export interface JsonStatDimension {
  label?: string
  category: {
    index: Record<string, number> | string[]
    label?: Record<string, string>
  }
}

export interface JsonStatDataset {
  version?: string
  class?: string
  label?: string
  updated?: string
  id: string[]
  size: number[]
  dimension: Record<string, JsonStatDimension>
  value: Record<string, number> | (number | null)[]
}

/** IMF DataMapper `GET /api/v1/{indicator}` payload. */
export interface ImfValuesPayload {
  values: Record<string, Record<string, Record<string, number>>>
}

/** IMF DataMapper `GET /api/v1/indicators` payload (subset). */
export interface ImfIndicatorsPayload {
  indicators: Record<string, { label: string; unit?: string; source?: string; 'last-modified'?: string }>
}

/** IMF DataMapper `GET /api/v1/countries` payload (subset). */
export interface ImfCountriesPayload {
  countries: Record<string, { label?: string | null } | null>
}

/** IMF SDMX-JSON 2.0 data message (subset used by the QNEA parser). */
export interface SdmxJsonData {
  data: {
    dataSets: { series?: Record<string, { observations?: Record<string, (string | number | null)[]> }> }[]
    structures: {
      dimensions: {
        series: { id: string; values: { id?: string; value?: string }[] }[]
        observation: { id: string; values: { id?: string; value?: string }[] }[]
      }
    }[]
  }
}
