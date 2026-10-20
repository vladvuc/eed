import type { CountryGroup, Source } from '../types'

/** Eurostat uses ISO2-style codes (EL = Greece, UK, XK = Kosovo). */
export const EUROSTAT_GROUPS: CountryGroup[] = [
  {
    id: 'eu',
    label: 'European Union (27)',
    codes: ['BE','BG','CZ','DK','DE','EE','IE','EL','ES','FR','HR','IT','CY','LV','LT','LU','HU','MT','NL','AT','PL','PT','RO','SI','SK','FI','SE'],
  },
  { id: 'wb', label: 'Western Balkan', codes: ['AL', 'BA', 'ME', 'MK', 'RS', 'XK'] },
  { id: 'efta_uk', label: 'EFTA & United Kingdom', codes: ['IS', 'LI', 'NO', 'CH', 'UK'] },
  { id: 'other', label: 'Black Sea region', codes: ['TR', 'MD', 'UA', 'RU'] },
  { id: 'agg', label: 'Aggregates', codes: ['EU27_2020', 'EA20'] },
]

/** IMF uses ISO3 codes (UVK = Kosovo). */
export const IMF_GROUPS: CountryGroup[] = [
  {
    id: 'eu',
    label: 'European Union (27)',
    codes: ['AUT','BEL','BGR','HRV','CYP','CZE','DNK','EST','FIN','FRA','DEU','GRC','HUN','IRL','ITA','LVA','LTU','LUX','MLT','NLD','POL','PRT','ROU','SVK','SVN','ESP','SWE'],
  },
  { id: 'wb', label: 'Western Balkan', codes: ['ALB', 'BIH', 'MNE', 'MKD', 'SRB', 'UVK'] },
  { id: 'efta_uk', label: 'EFTA & United Kingdom', codes: ['ISL', 'LIE', 'NOR', 'CHE', 'GBR'] },
  { id: 'east', label: 'Eastern Europe', codes: ['UKR', 'RUS', 'BLR', 'MDA'] },
  { id: 'caucasus', label: 'Caucasus & Türkiye', codes: ['GEO', 'ARM', 'AZE', 'TUR'] },
  { id: 'micro', label: 'Microstates', codes: ['AND', 'SMR', 'MCO'] },
  { id: 'agg', label: 'Aggregates', codes: ['EU', 'EURO', 'EDE'] },
]

/** Eurostat and the IMF use different code systems, so selections are kept per code space. */
export type SelectionKey = 'eurostat' | 'imf'

export function selectionKeyFor(source: Source): SelectionKey {
  return source === 'eurostat' ? 'eurostat' : 'imf'
}

export function groupsFor(source: Source): CountryGroup[] {
  return source === 'eurostat' ? EUROSTAT_GROUPS : IMF_GROUPS
}

/** First-load selection: nothing is chosen until the user picks countries. */
export const DEFAULT_SELECTION: Record<SelectionKey, string[]> = {
  eurostat: [],
  imf: [],
}

/** Shorter display names than the official labels, where those are unwieldy. */
const DISPLAY_NAME_OVERRIDES: Record<string, string> = {
  EU27_2020: 'European Union (27)',
  EA20: 'Euro area (20)',
  // Eurostat already labels Kosovo "Kosovo*"; the IMF doesn't. The asterisk points to KOSOVO_FOOTNOTE.
  XK: 'Kosovo*',
  UVK: 'Kosovo*',
}

export function displayName(code: string, officialLabel: string | undefined): string {
  return DISPLAY_NAME_OVERRIDES[code] ?? officialLabel ?? code
}

/**
 * Ranked name for one year. Before reunification (3 October 1990) Germany's growth and inflation are
 * West Germany's; its GDP levels (IMF, UN) cover today's territory, so those keep "Germany".
 */
export function periodName(code: string, name: string, period: string, isLevel: boolean): string {
  return code === 'DEU' && !isLevel && Number(period.slice(0, 4)) <= 1990 ? 'West Germany' : name
}

export const KOSOVO_FOOTNOTE =
  '* This designation is without prejudice to positions on status, and is in line with UNSCR 1244/1999.'
