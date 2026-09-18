import meta from '../data/saps/meta.json';
import national from '../data/saps/national.json';
import provinces from '../data/saps/provinces.json';
import type { Meta, Place, StationIndexEntry } from '../types';

export const META = meta as unknown as Meta;
export const NATIONAL = national as unknown as Place;
export const PROVINCES = provinces as unknown as Place[];

/**
 * District and station data load on demand.
 *
 * All 1 172 stations across ten years is roughly ten megabytes. Bundling it
 * would make the first paint wait on data most visitors never open, so the
 * stations are split into one chunk per province and fetched when asked for.
 */
const cache = new Map<string, Promise<unknown>>();

function load<T>(key: string, loader: () => Promise<T>): Promise<T> {
  if (!cache.has(key)) cache.set(key, loader());
  return cache.get(key) as Promise<T>;
}

export const loadDistricts = (): Promise<Place[]> =>
  load('districts', () => import('../data/saps/districts.json').then((m) => m.default as unknown as Place[]));

export const loadStationIndex = (): Promise<StationIndexEntry[]> =>
  load('station-index', () =>
    import('../data/saps/stations-index.json').then((m) => m.default as unknown as StationIndexEntry[]));

const PROVINCE_SLUG: Record<string, string> = {
  'Eastern Cape': 'eastern-cape', 'Free State': 'free-state', Gauteng: 'gauteng',
  'KwaZulu-Natal': 'kwazulu-natal', Limpopo: 'limpopo', Mpumalanga: 'mpumalanga',
  'Northern Cape': 'northern-cape', 'North West': 'north-west', 'Western Cape': 'western-cape',
};

export function loadStations(province: string): Promise<Place[]> {
  const slug = PROVINCE_SLUG[province];
  if (!slug) return Promise.resolve([]);
  return load(`stations:${slug}`, () =>
    import(`../data/saps/stations/${slug}.json`).then((m) => m.default as unknown as Place[]));
}

export const provinceSlug = (p: string) => PROVINCE_SLUG[p] ?? p.toLowerCase().replace(/\s+/g, '-');
export const provinceFromSlug = (slug: string) =>
  Object.keys(PROVINCE_SLUG).find((p) => PROVINCE_SLUG[p] === slug);
