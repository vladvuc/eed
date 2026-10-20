/**
 * UN Statistics Division, National Accounts – Analysis of Main Aggregates (AMA): GDP for
 * Europe from 1970, including the former federations (Yugoslavia, Czechoslovakia, USSR)
 * that Eurostat and the IMF don't cover. Used by the leaderboard only. Pure helpers; the
 * download lives in fetch-un.ts.
 */
import type { Cell } from './xlsx.ts'

export type Series = (number | null)[]

/** AMA CountryID (UN M49) → the ISO3-style code and name used in the app. */
export const UN_COUNTRIES: { m49: number; code: string; name: string }[] = [
  { m49: 890, code: 'YUG', name: 'Yugoslavia' },
  { m49: 200, code: 'CSK', name: 'Czechoslovakia' },
  { m49: 810, code: 'SUN', name: 'USSR' },
  { m49: 40, code: 'AUT', name: 'Austria' },
  { m49: 56, code: 'BEL', name: 'Belgium' },
  { m49: 100, code: 'BGR', name: 'Bulgaria' },
  { m49: 191, code: 'HRV', name: 'Croatia' },
  { m49: 196, code: 'CYP', name: 'Cyprus' },
  { m49: 203, code: 'CZE', name: 'Czech Republic' },
  { m49: 208, code: 'DNK', name: 'Denmark' },
  { m49: 233, code: 'EST', name: 'Estonia' },
  { m49: 246, code: 'FIN', name: 'Finland' },
  { m49: 250, code: 'FRA', name: 'France' },
  { m49: 276, code: 'DEU', name: 'Germany' },
  { m49: 300, code: 'GRC', name: 'Greece' },
  { m49: 348, code: 'HUN', name: 'Hungary' },
  { m49: 372, code: 'IRL', name: 'Ireland' },
  { m49: 380, code: 'ITA', name: 'Italy' },
  { m49: 428, code: 'LVA', name: 'Latvia' },
  { m49: 440, code: 'LTU', name: 'Lithuania' },
  { m49: 442, code: 'LUX', name: 'Luxembourg' },
  { m49: 470, code: 'MLT', name: 'Malta' },
  { m49: 528, code: 'NLD', name: 'Netherlands' },
  { m49: 616, code: 'POL', name: 'Poland' },
  { m49: 620, code: 'PRT', name: 'Portugal' },
  { m49: 642, code: 'ROU', name: 'Romania' },
  { m49: 703, code: 'SVK', name: 'Slovak Republic' },
  { m49: 705, code: 'SVN', name: 'Slovenia' },
  { m49: 724, code: 'ESP', name: 'Spain' },
  { m49: 752, code: 'SWE', name: 'Sweden' },
  { m49: 8, code: 'ALB', name: 'Albania' },
  { m49: 70, code: 'BIH', name: 'Bosnia and Herzegovina' },
  { m49: 499, code: 'MNE', name: 'Montenegro' },
  { m49: 807, code: 'MKD', name: 'North Macedonia' },
  { m49: 688, code: 'SRB', name: 'Serbia' },
  { m49: 412, code: 'UVK', name: 'Kosovo' },
  { m49: 352, code: 'ISL', name: 'Iceland' },
  { m49: 438, code: 'LIE', name: 'Liechtenstein' },
  { m49: 578, code: 'NOR', name: 'Norway' },
  { m49: 756, code: 'CHE', name: 'Switzerland' },
  { m49: 826, code: 'GBR', name: 'United Kingdom' },
  { m49: 804, code: 'UKR', name: 'Ukraine' },
  { m49: 643, code: 'RUS', name: 'Russia' },
  { m49: 112, code: 'BLR', name: 'Belarus' },
  { m49: 498, code: 'MDA', name: 'Moldova' },
  { m49: 268, code: 'GEO', name: 'Georgia' },
  { m49: 51, code: 'ARM', name: 'Armenia' },
  { m49: 31, code: 'AZE', name: 'Azerbaijan' },
  { m49: 792, code: 'TUR', name: 'Türkiye' },
  { m49: 20, code: 'AND', name: 'Andorra' },
  { m49: 674, code: 'SMR', name: 'San Marino' },
  { m49: 492, code: 'MCO', name: 'Monaco' },
]

/** Successor states outside Europe: only used to add up the USSR between 1991 and its split. */
const EXTRA_M49: Record<string, number> = { KAZ: 398, UZB: 860, TKM: 795, KGZ: 417, TJK: 762 }

/**
 * Former federations, shown up to the year they split (`lastYear`). The UN reports them until
 * 1990; for 1991 to `lastYear` their successor states are added up instead.
 */
