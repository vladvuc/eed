import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { MeasureDef } from '../data/measures'
import type { View } from '../types'
import { Field } from './Field'
import { ViewToggle } from './ViewToggle'
import { YearSelect } from './YearSelect'

interface Props {
  measures: MeasureDef[]
  measure: MeasureDef
  onMeasure: (code: string) => void
  years: number[]
  logScale: boolean
  onLogScale: (v: boolean) => void
  from: number
  to: number
  onRange: (from: number, to: number) => void
  view: View
  onView: (v: View) => void
  /** Base-year picker (cumulative tab only). */
  base?: { value: number; onChange: (y: number) => void }
  /** File name for the Download button. */
  downloadName: string
}

export function Controls({
  measures,
  measure,
  onMeasure,
  years,
  logScale,
  onLogScale,
  from,
  to,
  onRange,
  view,
  onView,
  base,
  downloadName,
}: Props) {
  return (
    <div className="flex flex-wrap items-end gap-4" role="group" aria-label="Chart controls">
      {base && (
        <Field label="Base year (= 0 %)" htmlFor="base-year">
          <YearSelect id="base-year" label="Base year" years={years} value={base.value} onChange={base.onChange} />
        </Field>
      )}

      <Field label="Measure" htmlFor="measure" className="max-md:w-full">
        <Select value={measure.code} onValueChange={onMeasure}>
          <SelectTrigger id="measure" size="sm" className="max-w-[26rem] max-md:w-full max-md:max-w-none">
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

      <div className="flex h-7 items-center gap-2">
        <Checkbox
          id="log-scale"
          checked={logScale}
          onCheckedChange={(v) => onLogScale(v === true)}
        />
        <Label
          htmlFor="log-scale"
          title={measure.isLevel ? undefined : 'Symmetric log: compresses large moves on both sides of zero, so zero and negative values stay visible'}
        >
          Log scale
        </Label>
      </div>

      <Field label="Years">
        <div className="flex items-center gap-1.5">
          <YearSelect label="From year" years={years.filter((y) => y <= to)} value={from} onChange={(y) => onRange(y, to)} />
          <span className="text-muted-foreground">–</span>
          <YearSelect label="To year" years={years.filter((y) => y >= from)} value={to} onChange={(y) => onRange(from, y)} />
        </div>
      </Field>

      <ViewToggle view={view} onView={onView} downloadName={downloadName} />
    </div>
  )
}
