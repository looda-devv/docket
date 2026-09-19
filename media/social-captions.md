# Docket — social captions

Live: https://docket-sigma-jet.vercel.app
Code: https://github.com/looda-devv/docket

---

## LinkedIn (long form)

South Africa recorded **24 692 murders** last financial year. That's 68 a day,
and a rate near 39 per 100 000 — among the highest measured anywhere on earth.

I built Docket to make that data usable: every crime SAPS reports, across 49
categories, 1 172 police stations, 55 districts, 9 provinces, ten financial
years and 63 months.

**The thing I keep coming back to**

We rank provinces by how much crime they record. That ranking is misleading,
and it sends resources to the wrong places.

Gauteng records more murders than any other province — 5 959. It is fourth by
murder *rate*. The Eastern Cape, with fewer than half as many murders, has a
rate nearly twice Gauteng's: 66,7 per 100 000 against 36,6.

Ranking by count measures where people live nearly as much as it measures
crime. Ranking by rate tells you where you are most likely to become a victim.
Docket leads with the rate everywhere it can — and deliberately refuses to
compute one at station level, because SAPS precincts are not census areas and
have no published population. A per-capita figure there would be invented.

**On "real time", which is where this started**

The brief was a live crime dashboard. So the first job was finding out what
"live" can honestly mean here, and the answer is uncomfortable:

**South Africa has no real-time crime feed.** No incident stream, no daily
update, no public API. SAPS publishes quarterly, weeks in arrears. Any site
claiming live South African crime data is not using SAPS data.

What I built instead is a live connection to the actual source: a serverless
function polls the SAPS publications page every minute and reports what is
published right now, flagging a new release within a minute of you looking. It
updates when reality updates — which, for South African crime data, is four
times a year. The Method page says this in its first panel rather than burying
it in a footnote.

**Then the feed caught me out**

I shipped it, and a day later went to add the 2026/27 first quarter. My own
dashboard said the newest release was the previous quarter. It was wrong.

SAPS had published Q1 2026/27 as a macro-enabled **.xlsm** with a **.pptx**
presentation, where every prior quarter had been .xlsx and .pdf. My extension
matching only knew the old formats, so the release sat on the page unseen while
the dashboard confidently reported stale data.

A live feed that silently ignores a release is worse than no live feed. It now
matches every format SAPS uses and reports which one it found.

**Three traps in the data, all of which inflate the numbers**

- The spreadsheet stacks station, district, province and national rows in one
  table. Sum it and you get four times the country's real crime.
- Several "categories" are subtotals of other categories. Add all 49 together
  and you roughly double the total.
- Police-detected crime — drugs, drunk driving, illegal firearms — is *not*
  part of the community-reported total. An early build folded it in and
  produced a breakdown summing to 118,9%.

Each is handled, and each has a test that would catch it coming back.

**What recorded crime is not**

These are crimes *reported and captured on a system*. The gap between crimes
committed and crimes recorded is large and uneven — reporting rates differ by
offence, by place, and by how much people trust the police.

Murder is the exception, and it's why criminologists lean on it: a body is hard
not to report. A fall in reported assaults might mean less assault or less
reporting. A fall in murders is far more likely to be real. And murders are
falling — 5 427 in April–June 2026, down from 5 770 a year earlier, continuing
a decline visible since 2022.

React, TypeScript, Vite, Tailwind. Pure-TypeScript analysis engine, hand-rolled
SVG charts, a serverless live check, Python extraction. 22 tests, including ones
asserting the extracted figures match what SAPS published.

Live: https://docket-sigma-jet.vercel.app
Code: https://github.com/looda-devv/docket

Data: SAPS crime statistics; Stats SA mid-2026 population estimates.

#SouthAfrica #CrimeStats #SAPS #DataEngineering #CivicTech #OpenData
#TypeScript #React #DataVisualization

---

## X / Twitter (thread)

**1/**
South Africa recorded 24 692 murders last year.

68 a day. ~39 per 100 000 — among the highest on earth.

I built a dashboard over every crime SAPS reports: 49 categories, 1 172
stations, 63 months 🧵

**2/**
First I had to find out what "live crime data" can honestly mean here.

The answer: South Africa has no real-time crime feed. No incident stream, no
daily update, no API. SAPS publishes quarterly, weeks late.

Any site claiming live SA crime data isn't using SAPS data.

**3/**
So instead: a serverless function polls the SAPS publications page every minute
and reports what's live right now, flagging a new release within a minute.

It updates when reality updates. Four times a year.

**4/**
Then my own feed caught me out.

A day after shipping, I went to add Q1 2026/27. The dashboard said the previous
quarter was newest.

Wrong.

**5/**
SAPS had published it as a macro-enabled .xlsm with a .pptx — every prior
quarter was .xlsx and .pdf.

My extension matching only knew the old formats. The release sat there unseen.

A live feed that silently ignores a release is worse than none.

**6/**
The finding I keep coming back to:

Gauteng records the MOST murders (5 959). It's 4th by RATE.

Eastern Cape has fewer than half as many murders and nearly double the rate —
66,7 vs 36,6 per 100k.

**7/**
Ranking by count measures where people live as much as it measures crime.

Rank by rate and you learn where you're actually most likely to be a victim.

**8/**
Docket also refuses to compute station-level rates.

SAPS precincts aren't census areas and have no published population. A
per-capita figure there would be invented, so it shows counts and says why.

**9/**
Three traps in the data, all inflating:

• The sheet stacks station/district/province/national rows → 4x the real total
• Some categories contain others → ~2x
• Police-detected crime isn't part of the reported total

An early build hit the third and produced shares summing to 118,9%.

**10/**
What recorded crime is NOT: crime committed. Reporting rates vary hugely.

Murder is the exception — a body is hard not to report.

And murders are falling: 5 427 in Apr–Jun 2026 vs 5 770 a year earlier.

**11/**
React + TypeScript + Vite + Tailwind. Pure-TS engine, hand-rolled SVG charts,
serverless live check, Python extraction. 22 tests.

Live: https://docket-sigma-jet.vercel.app
Code: https://github.com/looda-devv/docket

---

## Short version (Instagram / general)

South Africa recorded 24 692 murders last financial year — 68 a day, and a rate
among the highest measured anywhere.

I built Docket to make that data usable: every crime SAPS reports, across 49
categories, 1 172 police stations and 63 months.

The thing that surprised me: Gauteng records the most murders of any province
but ranks 4th by rate. The Eastern Cape has fewer than half as many murders and
nearly double the rate. Ranking provinces by count measures where people live
as much as it measures crime.

Worth saying plainly: South Africa has no real-time crime feed. SAPS publishes
quarterly. So rather than fake a live stream, the site holds a live connection
to the real source and tells you exactly how fresh the data is.

Live: https://docket-sigma-jet.vercel.app
Code: https://github.com/looda-devv/docket

#SouthAfrica #CrimeStats #CivicTech #OpenData

---

## Notes on posting

- The video is silent — add captions for feeds that autoplay muted.
- Strongest openers: **24 692 murders / 68 a day**, or the
  **Gauteng-vs-Eastern-Cape rate flip**.
- The .xlsm story is the one engineers respond to; the rate-vs-count finding is
  the one everyone else does. Pick by audience.
- Every figure is from SAPS or Stats SA and is reproduced in the app with a link
  to the source, so the claims hold up if challenged.
- Be careful not to imply the dashboard shows live incidents — the Method page
  is explicit about this, and the copy above deliberately is too.
