import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Props {
  id?: string
  label: string
  years: number[]
  value: number
  onChange: (y: number) => void
}

export function YearSelect({ id, label, years, value, onChange }: Props) {
  return (
    <Select value={String(value)} onValueChange={(v) => onChange(Number(v))}>
      <SelectTrigger id={id} size="sm" aria-label={label} className="min-w-[5.5rem]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {years.map((y) => (
          <SelectItem key={y} value={String(y)}>
            {y}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
