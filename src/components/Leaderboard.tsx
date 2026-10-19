import { useMemo, useState, type ReactNode } from 'react'
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
import { primaryFlagColor } from '../lib/flagColors'
import { useColorScheme } from '../hooks/useColorScheme'
import { rankCountries, rankLatest, type RankedRow } from '../lib/rank'
import { niceZeroDomain } from '../lib/scale'
import { mapScale } from '../lib/mapScale'
import { EuropeMap, type MapDatum } from './EuropeMap'
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
  /** Move every country to the pool (then pick a few back, e.g. from the map). */
  onExcludeAll: () => void
  measure: MeasureDef
  /** Ranked period (ignored in 'latest' mode). */
  period: string
  mode: 'period' | 'latest'
  view: View
  /** Card heading for the ranking (left half). */
  title: ReactNode
  subtitle: ReactNode
}

const ROW_HEIGHT = 24
const POOL_COLLAPSE_AT = 12
const nf1 = new Intl.NumberFormat('en-GB', { minimumFractionDigits: 1, maximumFractionDigits: 1, signDisplay: 'always' })

/** Horizontal bar: 4px rounded data-end (right for positive, left for negative), square at the zero line. */
function RoundedBarH(props: BarShapeProps) {
  const { x, y, width, height } = props
  // Each bar carries its country's primary flag colour on its row.
  const fill = (props.payload as { fill?: string } | undefined)?.fill ?? props.fill
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
  const dim = (props.payload as { dim?: boolean } | undefined)?.dim
  return <path d={d} fill={fill} opacity={dim ? 0.3 : 1} />
}

export function Leaderboard({
  data,
  codes,
  excluded,
  onExclude,
  onRestore,
  onRestoreAll,
  onExcludeAll,
  measure,
  period,
  mode,
  view,
  title,
  subtitle,
}: Props) {
  const rows = useMemo(
    () => (mode === 'latest' ? rankLatest(data, codes, measure.code) : rankCountries(data, codes, measure.code, period)),
    [data, codes, measure, period, mode],
  )
  const labels = useMemo(() => new Map(data.countries.map((c) => [c.code, c.name])), [data])
  const scheme = useColorScheme()

  // One hovered country shared by the ranking (left) and the map (right).
  const [hovered, setHovered] = useState<string | null>(null)

  const mapData = useMemo(() => {
    const byCode = new Map(rows.map((r) => [r.code, r]))
    const out = new Map<string, MapDatum>()
    for (const code of [...codes, ...excluded]) {
      const r = byCode.get(code)
      out.set(code, {
        code,
        name: r?.name ?? displayName(code, labels.get(code)),
        value: r?.value ?? null,
        rank: r?.rank ?? null,
        period: r?.period ?? null,
        excluded: excluded.includes(code),
      })
    }
    return out
  }, [rows, codes, excluded, labels])
  const scale = useMemo(
    () => (rows.length ? mapScale(measure.code, measure.isLevel, rows.map((r) => r.value), scheme) : null),
    [rows, measure, scheme],
  )

  // A long pool (e.g. after "Remove all") collapses to a count so it doesn't push the ranking down.
  const [poolOpen, setPoolOpen] = useState(false)
  const collapsed = excluded.length > POOL_COLLAPSE_AT && !poolOpen

  const pool = (
    <div className="pool flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-dashed px-3 py-2" aria-label="Excluded countries">
      <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Pool</span>
      {excluded.length === 0 ? (
        <span className="flex-1 text-xs text-muted-foreground">
          Click a bar, a table row or a country on the map to leave it out of the ranking.
        </span>
      ) : collapsed ? (
        <span className="flex-1 text-xs text-muted-foreground">
          {excluded.length} countries · click them on the map to put them back{' '}
          <Button variant="link" size="xs" className="h-auto p-0" onClick={() => setPoolOpen(true)}>
            Show
          </Button>
        </span>
      ) : (
        <ul className="flex flex-1 flex-wrap gap-1.5">
          {excluded.map((code) => (
            <li key={code}>
              <Badge asChild variant="outline" className="chip cursor-pointer bg-card hover:bg-muted">
                <button type="button" onClick={() => onRestore(code)} title="Put back into the ranking">
                  {displayName(code, labels.get(code))} <span aria-hidden="true">↩</span>
                </button>
              </Badge>
            </li>
          ))}
          {excluded.length > POOL_COLLAPSE_AT && (
            <li>
              <Button variant="link" size="xs" className="h-6 p-0" onClick={() => setPoolOpen(false)}>
                Hide
              </Button>
            </li>
          )}
        </ul>
      )}
      <div className="ml-auto flex items-center gap-3">
        <Button variant="link" size="xs" className="h-auto p-0" onClick={onExcludeAll} disabled={rows.length === 0}>
          Remove all
        </Button>
        <Button variant="link" size="xs" className="h-auto p-0" onClick={onRestoreAll} disabled={excluded.length === 0}>
          Restore all
        </Button>
      </div>
    </div>
  )

  let body: ReactNode
  if (rows.length === 0) {
    body = (
      <div className="grid min-h-60 place-items-center text-muted-foreground">
        <p>
          {codes.length === 0
            ? 'Every country is in the pool. Click countries on the map to add them back.'
            : `No data for ${period}.`}
        </p>
      </div>
    )
  } else if (view === 'table') {
    body = <LeaderboardTable rows={rows} measure={measure} mode={mode} onExclude={onExclude} hovered={hovered} onHover={setHovered} />
  } else {
    body = <LeaderboardChart rows={rows} measure={measure} mode={mode} onExclude={onExclude} hovered={hovered} onHover={setHovered} />
  }

  const toggle = (code: string) => (excluded.includes(code) ? onRestore(code) : onExclude(code))

  return (
    <div className="grid items-start gap-6 lg:grid-cols-2">
      <Card className="panel min-w-0 gap-3" aria-live="polite">
        <CardHeader>
          <CardTitle className="text-[15px]">{title}</CardTitle>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {pool}
          {body}
        </CardContent>
      </Card>

      <Card className="map-panel min-w-0 gap-3 lg:sticky lg:top-5">
        <CardHeader>
          <CardTitle className="text-[15px]">Across Europe</CardTitle>
          <p className="text-xs text-muted-foreground">Hover a country to find it in the ranking · click to move it into or out of the pool</p>
        </CardHeader>
        <CardContent className="px-3">
          <EuropeMap
            data={mapData}
            measure={measure}
            scale={scale}
            showPeriod={mode === 'latest'}
            hovered={hovered}
            onHover={setHovered}
            onToggle={toggle}
          />
        </CardContent>
      </Card>
    </div>
  )
}

