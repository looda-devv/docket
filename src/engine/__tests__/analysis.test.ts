import { describe, expect, it } from 'vitest';
import {
  change, communityGroups, composition, latest, leafCategories, longRunTrend,
  policeDetectedGroups, rank, ratePer100k, rollingSum, seriesFor,
} from '../analysis';
import meta from '../../data/saps/meta.json';
import national from '../../data/saps/national.json';
import provinces from '../../data/saps/provinces.json';
import { NATIONAL_POPULATION, PROVINCE_POPULATION } from '../../data/population';
import type { Meta, Place } from '../../types';

const M = meta as unknown as Meta;
const RSA = national as unknown as Place;
const PROV = provinces as unknown as Place[];

describe('published SAPS data', () => {
  it('carries the full hierarchy and period coverage', () => {
    expect(M.years).toHaveLength(10);
    expect(M.months).toHaveLength(60);
    expect(M.provinces).toHaveLength(9);
    expect(PROV).toHaveLength(9);
    expect(M.stationCount).toBe(1172);
    expect(M.categories.length).toBeGreaterThanOrEqual(39);
  });

  it('reproduces the headline figures SAPS published for 2024/25', () => {
    const at = (c: string) => latest(seriesFor(RSA, M, c), M.years)!;
    expect(at('Murder').period).toBe('2024-2025');
    expect(at('Murder').value).toBe(24_692);
    expect(at('Rape').value).toBe(40_475);
    expect(at('Carjacking').value).toBe(20_150);
    expect(at(M.total).value).toBe(1_515_383);
  });

  it('closes: every parent equals the sum of its children', () => {
    const val = (c: string) => latest(seriesFor(RSA, M, c), M.years)?.value ?? null;
    for (const [parent, children] of Object.entries(M.groups)) {
      const sum = children.reduce((s, c) => s + (val(c) ?? 0), 0);
      // The source rounds a couple of rollups by a single count.
      expect(Math.abs((val(parent) ?? 0) - sum)).toBeLessThanOrEqual(1);
    }
  });

  it('sums the nine provinces to the national total', () => {
    // Independent confirmation that the aggregation levels were separated
    // correctly — if station, district and province rows had been mixed, this
    // would be out by a multiple, not a rounding.
    const nat = latest(seriesFor(RSA, M, 'Murder'), M.years)!.value;
    const sum = PROV.reduce(
      (s, p) => s + (latest(seriesFor(p, M, 'Murder'), M.years)?.value ?? 0), 0);
    expect(sum).toBe(nat);
  });

  it('keeps rollup categories out of the leaf list', () => {
    const leaves = leafCategories(M);
    expect(leaves).not.toContain(M.total);
    expect(leaves).not.toContain('Contact crime (Crimes against the person)');
    expect(leaves).not.toContain('Sexual offences');
    expect(leaves).toContain('Murder');
    expect(leaves).toContain('Rape');
  });

  it('matches the province populations to the crime data', () => {
    for (const p of M.provinces) expect(PROVINCE_POPULATION[p]).toBeGreaterThan(0);
    const sum = Object.values(PROVINCE_POPULATION).reduce((a, b) => a + b, 0);
    expect(sum).toBe(NATIONAL_POPULATION);
  });
});

describe('rates and comparison', () => {
  it('computes a murder rate per 100 000 in the range South Africa reports', () => {
    const murders = latest(seriesFor(RSA, M, 'Murder'), M.years)!.value;
    const rate = ratePer100k(murders, NATIONAL_POPULATION);
    // South Africa runs around 38-45 per 100 000 — among the highest on earth.
    expect(rate).toBeGreaterThan(30);
    expect(rate).toBeLessThan(50);
  });

  it('reorders provinces when ranking by rate rather than by count', () => {
    // Gauteng records the most murders; it does not have the highest rate.
    // If these ever agree, the rate calculation has stopped doing anything.
    const byCount = rank(PROV, M, 'Murder');
    const byRate = rank(PROV, M, 'Murder', { populations: PROVINCE_POPULATION, basis: 'rate' });
    expect(byCount[0].place.name).toBe('Gauteng');
    expect(byRate[0].place.name).not.toBe('Gauteng');
  });
});

describe('change arithmetic', () => {
  it('refuses to invent a percentage from a zero base', () => {
    const c = change(0, 3)!;
    expect(c.absolute).toBe(3);
    expect(c.percent).toBeNull();
    expect(c.direction).toBe('up');
  });

  it('reports direction and magnitude', () => {
    expect(change(100, 80)).toMatchObject({ absolute: -20, percent: -20, direction: 'down' });
    expect(change(50, 50)).toMatchObject({ absolute: 0, direction: 'flat' });
    expect(change(null, 10)).toBeNull();
  });

  it('annualises a long-run trend rather than comparing endpoints', () => {
    // Doubling over 4 periods is ~18.9% a period, not 100%.
    expect(longRunTrend([100, null, null, null, 200])!).toBeCloseTo(18.92, 1);
    expect(longRunTrend([100])).toBeNull();
    expect(longRunTrend([0, 50])).toBeNull();
  });
});

describe('null handling', () => {
  it('never reads an unreported period as zero', () => {
    expect(latest([5, null], ['a', 'b'])).toMatchObject({ value: 5, period: 'a' });
    expect(latest([null, null], ['a', 'b'])).toBeNull();
  });

  it('leaves a rolling window null until it is full, and where data is missing', () => {
    const r = rollingSum([1, 2, 3, 4], 3);
    expect(r).toEqual([null, null, 6, 9]);
    expect(rollingSum([1, null, 3], 3)).toEqual([null, null, null]);
  });

  it('builds a twelve-month rolling total from the real monthly series', () => {
    const s = seriesFor(RSA, M, 'Murder', 'monthly');
    expect(s).toHaveLength(60);
    const rolled = rollingSum(s, 12);
    const last = rolled[rolled.length - 1];
    // A rolling year of murders should land near the annual figure.
    expect(last).toBeGreaterThan(20_000);
    expect(last).toBeLessThan(30_000);
  });
});

describe('composition', () => {
  it('breaks a parent into children that sum to the whole', () => {
    const rows = composition(RSA, M, 'Contact crime (Crimes against the person)');
    expect(rows.length).toBeGreaterThan(3);
    const shares = rows.reduce((s, r) => s + r.share, 0);
    expect(shares).toBeCloseTo(100, 6);
    expect(rows[0].value).toBeGreaterThanOrEqual(rows[rows.length - 1].value);
  });
});

describe('the community-reported total and what sits outside it', () => {
  it('sums the four community groups to the published total, and no more', () => {
    // Including police-detected crime here pushes the shares past 100%: those
    // offences are found by police, not reported by the public, and SAPS
    // counts them outside the community-reported total.
    const val = (c: string) => latest(seriesFor(RSA, M, c), M.years)?.value ?? 0;
    const groups = communityGroups(M);

    expect(groups).toHaveLength(4);
    expect(groups).not.toContain('Crime detected as a result of police action');
    expect(groups.reduce((s, g) => s + val(g), 0)).toBe(val(M.total));
  });

  it('keeps police-detected crime available but separate', () => {
    const police = policeDetectedGroups(M);
    expect(police).toEqual(['Crime detected as a result of police action']);

    const val = (c: string) => latest(seriesFor(RSA, M, c), M.years)?.value ?? 0;
    // It is substantial — large enough that folding it in would badly distort
    // any breakdown that claimed to be of reported crime.
    expect(val(police[0])).toBeGreaterThan(200_000);
  });
});
