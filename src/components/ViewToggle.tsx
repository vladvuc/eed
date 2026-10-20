import { DownloadIcon } from 'lucide-react'
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
    <div className="ml-auto flex items-center gap-2">
      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        value={view}
        onValueChange={(v) => v && onView(v as View)}
        aria-label="View"
      >
        <ToggleGroupItem value="chart" className="px-3">
          Chart
        </ToggleGroupItem>
        <ToggleGroupItem value="table" className="px-3">
          Table
        </ToggleGroupItem>
      </ToggleGroup>
      <Button variant="outline" size="sm" onClick={download} disabled={busy} title={`Save as ${downloadName}`}>
        <DownloadIcon aria-hidden="true" />
        {busy ? 'Saving…' : 'Download'}
      </Button>
    </div>
  )
}