type HoverProps = { hovered: string | null; onHover: (code: string | null) => void }

function LeaderboardChart({
  rows,
  measure,
  mode,
  onExclude,
  hovered,
  onHover,
}: {
  rows: RankedRow[]
  measure: MeasureDef
  mode: 'period' | 'latest'
  onExclude: (code: string) => void
} & HoverProps) {
  const scheme = useColorScheme()
  const chartRows = rows.map((r) => ({
    ...r,
    fill: primaryFlagColor(r.code, scheme),
    dim: hovered !== null && hovered !== r.code,
    label: mode === 'latest' ? `${r.rank}. ${r.name} · ${r.period}` : `${r.rank}. ${r.name}`,
  }))
  const { domain, ticks } = niceZeroDomain(rows[rows.length - 1].value, rows[0].value, 6)
  const height = rows.length * ROW_HEIGHT + 40

  return (
    <div className="chart leaderboard-chart">
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={chartRows}
          layout="vertical"
          margin={{ top: 4, right: 64, bottom: 4, left: 8 }}
          barCategoryGap={4}
          // The whole row band is the hover target, not just the bar.
          onMouseMove={(state) => {
            const i = state.activeTooltipIndex
            const code = i === undefined || i === null ? null : (chartRows[Number(i)]?.code ?? null)
            if (code !== hovered) onHover(code)
          }}
          onMouseLeave={() => onHover(null)}
        >
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
            tick={(props: { x?: number | string; y?: number | string; index?: number; payload?: { value?: unknown } }) => {
              const code = chartRows[props.index ?? -1]?.code
              const isHovered = hovered !== null && code === hovered
              return (
                // Plain single-line label: Recharts' default tick wraps long names onto two lines.
                <text
                  x={Number(props.x ?? 0)}
                  y={Number(props.y ?? 0)}
                  dy={4}
                  textAnchor="end"
                  fontSize={12}
                  fontWeight={isHovered ? 600 : 400}
                  fill="var(--foreground)"
                  opacity={hovered !== null && !isHovered ? 0.55 : 1}
                  className="recharts-cartesian-axis-tick-value"
                >
                  {String(props.payload?.value ?? '')}
                </text>
              )
            }}
            tickLine={false}
            axisLine={false}
          />
          <ReferenceLine x={0} stroke="var(--chart-axis)" strokeWidth={1} />
          <Bar
            dataKey="value"
            fill="var(--muted-foreground)"
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
  hovered,
  onHover,
}: {
  rows: RankedRow[]
  measure: MeasureDef
  mode: 'period' | 'latest'
  onExclude: (code: string) => void
} & HoverProps) {
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
              <TableRow
                key={r.code}
                className={cn('cursor-pointer', hovered === r.code && 'bg-muted')}
                onClick={() => onExclude(r.code)}
                onMouseEnter={() => onHover(r.code)}
                onMouseLeave={() => onHover(null)}
              >
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
