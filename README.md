# European Economic Data

A local web app for comparing European economies. Selected countries appear as lines on the chart.

| Tab             | Source                 | Frequency                                             | Measures                                                                                                          |
| --------------- | ---------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Leaderboard (homepage) | WEO                    | annual                                                | all European countries ranked for one year by growth/inflation/debt, next to a map; choose the ranked countries with the Countries filter |
| Latest quarter  | QNEA                   | quarterly                                             | countries ranked by latest quarter (y/y, q/q or nominal y/y), with previous quarter and reference period          |
| GDP · Eurostat  | `nama_10_gdp`          | annual, 1975–                                         | current prices €/PPS, real GDP, volume index, growth                                                              |
| GDP · IMF       | WEO via DataMapper     | annual, 1980–current year (later projections dropped) | US$, PPP, per capita                                                                                              |
| Quarterly · IMF | QNEA                   | quarterly, 1995 Q1–latest                             | q/q and y/y real growth, nominal y/y, volume index                                                                |
| Growth          | WEO                    | annual                                                | real GDP growth                                                                                                   |
| Inflation       | WEO                    | annual                                                | average and end-of-period CPI change                                                                              |
| Cumulative      | WEO                    | annual                                                | compounded real GDP growth since a base year (% change or index = 100)                                            |
| Public debt     | WEO + Eurostat USD/EUR | annual                                                | gross debt as % of GDP in billion €/US$; net lending/borrowing % of GDP                                           |

IMF tabs cover all of Europe, including Ukraine, Russia, Belarus, Moldova, the Caucasus, Türkiye and microstates. On the Eurostat tab, Russia uses `naida_10_gdp` (ends 2020); its 2010-based volume index is rebased to 2015 = 100. A single country on a growth measure is drawn as bars per period.

## Run

```
pnpm install
pnpm dev          # API :3001, web app :5173
```

Open <http://localhost:5173>. Data is fetched once, cached in memory and `server/cache/*.json` for 24 hours, and served stale if upstream is down. The Node proxy is required because the IMF quarterly endpoint lacks CORS headers.

Other scripts:

```
pnpm test         # vitest: JSON-stat normaliser tests
pnpm build        # type-check + vite build → dist/
pnpm start        # production: one Node process serves API and dist/ on PORT (default 3001)
pnpm lint         # oxlint
pnpm build:map    # regenerate src/data/europe-map.json (only after changing scripts/build-europe-map.ts)
```

## Deploy (Docker / Dokploy)

No database needed. The server downloads Eurostat/IMF data on first request, keeps it 24 hours, then refreshes on the next request.

The `Dockerfile` builds the client and runs `node server/index.ts` as a non-root user, with a health check on `/api/health`.

Dokploy steps:

1. Create an **Application**, connect the Git repo, set **Build type** to **Dockerfile**.
2. Add your domain with **container port `3001`** (HTTPS via Let's Encrypt).
3. Optional: mount a volume at **`/app/data`** so cached datasets survive redeploys.
4. Deploy.

Optional env vars: `PORT` (default `3001`), `CACHE_DIR` (default `/app/data` in image, `server/cache` locally). Server needs outbound HTTPS to `ec.europa.eu`, `www.imf.org`, `api.imf.org`.

## Features

- Select up to 8 countries. Each uses its flag colour: primary, then secondary/tertiary if too similar to an existing pick, then a lighter/darker shade of its own flag colour. Faint colours keep hue but adjust lightness. Adding a country never recolours existing ones. Leaderboard bars use primary flag colours. Eurostat and IMF tabs have separate selections.
- Leaderboard and Latest quarter: the ranking (left) and a map of Europe (right) share hover: hover a bar, table row or country to highlight it on both sides. Growth-type measures use red below 0, grey at 0, green above; inflation and debt use a blue ramp (log scale for amounts in €/US$). Scale ends are rounded and set at the 95th percentile so one outlier doesn't wash out the rest. No data and hidden countries are hatched. The **Countries** button (next to the year) chooses which countries are ranked: search, tick boxes, and per group *Only* / *Hide* (a popover on desktop, a bottom sheet on phones). Tapping a bar or a country only highlights it; the × in a table row hides that country.
- Map geometry is generated once from Natural Earth 1:50m (`world-atlas`, public domain) by `scripts/build-europe-map.ts`. It's pre-projected (Lambert azimuthal equal-area, like Eurostat), shows Crimea as part of Ukraine and the whole island as Cyprus, cuts Russia east of the Caucasus, and marks microstates with dots. It loads as a separate ~70 KB (gzipped) chunk only on these two tabs.
- Log scale for monetary measures (off by default), year range, table view with CSV download. Light/dark mode follows OS setting.
- Quarterly growth rates are computed server-side from IMF chain-linked volume levels: q/q and index use seasonally adjusted series (not published for Russia, Belarus, Georgia, Armenia, Azerbaijan); y/y uses unadjusted series.

## Structure

```
server/   Express 5 API: GET /api/eurostat, /api/imf, /api/imf-quarterly, /api/health
src/      Vite + React 19 + Tailwind v4 + shadcn/ui + Recharts client (tabs in src/data/tabs.ts)
```

All three endpoints return `{ source, frequency, periods, countries, measures, projectionsFrom? }`, where each measure maps country code → values aligned with `periods` (`"2024"` or `"2024-Q1"`, `null` = no data). Normalisers: `server/normalize.ts` (Eurostat JSON-stat), `server/imf.ts` (DataMapper), `server/imfq.ts` (SDMX-JSON plus growth computations).