export const FEDERATIONS: { code: string; lastYear: number; successors: string[] }[] = [
  { code: 'YUG', lastYear: 1992, successors: ['SVN', 'HRV', 'BIH', 'SRB', 'MNE', 'MKD', 'UVK'] },
  {
    code: 'SUN',
    lastYear: 1991,
    successors: ['RUS', 'UKR', 'BLR', 'MDA', 'GEO', 'ARM', 'AZE', 'EST', 'LVA', 'LTU', 'KAZ', 'UZB', 'TKM', 'KGZ', 'TJK'],
  },
  { code: 'CSK', lastYear: 1992, successors: ['CZE', 'SVK'] },
]

export interface UnTable {
  years: number[]
  /** CountryID → values aligned with `years`. */
  byId: Map<number, Series>
}

const num = (c: Cell): number | null => (typeof c === 'number' && Number.isFinite(c) ? c : null)

/**
 * AMA sheets: a title row, then a header row "CountryID, Country, [IndicatorName,] 1970 … 2024".
 * Files with several indicators per country keep only `indicator`.
 */
export function tableFromSheet(rows: Cell[][], indicator?: string): UnTable {
  const h = rows.findIndex((r) => r[0] === 'CountryID')
  if (h < 0) throw new Error('UN sheet has no CountryID header row')
  const header = rows[h]
  const yearCols = header.flatMap((c, i) => (typeof c === 'number' && c >= 1900 && c <= 2100 ? [i] : []))
  const indCol = header.indexOf('IndicatorName')
  const byId = new Map<number, Series>()
  for (const r of rows.slice(h + 1)) {
    const id = num(r[0])
    if (id === null) continue
    if (indCol >= 0 && r[indCol] !== indicator) continue
    byId.set(id, yearCols.map((i) => num(r[i])))
  }
  return { years: yearCols.map((i) => header[i] as number), byId }
}

export interface UnTables {
  current: UnTable // GDP, current US$
  constant: UnTable // GDP, constant 2020 US$
  perCapita: UnTable // GDP per capita, current US$
  /** GDP, current prices in national currency (for deflator inflation). */
  currentNcu: UnTable
  /** Eurostat annual average US$ per € (ECU before 1999), by year: GDP in € for the Eurostat tab. */
  usdPerEur?: Record<string, number>
}

/**
 * Years whose GDP deflator (inflation) is shown as no data: the UN's national-currency GDP isn't in
 * one currency across the year and the year before, so the ratio measures a currency switch, not prices.
 *  - Serbia: 1993 is in different dinar units from 1992 and 1994 (the 1993–94 redenominations),
 *    which would give 222 billion % for 1993 and 3 % for 1994.
 *  - Montenegro, Kosovo: in euro throughout, converted from dinars at market rates until the
 *    Deutsche Mark took over in late 1999, so years up to 2000 would show e.g. −41 % in 1996.
 */
export const UNRELIABLE_DEFLATOR: Record<string, (year: number) => boolean> = {
  SRB: (y) => y === 1993 || y === 1994,
  MNE: (y) => y <= 2000,
  UVK: (y) => y <= 2000,
}

export const UNRELIABLE_DEFLATOR_NOTE =
  'Inflation not shown for Serbia in 1993–94, or for Montenegro and Kosovo before 2001: the UN figures for those years mix currency units.'

/** Same shape as the app's StatDataset (src/types.ts). */
export interface UnDataset {
  source: 'un'
  updated: string
  frequency: 'A'
  periods: string[]
  countries: { code: string; name: string }[]
  measures: Record<string, Record<string, Series>>
  notes: string[]
  /** Successors listed are the ones the app knows (European); the app hides them while the federation is shown. */
  former: { code: string; lastYear: number; successors: string[] }[]
}

const growth = (s: Series): Series =>
  s.map((v, i) => (i > 0 && v !== null && s[i - 1] ? (v / s[i - 1]! - 1) * 100 : null))

const sumAll = (xs: (number | null)[]): number | null =>
  xs.every((x) => x !== null) ? xs.reduce<number>((a, x) => a + x!, 0) : null

const lastIndex = (s: Series | undefined): number => {
  if (!s) return -1
  for (let i = s.length - 1; i >= 0; i--) if (s[i] !== null) return i
  return -1
}

