import { cn } from '@/lib/utils'

/** Colour key for a series slot (0-based). `line` draws the short line-key used in legends. */
export function Swatch({ slot, line, className }: { slot: number | null; line?: boolean; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn('inline-block shrink-0', line ? 'h-[3px] w-4 rounded-sm' : 'size-3 rounded-[3px]', className)}
      style={slot === null ? undefined : { background: `var(--series-${slot + 1})` }}
    />
  )
}
