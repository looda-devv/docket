"""Emit the app dataset: arrays indexed by category, not objects keyed by name.

Category names in this data run to fifty characters and repeat once per place
per period. Keyed objects made the station file 53 MB; indexing into a single
category list instead is the difference between a dataset that ships to a
browser and one that does not.
"""
import importlib.util, sys, json, os, unicodedata, re
spec = importlib.util.spec_from_file_location('bd', 'build_dataset.py')
bd = importlib.util.module_from_spec(spec); sys.modules['bd'] = bd; spec.loader.exec_module(bd)

annual, years = bd.harvest('saps_annual_2024_25.xlsx', 'year')
monthly, months = {}, set()
# The 2026/27 first quarter arrives as .xlsm rather than .xlsx — SAPS changed
# the format for that release, and it is listed on the page with a .pptx
# presentation instead of a PDF. Matching on extension alone would miss it.
QUARTERLIES = [
    'q1st_2025_26.xlsx', 'q2nd_2025_26.xlsx', 'q3rd_2025_26.xlsx', 'q4_2025_26.xlsx',
    'q1_2026_27.xlsm',
]
for f in QUARTERLIES:
    part, ms = bd.harvest(f, 'month')
    months.update(ms)
    for k, v in part.items():
        monthly.setdefault(k, {}).update(v)
months = sorted(months)

# The quarterly releases report categories the annual file does not — SAPS
# added culpable homicide to quarterly reporting — so the category list is the
# union of both, and a category missing from one release stays null there
# rather than being written as a zero.
CATS = sorted({k[4] for k in annual} | {k[4] for k in monthly})
CI = {c: i for i, c in enumerate(CATS)}

def series(store, level, periods):
    """{place: (province, district, [[v per period] per category])}"""
    out = {}
    for (lv, place, prov, dist, cat), vals in store.items():
        if lv != level: continue
        rec = out.setdefault(place, [prov, dist, [[None] * len(periods) for _ in CATS]])
        row = rec[2][CI[cat]]
        for j, p in enumerate(periods):
            if p in vals: row[j] = vals[p]
    return out

A = {lv: series(annual, lv, years) for lv in ['National', 'Province', 'District', 'Station']}
M = {lv: series(monthly, lv, months) for lv in ['National', 'Province', 'District', 'Station']}

OUT = '/home/buzzdevv/Documents/demo_projects/docket/src/data/saps'
os.makedirs(OUT, exist_ok=True)
os.makedirs(f'{OUT}/stations', exist_ok=True)

def slug(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode()
    return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')

def place_payload(level):
    a, m = A[level], M[level]
    return [{'name': n, 'province': a[n][0], 'district': a[n][1],
             'annual': a[n][2], 'monthly': m.get(n, [None, None, [[None]*len(months) for _ in CATS]])[2]}
            for n in sorted(a)]

json.dump({'categories': CATS, 'years': years, 'months': months,
           'groups': bd.GROUPS, 'cross': {k: v for k, v in bd.CROSS.items() if v},
           'total': bd.TOTAL,
           'provinces': sorted(A['Province']), 'districts': sorted(A['District']),
           'stationCount': len(A['Station'])},
          open(f'{OUT}/meta.json', 'w'), separators=(',', ':'))

json.dump(place_payload('National')[0], open(f'{OUT}/national.json', 'w'), separators=(',', ':'))
json.dump(place_payload('Province'), open(f'{OUT}/provinces.json', 'w'), separators=(',', ':'))
json.dump(place_payload('District'), open(f'{OUT}/districts.json', 'w'), separators=(',', ':'))

stations = place_payload('Station')
by_prov = {}
for s in stations:
    by_prov.setdefault(s['province'], []).append(s)
for prov, rows in by_prov.items():
    json.dump(rows, open(f'{OUT}/stations/{slug(prov)}.json', 'w'), separators=(',', ':'))

# A light index so search and national rankings work before any chunk loads.
ti = CI[bd.TOTAL]
json.dump([{'n': s['name'], 'p': s['province'], 'd': s['district'],
            't': s['annual'][ti][-1]} for s in stations],
          open(f'{OUT}/stations-index.json', 'w'), separators=(',', ':'))

print(f'categories {len(CATS)}  years {len(years)}  months {len(months)}')
print(f'stations {len(stations)} across {len(by_prov)} provinces')
for f in sorted(os.listdir(OUT)):
    p = f'{OUT}/{f}'
    if os.path.isfile(p): print(f'  {f:<24}{os.path.getsize(p)/1024:>9.0f} KB')
tot = sum(os.path.getsize(f'{OUT}/stations/{f}') for f in os.listdir(f'{OUT}/stations'))
print(f'  stations/ (9 chunks)   {tot/1024:>9.0f} KB total')
