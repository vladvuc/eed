import { useMemo, type ReactNode } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type BarShapeProps,
  type TooltipContentProps,
} from 'recharts'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { displayName } from '../data/countries'
import type { MeasureDef } from '../data/measures'
import { TOOLTIP_CLASS } from '../lib/chart-ui'
import { csvCell, downloadCsv } from '../lib/csv'
import { rankCountries, rankLatest, type RankedRow } from '../lib/rank'
import { niceZeroDomain } from '../lib/scale'
import type { StatDataset, View } from '../types'

interface Props {
  data: StatDataset
  /** Country codes to rank (aggregates and the pool excluded by the caller). */
  codes: string[]
  /** Codes parked in the pool, in the order they were excluded. */
  excluded: string[]
  onExclude: (code: string) => void
  onRestore: (code: string) => void
  onRestoreAll: () => void
  measure: MeasureDef
  /** Ranked period (ignored in 'latest' mode). */
  period: string
  mode: 'period' | 'latest'
  view: View
}

const ROW_HEIGHT = 24
const nf1 = new Intl.NumberFormat('en-GB', { minimumFractionDigits: 1, maximumFractionDigits: 1, signDisplay: 'always' })

/** Horizontal bar: 4px rounded data-end (right for positive, left for negative), square at the zero line. */
function RoundedBarH(props: BarShapeProps) {
  const { x, y, width, height, fill } = props
  if (height <= 0 || width === 0) return null
  const left = Math.min(x, x + width)
  const right = Math.max(x, x + width)
  const w = right - left
  const r = Math.min(4, height / 2, w)
  const v = Array.isArray(props.value) ? props.value[1] - props.value[0] : Number(props.value)
  const d =
    v >= 0
      ? `M${left},${y} H${right - r} a${r},${r} 0 0 1 ${r},${r} V${y + height - r} a${r},${r} 0 0 1 -${r},${r} H${left} Z`
      : `M${right},${y} H${left + r} a${r},${r} 0 0 0 -${r},${r} V${y + height - r} a${r},${r} 0 0 0 ${r},${r} H${right} Z`
  return <path d={d} fill={fill} />
}

