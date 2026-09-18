# Building the dataset

The figures in `src/data/saps/` come from South African Police Service
workbooks. These scripts are kept so the numbers can be traced and rebuilt when
SAPS publishes a new quarter; the app ships the extracted arrays.

```bash
python3 -m venv .venv && ./.venv/bin/pip install openpyxl

# The annual release carries ten financial years per station.
curl -k -O "https://www.saps.gov.za/services/downloads/2024-2025 _Annual_Financial year_WEB.xlsx"
# Each quarterly release carries its own quarter's months across five years,
# so all four are needed for a continuous monthly series.
for q in 1st 2nd 3rd 4th; do
  curl -k -O "https://www.saps.gov.za/services/downloads/2025/2025-2026_-_${q}_Quarter_WEB.xlsx"
done

./.venv/bin/python emit.py
```

`curl -k` is needed because saps.gov.za serves an incomplete certificate chain
— it omits the Sectigo intermediate. The site's live endpoint handles this
properly instead, by bundling the intermediate and adding it to the trust
store; see `api/saps-releases.ts`.

## The two traps

**Stacked aggregation levels.** The RAW Data sheet holds station, district,
province and national rows in one table. Summing the sheet gives about four
times the country's real crime. The `Comp level` column separates them, and the
columns shift up a level with each step — a district row carries its province
in the District column, not the Province one. As a check, all four levels agree
to the unit: 24 692 murders in 2024/25 whichever level is used.

**Categories that contain other categories.** Of the 49 categories, several are
subtotals. `17 Community reported serious crime` is the grand total; four
groups sum to it; sexual offences and TRIO crime are cross-cutting rollups of
offences already counted inside those groups. Adding every category together
roughly doubles the total. Each parent is verified against the sum of its
children before use.

One more that is easy to miss: **police-detected crime is not part of the
community-reported total.** Drug possession, drunk driving and illegal firearms
are found by police rather than reported by the public, and SAPS counts them
outside the headline figure. Folding them into a breakdown of reported crime
pushes the shares past 100%.

## What is checked

- Every category subtotal equals the sum of its parts.
- The nine provinces sum to the national figure.
- Headline counts match what SAPS published: 24 692 murders, 40 475 rapes,
  20 150 carjackings, 1 515 383 serious crimes in 2024/25.
- Provincial populations sum to the Stats SA published national total.

All of it is asserted in `src/engine/__tests__/analysis.test.ts`.
