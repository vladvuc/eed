export interface MeasureDef {
  code: string
  label: string
  /** Short suffix used in table headers / CSV. */
  short: string
  /** Level measures (monetary) can be drawn on a log axis. */
  isLevel: boolean
  /** Rates get a zero baseline and, for a single country, year-by-year bars. */
  hasZeroBaseline: boolean
  /** Compact formatter for axis ticks. */
  formatTick: (v: number) => string
  /** Full-precision formatter for tooltip / table. */
  formatValue: (v: number) => string
}

const nf0 = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 })
const nf1 = new Intl.NumberFormat('en-GB', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const nf2 = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 2 })

/** v is in millions. Compact to M / B / T. */
function compactMillions(prefix: string) {
  return (v: number): string => {
    const abs = Math.abs(v)
    if (abs >= 1e6) return `${prefix}${nf2.format(v / 1e6)} T`
    if (abs >= 1e3) return `${prefix}${nf2.format(v / 1e3)} B`
    return `${prefix}${nf2.format(v)} M`
  }
}

/** v is in billions. Compact to B / T. */
function compactBillions(prefix: string) {
  return (v: number): string => {
    const abs = Math.abs(v)
    if (abs >= 1e3) return `${prefix}${nf2.format(v / 1e3)} T`
    return `${prefix}${nf2.format(v)} B`
  }
}

const pct = (v: number) => `${nf1.format(v)} %`
const pctTick = (v: number) => `${nf0.format(v)} %`

export const EUROSTAT_MEASURES: MeasureDef[] = [
  {
    code: 'CP_MEUR',
    label: 'GDP, current prices (€)',
    short: 'M€',
    isLevel: true,
    hasZeroBaseline: false,
    formatTick: compactMillions('€'),
    formatValue: (v) => `${nf1.format(v)} M€`,
  },
  {
    code: 'CP_MPPS_EU27_2020',
    label: 'GDP, current prices (PPS)',
    short: 'M PPS',
    isLevel: true,
    hasZeroBaseline: false,
    formatTick: compactMillions(''),
    formatValue: (v) => `${nf1.format(v)} M PPS`,
  },
  {
    code: 'CLV15_MEUR',
    label: 'Real GDP, chain-linked 2015 (€)',
    short: 'M€ (2015)',
    isLevel: true,
    hasZeroBaseline: false,
    formatTick: compactMillions('€'),
    formatValue: (v) => `${nf1.format(v)} M€`,
  },
  {
    code: 'CLV_I15',
    label: 'Real GDP, volume index (2015 = 100)',
    short: 'index',
    isLevel: false,
    hasZeroBaseline: false,
    formatTick: (v) => nf0.format(v),
    formatValue: (v) => nf1.format(v),
  },
  {
    code: 'CLV_PCH_PRE',
    label: 'Real GDP growth, % vs previous year',
    short: '%',
    isLevel: false,
    hasZeroBaseline: true,
    formatTick: pctTick,
    formatValue: pct,
  },
]

export const IMF_GDP_MEASURES: MeasureDef[] = [
  {
    code: 'NGDPD',
    label: 'GDP, current prices (US$)',
    short: 'bn US$',
    isLevel: true,
    hasZeroBaseline: false,
    formatTick: compactBillions('$'),
    formatValue: (v) => `${nf1.format(v)} bn US$`,
  },
  {
    code: 'PPPGDP',
    label: 'GDP, PPP (international $)',
    short: 'bn PPP$',
    isLevel: true,
    hasZeroBaseline: false,
    formatTick: compactBillions(''),
    formatValue: (v) => `${nf1.format(v)} bn PPP$`,
  },
  {
    code: 'NGDPDPC',
    label: 'GDP per capita, current prices (US$)',
    short: 'US$ per capita',
    isLevel: true,
    hasZeroBaseline: false,
    formatTick: (v) => `$${nf0.format(v)}`,
    formatValue: (v) => `${nf0.format(v)} US$`,
  },
  {
    code: 'PPPPC',
    label: 'GDP per capita, PPP (international $)',
    short: 'PPP$ per capita',
    isLevel: true,
    hasZeroBaseline: false,
    formatTick: (v) => nf0.format(v),
    formatValue: (v) => `${nf0.format(v)} PPP$`,
  },
]

