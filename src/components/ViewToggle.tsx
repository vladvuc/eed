import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { View } from '../types'

export function ViewToggle({ view, onView }: { view: View; onView: (v: View) => void }) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      value={view}
      onValueChange={(v) => v && onView(v as View)}
      aria-label="View"
      className="ml-auto"
    >
      <ToggleGroupItem value="chart" className="px-3">
        Chart
      </ToggleGroupItem>
      <ToggleGroupItem value="table" className="px-3">
        Table
      </ToggleGroupItem>
    </ToggleGroup>
  )
}
