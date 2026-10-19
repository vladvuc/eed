import { XIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { displayName } from '../data/countries'
import { MAX_SERIES } from '../hooks/useSelection'
import type { Country, CountryGroup } from '../types'
import { Swatch } from './Swatch'

interface Props {
  countries: Country[]
  groups: CountryGroup[]
  /** Codes that have at least one value for the current measure. */
  available: Set<string>
  /** Selected codes in pick order. */
  selected: string[]
  /** Flag colour of each selected code. */
  colors: Record<string, string>
  isFull: boolean
  onToggle: (code: string) => void
  onAddMany: (codes: string[]) => void
  onRemoveMany: (codes: string[]) => void
  onClearAll: () => void
}

export function CountryPicker({
  countries,
  groups,
  available,
  selected,
  colors,
  isFull,
  onToggle,
  onAddMany,
  onRemoveMany,
  onClearAll,
}: Props) {
  const [query, setQuery] = useState('')

  const nameOf = useMemo(() => {
    const labels = new Map(countries.map((c) => [c.code, c.name]))
    return (code: string) => displayName(code, labels.get(code))
  }, [countries])

  const inDataset = useMemo(() => new Set(countries.map((c) => c.code)), [countries])
  const q = query.trim().toLowerCase()

  const visibleGroups = groups
    .map((g) => ({
      ...g,
      codes: g.codes.filter(
        (code) =>
          inDataset.has(code) &&
          (q === '' || code.toLowerCase().includes(q) || nameOf(code).toLowerCase().includes(q)),
      ),
    }))
    .filter((g) => g.codes.length > 0)

  return (
    <aside
      className="picker flex flex-col overflow-hidden rounded-xl border bg-card md:sticky md:top-5 md:h-[calc(100vh-6rem)]"
      aria-label="Country selection"
    >
      <div className="flex flex-col gap-2 border-b p-3">
        <Input
          type="search"
          placeholder="Search countries…"
          aria-label="Search countries"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {selected.length} / {MAX_SERIES} selected
          </span>
          <Button variant="link" size="xs" className="h-auto p-0" onClick={onClearAll} disabled={selected.length === 0}>
            Clear all
          </Button>
        </div>
        {selected.length > 0 && (
          <ul className="selected-chips flex flex-wrap gap-1.5" aria-label="Selected countries">
            {selected.map((code) => (
              <li key={code}>
                <Badge asChild variant="outline" className="h-6 cursor-pointer gap-1.5 bg-background pr-1 hover:bg-muted">
                  <button type="button" onClick={() => onToggle(code)} title={`Remove ${nameOf(code)}`}>
                    <Swatch color={colors[code]} />
                    {nameOf(code)}
                    <XIcon className="size-3 text-muted-foreground" aria-hidden="true" />
                  </button>
                </Badge>
              </li>
            ))}
          </ul>
        )}
        {selected.length === 0 && (
          <p className="text-xs text-muted-foreground">Tick countries below to draw them on the chart.</p>
        )}
        {isFull && <p className="text-xs text-muted-foreground">Limit reached. Deselect one to add more.</p>}
      </div>

      <ScrollArea className="min-h-0 flex-1 max-md:h-80 max-md:flex-none">
        <div className="py-2">
          {visibleGroups.map((g) => {
            const allSelected = g.codes.every((c) => selected.includes(c))
            const anySelected = g.codes.some((c) => selected.includes(c))
            return (
              <section key={g.id} className="pt-2 pr-6 pb-1 pl-3">
                <header className="group-head flex items-baseline justify-between py-1">
                  <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{g.label}</h3>
                  <div className="flex gap-2.5">
                    <Button
                      variant="link"
                      size="xs"
                      className="h-auto p-0"
                      onClick={() => onAddMany(g.codes)}
                      disabled={allSelected || isFull}
                      title={isFull ? 'Limit reached' : `Add up to ${MAX_SERIES - selected.length} from this group`}
                    >
                      Select
                    </Button>
                    <Button
                      variant="link"
                      size="xs"
                      className="h-auto p-0"
                      onClick={() => onRemoveMany(g.codes)}
                      disabled={!anySelected}
                    >
                      Clear
                    </Button>
                  </div>
                </header>
                <ul>
                  {g.codes.map((code) => {
                    const checked = code in colors
                    const disabled = !checked && isFull
                    const noData = !available.has(code)
                    const id = `country-${code}`
                    return (
                      <li key={code}>
                        <label
                          htmlFor={id}
                          className={cn(
                            'row -mx-1.5 grid cursor-pointer grid-cols-[auto_12px_1fr_auto] items-center gap-2 rounded-md px-1.5 py-1 text-sm hover:bg-muted',
                            disabled && 'cursor-not-allowed text-muted-foreground',
                          )}
                        >
                          <Checkbox id={id} checked={checked} disabled={disabled} onCheckedChange={() => onToggle(code)} />
                          <Swatch color={colors[code]} />
                          <span>{nameOf(code)}</span>
                          {noData ? (
                            <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground" title="No data for the selected measure">
                              no data
                            </Badge>
                          ) : (
                            <span className="text-[11px] text-muted-foreground tabular-nums">{code}</span>
                          )}
                        </label>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )
          })}
          {visibleGroups.length === 0 && <p className="px-3 text-xs text-muted-foreground">No countries match “{query}”.</p>}
        </div>
      </ScrollArea>
    </aside>
  )
}
