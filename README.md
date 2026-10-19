# European Economic Data

A local web app for comparing European economies. Select countries and each appears as a line on the chart. It has eight tabs:

| Tab             | Source                        | Frequency                                             | Measures                                                                                                                              |
| --------------- | ----------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| GDP · Eurostat  | `nama_10_gdp`                 | annual, 1975–                                         | current prices €/PPS, real GDP, volume index, growth                                                                                  |
| GDP · IMF       | WEO via DataMapper            | annual, 1980–current year (later projections dropped) | US$, PPP, per capita                                                                                                                  |
| Quarterly · IMF | QNEA                          | quarterly, 1995 Q1–latest                             | q/q and y/y real growth, nominal y/y, volume index                                                                                    |
| Growth          | WEO                           | annual                                                | real GDP growth                                                                                                                       |
| Inflation       | WEO                           | annual                                                | average and end-of-period CPI change                                                                                                  |
| Cumulative      | WEO                           | annual                                                | compounded real GDP growth since a base year, as % change or index = 100                                                              |
| Public debt     | WEO (+ Eurostat USD/EUR rate) | annual                                                | gross debt as % of GDP, in billion € and US$; net lending/borrowing % of GDP                                                          |
| Latest quarter  | QNEA                          | quarterly                                             | countries ranked by most recent quarter (y/y, q/q or nominal y/y), with previous quarter and reference period                         |
| Leaderboard     | WEO                           | annual                                                | all European countries ranked for one year by growth (or inflation/debt), biggest first; click a bar to exclude a country and re-rank |

IMF tabs cover all of Europe, including Ukraine, Russia, Belarus, Moldova, the Caucasus, Türkiye and microstates. On the Eurostat tab, Russia comes from Eurostat's `naida_10_gdp` (international data cooperation), which ends in 2020; its 2010-based volume index is rebased to 2015 = 100. A single country on a growth measure is drawn as bars per period.

## Run

```
pnpm install
pnpm dev          # API on http://localhost:3001, web app on http://localhost:5173
```

Open <http://localhost:5173>. Each source is fetched once, cached in memory and in `server/cache/*.json` for 24 hours, and served stale if upstream is down. The IMF quarterly endpoint lacks CORS headers, so the Node proxy is required.

Other scripts:

```
pnpm test         # vitest: JSON-stat normaliser tests
pnpm build        # type-check (tsc -b) + vite build → dist/
pnpm start        # production: one Node process serves the API and dist/ on PORT (default 3001)
pnpm lint         # oxlint
```

## Deploy (Docker / Dokploy)

No database is needed: the server downloads the data from Eurostat and the IMF on the first
request, keeps it for 24 hours, then refreshes it on the next request after that.

The `Dockerfile` builds the client and runs `node server/index.ts` (Node 24 runs the TypeScript
server directly) as a non-root user, with a health check on `/api/health`.

In Dokploy:

1. Create an **Application**, connect this Git repository, and set **Build type** to `Dockerfile`.
2. Under **Domains**, add your domain with **container port `3001`** (HTTPS via Let's Encrypt).
3. Optional: under **Advanced → Volumes**, add a volume mounted at **`/app/data`** so the cached
   datasets survive redeploys. Without it, the first visit after a redeploy takes a few seconds
   while the data is downloaded again.
4. Deploy.

Environment variables (all optional): `PORT` (default `3001`), `CACHE_DIR` (default `/app/data`
in the image, `server/cache` locally). The server needs outbound HTTPS to `ec.europa.eu`,
`www.imf.org` and `api.imf.org`.

## Features

- Select up to 8 countries. Each country is drawn in its flag colour: its primary colour, or its secondary and then tertiary colour when an earlier pick already uses a near-identical colour. If all of them are taken, a lighter or darker shade of its own flag colour is used. Colours too faint for the background (e.g. yellow on white, navy on black) keep their hue and are adjusted in lightness. Adding a country never recolours the ones already on the chart. Leaderboard bars use each country's primary flag colour. Eurostat and IMF tabs have separate selections (different code systems).
- Log scale for monetary measures (off by default), year range, and table view with CSV download. Light/dark mode follows OS setting.
- Quarterly growth rates are computed server-side from IMF chain-linked volume levels: q/q and the index use seasonally adjusted series (not published for Russia, Belarus, Georgia, Armenia, Azerbaijan); y/y uses unadjusted series.

## Structure

```
server/   Express 5 API: GET /api/eurostat, /api/imf, /api/imf-quarterly, /api/health
src/      Vite + React 19 + Tailwind v4 + shadcn/ui + Recharts client (tabs in src/data/tabs.ts)
```

UI primitives live in `src/components/ui` (generated by the shadcn CLI, owned by
this repo; add more with `pnpm dlx shadcn@latest add <component>`). Dark mode
follows the OS setting via the `dark` class on `<html>`. Flag colours live in
`src/data/flags.ts` and the assignment rule in `src/lib/flagColors.ts`. The UI font is Tableau Book: the
Tableau fonts are proprietary, so they're used only if installed on your system
(they come with Tableau Desktop); otherwise the bundled Geist font is used.

All three endpoints return the same shape: `{ source, frequency, periods, countries, measures, projectionsFrom? }`, where each measure maps country code → values aligned with `periods` (`"2024"` or `"2024-Q1"`, `null` = no data). Normalisers: `server/normalize.ts` (Eurostat JSON-stat), `server/imf.ts` (DataMapper), `server/imfq.ts` (SDMX-JSON plus growth computations).
