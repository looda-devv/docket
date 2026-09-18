"""Build the Docket dataset from SAPS crime statistics workbooks.

Two traps in the source, both of which silently inflate every figure if missed:

1. The RAW Data sheet stacks four aggregation levels in one table — station,
   district, province and national rows together. Summing the sheet multiplies
   the country's murders by roughly four. The "Comp level" column separates
   them, and as a check all four levels agree to the unit.

2. Several "categories" are rollups. "17 Community reported serious crime" is
   the grand total; Contact crime, Contact-related crime, Property-related
   crime and Other serious crime are its four groups; Sexual offences and TRIO
   crime are cross-cutting rollups of categories counted elsewhere. Adding
   every category together double-counts. The hierarchy below was verified
   against the data rather than assumed — each parent equals the sum of its
   children exactly.
"""
import openpyxl, datetime, json, sys
from collections import defaultdict

LEVELS = {'Station', 'District', 'Province', 'National'}
COL = dict(level=2, station=4, district=5, province=6, category=7, code=8)

# Verified: every parent equals the sum of its children in the published data.
GROUPS = {
    'Contact crime (Crimes against the person)': [
        'Murder', 'Attempted murder', 'Sexual offences',
        'Assault with the intent to inflict grievous bodily harm',
        'Common assault', 'Common robbery', 'Robbery with aggravating circumstances'],
    'Contact-related crime': ['Arson', 'Malicious damage to property'],
    'Property-related crime': [
        'Burglary at non-residential premises', 'Burglary at residential premises',
        'Theft of motor vehicle and motorcycle', 'Theft out of or from motor vehicle',
        'Stock-theft'],
    'Other serious crime': [
        'All theft not mentioned elsewhere', 'Commercial crime', 'Shoplifting'],
    'Crime detected as a result of police action': [
        'Illegal possession of firearms and ammunition', 'Drug-related crime',
        'Driving under the influence of alcohol or drugs',
        'Sexual offences detected as a result of police action'],
}
# Rollups of categories that are already counted inside a group above.
CROSS = {
    'Sexual offences': ['Rape', 'Sexual assault', 'Attempted sexual offences',
                        'Contact sexual offences'],
    'TRIO crime': ['Carjacking', 'Robbery at residential premises',
                   'Robbery at non-residential premises'],
    'Robbery with aggravating circumstances': [],   # parent of TRIO, kept as a leaf
}
TOTAL = '17 Community reported serious crime'

def sheet(path):
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    ws = wb['RAW Data']
    it = ws.iter_rows(values_only=True)
    next(it); next(it)
    hdr = next(it)
    return hdr, it, wb

def year_cols(hdr):
    return [(i, h) for i, h in enumerate(hdr)
            if isinstance(h, str) and len(h) == 9 and h[4] == '-' and h[:4].isdigit()]

def month_cols(hdr):
    return [(i, h.strftime('%Y-%m')) for i, h in enumerate(hdr)
            if isinstance(h, datetime.datetime)]

def harvest(path, mode):
    """Return {(level, place, province, category): {period: count}}."""
    hdr, rows, wb = sheet(path)
    cols = year_cols(hdr) if mode == 'year' else month_cols(hdr)
    out = defaultdict(dict)
    for r in rows:
        level = str(r[COL['level']] or '').strip()
        if level not in LEVELS:
            continue
        cat = str(r[COL['category']] or '').strip()
        if not cat:
            continue
        # The columns shift up a level with each aggregation step: the place
        # being described is always in the Station column, and the columns to
        # its right hold its parents. A district row therefore carries its
        # province in the District column, not the Province one.
        name = str(r[COL['station']] or '').strip()
        if level == 'Station':
            place, prov = name, str(r[COL['province']] or '').strip()
            dist = str(r[COL['district']] or '').strip()
        elif level == 'District':
            place, prov, dist = name, str(r[COL['district']] or '').strip(), ''
        elif level == 'Province':
            place, prov, dist = name, '', ''
        else:
            place, prov, dist = 'RSA', '', ''
        if not place:
            continue
        key = (level, place, prov, dist, cat)
        for i, label in cols:
            v = r[i]
            if isinstance(v, (int, float)):
                out[key][label] = int(v)
    wb.close()
    return out, [c[1] for c in cols]

if __name__ == '__main__':
    annual, years = harvest('saps_annual_2024_25.xlsx', 'year')
    print(f'annual: {len(annual)} series, {len(years)} years', flush=True)

    monthly = defaultdict(dict)
    months = set()
    for f in ['q1st_2025_26.xlsx', 'q2nd_2025_26.xlsx', 'q3rd_2025_26.xlsx', 'q4_2025_26.xlsx']:
        part, ms = harvest(f, 'month')
        months.update(ms)
        for k, v in part.items():
            monthly[k].update(v)
        print(f'  {f}: +{len(part)} series', flush=True)
    months = sorted(months)

    cats = sorted({k[3] for k in annual})
    leaves = [c for c in cats if c not in GROUPS and c != TOTAL and c not in ('Sexual offences', 'TRIO crime')]
    print(f'\n{len(cats)} categories, {len(leaves)} leaf categories')
    print(f'{len(months)} months {months[0]}..{months[-1]}')

    json.dump({
        'years': years, 'months': months, 'categories': cats,
        'groups': GROUPS, 'cross': {k: v for k, v in CROSS.items() if v}, 'total': TOTAL,
        'leaves': leaves,
    }, open('ds_meta.json', 'w'), indent=1)

    def dump(level, fname, keyfn):
        rec = defaultdict(lambda: {'annual': {}, 'monthly': {}})
        for (lv, place, prov, dist, cat), vals in annual.items():
            if lv == level: rec[keyfn(place, prov)].setdefault('annual', {})[cat] = vals
        for (lv, place, prov, dist, cat), vals in monthly.items():
            if lv == level: rec[keyfn(place, prov)].setdefault('monthly', {})[cat] = vals
        json.dump(rec, open(fname, 'w'))
        print(f'{fname}: {len(rec)} places')

    dump('National', 'ds_national.json', lambda p, pr: 'RSA')
    dump('Province', 'ds_provinces.json', lambda p, pr: p)
    dump('District', 'ds_districts.json', lambda p, pr: p)
    dump('Station', 'ds_stations.json', lambda p, pr: f'{p}|{pr}')
