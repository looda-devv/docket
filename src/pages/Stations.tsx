import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { META, loadStationIndex, provinceSlug } from '../state/data';
import { Bar, Empty, Loading, Panel, Stat } from '../components/ui';
import { formatCount, formatNumber } from '../lib/format';
import type { StationIndexEntry } from '../types';

/**
 * All 1 172 police stations.
 *
 * Deliberately ranked by count with the rate left out. A station precinct has
 * no published resident population — SAPS boundaries are not census boundaries
 * — so any per-capita figure at this level would be invented. The honest thing
 * is to show the counts and say what they do and do not mean.
 */
export default function Stations() {
  const [index, setIndex] = useState<StationIndexEntry[] | null>(null);
  const [q, setQ] = useState('');
  const [province, setProvince] = useState('All');

  useEffect(() => {
    let alive = true;
    loadStationIndex().then((d) => { if (alive) setIndex(d); }).catch(() => { if (alive) setIndex([]); });
    return () => { alive = false; };
  }, []);

  const rows = useMemo(() => {
    if (!index) return [];
    const needle = q.trim().toLowerCase();
    return index
      .filter((s) => province === 'All' || s.p === province)
      .filter((s) => !needle || s.n.toLowerCase().includes(needle) || s.d.toLowerCase().includes(needle))
      .sort((a, b) => (b.t ?? 0) - (a.t ?? 0));
  }, [index, q, province]);

  const max = rows[0]?.t ?? 1;
  const total = useMemo(() => (index ?? []).reduce((s, r) => s + (r.t ?? 0), 0), [index]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-white">Police stations</h1>
        <p className="mt-1.5 max-w-3xl text-[13px] leading-relaxed text-bone-400">
          Every station SAPS reports against, ranked by serious crime recorded in the latest
          financial year. A busy station is not the same as a dangerous area — precincts
          covering a CBD, a transport interchange or a major hospital record crime committed
          against people who do not live there.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Panel><Stat label="Stations" value={formatNumber(META.stationCount)} hint="Across nine provinces and 55 districts" /></Panel>
        <Panel><Stat label="Serious crime recorded" value={formatCount(total)} tone="warn" hint="Latest financial year, all stations" /></Panel>
        <Panel><Stat label="Average per station" value={formatCount(index?.length ? total / index.length : null)} hint="Median is far lower — the distribution is very skewed" /></Panel>
      </div>

      <div className="flex flex-col gap-4 border-y border-white/10 py-4 lg:flex-row lg:items-center">
        <select value={province} onChange={(e) => setProvince(e.target.value)} aria-label="Filter by province"
          className="field w-auto cursor-pointer">
          <option value="All">All provinces</option>
          {META.provinces.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <div className="group relative w-full lg:ml-auto lg:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-bone-500 group-focus-within:text-tab-300" aria-hidden="true" />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search station or district"
            aria-label="Search stations" className="field pl-9 pr-9" />
          {q && (
            <button type="button" onClick={() => setQ('')} aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-bone-500 hover:text-tab-200">
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
        <p className="label shrink-0">{index ? `${rows.length} of ${index.length}` : '—'}</p>
      </div>

      <Panel>
        {index === null ? <Loading what="station index" />
          : rows.length === 0 ? <Empty>No station matches that.</Empty>
          : rows.slice(0, 250).map((s, i) => (
            <div key={`${s.n}-${s.p}`} className="row grid-cols-[auto_2fr_1.4fr_1.2fr_1fr]">
              <span className="readout w-8 text-[12px] text-bone-600">{i + 1}</span>
              <div className="min-w-0">
                <p className="truncate font-medium text-white">{s.n}</p>
                <p className="truncate text-[11px] text-bone-500">{s.d}</p>
              </div>
              <Link to={`/provinces/${provinceSlug(s.p)}`} className="truncate text-[12px] text-bone-400 hover:text-tab-200">{s.p}</Link>
              <Bar value={s.t ?? 0} max={max} />
              <p className="readout text-[13px]">{formatCount(s.t)}</p>
            </div>
          ))}
        {rows.length > 250 && (
          <p className="border-t border-white/[0.06] px-5 py-4 text-center text-[11px] text-bone-500">
            Showing the top 250 of {rows.length}. Narrow by province or search to see the rest.
          </p>
        )}
      </Panel>
    </div>
  );
}
