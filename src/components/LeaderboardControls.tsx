import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { MeasureDef } from '../data/measures'
import type { View } from '../types'
import { Field } from './Field'
import { ViewToggle } from './ViewToggle'

interface Props {
  measures: MeasureDef[]
  measure: MeasureDef
  onMeasure: (code: string) => void
  /** Omit to hide the year control (latest-value mode). */
  periods?: string[]
  period: string
  onPeriod: (p: string) => void
  projectionsFrom?: string
  view: View
  onView: (v: View) => void
  /** File name for the Download button. */
  downloadName: string
}

export function LeaderboardControls({
  measures,
  measure,
  onMeasure,
  periods,
  period,
  onPeriod,
  projectionsFrom,
  view,
  onView,
  downloadName,
}: Props) {
  const i = periods ? periods.indexOf(period) : -1
  const projected = !!periods && !!projectionsFrom && period >= projectionsFrom
  return (
    <div className="flex flex-wrap items-end gap-4" role="group" aria-label="Leaderboard controls">
      <Field label="Rank by" htmlFor="rank-by">
        <Select value={measure.code} onValueChange={onMeasure}>
          <SelectTrigger id="rank-by" size="sm" className="max-w-[26rem]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {measures.map((m) => (
              <SelectItem key={m.code} value={m.code}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {periods && (
        <Field label={`Year${projected ? ' · IMF projection' : ''}`}>
          <div className="year-stepper flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Previous year"
              disabled={i <= 0}
              onClick={() => onPeriod(periods[i - 1])}
            >
              <ChevronLeftIcon />
            </Button>
            <Select value={period} onValueChange={onPeriod}>
              <SelectTrigger size="sm" aria-label="Year" className="min-w-[5.5rem]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {periods.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                    {projectionsFrom && p >= projectionsFrom ? ' ᵖ' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Next year"
              disabled={i < 0 || i >= periods.length - 1}
              onClick={() => onPeriod(periods[i + 1])}
            >
              <ChevronRightIcon />
            </Button>
          </div>
        </Field>
      )}

      <ViewToggle view={view} onView={onView} downloadName={downloadName} />
    </div>
  )
}
