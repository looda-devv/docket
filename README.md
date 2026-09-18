# Docket

South African crime statistics, analysed. Every category SAPS reports, across
1 172 police stations, ten financial years and sixty months — with a live
connection to the SAPS publication feed.

Built with React, TypeScript, Vite and Tailwind. The analysis engine is pure
TypeScript; the live check is a serverless function; the data is extracted from
SAPS workbooks by a Python script kept in the repo.

---

**[Live site](https://docket-sa.vercel.app)**

---

## Read this first: what "live" can and cannot mean here

**South Africa has no real-time crime feed.** No incident stream, no daily
update, no public API. Some countries publish incident-level data within days;
South Africa publishes none.

SAPS releases crime statistics **quarterly**, as spreadsheets and a press
presentation, weeks after the quarter they cover. The finest granularity in the
data is monthly, and those months only become public when their quarter is
released. Releases are not guaranteed either — the first quarter of 2026/27 was
postponed, which is why the newest figures here end at March 2026.

So this dashboard cannot update as crimes happen, and **any site claiming to do
that for South Africa is not using SAPS data.** What this does instead:

- a serverless function polls the SAPS publications page every minute,
  server-side, and reports exactly what is published there right now;
- the dashboard shows that connection live, and flags within a minute when a
  new release appears;
- if SAPS is unreachable, it says so and keeps serving its stored copy rather
  than showing a blank.

That is the honest version of "updates as it happens": it updates when reality
updates, which for South African crime data is four times a year.

## The data

| Source | What it gives |
| --- | --- |
| [SAPS crime statistics](https://www.saps.gov.za/services/crimestats.php) | 49 categories × 1 172 stations × 55 districts × 9 provinces. Ten financial years (2015/16–2024/25) and sixty continuous months (Apr 2021–Mar 2026). |
| [Stats SA mid-year population estimates 2026](https://www.statssa.gov.za/publications/P0302/P03022026.pdf) | Provincial populations, for rates per 100 000. |

Headline figures for 2024/25, as published: **24 692 murders**, 40 475 rapes,
20 150 carjackings, 1 515 383 community-reported serious crimes. That is a
murder rate near **39 per 100 000** — among the highest recorded anywhere.

### Three traps in the source

All three silently multiply the numbers, and all three are handled and tested.

**Stacked aggregation levels.** The spreadsheet holds station, district,
province and national rows in one table. Summing it gives roughly four times
the country's real crime. A `Comp level` column separates them — and the
columns shift up a level with each step, so a district row carries its province
in the *District* column. As a check, all four levels agree to the unit.

**Categories that contain other categories.** Several of the 49 are subtotals:
one grand total, four groups beneath it, and cross-cutting rollups (sexual
offences, TRIO crime) whose members are already counted inside those groups.
Adding every category together roughly doubles the total.

**Police-detected crime is not part of the reported total.** Drug possession,
drunk driving and illegal firearms are found by police rather than reported by
the public, and SAPS counts them separately. Folding them into a breakdown of
community-reported crime pushes the shares past 100% — which is exactly what
happened in an early build here, and what the test suite now prevents.

Throughout, **a missing value stays missing.** SAPS added categories over the
decade; writing an unreported year as zero would draw a line claiming no crime
occurred.

## What recorded crime is not

These are *recorded* crimes — offences someone reported and a station captured.
The gap between crimes committed and crimes recorded is large and uneven:
reporting rates differ by offence, by place, and by how much people trust the
police.

Murder is the exception, and it is why criminologists lean on it. A body is
hard not to report, so the murder count is the closest thing to a measurement
in the set. A fall in reported assaults can mean less assault or less
reporting; a fall in murders is much more likely to be real.

Two comparisons the dashboard deliberately makes carefully:

- **Rates, not counts, between places.** Gauteng records the most murders of
  any province and does not have the highest rate. Ranking by count measures
  where people live nearly as much as it measures crime.
- **No per-capita rates by station.** SAPS precincts are not census areas and
  have no published resident population, so a station-level rate would be
  invented. Station figures are shown as counts, with the caveat that a
  precinct covering a CBD or transport hub records crime against people who do
  not live there.

## Running it

```bash
npm install
npm run dev        # http://localhost:5173 — the live check needs the deployed function
npm test           # 17 tests over the engine and the published figures
npm run build
```

The live endpoint only runs on Vercel. Locally the banner reports itself
unreachable, which is the same path taken when SAPS is down.

## Layout

```
api/
└── saps-releases.ts    live check against saps.gov.za, server-side
src/
├── engine/             rates, trends, composition, ranking — pure functions
├── data/
│   ├── saps/           extracted counts; stations chunked per province
│   └── population.ts   Stats SA provincial populations
├── state/              data loading and the polling hook
├── components/         charts and UI primitives (SVG, no chart library)
├── pages/              national, categories, provinces, stations, method
└── lib/                en-ZA formatting
scripts/                SAPS workbook extraction
```

## A note on the certificate

saps.gov.za serves an incomplete certificate chain — it omits the Sectigo
intermediate. Browsers paper over this by fetching the issuer themselves; Node
does not, and the request fails outright. The endpoint bundles the intermediate
and adds it to the trust store rather than disabling verification, which would
work and would mean anyone able to intercept the connection could feed this
dashboard anything.

Worth noting when passing a custom `ca` to Node: it **replaces** the trust
store rather than adding to it, so the defaults have to be carried along
explicitly.

## Licence

MIT.
