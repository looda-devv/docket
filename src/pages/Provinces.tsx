import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import { META, PROVINCES, loadStations, provinceFromSlug, provinceSlug } from '../state/data';
import { PROVINCE_POPULATION } from '../data/population';
import { latest, leafCategories, longRunTrend, rank, ratePer100k, seriesFor, yearOnYear } from '../engine/analysis';
import { Bar, Delta, Loading, Panel, Stat } from '../components/ui';
import { Spark, TrendChart } from '../components/charts';
import { formatCount, formatNumber, formatRate, formatYear, shortCategory } from '../lib/format';
import { useEffect } from 'react';
import type { Place } from '../types';

/** All nine provinces, compared on rate rather than count. */
export function Provinces() {
  const [metric, setMetric] = useState<'rate' | 'count'>('rate');
  const rows = useMemo(() => {
    return PROVINCES.map((p) => {
      const all = latest(seriesFor(p, META, META.total), META.years)?.value ?? 0;
      const murders = latest(seriesFor(p, META, 'Murder'), META.years)?.value ?? 0;
      const pop = PROVINCE_POPULATION[p.name] ?? 0;
      return {
        p, all, murders, pop,
        allRate: ratePer100k(all, pop),
        murderRate: ratePer100k(murders, pop),
        yoy: yearOnYear(p, META, META.total),
        series: seriesFor(p, META, META.total),
      };
    }).sort((a, b) => (metric === 'rate' ? b.allRate - a.allRate : b.all - a.all));
  }, [metric]);
  const max = metric === 'rate' ? rows[0].allRate : rows[0].all;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-white">Provinces</h1>
        <p className="mt-1.5 max-w-3xl text-[13px] leading-relaxed text-bone-400">
          All nine, on {META.categories.length} categories. Population is the Statistics South
          Africa mid-2026 estimate, which is what turns a count into something comparable.
        </p>
      </div>

      <div className="flex gap-2 border-y border-white/10 py-4">
        {([['rate', 'Per 100 000 people'], ['count', 'Total recorded']] as const).map(([k, lbl]) => (
          <button key={k} type="button" onClick={() => setMetric(k)} aria-pressed={metric === k}
            className={`chip transition-colors ${metric === k ? 'border-tab-400 bg-tab-400 text-ink-950' : 'border-white/12 text-bone-400 hover:text-tab-200'}`}>
            {lbl}
          </button>
        ))}
      </div>

      <Panel>
        <div className="hidden px-5 py-2.5 md:grid md:grid-cols-[1.5fr_1.5fr_1fr_1fr_0.9fr_1fr] md:gap-4 md:border-b md:border-white/[0.06]">
          {['Province', metric === 'rate' ? 'All crime / 100k' : 'All serious crime', 'Murder rate', 'Population', 'Year on year', 'Shape'].map((h) => (
            <span key={h} className="label">{h}</span>
          ))}
        </div>
        {rows.map((r) => (
          <Link key={r.p.name} to={`/provinces/${provinceSlug(r.p.name)}`}
            className="row grid-cols-2 md:grid-cols-[1.5fr_1.5fr_1fr_1fr_0.9fr_1fr]">
            <p className="col-span-2 flex items-center gap-2 font-medium text-white md:col-span-1">
              {r.p.name} <ArrowUpRight className="h-3.5 w-3.5 text-bone-600" aria-hidden="true" />
            </p>
            <div className="flex items-center gap-3">
              <span className="readout w-16 shrink-0 text-[13px]">
                {metric === 'rate' ? formatRate(r.allRate, 0) : formatCount(r.all)}
              </span>
              <Bar value={metric === 'rate' ? r.allRate : r.all} max={max} />
            </div>
            <p className="readout text-[13px] text-blood-300">{formatRate(r.murderRate)}</p>
            <p className="readout text-[13px] text-bone-400">{formatCount(r.pop)}</p>
            <Delta percent={r.yoy?.percent ?? null} className="text-[13px]" />
            <div className="w-24"><Spark series={r.series} tone={(r.yoy?.percent ?? 0) > 0 ? 'up' : 'down'} /></div>
          </Link>
        ))}
      </Panel>
    </div>
  );
}

