import type { Meta, Place } from '../types';

/**
 * The analysis layer.
 *
 * Everything here is a pure function over the published counts. Two rules run
 * through all of it:
 *
 * 1. Null is not zero. SAPS added categories over the decade, and a category
 *    that was not reported in 2015 must not be drawn as a year with no crime.
 * 2. Never sum across categories without knowing the hierarchy. Roughly a
 *    quarter of the "categories" in the source are rollups of the others, and
 *    adding them all together roughly doubles the country's crime.
 */

export const NULL_SAFE_SUM = (vals: (number | null)[]): number | null => {
  const present = vals.filter((v): v is number => v !== null);
  return present.length ? present.reduce((a, b) => a + b, 0) : null;
};

/** Index of a category in the meta list, or -1. */
export const catIndex = (meta: Meta, category: string): number =>
  meta.categories.indexOf(category);

/** One category's series for a place, over the annual or monthly periods. */
export function seriesFor(
  place: Place,
  meta: Meta,
  category: string,
  basis: 'annual' | 'monthly' = 'annual',
): (number | null)[] {
  const i = catIndex(meta, category);
  if (i < 0) return [];
  return place[basis][i] ?? [];
}

/** The most recent non-null value in a series, with the period it belongs to. */
export function latest(
  series: (number | null)[],
  periods: string[],
): { value: number; period: string; index: number } | null {
  for (let i = series.length - 1; i >= 0; i -= 1) {
    const v = series[i];
    if (v !== null && v !== undefined) return { value: v, period: periods[i], index: i };
  }
  return null;
}

/**
 * Rate per 100 000 people.
 *
 * The standard unit of comparison in criminology, and the only fair way to set
 * a province of sixteen million beside one of one and a half million.
 */
export const ratePer100k = (count: number, population: number): number =>
  population > 0 ? (count / population) * 100_000 : 0;

export interface Change {
  from: number;
  to: number;
  absolute: number;
  /** Percent change. Null where the base period is zero and a ratio is undefined. */
  percent: number | null;
  direction: 'up' | 'down' | 'flat';
}

/**
 * Change between two periods.
 *
 * Percent is null rather than Infinity when the earlier period was zero. A
 * category going from 0 to 3 is a real and reportable change, but "+∞%" on a
 * dashboard is noise, and rendering it as +300% would be a fabrication.
 */
export function change(from: number | null, to: number | null): Change | null {
  if (from === null || to === null) return null;
  const absolute = to - from;
  return {
    from,
    to,
    absolute,
    percent: from === 0 ? null : (absolute / from) * 100,
    direction: absolute > 0 ? 'up' : absolute < 0 ? 'down' : 'flat',
  };
}

/** Year-on-year change for a category at a place. */
export function yearOnYear(
  place: Place,
  meta: Meta,
  category: string,
): Change | null {
  const s = seriesFor(place, meta, category);
  const end = latest(s, meta.years);
  if (!end || end.index < 1) return null;
  return change(s[end.index - 1], end.value);
}

/**
 * Compound annual growth rate across the full series, as a percent.
 *
 * A single year-on-year move can be noise — a station reclassifying dockets, a
 * policing operation, a month of unrest. The decade trend is what shows
 * whether something is actually moving.
 */
export function longRunTrend(series: (number | null)[]): number | null {
  const present = series
    .map((v, i) => [i, v] as const)
    .filter((p): p is readonly [number, number] => p[1] !== null);
  if (present.length < 2) return null;
  const [firstI, firstV] = present[0];
  const [lastI, lastV] = present[present.length - 1];
  if (firstV <= 0) return null;
  const periods = lastI - firstI;
  return (Math.pow(lastV / firstV, 1 / periods) - 1) * 100;
}

/**
 * Rolling sum over a window — used to turn a monthly series into a
 * twelve-month total.
 *
 * Crime is strongly seasonal in South Africa: December is not January. A
 * rolling year removes the seasonality so a genuine change in level is
 * visible, which a raw monthly line buries.
 */
export function rollingSum(series: (number | null)[], window = 12): (number | null)[] {
  return series.map((_, i) => {
    if (i < window - 1) return null;
    const slice = series.slice(i - window + 1, i + 1);
    return slice.some((v) => v === null) ? null : NULL_SAFE_SUM(slice);
  });
}

