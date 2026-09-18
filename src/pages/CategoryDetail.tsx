import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { META, NATIONAL, PROVINCES, loadStations, provinceSlug } from '../state/data';
import { NATIONAL_POPULATION, PROVINCE_POPULATION } from '../data/population';
import {
  change, composition, latest, longRunTrend, rank, ratePer100k, rollingSum, seriesFor,
} from '../engine/analysis';
import { Bar, Loading, Panel, Stat } from '../components/ui';
import { CompositionBar, TrendChart } from '../components/charts';
import {
  formatCount, formatMonthShort, formatNumber, formatRate, formatYear, shortCategory,
} from '../lib/format';
import type { Place } from '../types';

export default function CategoryDetail() {
  const { category = '' } = useParams();
  const cat = decodeURIComponent(category);
  const [stations, setStations] = useState<Place[] | null>(null);

  const known = META.categories.includes(cat);

  useEffect(() => {
    if (!known) return;
    let alive = true;
    Promise.all(META.provinces.map((p) => loadStations(p)))
      .then((chunks) => { if (alive) setStations(chunks.flat()); })
      .catch(() => { if (alive) setStations([]); });
    return () => { alive = false; };
  }, [known, cat]);

  const annual = useMemo(() => seriesFor(NATIONAL, META, cat), [cat]);
  const monthly = useMemo(() => rollingSum(seriesFor(NATIONAL, META, cat, 'monthly'), 12), [cat]);
  const end = useMemo(() => latest(annual, META.years), [annual]);
  const yoy = useMemo(() => (end && end.index > 0 ? change(annual[end.index - 1], end.value) : null), [annual, end]);
  const children = useMemo(() => composition(NATIONAL, META, cat), [cat]);

  const provinceRows = useMemo(() => {
    if (!end) return [];
    return PROVINCES.map((p) => {
      const v = latest(seriesFor(p, META, cat), META.years)?.value ?? 0;
      const pop = PROVINCE_POPULATION[p.name] ?? 0;
      return { p, value: v, rate: ratePer100k(v, pop) };
    }).sort((a, b) => b.rate - a.rate);
  }, [cat, end]);

  const topStations = useMemo(() => {
    if (!stations) return [];
    return rank(stations, META, cat).slice(0, 15);
  }, [stations, cat]);

  if (!known) {
    return (
      <Panel>
        <p className="px-5 py-10 text-center text-[13px] text-bone-400">
          No category by that name.{' '}
          <Link to="/categories" className="text-tab-200 underline underline-offset-4">All categories</Link>.
        </p>
      </Panel>
    );
  }

  const isRollup = Boolean(META.groups[cat] || META.cross[cat] || cat === META.total);

  return (
    <div className="space-y-6">
      <div>
        <Link to="/categories" className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-bone-500 hover:text-tab-200">
          <ArrowLeft className="h-3 w-3" aria-hidden="true" /> Categories
        </Link>
        <h1 className="mt-3 flex flex-wrap items-center gap-3 text-xl font-semibold tracking-tight text-white">
          {cat}
          {isRollup && <span className="chip border-blood-400/40 bg-blood-400/10 text-blood-200">subtotal</span>}
        </h1>
        {isRollup && (
          <p className="mt-1.5 max-w-3xl text-[12px] leading-relaxed text-bone-400">
            This is a subtotal: its cases are also counted under the categories it contains.
            It cannot be added to them.
          </p>
        )}
      </div>

      {end && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Panel>
            <Stat label={`Reported ${formatYear(end.period)}`} value={formatCount(end.value)} size="lg" />
          </Panel>
          <Panel>
            <Stat label="Per 100 000 people" value={formatRate(ratePer100k(end.value, NATIONAL_POPULATION))} size="lg" tone="warn" />
          </Panel>
          <Panel>
            <Stat label="Year on year" value={yoy ? `${yoy.percent === null ? 'new' : `${yoy.percent > 0 ? '+' : ''}${formatNumber(yoy.percent, 1)}%`}` : '—'}
              size="lg" tone={(yoy?.percent ?? 0) > 0 ? 'up' : 'down'}
              hint={yoy ? `${yoy.absolute > 0 ? '+' : ''}${formatNumber(yoy.absolute)} cases` : undefined} />
          </Panel>
          <Panel>
            <Stat label="Decade trend" value={(() => { const t = longRunTrend(annual); return t === null ? '—' : `${t > 0 ? '+' : ''}${formatNumber(t, 1)}%`; })()}
              unit="per year" size="lg" tone={(longRunTrend(annual) ?? 0) > 0 ? 'up' : 'down'}
              hint="Compound annual change across the reported years" />
          </Panel>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="By financial year" subtitle="April to March">
          <TrendChart series={annual} periods={META.years} formatPeriod={formatYear} label={`${cat} by year`} tone="up" />
        </Panel>
        <Panel title="Rolling twelve months" subtitle="Seasonality removed">
          <TrendChart series={monthly} periods={META.months} formatPeriod={formatMonthShort} label={`${cat}, rolling year`} tone="up" />
        </Panel>
      </div>

      {children.length > 0 && (
        <Panel title="What it is made of" subtitle="The categories that sum to this subtotal">
          <CompositionBar rows={children.map((r) => ({ ...r, category: shortCategory(r.category) }))} />
        </Panel>
      )}

      <Panel title="Provinces by rate" subtitle="Per 100 000 residents, latest reported year">
        {provinceRows.map((r, i) => (
          <Link key={r.p.name} to={`/provinces/${provinceSlug(r.p.name)}`} className="row grid-cols-[auto_1.5fr_1.4fr_1fr]">
            <span className="readout w-5 text-[12px] text-bone-600">{i + 1}</span>
            <p className="font-medium text-white">{r.p.name}</p>
            <div className="flex items-center gap-3">
              <span className="readout w-12 shrink-0 text-[13px] text-blood-300">{formatRate(r.rate)}</span>
              <Bar value={r.rate} max={provinceRows[0].rate} tone="up" />
            </div>
            <p className="readout text-[13px] text-bone-400">{formatCount(r.value)}</p>
          </Link>
        ))}
      </Panel>

      <Panel title="Stations recording the most" subtitle="By count — these are the busiest precincts, not necessarily the most dangerous">
        {stations === null ? <Loading what="station data" /> : topStations.map((s, i) => (
          <div key={s.place.name} className="row grid-cols-[auto_2fr_1.4fr_1fr]">
            <span className="readout w-5 text-[12px] text-bone-600">{i + 1}</span>
            <div className="min-w-0">
              <p className="truncate font-medium text-white">{s.place.name}</p>
              <p className="truncate text-[11px] text-bone-500">{s.place.district} · {s.place.province}</p>
            </div>
            <Bar value={s.value} max={topStations[0]?.value ?? 1} tone="up" />
            <p className="readout text-[13px]">{formatCount(s.value)}</p>
          </div>
        ))}
        <p className="border-t border-white/[0.06] px-5 py-4 text-[11px] leading-relaxed text-bone-500">
          Station counts are not rates. A precinct covering a CBD or a transport hub serves a
          daytime population many times its resident one, so it will record more of almost
          everything without being more dangerous for the people who live there.
        </p>
      </Panel>
    </div>
  );
}