/** One province, its categories and its stations. */
export function ProvinceDetail() {
  const { slug = '' } = useParams();
  const name = provinceFromSlug(slug);
  const province = PROVINCES.find((p) => p.name === name);
  const [stations, setStations] = useState<Place[] | null>(null);

  useEffect(() => {
    if (!name) return;
    let alive = true;
    loadStations(name).then((s) => { if (alive) setStations(s); }).catch(() => { if (alive) setStations([]); });
    return () => { alive = false; };
  }, [name]);

  const leaves = useMemo(() => leafCategories(META), []);
  const pop = name ? PROVINCE_POPULATION[name] ?? 0 : 0;

  const cats = useMemo(() => {
    if (!province) return [];
    return leaves.map((c) => {
      const s = seriesFor(province, META, c);
      const end = latest(s, META.years);
      return {
        category: c, value: end?.value ?? 0, series: s,
        rate: end ? ratePer100k(end.value, pop) : null,
        yoy: yearOnYear(province, META, c), trend: longRunTrend(s),
      };
    }).sort((a, b) => b.value - a.value);
  }, [province, leaves, pop]);

  const topStations = useMemo(
    () => (stations ? rank(stations, META, META.total).slice(0, 20) : []),
    [stations],
  );

  if (!province || !name) {
    return (
      <Panel>
        <p className="px-5 py-10 text-center text-[13px] text-bone-400">
          No province by that name. <Link to="/provinces" className="text-tab-200 underline underline-offset-4">All provinces</Link>.
        </p>
      </Panel>
    );
  }

  const all = latest(seriesFor(province, META, META.total), META.years);
  const murders = latest(seriesFor(province, META, 'Murder'), META.years);

  return (
    <div className="space-y-6">
      <div>
        <Link to="/provinces" className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-bone-500 hover:text-tab-200">
          <ArrowLeft className="h-3 w-3" aria-hidden="true" /> Provinces
        </Link>
        <h1 className="mt-3 text-xl font-semibold tracking-tight text-white">{name}</h1>
        <p className="mt-1.5 text-[13px] text-bone-400">
          {formatNumber(pop)} residents · {stations?.length ?? '—'} police stations
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Panel><Stat label="All serious crime" value={formatCount(all?.value ?? null)} size="lg"
          hint={all ? `${formatRate(ratePer100k(all.value, pop), 0)} per 100 000` : undefined} /></Panel>
        <Panel><Stat label="Murders" value={formatCount(murders?.value ?? null)} size="lg" tone="up"
          hint={murders ? `${formatRate(ratePer100k(murders.value, pop))} per 100 000` : undefined} /></Panel>
        <Panel><Stat label="Year on year" value={(() => { const y = yearOnYear(province, META, META.total); return y?.percent === null || !y ? '—' : `${y.percent > 0 ? '+' : ''}${formatNumber(y.percent, 1)}%`; })()}
          size="lg" tone={(yearOnYear(province, META, META.total)?.percent ?? 0) > 0 ? 'up' : 'down'} /></Panel>
        <Panel><Stat label="Share of national" value={(() => {
          const nat = PROVINCES.reduce((s, p) => s + (latest(seriesFor(p, META, META.total), META.years)?.value ?? 0), 0);
          return `${formatNumber(((all?.value ?? 0) / nat) * 100, 1)}%`;
        })()} size="lg" tone="accent" hint="of all recorded serious crime" /></Panel>
      </div>

      <Panel title="All serious crime, ten years">
        <TrendChart series={seriesFor(province, META, META.total)} periods={META.years} formatPeriod={formatYear} />
      </Panel>

      <Panel title="Every offence in this province" subtitle="Distinct offences only — subtotals excluded so nothing is counted twice">
        <div className="hidden px-5 py-2.5 md:grid md:grid-cols-[2.2fr_1fr_1fr_1fr_1fr] md:gap-4 md:border-b md:border-white/[0.06]">
          {['Offence', 'Latest year', 'Per 100k', 'Year on year', 'Shape'].map((h) => <span key={h} className="label">{h}</span>)}
        </div>
        {cats.map((c) => (
          <Link key={c.category} to={`/categories/${encodeURIComponent(c.category)}`}
            className="row grid-cols-2 md:grid-cols-[2.2fr_1fr_1fr_1fr_1fr]">
            <p className="col-span-2 truncate font-medium text-white md:col-span-1">{shortCategory(c.category)}</p>
            <p className="readout text-[13px]">{formatCount(c.value)}</p>
            <p className="readout text-[13px] text-bone-400">{formatRate(c.rate)}</p>
            <Delta percent={c.yoy?.percent ?? null} className="text-[13px]" />
            <div className="w-24"><Spark series={c.series} tone={(c.yoy?.percent ?? 0) > 0 ? 'up' : 'down'} /></div>
          </Link>
        ))}
      </Panel>

      <Panel title="Busiest stations" subtitle="By recorded serious crime, latest year">
        {stations === null ? <Loading what="stations" /> : topStations.map((s, i) => (
          <div key={s.place.name} className="row grid-cols-[auto_2fr_1.4fr_1fr]">
            <span className="readout w-5 text-[12px] text-bone-600">{i + 1}</span>
            <div className="min-w-0">
              <p className="truncate font-medium text-white">{s.place.name}</p>
              <p className="truncate text-[11px] text-bone-500">{s.place.district}</p>
            </div>
            <Bar value={s.value} max={topStations[0]?.value ?? 1} />
            <p className="readout text-[13px]">{formatCount(s.value)}</p>
          </div>
        ))}
      </Panel>
    </div>
  );
}
