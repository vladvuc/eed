# European Economic Data — Condensed

A local web app for comparing European economies; selected countries appear as chart lines.

## Tabs

| Tab                | Source                 | Frequency                                             | Measures                                                                                                                      |
| ------------------ | ---------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Leaderboard (home) | WEO                    | Annual                                                | All European countries ranked for one year by growth/inflation/debt, beside a map; Countries filter chooses ranked countries. |
| Latest quarter     | QNEA                   | Quarterly                                             | Latest-quarter ranking (y/y, q/q or nominal y/y), with previous quarter and reference period.                                 |
| GDP · Eurostat     | `nama_10_gdp`          | Annual, 1975–                                         | Current prices €/PPS, real GDP, volume index, growth.                                                                         |
| GDP · IMF          | WEO via DataMapper     | Annual, 1980–current year (later projections dropped) | US$, PPP, per capita.                                                                                                         |
| Quarterly · IMF    | QNEA                   | Quarterly, 1995 Q1–latest                             | q/q and y/y real growth, nominal y/y, volume index.                                                                           |
| Growth             | WEO                    | Annual                                                | Real GDP growth.                                                                                                              |
| Inflation          | WEO                    | Annual                                                | Average and end-of-period CPI change.                                                                                         |
| Cumulative         | WEO                    | Annual                                                | Compounded real GDP growth since a base year (% change or index = 100).                                                       |
| Public debt        | WEO + Eurostat USD/EUR | Annual                                                | Gross debt as % of GDP in bn €/US$; net lending/borrowing as % of GDP.                                                        |

IMF tabs cover all of Europe, incl. Ukraine, Russia, Belarus, Moldova, Caucasus, Türkiye and microstates. Eurostat Russia uses `naida_10_gdp` (ends 2020); its 2010-based volume index is rebased to 2015 = 100. A single country on a growth measure is shown as bars per period.

## Run

```bash
pnpm install
pnpm dev          # API :3001, web app :5173
```

Open <http://localhost:5173>. Data is cached in memory and `server/cache/*.json` for 24h; stale data is served if upstream is down. The Node proxy is required because IMF quarterly lacks CORS headers.

Other scripts:

```bash
pnpm test         # vitest: JSON-stat normaliser tests
pnpm build        # type-check + vite build → dist/
pnpm start        # production: one Node process serves API + dist/ on PORT (default 3001)
pnpm lint         # oxlint
pnpm build:map    # regenerate src/data/europe-map.json
pnpm build:og     # regenerate public/og-image.png link preview
```

Run `pnpm build:og` after a new IMF WEO vintage and commit the image plus `src/data/og-image.json`. The build adds a content hash (`og-image.png?v=…`) to avoid stale social-media caches.

## Docker / Dokploy

No database. Server downloads Eurostat/IMF data on first request, keeps it 24h, refreshes next request.

`Dockerfile` builds the client and runs `node server/index.ts` as non-root, with health check on `/api/health`.

Dokploy:

1. Create **Application**, connect Git repo, set **Build type = Dockerfile**.
2. Add domain with **container port `3001`**.
3. Public URL defaults to `https://eed.jesuisbored.com` (`DEFAULT_SITE_URL` in `src/data/seo.ts`). For another domain, set `SITE_URL=https://other-domain.tld` under **Environment → Build-time Arguments**.
4. Optional: mount volume at **`/app/data`** to keep cached datasets across redeploys.
5. Deploy; check preview with opengraph.xyz or LinkedIn Post Inspector.

Optional env vars: `PORT` (default `3001`), `CACHE_DIR` (default `/app/data` in image, `server/cache` locally). Server needs outbound HTTPS to `ec.europa.eu`, `www.imf.org`, `api.imf.org`.

## Features

- Up to 8 countries, coloured by flag colours (primary, then secondary/tertiary, then shades); adding a country never recolours existing ones. Eurostat and IMF tabs have separate selections.
- Leaderboard and Latest quarter: ranking and map share hover highlighting. Growth: red/grey/green; inflation/debt: blue ramp. Scale ends at 95th percentile. No data/hidden countries hatched. **Countries** button: search, tick boxes, per-group _Only_ / _Hide_.
- Map generated once from Natural Earth 1:50m (`scripts/build-europe-map.ts`), pre-projected Lambert azimuthal equal-area; loads as ~70 KB gzipped chunk only on those two tabs.
- Log scale for monetary measures (off by default), year range, table view with CSV download, light/dark follows OS.
- Quarterly growth computed server-side from IMF chain-linked volume levels: q/q and index use seasonally adjusted series (not published for Russia, Belarus, Georgia, Armenia, Azerbaijan); y/y uses unadjusted series.

## Structure

```
server/   Express 5 API: GET /api/eurostat, /api/imf, /api/imf-quarterly, /api/health
src/      Vite + React 19 + Tailwind v4 + shadcn/ui + Recharts client (tabs in src/data/tabs.ts)
```

All three endpoints return `{ source, frequency, periods, countries, measures, projectionsFrom? }`; each measure maps country code → values aligned with `periods` (`"2024"` or `"2024-Q1"`, `null` = no data). Normalisers: `server/normalize.ts` (Eurostat JSON-stat), `server/imf.ts` (DataMapper), `server/imfq.ts` (SDMX-JSON + growth computations).
