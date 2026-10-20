import { execFileSync } from 'node:child_process'

/**
 * Minimal .xlsx reader for the UN download files: first worksheet only, shared strings and
 * numbers, no formulas or styles. Uses the system `unzip` so the project needs no extra
 * dependency for a script that runs once a year.
 */
export type Cell = string | number | null

const unzipEntry = (file: string, entry: string): string =>
  execFileSync('unzip', ['-p', file, entry], { maxBuffer: 256 * 1024 * 1024 }).toString('utf8')

const decode = (s: string) =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, '&')

/** "BE" → 56 (1-based). */
function columnIndex(ref: string): number {
  let n = 0
  for (const ch of ref.replace(/\d+$/, '')) n = n * 26 + (ch.charCodeAt(0) - 64)
  return n - 1
}

export function parseSharedStrings(xml: string): string[] {
  return [...xml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map(([, si]) =>
    decode([...si.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((m) => m[1]).join('')),
  )
}

export function parseSheet(xml: string, strings: string[]): Cell[][] {
  const rows: Cell[][] = []
  for (const [, body] of xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
    const row: Cell[] = []
    for (const [, attrs, inner] of body.matchAll(/<c([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const ref = /\br="([A-Z]+\d+)"/.exec(attrs)?.[1]
      if (!ref) continue
      const type = /\bt="(\w+)"/.exec(attrs)?.[1]
      const raw = inner ? /<v>([\s\S]*?)<\/v>/.exec(inner)?.[1] : undefined
      let value: Cell = null
      if (type === 's' && raw !== undefined) value = strings[Number(raw)] ?? null
      else if (type === 'inlineStr' && inner) value = decode(/<t[^>]*>([\s\S]*?)<\/t>/.exec(inner)?.[1] ?? '')
      else if (type === 'str' && raw !== undefined) value = decode(raw)
      else if (raw !== undefined) value = Number(raw)
      row[columnIndex(ref)] = value
    }
    rows.push(Array.from(row, (c) => c ?? null))
  }
  return rows
}

export function readFirstSheet(file: string): Cell[][] {
  let strings: string[] = []
  try {
    strings = parseSharedStrings(unzipEntry(file, 'xl/sharedStrings.xml'))
  } catch {
    /* workbook without shared strings */
  }
  return parseSheet(unzipEntry(file, 'xl/worksheets/sheet1.xml'), strings)
}
