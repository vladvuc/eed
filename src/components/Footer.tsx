import { KOSOVO_FOOTNOTE } from '../data/countries'
import type { Source } from '../types'

interface Props {
  source: Source
  updated: string | null
  showKosovoNote: boolean
  notes?: string[]
  hasProjections?: boolean
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })
}

const link = 'text-primary underline underline-offset-4'

export function Footer({ source, updated, showKosovoNote, notes, hasProjections }: Props) {
  return (
    <footer className="footer flex flex-col gap-1 text-xs text-muted-foreground">
      {source === 'eurostat' && (
        <p>
          Source:{' '}
          <a
            className={link}
            href="https://ec.europa.eu/eurostat/databrowser/view/nama_10_gdp/default/table"
            target="_blank"
            rel="noreferrer"
          >
            Eurostat, nama_10_gdp
          </a>
          {updated ? `, updated ${formatDate(updated)}` : ''}. GDP at market prices (B1GQ).
        </p>
      )}
      {source === 'imf' && (
        <p>
          Source:{' '}
          <a className={link} href="https://data.imf.org/en/Datasets/WEO" target="_blank" rel="noreferrer">
            IMF {updated ?? 'World Economic Outlook'}
          </a>
          .{hasProjections ? ' Shaded years (marked ᵖ in the table) are IMF projections.' : ''}
        </p>
      )}
      {source === 'imf-quarterly' && (
        <>
          <p>
            Source:{' '}
            <a className={link} href="https://data.imf.org/en/datasets/IMF.STA:QNEA" target="_blank" rel="noreferrer">
              IMF Quarterly National Accounts (QNEA)
            </a>
            {updated ? `, fetched ${formatDate(updated)}` : ''}. GDP at market prices (B1GQ).
          </p>
          <p className="footnote max-w-[72ch]">
            Growth rates are computed from chain-linked volume levels in national currency. Quarter-on-quarter
            change and the index use seasonally adjusted series, which the IMF does not publish for Russia,
            Belarus, Georgia, Armenia or Azerbaijan; use year-on-year change for those.
          </p>
        </>
      )}
      {notes?.map((n) => (
        <p key={n} className="footnote max-w-[72ch]">
          {n}
        </p>
      ))}
      {showKosovoNote && <p className="footnote max-w-[72ch]">{KOSOVO_FOOTNOTE}</p>}
    </footer>
  )
}
