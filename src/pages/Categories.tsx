import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { META, NATIONAL } from '../state/data';
import { NATIONAL_POPULATION } from '../data/population';
import { latest, leafCategories, longRunTrend, ratePer100k, seriesFor, yearOnYear } from '../engine/analysis';
import { Delta, Empty, Panel } from '../components/ui';
import { Spark } from '../components/charts';
import { formatCount, formatNumber, formatRate, formatYear, shortCategory } from '../lib/format';

type Sort = 'count' | 'yoy' | 'trend' | 'name';

/**
 * Every category SAPS reports.
 *
 * The rollups are shown separately from the leaf offences rather than mixed
 * in, because they are not comparable: "Contact crime" contains "Murder", and
 * a single list sorted by count puts the container next to its contents as
 * though they were peers.
 */
export default function Categories() {
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<Sort>('count');
  const [showRollups, setShowRollups] = useState(false);

  const leaves = useMemo(() => new Set(leafCategories(META)), []);

  const rows = useMemo(() => {
    const list = META.categories
      .filter((c) => (showRollups ? !leaves.has(c) : leaves.has(c)))
      .map((c) => {
        const s = seriesFor(NATIONAL, META, c);
        const end = latest(s, META.years);
        const yoy = yearOnYear(NATIONAL, META, c);
        return {
          category: c,
          value: end?.value ?? null,
          period: end?.period ?? null,
          yoy, trend: longRunTrend(s), series: s,
          rate: end ? ratePer100k(end.value, NATIONAL_POPULATION) : null,
        };
      });
    const needle = q.trim().toLowerCase();
    const filtered = needle
      ? list.filter((r) => r.category.toLowerCase().includes(needle))
      : list;
    return filtered.sort((a, b) => {
      if (sort === 'name') return a.category.localeCompare(b.category);
      if (sort === 'yoy') return Math.abs(b.yoy?.percent ?? 0) - Math.abs(a.yoy?.percent ?? 0);
      if (sort === 'trend') return (b.trend ?? -999) - (a.trend ?? -999);
      return (b.value ?? 0) - (a.value ?? 0);
    });
  }, [q, sort, showRollups, leaves]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-white">Crime categories</h1>
        <p className="mt-1.5 max-w-3xl text-[13px] leading-relaxed text-bone-400">
          All {META.categories.length} categories in the SAPS release. {leaves.size} are
          distinct offences; the rest are subtotals the source provides — groups like contact
          crime, and cross-cutting rollups like sexual offences and TRIO crime, whose members
          are already counted elsewhere. Adding every category together would count much of
          the country's crime twice.
        </p>
      </div>

      <div className="flex flex-col gap-4 border-y border-white/10 py-4 lg:flex-row lg:items-center">
        <div className="flex flex-wrap gap-2">
          {([['count', 'By volume'], ['yoy', 'Biggest movers'], ['trend', 'Decade trend'], ['name', 'A–Z']] as const).map(([k, lbl]) => (
            <button key={k} type="button" onClick={() => setSort(k)} aria-pressed={sort === k}
              className={`chip transition-colors ${sort === k ? 'border-tab-400 bg-tab-400 text-ink-950' : 'border-white/12 text-bone-400 hover:text-tab-200'}`}>
              {lbl}
            </button>
          ))}
          <button type="button" onClick={() => setShowRollups((v) => !v)} aria-pressed={showRollups}
            className={`chip transition-colors ${showRollups ? 'border-blood-400 bg-blood-400/20 text-blood-200' : 'border-white/12 text-bone-400 hover:text-tab-200'}`}>
            {showRollups ? 'showing subtotals' : 'show subtotals'}
          </button>
        </div>
        <div className="group relative w-full lg:ml-auto lg:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-bone-500 group-focus-within:text-tab-300" aria-hidden="true" />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search categories"
            aria-label="Search categories" className="field pl-9 pr-9" />
          {q && (
            <button type="button" onClick={() => setQ('')} aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-bone-500 hover:text-tab-200">
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
        <p className="label shrink-0">{rows.length} shown</p>
      </div>

      <Panel>
        <div className="hidden px-5 py-2.5 md:grid md:grid-cols-[2.2fr_1fr_0.9fr_1fr_1fr_1fr] md:gap-4 md:border-b md:border-white/[0.06]">
          {['Category', 'Latest year', 'Per 100k', 'Year on year', 'Decade trend', 'Shape'].map((h) => (
            <span key={h} className="label">{h}</span>
          ))}
        </div>
        {rows.length === 0 ? (
          <Empty>Nothing matches that.</Empty>
        ) : rows.map((r) => (
          <Link key={r.category} to={`/categories/${encodeURIComponent(r.category)}`}
            className="row grid-cols-2 md:grid-cols-[2.2fr_1fr_0.9fr_1fr_1fr_1fr]">
            <div className="col-span-2 min-w-0 md:col-span-1">
              <p className="truncate font-medium text-white">{shortCategory(r.category)}</p>
              {r.period && r.period !== META.years[META.years.length - 1] && (
                <p className="mt-0.5 text-[11px] text-bone-500">last reported {formatYear(r.period)}</p>
              )}
            </div>
            <p className="readout text-[13px]">{formatCount(r.value)}</p>
            <p className="readout text-[13px] text-bone-400">{formatRate(r.rate)}</p>
            <Delta percent={r.yoy?.percent ?? null} className="text-[13px]" />
            <p className="readout text-[13px] text-bone-400">
              {r.trend === null ? '—' : `${r.trend > 0 ? '+' : ''}${formatNumber(r.trend, 1)}%`}
            </p>
            <div className="w-24"><Spark series={r.series} tone={(r.yoy?.percent ?? 0) > 0 ? 'up' : 'down'} /></div>
          </Link>
        ))}
      </Panel>
    </div>
  );
}
