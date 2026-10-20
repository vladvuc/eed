import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import type { ReactNode } from 'react'
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
  /** The Countries filter, shown next to the year. */
  countryFilter: ReactNode
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
  countryFilter,
}: Props) {
  const i = periods ? periods.indexOf(period) : -1
  const projected = !!periods && !!projectionsFrom && period >= projectionsFrom
  return (
    // Phones: `contents` lets the year row stick to the top of the whole page, not just this block.
    <div className="flex flex-wrap items-end gap-4 max-md:contents" role="group" aria-label="Leaderboard controls">
      <Field label="Rank by" htmlFor="rank-by" className="max-md:w-full">
        <Select value={measure.code} onValueChange={onMeasure}>
          <SelectTrigger id="rank-by" size="sm" className="max-w-[26rem] max-md:w-full max-md:max-w-none">
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

      <div className="flex flex-1 items-end gap-4 max-md:sticky max-md:top-0 max-md:z-20 max-md:-mx-4 max-md:-my-2 max-md:items-center max-md:bg-background max-md:px-4 max-md:py-2">
        {periods && (
          <Field label={`Year${projected ? ' · IMF projection' : ''}`} className="max-md:[&>label]:sr-only">
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

        {countryFilter}
        <ViewToggle view={view} onView={onView} downloadName={downloadName} />
      </div>
    </div>
  )
}