export const IMF_GROWTH_MEASURES: MeasureDef[] = [
  {
    code: 'NGDP_RPCH',
    label: 'Real GDP growth, % vs previous year',
    short: '%',
    isLevel: false,
    hasZeroBaseline: true,
    formatTick: pctTick,
    formatValue: pct,
  },
]

export const IMF_INFLATION_MEASURES: MeasureDef[] = [
  {
    code: 'PCPIPCH',
    label: 'Inflation, average consumer prices (% change)',
    short: '%',
    isLevel: false,
    hasZeroBaseline: true,
    formatTick: pctTick,
    formatValue: pct,
  },
  {
    code: 'PCPIEPCH',
    label: 'Inflation, end-of-period consumer prices (% change)',
    short: '%',
    isLevel: false,
    hasZeroBaseline: true,
    formatTick: pctTick,
    formatValue: pct,
  },
]

export const IMF_DEBT_MEASURES: MeasureDef[] = [
  {
    code: 'GGXWDG_NGDP',
    label: 'General government gross debt (% of GDP)',
    short: '% of GDP',
    isLevel: false,
    hasZeroBaseline: false,
    formatTick: pctTick,
    formatValue: pct,
  },
  {
    code: 'GGXWDG_EUR',
    label: 'General government gross debt (€)',
    short: 'bn €',
    isLevel: true,
    hasZeroBaseline: false,
    formatTick: compactBillions('€'),
    formatValue: (v) => `${nf1.format(v)} bn €`,
  },
  {
    code: 'GGXWDG_USD',
    label: 'General government gross debt (US$)',
    short: 'bn US$',
    isLevel: true,
    hasZeroBaseline: false,
    formatTick: compactBillions('$'),
    formatValue: (v) => `${nf1.format(v)} bn US$`,
  },
  {
    code: 'GGXCNL_NGDP',
    label: 'Government net lending (+) / borrowing (−) (% of GDP)',
    short: '% of GDP',
    isLevel: false,
    hasZeroBaseline: true,
    formatTick: pctTick,
    formatValue: pct,
  },
]

export const IMF_QUARTERLY_MEASURES: MeasureDef[] = [
  {
    code: 'QOQ_SA',
    label: 'Real GDP, % change vs previous quarter (seasonally adjusted)',
    short: '% q/q',
    isLevel: false,
    hasZeroBaseline: true,
    formatTick: pctTick,
    formatValue: pct,
  },
  {
    code: 'YOY',
    label: 'Real GDP, % change vs same quarter a year earlier',
    short: '% y/y',
    isLevel: false,
    hasZeroBaseline: true,
    formatTick: pctTick,
    formatValue: pct,
  },
  {
    code: 'NOM_YOY',
    label: 'Nominal GDP, % change vs same quarter a year earlier',
    short: '% y/y nominal',
    isLevel: false,
    hasZeroBaseline: true,
    formatTick: pctTick,
    formatValue: pct,
  },
  {
    code: 'IDX_SA',
    label: 'Real GDP, volume index (2015 = 100, seasonally adjusted)',
    short: 'index',
    isLevel: false,
    hasZeroBaseline: false,
    formatTick: (v) => nf0.format(v),
    formatValue: (v) => nf1.format(v),
  },
]

/** Derived client-side from NGDP_RPCH (see src/lib/cumulative.ts). */
export const IMF_CUMULATIVE_MEASURES: MeasureDef[] = [
  {
    code: 'CUM_PCT',
    label: 'Real GDP, cumulative % change since base year',
    short: '% since base',
    isLevel: false,
    hasZeroBaseline: true,
    formatTick: pctTick,
    formatValue: pct,
  },
  {
    code: 'CUM_IDX',
    label: 'Real GDP, index (base year = 100)',
    short: 'index',
    isLevel: false,
    hasZeroBaseline: false,
    formatTick: (v) => nf0.format(v),
    formatValue: (v) => nf1.format(v),
  },
]
