import { cn } from '@/lib/utils'

/** Colour key for a series. `line` draws the short line-key used in legends; no colour = empty box. */
export function Swatch({ color, line, className }: { color?: string | null; line?: boolean; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn('inline-block shrink-0', line ? 'h-[3px] w-4 rounded-sm' : 'size-3 rounded-[3px]', className)}
      style={color ? { background: color } : undefined}
    />
  )
}