/**
 * The four groups that actually sum to the community-reported total.
 *
 * `meta.groups` also contains "Crime detected as a result of police action",
 * which is NOT part of that total — police-detected offences like drug
 * possession and drunk driving are found by police rather than reported by the
 * public, and SAPS counts them separately. Including it in a breakdown of
 * community-reported crime pushes the shares past 100%.
 */
export function communityGroups(meta: Meta): string[] {
  return Object.keys(meta.groups).filter((g) => !/police action/i.test(g));
}

/** Groups found by police rather than reported to them. */
export function policeDetectedGroups(meta: Meta): string[] {
  return Object.keys(meta.groups).filter((g) => /police action/i.test(g));
}

/**
 * A monthly series for total community-reported serious crime.
 *
 * SAPS never publishes this total monthly — nor three of its four groups. Only
 * the individual offences appear in the quarterly releases, so the total has to
 * be summed from the seventeen community-reported categories.
 *
 * That sum does not exactly equal the published annual figure, and the reason
 * is worth knowing rather than hiding: SAPS revises counts between the
 * quarterly release and the annual one, as late dockets and reclassifications
 * work through. Across the four complete years here the derived total lands
 * within 0.05% for three of them and 1.3% out for 2024/25. The annual file is
 * the revised, authoritative figure; this series is the only way to see the
 * shape of the year between those points, and it is labelled as derived
 * wherever it is shown.
 */
export function communityTotalMonthly(place: Place, meta: Meta): (number | null)[] {
  const leaves = communityGroups(meta).flatMap((g) => meta.groups[g] ?? []);
  const rows = leaves.map((c) => seriesFor(place, meta, c, 'monthly'));
  return meta.months.map((_, j) => {
    const vals = rows.map((r) => r[j]);
    // One missing offence makes the month's total wrong rather than merely
    // incomplete, so the whole month is withheld.
    return vals.some((v) => v === null || v === undefined)
      ? null
      : vals.reduce((a, b) => (a as number) + (b as number), 0);
  });
}

/**
 * The leaf categories — those that are not rollups of other categories.
 *
 * These are the only ones that can be safely added together. Everything else
 * in the list is a subtotal the source provides for convenience.
 */
export function leafCategories(meta: Meta): string[] {
  const parents = new Set([
    meta.total,
    ...Object.keys(meta.groups),
    ...Object.keys(meta.cross),
  ]);
  return meta.categories.filter((c) => !parents.has(c));
}

/** Share of a parent category made up by each of its children. */
export function composition(
  place: Place,
  meta: Meta,
  parent: string,
  periodIndex?: number,
): { category: string; value: number; share: number }[] {
  const children = meta.groups[parent] ?? meta.cross[parent] ?? [];
  const at = (cat: string) => {
    const s = seriesFor(place, meta, cat);
    if (periodIndex !== undefined) return s[periodIndex] ?? null;
    return latest(s, meta.years)?.value ?? null;
  };
  const rows = children
    .map((c) => ({ category: c, value: at(c) ?? 0 }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value);
  const total = rows.reduce((s, r) => s + r.value, 0);
  return rows.map((r) => ({ ...r, share: total > 0 ? (r.value / total) * 100 : 0 }));
}

/**
 * Rank places by a category, optionally by rate rather than count.
 *
 * Ranking by count answers "where does the most crime happen"; ranking by rate
 * answers "where are you most likely to be a victim". They give very different
 * lists, and conflating them is how a big city ends up permanently labelled
 * the most dangerous place in the country on the strength of its size.
 */
export function rank(
  places: Place[],
  meta: Meta,
  category: string,
  opts: { populations?: Record<string, number>; basis?: 'count' | 'rate' } = {},
): { place: Place; value: number; rate: number | null }[] {
  const { populations, basis = 'count' } = opts;
  return places
    .map((p) => {
      const v = latest(seriesFor(p, meta, category), meta.years)?.value ?? null;
      const pop = populations?.[p.name];
      return {
        place: p,
        value: v ?? 0,
        rate: v !== null && pop ? ratePer100k(v, pop) : null,
      };
    })
    .filter((r) => (basis === 'rate' ? r.rate !== null : true))
    .sort((a, b) =>
      basis === 'rate' ? (b.rate ?? 0) - (a.rate ?? 0) : b.value - a.value,
    );
}
