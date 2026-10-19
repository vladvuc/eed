import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CountryPicker } from './components/CountryPicker'
import { Controls } from './components/Controls'
import { DataTable } from './components/DataTable'
import { Footer } from './components/Footer'
import { Leaderboard } from './components/Leaderboard'
import { LeaderboardControls } from './components/LeaderboardControls'
import { SeriesChart, type SeriesSpec } from './components/SeriesChart'
import { Swatch } from './components/Swatch'
import { DEFAULT_SELECTION, IMF_GROUPS, displayName, groupsFor, selectionKeyFor } from './data/countries'
import { TABS, TAB_BY_ID, isTabId } from './data/tabs'
import { useDataset } from './hooks/useDataset'
import { useSelection } from './hooks/useSelection'
import { useColorScheme } from './hooks/useColorScheme'
import { assignFlagColors } from './lib/flagColors'
import { CUMULATIVE_SOURCE_MEASURE, deriveCumulative } from './lib/cumulative'
import { yearOf, type TabId, type View } from './types'

interface TabState {
  measure: string
  logScale: boolean
  range: { from: number; to: number } | null
  view: View
  /** Leaderboard only: the ranked period. */
  period: string | null
  /** Cumulative only: base year; null = start of the visible range. */
  base: number | null
}

const EXCLUDED_KEY = 'gdp-statistika:leaderboard-excluded'

