/**
 * Official flag colours, in order of preference: primary, secondary, tertiary.
 * Values follow the colour specifications on the English Wikipedia "Flag of …" pages (checked 2026-10),
 * preferring the legal/government scheme where several are given. Belgium, Czechia, Portugal, Türkiye,
 * Monaco and Montenegro publish no official shades there; those use the commonly cited values.
 * Chromatic colours come first; white/black come last because on a chart they read as ink or background.
 * Keyed by IMF ISO3 code; Eurostat codes are mapped below.
 */
export const FLAG_COLORS: Record<string, string[]> = {
  AUT: ['#C8102E', '#FFFFFF'],
  BEL: ['#FDDA24', '#EF3340', '#000000'],
  BGR: ['#00966E', '#D62612', '#FFFFFF'],
  HRV: ['#E1000F', '#000091', '#FFFFFF'],
  CYP: ['#D57800', '#4E5B31', '#FFFFFF'],
  CZE: ['#11457E', '#D7141A', '#FFFFFF'],
  DNK: ['#D21034', '#FFFFFF'],
  EST: ['#0072CE', '#000000', '#FFFFFF'],
  FIN: ['#18447E', '#FFFFFF'],
  FRA: ['#000091', '#E1000F', '#FFFFFF'],
  DEU: ['#D00000', '#FFCE00', '#000000'],
  GRC: ['#014488', '#FFFFFF'],
  HUN: ['#CE2939', '#477050', '#FFFFFF'],
  IRL: ['#169B62', '#FF883E', '#FFFFFF'],
  ITA: ['#008C45', '#CD212A', '#FFFFFF'],
  LVA: ['#9D2235', '#FFFFFF'],
  LTU: ['#FDB913', '#006A44', '#C1272D'],
  LUX: ['#00A3E0', '#EF3340', '#FFFFFF'],
  MLT: ['#CF142B', '#FFFFFF'],
  NLD: ['#AD1D25', '#1E4785', '#FFFFFF'],
  POL: ['#D4213D', '#FFFFFF'],
  PRT: ['#FF0000', '#006600', '#FFFF00'],
  ROU: ['#002B7F', '#FCD116', '#CE1126'],
  SVK: ['#254AA5', '#ED1C24', '#FFFFFF'],
  SVN: ['#0000FF', '#FF0000', '#FFFFFF'],
  ESP: ['#AD1519', '#FABD00'],
  SWE: ['#005583', '#FFC200'],
  ALB: ['#FF0000', '#000000'],
  BIH: ['#001489', '#FFCD00', '#FFFFFF'],
  MNE: ['#C40308', '#D4AF37'],
  MKD: ['#CE2028', '#F9D616'],
  SRB: ['#C7363D', '#0C4077', '#FFFFFF'],
  UVK: ['#2443A5', '#D1A650', '#FFFFFF'],
  ISL: ['#02529C', '#DC1E35', '#FFFFFF'],
  LIE: ['#002780', '#CF0921', '#FFD93B'],
  NOR: ['#D21034', '#003698', '#FFFFFF'],
  CHE: ['#FF0000', '#FFFFFF'],
  GBR: ['#012169', '#C8102E', '#FFFFFF'],
  UKR: ['#0057B7', '#FFD700'],
  RUS: ['#0032A0', '#DA291C', '#FFFFFF'],
  BLR: ['#D22730', '#009739', '#FFFFFF'],
  MDA: ['#0046AE', '#FFD200', '#CC092F'],
  GEO: ['#FF0000', '#FFFFFF'],
  ARM: ['#D90012', '#0033A0', '#F2A800'],
  AZE: ['#00B5E2', '#EF3340', '#509E2F'],
  TUR: ['#E30A17', '#FFFFFF'],
  AND: ['#10069F', '#FEDD00', '#D50032'],
  SMR: ['#59A7D3', '#FFFFFF'],
  MCO: ['#CE1126', '#FFFFFF'],
  // Aggregates: the flag of Europe for the EU and the euro area; no flag for "Emerging and Developing Europe".
  EU: ['#003399', '#FFCC00'],
  EURO: ['#003399', '#FFCC00'],
  EDE: ['#8C8C8C'],
}

const EUROSTAT_TO_ISO3: Record<string, string> = {
  BE: 'BEL', BG: 'BGR', CZ: 'CZE', DK: 'DNK', DE: 'DEU', EE: 'EST', IE: 'IRL', EL: 'GRC', ES: 'ESP',
  FR: 'FRA', HR: 'HRV', IT: 'ITA', CY: 'CYP', LV: 'LVA', LT: 'LTU', LU: 'LUX', HU: 'HUN', MT: 'MLT',
  NL: 'NLD', AT: 'AUT', PL: 'POL', PT: 'PRT', RO: 'ROU', SI: 'SVN', SK: 'SVK', FI: 'FIN', SE: 'SWE',
  AL: 'ALB', BA: 'BIH', ME: 'MNE', MK: 'MKD', RS: 'SRB', XK: 'UVK',
  IS: 'ISL', LI: 'LIE', NO: 'NOR', CH: 'CHE', UK: 'GBR',
  TR: 'TUR', MD: 'MDA', UA: 'UKR', RU: 'RUS',
  EU27_2020: 'EU', EA20: 'EURO',
}

/** Neutral used for any code without a known flag. */
export const NO_FLAG_COLOR = '#8C8C8C'

export function flagColors(code: string): string[] {
  return FLAG_COLORS[EUROSTAT_TO_ISO3[code] ?? code] ?? [NO_FLAG_COLOR]
}
