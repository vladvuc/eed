import { ChartBarBigIcon, DownloadIcon, TableIcon } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { downloadVisibleChart } from '../lib/downloadImage'
import type { View } from '../types'

export function ViewToggle({
  view,
  onView,
  downloadName,
}: {
  view: View
  onView: (v: View) => void
  /** File name for the "Download" PNG of what is currently shown. */
  downloadName: string
}) {
  const [busy, setBusy] = useState(false)
  const download = async () => {
    setBusy(true)
    try {
      await downloadVisibleChart(downloadName)
    } catch (err) {
      console.error('[download] could not render the image:', err)
    } finally {
      setBusy(false)
    }
  }

  return (
    // Phones: icons only, so the year and these buttons share one line.
    <div className="ml-auto flex items-center gap-2">
      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        value={view}
        onValueChange={(v) => v && onView(v as View)}
        aria-label="View"
      >
        <ToggleGroupItem value="chart" className="px-3 max-md:px-2" title="Chart">
          <ChartBarBigIcon className="md:hidden" aria-hidden="true" />
          <span className="max-md:sr-only">Chart</span>
        </ToggleGroupItem>
        <ToggleGroupItem value="table" className="px-3 max-md:px-2" title="Table">
          <TableIcon className="md:hidden" aria-hidden="true" />
          <span className="max-md:sr-only">Table</span>
        </ToggleGroupItem>
      </ToggleGroup>
      <Button
        variant="outline"
        size="sm"
        className="max-md:px-2"
        onClick={download}
        disabled={busy}
        title={`Save as ${downloadName}`}
      >
        <DownloadIcon aria-hidden="true" />
        <span className="max-md:sr-only">{busy ? 'Saving…' : 'Download'}</span>
      </Button>
    </div>
  )
}
