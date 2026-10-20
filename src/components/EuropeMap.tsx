import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { KOSOVO_FOOTNOTE } from '../data/countries'
import type { MeasureDef } from '../data/measures'
import { TOOLTIP_CLASS } from '../lib/chart-ui'
import type { MapScale } from '../lib/mapScale'

type Geometry = {
  width: number
  height: number
  countries: { code: string; d: string; cx: number; cy: number; dot: boolean }[]
}

export type MapDatum = {
  code: string
  name: string
  value: number | null
  rank: number | null
  period: string | null
  excluded: boolean
}

// The pre-projected geometry (~180 KB) is loaded on first use, outside the main bundle.
let geometryPromise: Promise<Geometry> | null = null
function loadGeometry(): Promise<Geometry> {
  geometryPromise ??= import('../data/europe-map.json').then((m) => m.default as Geometry)
  return geometryPromise
}

/** No data / in the pool: diagonal hatching, so it can't be mistaken for a value near zero. */
const MUTED = 'url(#map-no-data)'
const MUTED_CSS = 'repeating-linear-gradient(135deg, var(--map-empty) 0 2px, transparent 2px 4px)'

export function EuropeMap({
  data,
  measure,
  scale,
  showPeriod,
  hovered,
  onHover,
  onToggle,
  aliases = {},
}: {
  data: Map<string, MapDatum>
  measure: MeasureDef
  scale: MapScale | null
  /** Show each country's own reference period (latest-quarter mode). */
  showPeriod: boolean
  hovered: string | null
  onHover: (code: string | null) => void
  /** Click: move to / back from the pool. */
  onToggle: (code: string) => void
  /** Shape code → the code it is drawn as (successor states → the former country they were part of). */
  aliases?: Record<string, string>
}) {
  const [geo, setGeo] = useState<Geometry | null>(null)
  useEffect(() => {
    let live = true
    loadGeometry().then((g) => live && setGeo(g))
    return () => {
      live = false
    }
  }, [])

  if (!geo) return <div className="grid aspect-[1000/808] place-items-center text-sm text-muted-foreground">Loading map…</div>

  const dataCode = (code: string) => aliases[code] ?? code
  const fillOf = (code: string) => {
    const d = data.get(dataCode(code))
    if (!d || d.excluded || d.value === null || !scale) return MUTED
    return scale.colorOf(d.value)
  }
  // A former country is drawn as all of its successors' shapes; the tooltip sits at their mean centre.
  const activeShapes = hovered ? geo.countries.filter((c) => dataCode(c.code) === hovered) : []
  const active = activeShapes.length
    ? {
        cx: activeShapes.reduce((a, c) => a + c.cx, 0) / activeShapes.length,
        cy: activeShapes.reduce((a, c) => a + c.cy, 0) / activeShapes.length,
      }
    : undefined
  const activeDatum = hovered ? data.get(hovered) : undefined
  const ratio = geo.width / geo.height

  const handlers = (code: string) => ({
    onMouseEnter: () => onHover(dataCode(code)),
    onMouseLeave: () => onHover(null),
    onClick: () => onToggle(dataCode(code)),
  })

  return (
    <div className="flex flex-col gap-3">
      {/* Fixed aspect box, as wide as the column but never taller than the viewport allows,
          so tooltip positions (in % of the box) line up with the drawing. */}
      <div
        className="relative mx-auto"
        style={{ aspectRatio: `${geo.width} / ${geo.height}`, width: `min(100%, calc((100vh - 15rem) * ${ratio.toFixed(4)}))` }}
        onMouseLeave={() => onHover(null)}
      >
        <svg
          viewBox={`0 0 ${geo.width} ${geo.height}`}
          className="map block size-full"
          role="img"
          aria-label={`Map of Europe coloured by ${measure.label}`}
        >
          <defs>
            <pattern id="map-no-data" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="5" height="5" fill="var(--card)" />
              <rect width="2" height="5" fill="var(--map-empty)" />
            </pattern>
          </defs>
          <g>
            {geo.countries.map((c) => (
              <path
                key={c.code}
                d={c.d}
                fill={fillOf(c.code)}
                stroke="var(--card)"
                strokeWidth={0.7}
                strokeLinejoin="round"
                className="cursor-pointer"
                {...handlers(c.code)}
              />
            ))}
          </g>
          {/* Microstates: a dot on top so they can be seen and hovered. */}
          <g>
            {geo.countries
              .filter((c) => c.dot)
              .map((c) => (
                <circle
                  key={c.code}
                  cx={c.cx}
                  cy={c.cy}
                  r={hovered === c.code ? 7 : 5}
                  fill={fillOf(c.code)}
                  stroke="var(--card)"
                  strokeWidth={1.5}
                  className="cursor-pointer"
                  {...handlers(c.code)}
                />
              ))}
          </g>
          {activeShapes.length > 0 && (
            <g pointerEvents="none">
              {activeShapes.map((s) => (
                <g key={s.code}>
                  <path d={s.d} fill="none" stroke="var(--foreground)" strokeWidth={2} strokeLinejoin="round" />
                  {s.dot && <circle cx={s.cx} cy={s.cy} r={7} fill="none" stroke="var(--foreground)" strokeWidth={2} />}
                </g>
              ))}
            </g>
          )}
        </svg>

        {active && activeDatum && (
          <div
            className={cn(TOOLTIP_CLASS, 'pointer-events-none absolute z-10 min-w-0 whitespace-nowrap')}
            style={{
              left: `${(active.cx / geo.width) * 100}%`,
              top: `${(active.cy / geo.height) * 100}%`,
              transform: `translate(${active.cx / geo.width > 0.75 ? '-100%' : active.cx / geo.width < 0.25 ? '0%' : '-50%'}, calc(-100% - 12px))`,
            }}
            role="status"
          >
            <div className="font-semibold">
              {activeDatum.rank !== null && !activeDatum.excluded ? `#${activeDatum.rank} ` : ''}
              {activeDatum.name}
            </div>
            <div className="text-muted-foreground">
              {activeDatum.excluded
                ? 'In the pool · click to put back'
                : activeDatum.value === null
                  ? 'No data'
                  : (
                      <>
                        <span className="text-foreground tabular-nums">{measure.formatValue(activeDatum.value)}</span>
                        {showPeriod && activeDatum.period ? ` · ${activeDatum.period}` : ''}
                      </>
                    )}
            </div>
          </div>
        )}
      </div>

      {scale && <MapLegend measure={measure} scale={scale} />}
      <div className="flex flex-col gap-1 text-center text-[11px] text-muted-foreground">
        <p>Map: Natural Earth (public domain). Crimea is shown as part of Ukraine; Russia is cut east of the Caucasus.</p>
        {/* Kosovo is drawn on the map, so its designation note sits here as well as in the page footer. */}
        <p>{KOSOVO_FOOTNOTE}</p>
      </div>
    </div>
  )
}

function MapLegend({ measure, scale }: { measure: MeasureDef; scale: MapScale }) {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-1.5 text-xs text-muted-foreground" aria-label="Map colour legend">
      <div className="h-2.5 rounded-sm" style={{ background: `linear-gradient(to right, ${scale.stops.join(', ')})` }} />
      <div className="relative h-4 tabular-nums">
        {scale.ticks.map((t) => {
          const pos = scale.position(t)
          return (
            <span
              key={t}
              className="absolute top-0 whitespace-nowrap"
              style={{ left: `${pos * 100}%`, transform: `translateX(${pos === 0 ? '0' : pos === 1 ? '-100%' : '-50%'})` }}
            >
              {measure.formatTick(t)}
            </span>
          )
        })}
      </div>
      <div className="flex items-start justify-between gap-4">
        <span>
          {[scale.kind === 'diverging' ? 'red below zero · green above' : '', scale.log ? 'log scale' : '', 'values past the ends take the end colour']
            .filter(Boolean)
            .join(' · ')}
        </span>
        <span className="inline-flex shrink-0 items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-sm border" style={{ background: MUTED_CSS }} /> no data / in pool
        </span>
      </div>
    </div>
  )
}
