/**
 * Generates src/data/europe-map.json: pre-projected SVG paths for the leaderboard map.
 * Run with `pnpm build:map` (only needed when this script changes).
 *
 * Source: Natural Earth 1:50m admin-0 countries via the `world-atlas` package (public domain).
 * Adjustments:
 *  - Crimea is drawn as part of Ukraine (UN GA resolution 68/262; Natural Earth draws it with Russia).
 *  - Northern Cyprus is merged into Cyprus, as on Eurostat maps.
 *  - The frame stops east of the Caucasus, so only European Russia is shown.
 *  - Countries too small to see or hover (Monaco, San Marino, …) also get a dot marker.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { geoAzimuthalEqualArea, geoContains, geoPath } from 'd3-geo'
import type { Feature, MultiPolygon, Polygon } from 'geojson'
import { feature, merge } from 'topojson-client'
import type { GeometryCollection, MultiPolygon as TopoMultiPolygon, Polygon as TopoPolygon, Topology } from 'topojson-specification'

const root = path.resolve(import.meta.dirname, '..')
const topo = JSON.parse(
  readFileSync(path.join(root, 'node_modules/world-atlas/countries-50m.json'), 'utf8'),
) as Topology<{ countries: GeometryCollection<{ name: string }> }>

/** Natural Earth id (ISO 3166-1 numeric) → IMF ISO3 code used by the dashboard. */
const NE_TO_ISO3: Record<string, string> = {
  '040': 'AUT', '056': 'BEL', '100': 'BGR', '191': 'HRV', '196': 'CYP', '203': 'CZE', '208': 'DNK',
  '233': 'EST', '246': 'FIN', '250': 'FRA', '276': 'DEU', '300': 'GRC', '348': 'HUN', '372': 'IRL',
  '380': 'ITA', '428': 'LVA', '440': 'LTU', '442': 'LUX', '470': 'MLT', '528': 'NLD', '616': 'POL',
  '620': 'PRT', '642': 'ROU', '703': 'SVK', '705': 'SVN', '724': 'ESP', '752': 'SWE',
  '008': 'ALB', '070': 'BIH', '499': 'MNE', '807': 'MKD', '688': 'SRB',
  '352': 'ISL', '438': 'LIE', '578': 'NOR', '756': 'CHE', '826': 'GBR',
  '804': 'UKR', '643': 'RUS', '112': 'BLR', '498': 'MDA', '268': 'GEO', '051': 'ARM', '031': 'AZE', '792': 'TUR',
  '020': 'AND', '674': 'SMR', '492': 'MCO',
}
/** Features without a numeric id, matched by name. */
const BY_NAME: Record<string, string> = { Kosovo: 'UVK', 'N. Cyprus': 'CYP' }

type Geom = TopoPolygon | TopoMultiPolygon
const geoms = topo.objects.countries.geometries as (Geom & { id?: string; properties: { name: string } })[]
const groups = new Map<string, Geom[]>()
for (const g of geoms) {
  const code = (g.id && NE_TO_ISO3[g.id]) ?? BY_NAME[g.properties.name]
  if (code) groups.set(code, [...(groups.get(code) ?? []), g])
}

// Move the Crimean polygon from Russia to Ukraine.
const SIMFEROPOL: [number, number] = [34.1, 44.95]
const russia = groups.get('RUS')![0] as TopoMultiPolygon
const crimeaIdx = russia.arcs.findIndex((arcs) =>
  geoContains(feature(topo, { type: 'Polygon', arcs } as TopoPolygon) as Feature<Polygon>, SIMFEROPOL),
)
if (crimeaIdx < 0) throw new Error('Crimea polygon not found in Russia')
const crimea: TopoPolygon = { type: 'Polygon', arcs: russia.arcs[crimeaIdx] }
groups.set('RUS', [{ ...russia, arcs: russia.arcs.filter((_, i) => i !== crimeaIdx) }])
groups.set('UKR', [...groups.get('UKR')!, crimea])

// Lambert azimuthal equal-area centred on Europe (as Eurostat's EPSG:3035), fitted to the outermost points
// of the mapped countries. Everything outside the frame (overseas territories, Asian Russia) is clipped.
const WIDTH = 1000
const frame: [number, number][] = [
  [-24.6, 65.5], // Iceland, west
  [-9.6, 38.7], // Portugal, Cabo da Roca
  [-9.3, 43.1], // Spain, Finisterre
  [24.6, 34.8], // Crete, south
  [34.6, 34.6], // Cyprus, south-east
  [36.2, 36.0], // Türkiye, Hatay
  [44.8, 39.7], // Türkiye, east
  [50.4, 40.4], // Azerbaijan, Absheron (east edge)
  [44.0, 69.6], // Russia, Barents coast
  [25.8, 71.2], // Norway, North Cape
]
const projection = geoAzimuthalEqualArea().rotate([-15, -52])
projection.fitWidth(WIDTH, { type: 'MultiPoint', coordinates: frame })
const [[, y0], [, y1]] = geoPath(projection).bounds({ type: 'MultiPoint', coordinates: frame })
const HEIGHT = Math.ceil(y1 - y0)
projection.translate([projection.translate()[0], projection.translate()[1] - y0]).clipExtent([[0, 0], [WIDTH, HEIGHT]])
const toPath = geoPath(projection).digits(1)

/** Below this projected area (px² at 1000 px wide) a country also gets a dot so it can be seen and hovered. */
const DOT_AREA = 60

const countries = [...groups.entries()]
  .map(([code, gs]) => {
    const shape = merge(topo, gs) as MultiPolygon
    const d = toPath(shape)
    if (!d) throw new Error(`no path for ${code}`)
    // Anchor tooltips/dots on the largest visible part (mainland France, not Corsica).
    const parts = shape.coordinates.map((c) => ({ type: 'Polygon', coordinates: c }) as Polygon)
    const main = parts.reduce((a, b) => (toPath.area(b) > toPath.area(a) ? b : a))
    const [cx, cy] = toPath.centroid(main).map((v) => Math.round(v * 10) / 10)
    const area = Math.round(toPath.area(shape))
    return { code, d, cx, cy, dot: area < DOT_AREA }
  })
  .sort((a, b) => a.code.localeCompare(b.code))

const out = { width: WIDTH, height: HEIGHT, countries }
const file = path.join(root, 'src/data/europe-map.json')
writeFileSync(file, JSON.stringify(out) + '\n')
console.log(`wrote ${path.relative(root, file)}: ${countries.length} countries, ${WIDTH}×${HEIGHT}, ${(JSON.stringify(out).length / 1024).toFixed(0)} KB`)
console.log('dots:', countries.filter((c) => c.dot).map((c) => c.code).join(', '))
