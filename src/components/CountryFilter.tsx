import { ListFilterIcon } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { useIsCompact } from '../hooks/useIsCompact'
import { setShown, showOnly } from '../lib/countryFilter'
import type { Country, CountryGroup } from '../types'

interface Props {
  /** Every country that can be ranked, with its display name. */
  countries: Country[]
  /** Groups of those countries (see filterGroups). */
  groups: CountryGroup[]
  /** Codes left out of the ranking. */
  hidden: string[]
  onChange: (hidden: string[]) => void
}

/**
 * Leaderboard "Countries" control: which countries are ranked. A popover on wider screens,
 * a bottom sheet on phones.
 */
export function CountryFilter({ countries, groups, hidden, onChange }: Props) {
  const compact = useIsCompact()
  const [open, setOpen] = useState(false)
  const all = countries.map((c) => c.code)
  const shownCount = all.filter((c) => !hidden.includes(c)).length

  const trigger = (
    <Button
      variant="outline"
      size="sm"
      className="max-md:px-2"
      aria-label={`Countries: ${shownCount} of ${all.length} shown`}
      title="Choose the countries in the ranking"
      onClick={compact ? () => setOpen(true) : undefined}
    >
      <ListFilterIcon aria-hidden="true" />
      <span className="max-md:sr-only">Countries</span>
      {shownCount < all.length && (
        <span className="text-xs text-muted-foreground tabular-nums max-md:sr-only">
          {shownCount}/{all.length}
        </span>
      )}
    </Button>
  )
  const body = <FilterBody countries={countries} groups={groups} hidden={hidden} onChange={onChange} all={all} />

  if (compact) {
    return (
      <>
        {trigger}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent
            side="bottom"
            className="gap-0 rounded-t-xl data-[side=bottom]:h-[85dvh]"
            // Don't focus the search box on open: the keyboard would cover the list.
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <SheetHeader className="border-b pb-3">
              <SheetTitle>Countries in the ranking</SheetTitle>
              <SheetDescription>
                {shownCount} of {all.length} shown
              </SheetDescription>
            </SheetHeader>
            {body}
          </SheetContent>
        </Sheet>
      </>
    )
  }
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="end" className="flex h-[min(32rem,70vh)] w-80 flex-col gap-0 p-0">
        <div className="border-b px-3 py-2.5">
          <p className="font-medium">Countries in the ranking</p>
          <p className="text-xs text-muted-foreground">
            {shownCount} of {all.length} shown
          </p>
        </div>
        {body}
      </PopoverContent>
    </Popover>
  )
}

function FilterBody({ countries, groups, hidden, onChange, all }: Props & { all: string[] }) {
  const [query, setQuery] = useState('')
  const names = new Map(countries.map((c) => [c.code, c.name]))
  const q = query.trim().toLowerCase()
  const matches = (code: string) =>
    q === '' || code.toLowerCase().includes(q) || (names.get(code) ?? '').toLowerCase().includes(q)
  const visibleGroups = groups.map((g) => ({ ...g, codes: g.codes.filter(matches) })).filter((g) => g.codes.length > 0)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-col gap-2 border-b p-3">
        <Input
          type="search"
          placeholder="Search countries…"
          aria-label="Search countries"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="flex gap-3 text-xs">
          <Button
            variant="link"
            size="xs"
            className="h-auto p-0"
            onClick={() => onChange(setShown(hidden, all, true))}
            disabled={all.every((c) => !hidden.includes(c))}
          >
            Show all
          </Button>
          <Button
            variant="link"
            size="xs"
            className="h-auto p-0"
            onClick={() => onChange(setShown(hidden, all, false))}
            disabled={all.every((c) => hidden.includes(c))}
          >
            Hide all
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-1">
        {visibleGroups.map((g) => {
          const allShown = g.codes.every((c) => !hidden.includes(c))
          return (
            <section key={g.id} className="px-3 pt-2 pb-1">
              <header className="flex items-baseline justify-between gap-3 py-1">
                <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{g.label}</h3>
                <div className="flex gap-2.5">
                  <Button
                    variant="link"
                    size="xs"
                    className="h-auto p-0"
                    onClick={() => onChange(showOnly(hidden, all, g.codes))}
                    title={`Rank only ${g.label}`}
                  >
                    Only
                  </Button>
                  <Button
                    variant="link"
                    size="xs"
                    className="h-auto p-0"
                    onClick={() => onChange(setShown(hidden, g.codes, !allShown))}
                  >
                    {allShown ? 'Hide' : 'Show'}
                  </Button>
                </div>
              </header>
              <ul>
                {g.codes.map((code) => {
                  const id = `filter-${code}`
                  const shown = !hidden.includes(code)
                  return (
                    <li key={code}>
                      <label
                        htmlFor={id}
                        className={cn(
                          '-mx-1.5 grid cursor-pointer grid-cols-[auto_1fr_auto] items-center gap-2.5 rounded-md px-1.5 py-1 text-sm hover:bg-muted max-md:py-2',
                          !shown && 'text-muted-foreground',
                        )}
                      >
                        <Checkbox
                          id={id}
                          checked={shown}
                          onCheckedChange={(v) => onChange(setShown(hidden, [code], v === true))}
                        />
                        <span>{names.get(code) ?? code}</span>
                        <span className="text-[11px] text-muted-foreground tabular-nums">{code}</span>
                      </label>
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}
        {visibleGroups.length === 0 && <p className="px-3 py-2 text-xs text-muted-foreground">No countries match “{query}”.</p>}
      </div>
    </div>
  )
}