function readExcluded(): string[] {
  try {
    const v = JSON.parse(window.localStorage.getItem(EXCLUDED_KEY) ?? '[]') as unknown
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

/** Every IMF country (no aggregates) for the leaderboard. */
const LEADERBOARD_CODES = IMF_GROUPS.filter((g) => g.id !== 'agg').flatMap((g) => g.codes)

function readHashTab(): TabId {
  const h = window.location.hash.replace(/^#/, '')
  return isTabId(h) ? h : 'eurostat'
}

export default function App() {
  const [tabId, setTabId] = useState<TabId>(readHashTab)
  const tab = TAB_BY_ID[tabId]

  useEffect(() => {
    const onHash = () => setTabId(readHashTab())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const selectTab = useCallback((id: TabId) => {
    setTabId(id)
    window.history.replaceState(null, '', `#${id}`)
  }, [])

  const { data: sourceData, error, loading, retry } = useDataset(tab.source)

  // Leaderboard "pool": countries taken out of the ranking. Survives reloads.
  const [excluded, setExcluded] = useState<string[]>(readExcluded)
  useEffect(() => {
    window.localStorage.setItem(EXCLUDED_KEY, JSON.stringify(excluded))
  }, [excluded])
  const rankedCodes = useMemo(() => LEADERBOARD_CODES.filter((c) => !excluded.includes(c)), [excluded])

  // One selection per code space: Eurostat (ISO2) and IMF (ISO3), shared across the IMF tabs.
  const eurostatSel = useSelection(DEFAULT_SELECTION.eurostat)
  const imfSel = useSelection(DEFAULT_SELECTION.imf)
  const sel = selectionKeyFor(tab.source) === 'eurostat' ? eurostatSel : imfSel

  // Flag colours: primary, else secondary/tertiary when an earlier pick already uses that colour.
  const scheme = useColorScheme()
  const colors = useMemo(() => assignFlagColors(sel.selected, scheme), [sel.selected, scheme])

  const [tabStates, setTabStates] = useState<Partial<Record<TabId, TabState>>>({})
  const ts: TabState = tabStates[tabId] ?? {
    measure: tab.defaultMeasure,
    logScale: false,
    range: null,
    view: 'chart',
    period: null,
    base: null,
  }
  const patch = (p: Partial<TabState>) => setTabStates((s) => ({ ...s, [tabId]: { ...ts, ...p } }))

  const measure = tab.measures.find((m) => m.code === ts.measure) ?? tab.measures[0]

  const periods = useMemo(() => sourceData?.periods ?? [], [sourceData])
  const years = useMemo(() => Array.from(new Set(periods.map(yearOf))), [periods])
  const from = ts.range?.from ?? Math.max(years[0] ?? tab.defaultFromYear, tab.defaultFromYear)
  const to = ts.range?.to ?? (years[years.length - 1] ?? tab.defaultFromYear)

  // Cumulative tab: measures are computed from the growth series relative to a base year.
  const baseYear = ts.base !== null && years.includes(ts.base) ? ts.base : from
  const data = useMemo(() => {
    if (!sourceData || tab.derive !== 'cumulative') return sourceData
    return deriveCumulative(sourceData, String(baseYear))
  }, [sourceData, tab.derive, baseYear])

  const visible = useMemo(() => {
    const idx = periods.map((p, i) => [p, i] as const).filter(([p]) => yearOf(p) >= from && yearOf(p) <= to)
    return { periods: idx.map(([p]) => p), start: idx[0]?.[1] ?? 0, end: (idx[idx.length - 1]?.[1] ?? -1) + 1 }
  }, [periods, from, to])

  const series = useMemo<SeriesSpec[]>(() => {
    if (!data) return []
    const labels = new Map(data.countries.map((c) => [c.code, c.name]))
    return sel.selected.map((code) => ({ code, name: displayName(code, labels.get(code)), color: colors[code] }))
  }, [data, sel.selected, colors])

  const values = useMemo(() => {
    const out: Record<string, (number | null)[]> = {}
    if (!data) return out
    const byGeo = data.measures[measure.code] ?? {}
    for (const s of series) out[s.code] = (byGeo[s.code] ?? []).slice(visible.start, visible.end)
    return out
  }, [data, measure, series, visible])

  // Leaderboard: default to the latest outturn year (the year before projections start).
  const leaderboardPeriods = useMemo(() => {
    const byGeo = Object.values(data?.measures[measure.code] ?? {})
    return periods.filter((_, i) => byGeo.some((s) => s[i] !== null))
  }, [periods, data, measure])
  const defaultPeriod =
    data?.projectionsFrom && periods.includes(data.projectionsFrom)
      ? periods[Math.max(0, periods.indexOf(data.projectionsFrom) - 1)]
      : (periods[periods.length - 1] ?? '')
  const period = ts.period && periods.includes(ts.period) ? ts.period : defaultPeriod

  // Cumulative tab: selected countries whose growth series starts after the base year
  // cannot be chained back to it, so they would draw nothing. Say so, and offer a fix.
  const cumulativeGaps = useMemo(() => {
    if (tab.derive !== 'cumulative' || !sourceData) return []
    const growth = sourceData.measures[CUMULATIVE_SOURCE_MEASURE] ?? {}
    return series
      .filter((s) => !(values[s.code] ?? []).some((v) => v !== null))
      .map((s) => {
        const i = (growth[s.code] ?? []).findIndex((v) => v !== null)
        return { code: s.code, name: s.name, from: i >= 0 ? yearOf(sourceData.periods[i]) : null }
      })
  }, [tab.derive, sourceData, series, values])
  const suggestedBase = cumulativeGaps.reduce<number | null>(
    (acc, g) => (g.from !== null && (acc === null || g.from > acc) ? g.from : acc),
    null,
  )

  // Dataset notes that only concern the derived debt amounts stay on those measures.
  const notes = useMemo(
    () =>
      data?.notes?.filter((n) => !n.startsWith('Debt in') || measure.code.startsWith('GGXWDG_')) ?? undefined,
    [data, measure],
  )

  const available = useMemo(() => {
    const byGeo = data?.measures[measure.code] ?? {}
    return new Set(Object.keys(byGeo).filter((c) => byGeo[c].some((v) => v !== null)))
  }, [data, measure])

  const footer = (
    <Footer
      source={data?.source ?? tab.source}
      updated={data?.updated ?? null}
      notes={notes}
      hasProjections={!!data?.projectionsFrom}
    />
  )

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        {/* Same grid as the series layout below, so the title sits over the country
            picker and the tabs line up with the chart column. */}
        <div className="mx-auto grid w-full max-w-[1600px] items-center gap-x-6 gap-y-2 px-4 py-3 md:grid-cols-[320px_minmax(0,1fr)] md:px-8">
          <h1 className="flex items-center gap-2 text-lg font-semibold md:justify-center">
            <img src="/favicon.svg" alt="" className="size-7 shrink-0" />
            European Economic Data
          </h1>
          <Tabs value={tabId} onValueChange={(v) => selectTab(v as TabId)}>
            <TabsList className="tabs flex-wrap">
              {TABS.map((t) => (
                <TabsTrigger key={t.id} value={t.id}>
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </header>

      {loading && (
        <p className="status mx-auto w-full max-w-[1600px] px-4 md:px-8 py-6 text-muted-foreground">Loading {tab.source === 'eurostat' ? 'Eurostat' : 'IMF'} data…</p>
      )}
      {error && (
        <div className="status mx-auto w-full max-w-[1600px] px-4 md:px-8 flex items-center gap-3 py-6 text-destructive" role="alert">
          <p>Could not load data: {error}</p>
          <Button variant="outline" size="sm" onClick={retry}>
            Retry
          </Button>
        </div>
      )}

      {data && tab.kind === 'leaderboard' && (
        <main className="main mx-auto flex w-full max-w-[1100px] min-w-0 flex-col gap-4 px-4 pt-5 pb-8 md:px-8">
          <LeaderboardControls
            measures={tab.measures}
            measure={measure}
            onMeasure={(code) => patch({ measure: code })}
            periods={tab.rankMode === 'latest' ? undefined : leaderboardPeriods}
            period={period}
            onPeriod={(p) => patch({ period: p })}
            projectionsFrom={data.projectionsFrom}
            view={ts.view}
            onView={(v) => patch({ view: v })}
          />
          <Card className="panel gap-3" aria-live="polite">
            <CardHeader>
              <CardTitle className="text-[15px]">
                {measure.label}
                {tab.rankMode === 'latest' ? ' — latest quarter' : ` — ${period}`}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {tab.title} · biggest value first
                {tab.rankMode !== 'latest' && data.projectionsFrom && period >= data.projectionsFrom
                  ? ' · IMF projection'
                  : ''}
              </p>
            </CardHeader>
            <CardContent>
              <Leaderboard
                data={data}
                codes={rankedCodes}
                excluded={excluded}
                onExclude={(code) => setExcluded((xs) => (xs.includes(code) ? xs : [...xs, code]))}
                onRestore={(code) => setExcluded((xs) => xs.filter((c) => c !== code))}
                onRestoreAll={() => setExcluded([])}
                measure={measure}
                period={period}
                mode={tab.rankMode ?? 'period'}
                view={ts.view}
              />
            </CardContent>
          </Card>
          {footer}
        </main>
      )}

      {data && tab.kind === 'series' && (
        <div className="mx-auto w-full max-w-[1600px] px-4 md:px-8 grid flex-1 items-start gap-6 pt-5 pb-8 md:grid-cols-[320px_minmax(0,1fr)]">
          <CountryPicker
            countries={data.countries}
            groups={groupsFor(tab.source)}
            available={available}
            selected={sel.selected}
            colors={colors}
            isFull={sel.isFull}
            onToggle={sel.toggle}
            onAddMany={sel.addMany}
            onRemoveMany={sel.removeMany}
            onClearAll={sel.clearAll}
          />

          <main className="main flex min-w-0 flex-col gap-4">
            <Controls
              measures={tab.measures}
              measure={measure}
              onMeasure={(code) => patch({ measure: code })}
              years={years}
              logScale={ts.logScale}
              onLogScale={(v) => patch({ logScale: v })}
              from={from}
              to={to}
              onRange={(f, t) => patch({ range: { from: f, to: t } })}
              view={ts.view}
              onView={(v) => patch({ view: v })}
              base={tab.derive === 'cumulative' ? { value: baseYear, onChange: (y) => patch({ base: y }) } : undefined}
            />

            <Card className="panel gap-3" aria-live="polite">
              <CardHeader className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
                <div>
                  <CardTitle className="text-[15px]">
                    {measure.label}
                    {tab.derive === 'cumulative' ? ` — since ${baseYear}` : ''}
                  </CardTitle>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {tab.title}
                    {series.length === 1 && measure.hasZeroBaseline ? ' · single country shown as bars per period' : ''}
                    {ts.logScale ? (measure.isLevel ? ' · log scale' : ' · symmetric log scale (zero and negatives kept)') : ''}
                  </p>
                </div>
                {series.length > 0 && (
                  <ul className="legend flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted-foreground" aria-label="Legend">
                    {series.map((s) => (
                      <li key={s.code} className="inline-flex items-center gap-1.5">
                        <Swatch color={s.color} line />
                        <span>{s.name}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {cumulativeGaps.length > 0 && (
                  <p className="hint-row rounded-md border bg-muted/40 px-2.5 py-1.5 text-xs text-muted-foreground" role="status">
                    Not shown since {baseYear}:{' '}
                    {cumulativeGaps
                      .map((g) => (g.from === null ? `${g.name} (no growth data)` : `${g.name} (data from ${g.from})`))
                      .join(', ')}
                    .{' '}
                    {suggestedBase !== null && suggestedBase !== baseYear && (
                      <Button variant="link" size="xs" className="h-auto p-0" onClick={() => patch({ base: suggestedBase })}>
                        Use {suggestedBase} as base year
                      </Button>
                    )}
                  </p>
                )}
                {ts.view === 'chart' ? (
                  <SeriesChart
                    periods={visible.periods}
                    frequency={data.frequency}
                    series={series}
                    values={values}
                    measure={measure}
                    logScale={ts.logScale}
                    projectionsFrom={data.projectionsFrom}
                  />
                ) : (
                  <DataTable
                    periods={visible.periods}
                    frequency={data.frequency}
                    series={series}
                    values={values}
                    measure={measure}
                    projectionsFrom={data.projectionsFrom}
                  />
                )}
              </CardContent>
            </Card>

            {footer}
          </main>
        </div>
      )}
    </div>
  )
}
