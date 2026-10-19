import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  usePlotArea,
  useXAxisScale,
  useYAxisScale,
  type BarShapeProps,
  type TooltipContentProps,
} from 'recharts'
import type { MeasureDef } from '../data/measures'
import { spreadLabels } from '../lib/labels'
import { niceZeroDomain, symlogDomain } from '../lib/scale'
import { yearOf, type Frequency } from '../types'
import { TOOLTIP_CLASS } from '../lib/chart-ui'
import { Swatch } from './Swatch'

export interface SeriesSpec {
  code: string
  name: string
  color: string // flag colour assigned to this country
}

interface Props {
  periods: string[]
  frequency: Frequency
  series: SeriesSpec[]
  values: Record<string, (number | null)[]> // code → aligned with `periods`
  measure: MeasureDef
  logScale: boolean
  projectionsFrom?: string
}

type Row = { period: string } & Record<string, number | null | string>

const CHART_HEIGHT = 460
const LABEL_GAP = 13 // px between stacked end labels

/** Direct end labels for every line: country code at the last data point, nudged apart on collision. */
function EndLabels({ series, periods, values }: { series: SeriesSpec[]; periods: string[]; values: Props['values'] }) {
  const xScale = useXAxisScale()
  const yScale = useYAxisScale()
  const plot = usePlotArea()
  if (!xScale || !yScale || !plot) return null

  const points = series
    .map((s) => {
      const arr = values[s.code] ?? []
      let last = -1
      for (let i = 0; i < periods.length; i++) if (arr[i] !== null && arr[i] !== undefined) last = i
      if (last < 0) return null
      const x = xScale(periods[last])
      const y = yScale(arr[last])
      return x === undefined || y === undefined || Number.isNaN(y) ? null : { code: s.code, x, y }
    })
    .filter((p): p is { code: string; x: number; y: number } => p !== null)
  if (points.length === 0) return null

  const nudged = spreadLabels(
    points.map((p) => p.y),
    LABEL_GAP,
    plot.y + LABEL_GAP / 2,
    plot.y + plot.height - LABEL_GAP / 2,
  )

  return (
    <g className="end-labels" aria-hidden="true">
      {points.map((p, i) => {
        const ly = nudged[i]
        const moved = Math.abs(ly - p.y) > 1.5
        return (
          <g key={p.code}>
            {moved && (
              <line x1={p.x + 2} y1={p.y} x2={p.x + 7} y2={ly} stroke="var(--chart-ink-muted)" strokeWidth={1} />
            )}
            <text
              x={p.x + 9}
              y={ly}
              dy={4}
              fontSize={12}
              fontWeight={600}
              fill="var(--chart-ink-secondary)"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {p.code}
            </text>
          </g>
        )
      })}
    </g>
  )
}

function logDomainAndTicks(min: number, max: number): { domain: [number, number]; ticks: number[] } {
  const lo = Math.pow(10, Math.floor(Math.log10(min)))
  const hi = Math.pow(10, Math.ceil(Math.log10(max)))
  const ticks: number[] = []
  const decades = Math.round(Math.log10(hi) - Math.log10(lo))
  for (let p = lo; p <= hi * 1.0001; p *= 10) {
    ticks.push(p)
    if (decades <= 3 && p < hi) ticks.push(p * 2, p * 5)
  }
  return { domain: [lo, hi], ticks: ticks.filter((t) => t >= lo && t <= hi) }
}

/** Pick x ticks: one per year (or every n-th year) so labels never collide. */
function xTicks(periods: string[], frequency: Frequency): string[] {
  const firstOfYear = frequency === 'Q' ? periods.filter((p) => p.endsWith('-Q1')) : periods
  const maxTicks = 14
  const step = Math.max(1, Math.ceil(firstOfYear.length / maxTicks))
  const nice = step <= 1 ? 1 : step <= 2 ? 2 : step <= 5 ? 5 : 10
  return firstOfYear.filter((p) => yearOf(p) % nice === 0)
}

/** Bar with a 4px rounded data-end and a square base at the zero line. */
function RoundedBar(props: BarShapeProps) {
  const { x, y, width, height, fill } = props
  if (width <= 0 || height === 0) return null
  const top = Math.min(y, y + height)
  const bottom = Math.max(y, y + height)
  const h = bottom - top
  const r = Math.min(4, width / 2, h)
  const v = Array.isArray(props.value) ? props.value[1] - props.value[0] : Number(props.value)
  const positive = v >= 0
  const d = positive
    ? `M${x},${bottom} V${top + r} a${r},${r} 0 0 1 ${r},-${r} H${x + width - r} a${r},${r} 0 0 1 ${r},${r} V${bottom} Z`
    : `M${x},${top} V${bottom - r} a${r},${r} 0 0 0 ${r},${r} H${x + width - r} a${r},${r} 0 0 0 ${r},-${r} V${top} Z`
  return <path d={d} fill={fill} />
}

