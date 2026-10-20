import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CountryPicker } from './components/CountryPicker'
import { Controls } from './components/Controls'
import { CountryFilter } from './components/CountryFilter'
import { DataTable } from './components/DataTable'
import { Footer } from './components/Footer'
import { Leaderboard } from './components/Leaderboard'
import { MobileNav } from './components/MobileNav'
import { LeaderboardControls } from './components/LeaderboardControls'
import { SeriesChart, type SeriesSpec } from './components/SeriesChart'
import { Swatch } from './components/Swatch'
import { DEFAULT_SELECTION, IMF_GROUPS, displayName, groupsFor, selectionKeyFor } from './data/countries'
import { HOME_PAGE_ID, PAGE_SEO, pageIdFromPath } from './data/seo'
import { TABS, TAB_BY_ID, isTabId } from './data/tabs'
import { useDataset } from './hooks/useDataset'
import { useSelection } from './hooks/useSelection'
import { useColorScheme } from './hooks/useColorScheme'
import { assignFlagColors } from './lib/flagColors'
import { CUMULATIVE_SOURCE_MEASURE, deriveCumulative } from './lib/cumulative'
import { filterGroups, setShown } from './lib/countryFilter'
import {
  FORMER_NOTE_PREFIX,
  activeFormer,
  extendBackWithUn,
  lastFormerYear,
  mergeFormerCountries,
  successorAliases,
} from './lib/formerCountries'
import { slug } from './lib/downloadImage'
import { applyPageSeo } from './lib/pageSeo'
import { yearOf, type Source, type TabId, type View } from './types'

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

const SOURCE_NAMES: Record<Source, string> = { eurostat: 'Eurostat', imf: 'IMF', 'imf-quarterly': 'IMF', un: 'UN' }
const LEADERBOARD_FROM_YEAR = 1975

/** Every IMF country (no aggregates) for the leaderboard. */
const LEADERBOARD_CODES = IMF_GROUPS.filter((g) => g.id !== 'agg').flatMap((g) => g.codes)

