import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import type { MeasureDef } from '../data/measures'
import { csvCell, downloadCsv } from '../lib/csv'
import type { Frequency } from '../types'
import type { SeriesSpec } from './SeriesChart'
import { Swatch } from './Swatch'

interface Props {
  periods: string[]
  frequency: Frequency
  series: SeriesSpec[]
  values: Record<string, (number | null)[]>
  measure: MeasureDef
  projectionsFrom?: string
}

function toCsv(periods: string[], series: SeriesSpec[], values: Props['values'], measure: MeasureDef): string {
  const head = ['period', ...series.map((s) => `${s.name} (${s.code}) [${measure.short}]`)]
  const lines = [head.map(csvCell).join(',')]
  periods.forEach((p, i) => {
    const cells = [p, ...series.map((s) => values[s.code]?.[i] ?? '')]
    lines.push(cells.map((c) => csvCell(String(c))).join(','))
  })
  return lines.join('\n')
}

export function DataTable({ periods, frequency, series, values, measure, projectionsFrom }: Props) {
  if (series.length === 0) {
    return (
      <div className="grid min-h-60 place-items-center text-muted-foreground">
        <p>Select at least one country to show data.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {measure.label}
          {projectionsFrom ? ' · ᵖ = projection' : ''}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            downloadCsv(
              `${measure.code}_${periods[0]}_${periods[periods.length - 1]}.csv`,
              toCsv(periods, series, values, measure),
            )
          }
        >
          Download CSV
        </Button>
      </div>
      <div className="max-h-[560px] overflow-auto rounded-lg border">
        <Table className="data-table text-[13px] tabular-nums">
          <TableHeader className="sticky top-0 z-10 bg-card">
            <TableRow>
              <TableHead>{frequency === 'Q' ? 'Quarter' : 'Year'}</TableHead>
              {series.map((s) => (
                <TableHead key={s.code} className="text-right">
                  <span className="inline-flex items-center gap-1.5">
                    <Swatch color={s.color} />
                    {s.name}
                  </span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {periods.map((p, i) => {
              const projected = !!projectionsFrom && p >= projectionsFrom
              return (
                <TableRow key={p} className={projected ? 'text-muted-foreground' : ''}>
                  <TableCell className="font-medium text-muted-foreground">
                    {p}
                    {projected ? 'ᵖ' : ''}
                  </TableCell>
                  {series.map((s) => {
                    const v = values[s.code]?.[i] ?? null
                    return (
                      <TableCell key={s.code} className={cn('text-right', v === null && 'text-muted-foreground')}>
                        {v === null ? '–' : measure.formatValue(v)}
                      </TableCell>
                    )
                  })}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