export function SeriesChart({ periods, frequency, series, values, measure, logScale, projectionsFrom }: Props) {
  const rows = useMemo<Row[]>(
    () =>
      periods.map((period, i) => {
        const row: Row = { period }
        for (const s of series) row[s.code] = values[s.code]?.[i] ?? null
        return row
      }),
    [periods, series, values],
  )

  // Levels (always positive) get a true log axis; rates that can be zero or negative get a symmetric log.
  const useLog = logScale && measure.isLevel
  const useSymlog = logScale && !measure.isLevel

  const { domain, ticks } = useMemo(() => {
    let min = Infinity
    let max = -Infinity
    for (const s of series) {
      for (const v of values[s.code] ?? []) {
        if (v === null) continue
        if (useLog && v <= 0) continue
        if (v < min) min = v
        if (v > max) max = v
      }
    }
    if (!Number.isFinite(min)) return { domain: undefined, ticks: undefined }
    if (useLog) return logDomainAndTicks(min, max)
    if (useSymlog) return symlogDomain(min, max)
    if (measure.hasZeroBaseline) return niceZeroDomain(min, max)
    return { domain: undefined, ticks: undefined }
  }, [series, values, useLog, useSymlog, measure.hasZeroBaseline])

  const xt = useMemo(() => xTicks(periods, frequency), [periods, frequency])
  const tickYear = (p: string) => String(yearOf(p))

  if (series.length === 0) {
    return (
      <div className="grid min-h-60 place-items-center text-muted-foreground">
        <p>Select at least one country to draw a line.</p>
      </div>
    )
  }

  const projectionStart =
    projectionsFrom && periods.some((p) => p >= projectionsFrom)
      ? (periods.find((p) => p >= projectionsFrom) ?? null)
      : null
  const singleBars = series.length === 1 && measure.hasZeroBaseline

  // Levels start at zero; rates get a nice zero-anchored domain (computed above).
  const linearDomain: [number | 'auto', number | 'auto'] = measure.isLevel ? [0, 'auto'] : ['auto', 'auto']
  const hasCustomDomain = !!domain && (useLog || useSymlog || measure.hasZeroBaseline)

  const xAxis = (
    <XAxis
      dataKey="period"
      ticks={xt}
      tickFormatter={tickYear}
      tick={{ fill: 'var(--chart-ink-muted)', fontSize: 12 }}
      tickLine={false}
      axisLine={{ stroke: 'var(--chart-axis)' }}
      interval={0}
    />
  )
  const yAxis = (
    <YAxis
      scale={useLog ? 'log' : useSymlog ? 'symlog' : 'auto'}
      domain={hasCustomDomain ? domain : linearDomain}
      ticks={hasCustomDomain ? ticks : undefined}
      tickFormatter={(v: number) => measure.formatTick(v)}
      tick={{ fill: 'var(--chart-ink-muted)', fontSize: 12 }}
      tickLine={false}
      axisLine={false}
      width={72}
      allowDataOverflow={useLog}
    />
  )
  const projection = projectionStart && (
    <ReferenceArea
      x1={projectionStart}
      x2={periods[periods.length - 1]}
      fill="var(--chart-ink-muted)"
      fillOpacity={0.08}
      stroke="none"
      label={{ value: 'Projections', position: 'insideTopRight', fill: 'var(--chart-ink-muted)', fontSize: 12 }}
    />
  )
  const tooltip = (
    <Tooltip
      cursor={singleBars ? { fill: 'var(--chart-hover)' } : { stroke: 'var(--chart-axis)', strokeWidth: 1 }}
      isAnimationActive={false}
      content={(p: TooltipContentProps) => <ChartTooltip {...p} measure={measure} series={series} />}
    />
  )
  const margin = { top: 12, right: singleBars ? 16 : 56, bottom: 4, left: 8 }

  if (singleBars) {
    const s = series[0]
    return (
      <div className="chart">
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <BarChart data={rows} margin={margin} barCategoryGap="20%">
            <CartesianGrid stroke="var(--chart-grid)" strokeWidth={1} vertical={false} />
            {xAxis}
            {yAxis}
            {projection}
            <ReferenceLine y={0} stroke="var(--chart-axis)" strokeWidth={1} />
            <Bar
              dataKey={s.code}
              name={s.name}
              fill={s.color}
              maxBarSize={24}
              shape={RoundedBar}
              isAnimationActive={false}
            />
            {tooltip}
          </BarChart>
        </ResponsiveContainer>
      </div>
    )
  }

  return (
    <div className="chart">
      <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
        <LineChart data={rows} margin={margin}>
          <CartesianGrid stroke="var(--chart-grid)" strokeWidth={1} vertical={false} />
          {xAxis}
          {yAxis}
          {projection}
          {measure.hasZeroBaseline && <ReferenceLine y={0} stroke="var(--chart-axis)" strokeWidth={1} />}
          {series.map((s) => (
            <Line
              key={s.code}
              dataKey={s.code}
              name={s.name}
              type="linear"
              stroke={s.color}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--chart-surface)' }}
              connectNulls={false}
              isAnimationActive={false}
            />
          ))}
          <EndLabels series={series} periods={periods} values={values} />
          {tooltip}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function ChartTooltip({
  active,
  label,
  payload,
  measure,
  series,
}: TooltipContentProps & { measure: MeasureDef; series: SeriesSpec[] }) {
  if (!active) return null
  const byCode = new Map(series.map((s) => [s.code, s]))
  const items = (payload ?? [])
    .map((p) => ({
      code: String(p.dataKey ?? ''),
      value: typeof p.value === 'number' ? p.value : null,
    }))
    .filter((it) => byCode.has(it.code))
    .sort((a, b) => (b.value ?? -Infinity) - (a.value ?? -Infinity))

  return (
    <div className={TOOLTIP_CLASS} role="dialog" aria-label={`Values for ${label}`}>
      <div className="mb-1 font-semibold">{label}</div>
      <table>
        <tbody>
          {items.map((it) => {
            const s = byCode.get(it.code)!
            return (
              <tr key={it.code}>
                <td className="pr-1.5 align-middle">
                  <Swatch color={s.color} />
                </td>
                <td className="pr-3 text-muted-foreground">{s.name}</td>
                <td className="text-right whitespace-nowrap tabular-nums">
                  {it.value === null ? '–' : measure.formatValue(it.value)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