/** Pure: AMA tables → the leaderboard dataset (GDP in billion US$, per capita in US$, growth in %). */
export function buildUnDataset(t: UnTables, downloadedOn: string): UnDataset {
  const years = t.current.years
  const align = (table: UnTable, id: number): Series => {
    const s = table.byId.get(id)
    return years.map((y) => {
      const j = table.years.indexOf(y)
      return s && j >= 0 ? s[j] : null
    })
  }

  const gdp: Record<string, Series> = {}
  const real: Record<string, Series> = {}
  const pc: Record<string, Series> = {}
  const ncu: Record<string, Series> = {}
  const countries: { code: string; name: string }[] = []
  const load = (code: string, m49: number) => {
    gdp[code] = align(t.current, m49).map((v) => (v === null ? null : v / 1e9))
    real[code] = align(t.constant, m49)
    pc[code] = align(t.perCapita, m49)
    ncu[code] = align(t.currentNcu, m49)
  }
  for (const c of UN_COUNTRIES) {
    if (!align(t.current, c.m49).some((v) => v !== null)) continue
    countries.push({ code: c.code, name: c.name })
    load(c.code, c.m49)
  }
  const extra = Object.entries(EXTRA_M49).filter(([, m49]) => t.current.byId.has(m49))
  for (const [code, m49] of extra) load(code, m49)
  // Growth comes from each entity's own constant-price series.
  const rpch: Record<string, Series> = Object.fromEntries(Object.entries(real).map(([c, s]) => [c, growth(s)]))
  // Inflation = GDP deflator change: nominal growth in national currency over real growth. The UN has
  // no constant-price national-currency series for the former federations, so this works for all.
  const defl: Record<string, Series> = Object.fromEntries(
    Object.keys(real).map((c) => [
      c,
      years.map((year, i) => {
        const n = ncu[c][i], nPrev = ncu[c][i - 1], g = rpch[c][i]
        if (UNRELIABLE_DEFLATOR[c]?.(year)) return null
        return n !== null && nPrev && g !== null ? ((n / nPrev) / (1 + g / 100) - 1) * 100 : null
      }),
    ]),
  )

  const former: UnDataset['former'] = []
  let reportedUntil = Infinity
  for (const fed of FEDERATIONS) {
    const reported = lastIndex(gdp[fed.code])
    if (reported < 0) continue
    reportedUntil = Math.min(reportedUntil, years[reported])
    const succ = fed.successors.filter((c) => gdp[c])
    // Successors' population = GDP / GDP per capita, so the combined per-capita value is a true average.
    const sum = (m: Record<string, Series>, i: number) => sumAll(succ.map((c) => m[c][i]))
    const pop = (i: number) =>
      sumAll(succ.map((c) => (gdp[c][i] !== null && pc[c][i] ? (gdp[c][i]! * 1e9) / pc[c][i]! : null)))
    for (let i = reported + 1; i < years.length; i++) {
      if (years[i] > fed.lastYear) {
        gdp[fed.code][i] = pc[fed.code][i] = rpch[fed.code][i] = defl[fed.code][i] = null
        continue
      }
      const g = sum(gdp, i)
      const p = pop(i)
      const r = sum(real, i)
      const rPrev = sum(real, i - 1)
      gdp[fed.code][i] = g
      pc[fed.code][i] = g !== null && p ? (g * 1e9) / p : null
      // Within the successors' own series, so the break between the two sources isn't counted as growth.
      rpch[fed.code][i] = r !== null && rPrev ? (r / rPrev - 1) * 100 : null
      // Successors use different currencies: average their inflation, weighted by GDP in US$, over the
      // successors that have a figure (Montenegro and Kosovo have none for these years).
      const priced = succ.filter((c) => defl[c][i] !== null && gdp[c][i] !== null)
      const pricedGdp = priced.reduce((a, c) => a + gdp[c][i]!, 0)
      defl[fed.code][i] = pricedGdp ? priced.reduce((a, c) => a + defl[c][i]! * gdp[c][i]!, 0) / pricedGdp : null
    }
    former.push({ code: fed.code, lastYear: fed.lastYear, successors: succ.filter((c) => !(c in EXTRA_M49)) })
  }
  for (const [code] of extra) {
    delete gdp[code]
    delete pc[code]
    delete rpch[code]
    delete defl[code]
  }
  const nameOf = (code: string) => countries.find((c) => c.code === code)?.name ?? code
  // € only for the former countries: everyone else is on the Eurostat tab with Eurostat's own figures.
  const meur: Record<string, Series> = Object.fromEntries(
    former.map((f) => [f.code, gdp[f.code]] as const).map(([c, s]) => [
      c,
      s.map((v, i) => {
        const rate = t.usdPerEur?.[String(years[i])]
        return v === null || !rate ? null : (v * 1000) / rate
      }),
    ]),
  )

  return {
    source: 'un',
    updated: `data to ${years.at(-1)}, downloaded ${downloadedOn}`,
    frequency: 'A',
    periods: years.map(String),
    countries,
    measures: { UN_NGDPD: gdp, UN_NGDPDPC: pc, UN_NGDP_RPCH: rpch, UN_DEFL_PCH: defl, UN_NGDP_MEUR: meur },
    notes: [
      `Former countries: UN data to ${reportedUntil}, then their successor states combined until the split (${former
        .map((f) => `${nameOf(f.code)} ${f.lastYear}`)
        .join(', ')}). Their inflation is the GDP deflator.`,
      'Real GDP growth is computed from GDP at constant 2020 prices; inflation from the GDP deflator.',
      UNRELIABLE_DEFLATOR_NOTE,
    ],
    former,
  }
}
