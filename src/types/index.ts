/**
 * Domain types for Docket.
 *
 * A "place" is any level of the SAPS reporting hierarchy — the country, a
 * province, a district, or a police station. They share a shape because they
 * share a structure in the source: the same categories, the same periods, and
 * counts that roll up exactly from one level to the next.
 */

export type Level = 'National' | 'Province' | 'District' | 'Station';

/**
 * One place's counts.
 *
 * `annual` and `monthly` are indexed by the category list in `Meta`, then by
 * the period. Null means the category was not reported for that period, which
 * is not the same as zero — SAPS added categories over time, and a zero would
 * put a line on a chart claiming no crime occurred.
 */
export interface Place {
  name: string;
  province: string;
  district: string;
  annual: (number | null)[][];
  monthly: (number | null)[][];
}

export interface Meta {
  categories: string[];
  years: string[];
  months: string[];
  /** Parent category → the categories that sum to it. Verified against the data. */
  groups: Record<string, string[]>;
  /** Rollups whose members are already counted inside a group. */
  cross: Record<string, string[]>;
  /** The grand total category. */
  total: string;
  provinces: string[];
  districts: string[];
  stationCount: number;
}

/** A station as it appears in the lightweight search index. */
export interface StationIndexEntry {
  /** Station name. */
  n: string;
  /** Province. */
  p: string;
  /** District. */
  d: string;
  /** Total community-reported serious crime, latest financial year. */
  t: number | null;
}

/** Live status of the SAPS publication feed. */
export interface ReleaseFeed {
  checkedAt: string;
  reachable: boolean;
  /** Releases parsed from the SAPS crime statistics page, newest first. */
  releases: { title: string; url: string; year: string; kind: string }[];
  latest: string | null;
  note?: string;
}
