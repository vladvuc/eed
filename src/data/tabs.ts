import type { Source, TabId } from '../types'
import {
  EUROSTAT_MEASURES,
  IMF_CUMULATIVE_MEASURES,
  IMF_DEBT_MEASURES,
  IMF_GDP_MEASURES,
  IMF_GROWTH_MEASURES,
  IMF_INFLATION_MEASURES,
  IMF_QUARTERLY_MEASURES,
  UN_LEADERBOARD_MEASURES,
  type MeasureDef,
} from './measures'

export interface TabDef {
  id: TabId
  /** 'series' = lines over time for selected countries; 'leaderboard' = all countries ranked for one year. */
  kind: 'series' | 'leaderboard'
  /** Leaderboard only: rank one chosen period, or each country's latest published value. */
  rankMode?: 'period' | 'latest'
  /** Series only: measures are computed on the client from the source dataset. */
  derive?: 'cumulative'
  /** Short label in the tab bar. */
  label: string
  /** Heading above the chart. */
  title: string
  source: Source
  measures: MeasureDef[]
  defaultMeasure: string
  /** Year range starts here on first load (data before is sparse for the Balkans / ex-USSR). */
  defaultFromYear: number
  /** Series only: offer Yugoslavia, the USSR and Czechoslovakia (UN data) when the range starts before they split. */
  formerCountries?: boolean
}

/** Measures the leaderboard can rank by: annual WEO rates, plus UN GDP back to 1970 (incl. Yugoslavia). */
export const LEADERBOARD_MEASURES: MeasureDef[] = [
  ...IMF_GROWTH_MEASURES,
  ...IMF_INFLATION_MEASURES,
  ...IMF_DEBT_MEASURES,
  ...UN_LEADERBOARD_MEASURES,
]

export const TABS: TabDef[] = [
  {
    id: 'eurostat',
    kind: 'series',
    label: 'GDP · Eurostat',
    title: 'GDP — Eurostat national accounts (annual)',
    source: 'eurostat',
    measures: EUROSTAT_MEASURES,
    defaultMeasure: 'CP_MEUR',
    defaultFromYear: 1995,
    formerCountries: true,
  },
  {
    id: 'imf',
    kind: 'series',
    label: 'GDP · IMF',
    title: 'GDP — IMF World Economic Outlook (annual)',
    source: 'imf',
    measures: IMF_GDP_MEASURES,
    defaultMeasure: 'NGDPD',
    defaultFromYear: 1995,
    formerCountries: true,
  },
  {
    id: 'imf-quarterly',
    kind: 'series',
    label: 'Quarterly · IMF',
    title: 'Quarterly GDP change — IMF national accounts',
    source: 'imf-quarterly',
    measures: IMF_QUARTERLY_MEASURES,
    defaultMeasure: 'QOQ_SA',
    defaultFromYear: 2010,
  },
  {
    id: 'growth',
    kind: 'series',
    label: 'Growth',
    title: 'Real GDP growth — IMF World Economic Outlook',
    source: 'imf',
    measures: IMF_GROWTH_MEASURES,
    defaultMeasure: 'NGDP_RPCH',
    defaultFromYear: 1995,
    formerCountries: true,
  },
  {
    id: 'inflation',
    kind: 'series',
    label: 'Inflation',
    title: 'Inflation — IMF World Economic Outlook',
    source: 'imf',
    measures: IMF_INFLATION_MEASURES,
    defaultMeasure: 'PCPIPCH',
    defaultFromYear: 1995,
    formerCountries: true,
  },
  {
    id: 'debt',
    kind: 'series',
    label: 'Public debt',
    title: 'Public debt — IMF World Economic Outlook',
    source: 'imf',
    measures: IMF_DEBT_MEASURES,
    defaultMeasure: 'GGXWDG_NGDP',
    defaultFromYear: 1995,
  },
  {
    id: 'cumulative',
    kind: 'series',
    derive: 'cumulative',
    label: 'Cumulative',
    title: 'Cumulative real GDP growth since a base year — IMF World Economic Outlook',
    source: 'imf',
    measures: IMF_CUMULATIVE_MEASURES,
    defaultMeasure: 'CUM_PCT',
    defaultFromYear: 2000,
  },
  {
    id: 'leaderboard',
    kind: 'leaderboard',
    label: 'Leaderboard',
    title: 'All European countries ranked for one year — IMF World Economic Outlook',
    source: 'imf',
    measures: LEADERBOARD_MEASURES,
    defaultMeasure: 'NGDP_RPCH',
    defaultFromYear: 1995,
  },
  {
    id: 'latest',
    kind: 'leaderboard',
    rankMode: 'latest',
    label: 'Latest quarter',
    title: 'Latest published quarter per country — IMF national accounts',
    source: 'imf-quarterly',
    measures: IMF_QUARTERLY_MEASURES.filter((m) => m.hasZeroBaseline),
    defaultMeasure: 'YOY',
    defaultFromYear: 1995,
  },
]

export const TAB_BY_ID: Record<TabId, TabDef> = Object.fromEntries(TABS.map((t) => [t.id, t])) as Record<
  TabId,
  TabDef
>

export function isTabId(s: string): s is TabId {
  return s in TAB_BY_ID
}