/** Each tab has its own path (see src/data/seo.ts); old `#tab` links still resolve. */
function readUrlTab(): TabId {
  const h = window.location.hash.replace(/^#/, '')
  if (isTabId(h)) return h
  const fromPath = pageIdFromPath(window.location.pathname)
  return fromPath && isTabId(fromPath) ? fromPath : HOME_PAGE_ID
}

export default function App() {
  const [tabId, setTabId] = useState<TabId>(readUrlTab)
  const tab = TAB_BY_ID[tabId]

  useEffect(() => {
    const onNavigate = () => setTabId(readUrlTab())
    window.addEventListener('popstate', onNavigate)
    window.addEventListener('hashchange', onNavigate)
    return () => {
      window.removeEventListener('popstate', onNavigate)
      window.removeEventListener('hashchange', onNavigate)
    }
  }, [])

  // Keep the URL on the tab's canonical path (also rewrites legacy `#tab` links) and the head in sync.
  useEffect(() => {
    const { path } = PAGE_SEO[tabId]
    if (window.location.pathname !== path || window.location.hash) {
      window.history.replaceState(null, '', path + window.location.search)
    }
    applyPageSeo(tabId)
  }, [tabId])

  const selectTab = useCallback((id: TabId) => {
    if (PAGE_SEO[id].path !== window.location.pathname) {
      window.history.pushState(null, '', PAGE_SEO[id].path + window.location.search)
    }
    setTabId(id)
  }, [])

  // Leaderboard: countries hidden from the ranking (Countries filter). Survives reloads.
  const [excluded, setExcluded] = useState<string[]>(readExcluded)
  useEffect(() => {
    window.localStorage.setItem(EXCLUDED_KEY, JSON.stringify(excluded))
  }, [excluded])

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

  // Some leaderboard measures come from another source (UN data for years before the 1990s splits).
  const dataSource = measure.source ?? tab.source
  const { data: rawData, error, loading, retry } = useDataset(dataSource)
  // Annual IMF and Eurostat data gain Yugoslavia, the USSR and Czechoslovakia (UN) until they split.
  const { data: unData } = useDataset(dataSource === 'imf' || dataSource === 'eurostat' ? 'un' : null)
  // The leaderboard also reaches back to LEADERBOARD_FROM_YEAR with UN figures, before the WEO starts.
  const sourceData = useMemo(() => {
    if (!rawData || !unData) return rawData
    if (dataSource === 'eurostat') return mergeFormerCountries(rawData, unData, 'eurostat')
    if (dataSource !== 'imf') return rawData
    const merged = mergeFormerCountries(rawData, unData)
    return tab.kind === 'leaderboard' ? extendBackWithUn(merged, unData, LEADERBOARD_FROM_YEAR) : merged
  }, [rawData, unData, dataSource, tab.kind])

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

  // Former countries are ranked up to their split; their successors join the ranking afterwards.
  const formerNow = useMemo(
    () => (data && tab.kind === 'leaderboard' && tab.rankMode !== 'latest' ? activeFormer(data, measure.code, period) : []),
    [data, tab, measure, period],
  )
  const successorOf = useMemo(() => successorAliases(formerNow), [formerNow])
  const leaderboardCodes = useMemo(() => {
    const base = dataSource === 'un' ? (sourceData?.countries.map((c) => c.code) ?? []) : LEADERBOARD_CODES
    const kept = base.filter((c) => !successorOf[c])
    return [...kept, ...formerNow.map((f) => f.code).filter((c) => !kept.includes(c))]
  }, [dataSource, sourceData, successorOf, formerNow])

  // Leaderboard "Countries" filter: this year's rankable countries, by group, and which are hidden.
  const filterCountries = useMemo(() => {
    const labels = new Map(data?.countries.map((c) => [c.code, c.name]))
    return leaderboardCodes.map((code) => ({ code, name: displayName(code, labels.get(code)) }))
  }, [data, leaderboardCodes])
  const filterGroupList = useMemo(
    () => filterGroups(leaderboardCodes, IMF_GROUPS.filter((g) => g.id !== 'agg'), data?.former?.map((f) => f.code) ?? []),
    [leaderboardCodes, data],
  )
  const hidden = useMemo(() => excluded.filter((c) => leaderboardCodes.includes(c)), [excluded, leaderboardCodes])

  // Series: a "Former countries" group while the range starts before the last split.
  const formerUntil = tab.formerCountries ? lastFormerYear(data) : null
  const groups = useMemo(() => {
    const base = groupsFor(tab.source)
    if (formerUntil === null || from > formerUntil || !data?.former) return base
    const former = { id: 'former', label: 'Former countries', codes: data.former.map((f) => f.code) }
    const agg = base.findIndex((g) => g.id === 'agg')
    return agg < 0 ? [...base, former] : [...base.slice(0, agg), former, ...base.slice(agg)]
  }, [tab.source, formerUntil, from, data])
  const showFormerNote =
    tab.kind === 'leaderboard' ? formerNow.length > 0 : sel.selected.some((c) => data?.former?.some((f) => f.code === c))

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

  // Dataset notes that only concern some measures or countries stay with them.
  const notes = useMemo(
    () =>
      data?.notes?.filter((n) => {
        if (n.startsWith('Debt in')) return measure.code.startsWith('GGXWDG_')
        if (n.startsWith(FORMER_NOTE_PREFIX)) return showFormerNote
        return true
      }) ?? undefined,
    [data, measure, showFormerNote],
  )

  // Countries with data in the selected years (others are greyed out in the picker).
  const available = useMemo(() => {
    const byGeo = data?.measures[measure.code] ?? {}
    return new Set(
      Object.keys(byGeo).filter((c) => byGeo[c].slice(visible.start, visible.end).some((v) => v !== null)),
    )
  }, [data, measure, visible])

  const downloadPrefix = `european-economic-data_${tabId}_${slug(measure.label)}`

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
        <div className="mx-auto grid w-full max-w-[1600px] items-center gap-x-6 gap-y-2 px-4 py-2 md:grid-cols-[320px_minmax(0,1fr)] md:px-8 md:py-3">
          <div className="flex min-w-0 items-center gap-1 md:justify-center">
            {/* Phones: the tabs live in a side menu. */}
            <MobileNav active={tabId} onSelect={selectTab} />
            <h1 className="flex items-center gap-2 text-base font-semibold md:text-lg">
              <img src="/favicon.svg" alt="" className="size-6 shrink-0 md:size-7" />
              European Economic Data
            </h1>
          </div>
          <Tabs value={tabId} onValueChange={(v) => selectTab(v as TabId)} className="max-md:hidden">
            <TabsList className="tabs flex-wrap">
              {TABS.map((t) => (
                <TabsTrigger key={t.id} value={t.id} asChild>
                  {/* Real links so crawlers can follow every tab; plain clicks stay in the app. */}
                  <a
                    href={PAGE_SEO[t.id].path}
                    // Radix activates tabs on mousedown; skip that for "open in new tab" clicks.
                    onMouseDown={(e) => {
                      if (e.metaKey || e.shiftKey || e.altKey) e.preventDefault()
                    }}
                    onClick={(e) => {
                      if (e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) e.preventDefault()
                    }}
                  >
                    {t.label}
                  </a>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </header>

      {loading && (
        <p className="status mx-auto w-full max-w-[1600px] px-4 md:px-8 py-6 text-muted-foreground">Loading {SOURCE_NAMES[dataSource]} data…</p>
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
        <main className="main mx-auto flex w-full max-w-[1600px] min-w-0 flex-col gap-4 px-4 pt-5 pb-8 md:px-8">
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
            downloadName={`${downloadPrefix}${tab.rankMode === 'latest' ? '' : `_${period}`}.png`}
            countryFilter={
              <CountryFilter countries={filterCountries} groups={filterGroupList} hidden={hidden} onChange={setExcluded} />
            }
          />
          <div className="flex flex-col gap-4" data-export-root>
            <Leaderboard
              data={data}
              codes={leaderboardCodes.filter((c) => !excluded.includes(c))}
              successorOf={successorOf}
              excluded={hidden}
              onExclude={(code) => setExcluded((xs) => (xs.includes(code) ? xs : [...xs, code]))}
              onRestoreAll={() => setExcluded((xs) => setShown(xs, leaderboardCodes, true))}
              measure={measure}
              period={period}
              mode={tab.rankMode ?? 'period'}
              view={ts.view}
              title={`${measure.label}${tab.rankMode === 'latest' ? ' — latest quarter' : ` — ${period}`}`}
              // Only caveats about where this year's figures come from; the source is in the footer.
              subtitle={[
                tab.rankMode !== 'latest' && data.projectionsFrom && period >= data.projectionsFrom ? 'IMF projection' : '',
                data.unBefore && period < data.unBefore
                  ? `${period}: UN national accounts${measure.code === 'PCPIPCH' ? ' (GDP deflator)' : ''}`
                  : '',
              ]
                .filter(Boolean)
                .join(' · ')}
            />
            {footer}
          </div>
        </main>
      )}

      {data && tab.kind === 'series' && (
        <div className="mx-auto w-full max-w-[1600px] px-4 md:px-8 grid flex-1 items-start gap-6 pt-5 pb-8 md:grid-cols-[320px_minmax(0,1fr)]">
          <CountryPicker
            countries={data.countries}
            groups={groups}
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
              downloadName={`${downloadPrefix}_${from}-${to}.png`}
            />

            {/* What the Download button saves: the chart or table, with its sources. */}
            <div className="flex flex-col gap-4" data-export-root>
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
            </div>
          </main>
        </div>
      )}
    </div>
  )
}