export function Leaderboard({
  data,
  codes,
  excluded,
  onExclude,
  onRestore,
  onRestoreAll,
  measure,
  period,
  mode,
  view,
}: Props) {
  const rows = useMemo(
    () => (mode === 'latest' ? rankLatest(data, codes, measure.code) : rankCountries(data, codes, measure.code, period)),
    [data, codes, measure, period, mode],
  )
  const labels = useMemo(() => new Map(data.countries.map((c) => [c.code, c.name])), [data])

  const pool = (
    <Card className="pool gap-3 bg-muted/40 py-4 md:sticky md:top-3" aria-label="Excluded countries">
      <CardHeader className="flex items-baseline justify-between px-4">
        <CardTitle className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Pool</CardTitle>
        <Button variant="link" size="xs" className="h-auto p-0" onClick={onRestoreAll} disabled={excluded.length === 0}>
          Restore all
        </Button>
      </CardHeader>
      <CardContent className="px-4">
        {excluded.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Click a bar (or a table row) to move a country here and rank the rest without it.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-1.5">
            {excluded.map((code) => (
              <li key={code}>
                <Badge asChild variant="outline" className="chip cursor-pointer bg-card hover:bg-muted">
                  <button type="button" onClick={() => onRestore(code)} title="Put back into the ranking">
                    {displayName(code, labels.get(code))} <span aria-hidden="true">↩</span>
                  </button>
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )

  let body: ReactNode
  if (rows.length === 0) {
    body = (
      <div className="grid min-h-60 place-items-center text-muted-foreground">
        <p>No data for {period}.</p>
      </div>
    )
  } else if (view === 'table') {
    body = <LeaderboardTable rows={rows} measure={measure} mode={mode} onExclude={onExclude} />
  } else {
    body = <LeaderboardChart rows={rows} measure={measure} mode={mode} onExclude={onExclude} />
  }

  return (
    <div className="grid items-start gap-4 md:grid-cols-[minmax(0,1fr)_240px]">
      {body}
      {pool}
    </div>
  )
}

function LeaderboardChart({
  rows,
  measure,
  mode,
  onExclude,
}: {
  rows: RankedRow[]
  measure: MeasureDef
  mode: 'period' | 'latest'
  onExclude: (code: string) => void
}) {
  const chartRows = rows.map((r) => ({
    ...r,
    label: mode === 'latest' ? `${r.rank}. ${r.name} · ${r.period}` : `${r.rank}. ${r.name}`,
  }))
  const { domain, ticks } = niceZeroDomain(rows[rows.length - 1].value, rows[0].value, 6)
  const height = rows.length * ROW_HEIGHT + 40

  return (
    <div className="chart leaderboard-chart">
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={chartRows} layout="vertical" margin={{ top: 4, right: 64, bottom: 4, left: 8 }} barCategoryGap={4}>
          <CartesianGrid stroke="var(--chart-grid)" strokeWidth={1} horizontal={false} />
          <XAxis
            type="number"
            domain={domain}
            ticks={ticks}
            tickFormatter={(v: number) => measure.formatTick(v)}
            tick={{ fill: 'var(--chart-ink-muted)', fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            orientation="top"
          />
          <YAxis
            type="category"
            dataKey="label"
            width={mode === 'latest' ? 250 : 200}
            interval={0}
            tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <ReferenceLine x={0} stroke="var(--chart-axis)" strokeWidth={1} />
          <Bar
            dataKey="value"
            fill="var(--series-1)"
            maxBarSize={18}
            shape={RoundedBarH}
            isAnimationActive={false}
            cursor="pointer"
            onClick={(item) => {
              const code = (item.payload as RankedRow | undefined)?.code
              if (code) onExclude(code)
            }}
          >
            <LabelList
              dataKey="value"
              content={(props) => {
                const { value, viewBox } = props
                if (typeof value !== 'number' || !viewBox || !('x' in viewBox)) return null
                const x = viewBox.x ?? 0
                const w = viewBox.width ?? 0
                const y = (viewBox.y ?? 0) + (viewBox.height ?? 0) / 2
                const positive = value >= 0
                return (
                  <text
                    x={positive ? x + w + 6 : x - 6}
                    y={y}
                    dy={4}
                    fontSize={12}
                    textAnchor={positive ? 'start' : 'end'}
                    fill="var(--chart-ink-secondary)"
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {measure.formatValue(value)}
                  </text>
                )
              }}
            />
          </Bar>
          <Tooltip
            cursor={{ fill: 'var(--chart-hover)' }}
            isAnimationActive={false}
            content={(p: TooltipContentProps) => <RankTooltip {...p} measure={measure} />}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function RankTooltip({ active, payload, measure }: TooltipContentProps & { measure: MeasureDef }) {
  if (!active || !payload?.length) return null
  const r = payload[0].payload as RankedRow
  const period = r.period
  const prevPeriod = previousPeriod(period)
  return (
    <div className={TOOLTIP_CLASS} role="dialog" aria-label={`${r.name}, ${period}`}>
      <div className="mb-1 font-semibold">
        #{r.rank} {r.name}
      </div>
      <table>
        <tbody>
          <tr>
            <td className="pr-3 text-muted-foreground">{period}</td>
            <td className="text-right tabular-nums">{measure.formatValue(r.value)}</td>
          </tr>
          {r.previous !== null && (
            <tr>
              <td className="pr-3 text-muted-foreground">{prevPeriod}</td>
              <td className="text-right tabular-nums">{measure.formatValue(r.previous)}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

/** "2024" → "2023", "2026-Q1" → "2025-Q4". */
function previousPeriod(p: string): string {
  const m = /^(\d{4})-Q([1-4])$/.exec(p)
  if (!m) return String(Number(p) - 1)
  const y = Number(m[1])
  const q = Number(m[2])
  return q === 1 ? `${y - 1}-Q4` : `${y}-Q${q - 1}`
}

function LeaderboardTable({
  rows,
  measure,
  mode,
  onExclude,
}: {
  rows: RankedRow[]
  measure: MeasureDef
  mode: 'period' | 'latest'
  onExclude: (code: string) => void
}) {
  const latest = mode === 'latest'
  const period = rows[0]?.period ?? ''
  const prevPeriod = previousPeriod(period)
  const download = () => {
    const head = latest
      ? ['rank', 'country', 'code', `last [${measure.short}]`, `previous [${measure.short}]`, 'change (pp)', 'reference']
      : ['rank', 'country', 'code', `${period} [${measure.short}]`, `${prevPeriod} [${measure.short}]`, 'change (pp)']
    const lines = [head.join(',')]
    for (const r of rows) {
      const cells = [r.rank, csvCell(r.name), r.code, r.value, r.previous ?? '', r.previous === null ? '' : (r.value - r.previous).toFixed(2)]
      if (latest) cells.push(r.period)
      lines.push(cells.join(','))
    }
    downloadCsv(latest ? `latest_${measure.code}.csv` : `leaderboard_${measure.code}_${period}.csv`, lines.join('\n'))
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {measure.label}
          {latest ? '' : `, ${period}`} · {rows.length} countries
        </span>
        <Button variant="outline" size="sm" onClick={download}>
          Download CSV
        </Button>
      </div>
      <div className="overflow-auto rounded-lg border">
        <Table className="leaderboard-table text-[13px] tabular-nums">
          <TableHeader className="sticky top-0 z-10 bg-card">
            <TableRow>
              <TableHead className="w-10 text-right">#</TableHead>
              <TableHead>Country</TableHead>
              <TableHead className="text-right">{latest ? 'Last' : period}</TableHead>
              <TableHead className="text-right">{latest ? 'Previous' : prevPeriod}</TableHead>
              <TableHead className="text-right">Change (pp)</TableHead>
              {latest && <TableHead className="text-right">Reference</TableHead>}
              <TableHead className="w-8">
                <span className="sr-only">Exclude</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.code} className="cursor-pointer" onClick={() => onExclude(r.code)}>
                <TableCell className="text-right text-muted-foreground">{r.rank}</TableCell>
                <TableCell>
                  {r.name} <span className="text-[11px] text-muted-foreground">{r.code}</span>
                </TableCell>
                <TableCell className="text-right">{measure.formatValue(r.value)}</TableCell>
                <TableCell className={cn('text-right', r.previous === null && 'text-muted-foreground')}>
                  {r.previous === null ? '–' : measure.formatValue(r.previous)}
                </TableCell>
                <TableCell className={cn('text-right', r.previous === null && 'text-muted-foreground')}>
                  {r.previous === null ? '–' : nf1.format(r.value - r.previous)}
                </TableCell>
                {latest && <TableCell className="text-right text-muted-foreground">{r.period}</TableCell>}
                <TableCell className="py-0 text-right">
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    title="Move to the pool"
                    aria-label={`Move ${r.name} to the pool`}
                    onClick={(e) => {
                      e.stopPropagation()
                      onExclude(r.code)
                    }}
                  >
                    ×
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
