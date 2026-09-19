import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { META, NATIONAL, PROVINCES, provinceSlug } from '../state/data';
import { NATIONAL_POPULATION, PROVINCE_POPULATION } from '../data/population';
import {
  change, communityGroups, communityTotalMonthly, composition, latest, leafCategories,
  longRunTrend, policeDetectedGroups, ratePer100k, rollingSum, seriesFor, yearOnYear,
} from '../engine/analysis';
import { Bar, Delta, Panel, Stat } from '../components/ui';
import { CompositionBar, Spark, TrendChart } from '../components/charts';
import { SourceLine } from '../components/LiveBar';
import {
  formatCount, formatMonth, formatMonthShort, formatNumber, formatRate, formatYear, shortCategory,
} from '../lib/format';

const HEADLINE = ['Murder', 'Rape', 'Carjacking', 'Robbery at residential premises'];

export default function National() {
  const [basis, setBasis] = useState<'annual' | 'monthly'>('annual');

  const totals = useMemo(() => {
    const s = seriesFor(NATIONAL, META, META.total);
    const end = latest(s, META.years)!;
    return { series: s, end, yoy: change(s[end.index - 1], end.value) };
  }, []);

  const murder = useMemo(() => {
    const s = seriesFor(NATIONAL, META, 'Murder');
    const end = latest(s, META.years)!;
    return { end, rate: ratePer100k(end.value, NATIONAL_POPULATION) };
  }, []);

  const monthlyTotal = useMemo(() => {
    // The total is not published monthly; it is summed from the seventeen
    // community-reported offences. See communityTotalMonthly.
    const s = communityTotalMonthly(NATIONAL, META);
    return { raw: s, rolling: rollingSum(s, 12) };
  }, []);

  const leaves = useMemo(() => leafCategories(META), []);

  const movers = useMemo(() => {
    return leaves
      .map((c) => {
        const s = seriesFor(NATIONAL, META, c);
        const end = latest(s, META.years);
        const yoy = yearOnYear(NATIONAL, META, c);
        return { category: c, value: end?.value ?? 0, yoy, trend: longRunTrend(s), series: s };
      })
      .filter((m) => m.yoy && m.value > 400 && m.yoy.percent !== null)
      .sort((a, b) => Math.abs(b.yoy!.percent!) - Math.abs(a.yoy!.percent!));
  }, [leaves]);

  const provinceRows = useMemo(() => {
    return PROVINCES.map((p) => {
      const m = latest(seriesFor(p, META, 'Murder'), META.years)?.value ?? 0;
      const all = latest(seriesFor(p, META, META.total), META.years)?.value ?? 0;
      const pop = PROVINCE_POPULATION[p.name] ?? 0;
      return { p, murders: m, all, murderRate: ratePer100k(m, pop), allRate: ratePer100k(all, pop) };
    }).sort((a, b) => b.murderRate - a.murderRate);
  }, []);

  const worstRate = provinceRows[0]?.murderRate ?? 1;
  const groups = communityGroups(META);
  const policeGroups = policeDetectedGroups(META);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-white">
          South Africa, {formatYear(totals.end.period)}
        </h1>
        <p className="mt-1.5 max-w-3xl text-[13px] leading-relaxed text-bone-400">
          Every crime SAPS reports, across {META.categories.length} categories,{' '}
          {formatNumber(META.stationCount)} police stations and {META.months.length} months.
          These are recorded crimes — offences someone reported and a station captured — which
          is not the same as crimes committed.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <Panel>
          <Stat
            label="All serious crime"
            value={formatCount(totals.end.value)}
            size="lg"
            hint={<>reported in {formatYear(totals.end.period)} · <Delta percent={totals.yoy?.percent ?? null} /> on the year before</>}
          />
        </Panel>
        <Panel>
          <Stat
            label="Murders"
            value={formatCount(murder.end.value)}
            size="lg"
            tone="up"
            hint={<>{formatRate(murder.rate)} per 100 000 people — among the highest rates recorded anywhere</>}
          />
        </Panel>
        <Panel>
          <Stat
            label="Murders a day"
            value={formatRate(murder.end.value / 365)}
            size="lg"
            tone="up"
            hint="Averaged across the financial year"
          />
        </Panel>
        <Panel>
          <Stat
            label="Reported crimes an hour"
            value={formatRate(totals.end.value / 365 / 24)}
            size="lg"
            tone="warn"
            hint={<>One every {formatRate((365 * 24 * 60 * 60) / totals.end.value, 0)} seconds, day and night</>}
          />
        </Panel>
      </div>

      <Panel
        title={basis === 'annual' ? 'All serious crime, ten financial years' : 'All serious crime, rolling twelve months'}
        subtitle={
          basis === 'annual'
            ? 'Financial years run April to March'
            : 'A rolling year removes the seasonality — December is not January'
        }
        action={
          <div className="flex gap-1">
            {(['annual', 'monthly'] as const).map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setBasis(b)}
                aria-pressed={basis === b}
                className={`chip transition-colors ${basis === b ? 'border-tab-400 bg-tab-400 text-ink-950' : 'border-white/12 text-bone-400 hover:text-tab-200'}`}
              >
                {b === 'annual' ? 'yearly' : 'monthly'}
              </button>
            ))}
          </div>
        }
      >
        {basis === 'annual' ? (
          <TrendChart series={totals.series} periods={META.years} formatPeriod={formatYear}
            label="All serious crime by financial year" />
        ) : (
          <TrendChart series={monthlyTotal.rolling} periods={META.months} formatPeriod={formatMonthShort}
            label="All serious crime, rolling twelve-month total" />
        )}
        {basis === 'monthly' && (
          <p className="px-5 pb-4 text-[11px] leading-relaxed text-bone-500">
            The first eleven months are blank because a twelve-month total cannot be formed
            from them. Raw monthly counts swing hard with the festive season; the rolling
            total is what shows whether the level itself is moving.{' '}
            <span className="text-bone-400">
              This series is derived: SAPS publishes no monthly total, so it is summed from
              the seventeen community-reported offences. It runs about a percent above the
              published annual figure for 2024/25, because counts are revised between the
              quarterly and annual releases.
            </span>
          </p>
        )}
      </Panel>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel
          title="What the crime is"
          subtitle={`The four groups that sum to all community-reported serious crime, ${formatYear(totals.end.period)}`}
        >
          <CompositionBar
            rows={groups.map((g) => {
              const v = latest(seriesFor(NATIONAL, META, g), META.years)?.value ?? 0;
              return { category: shortCategory(g), value: v, share: (v / totals.end.value) * 100 };
            }).sort((a, b) => b.value - a.value)}
          />
          <p className="border-t border-white/[0.06] px-5 py-4 text-[11px] leading-relaxed text-bone-500">
            Police-detected offences sit outside this total.{' '}
            {policeGroups.map((g) => (
              <span key={g}>
                {formatCount(latest(seriesFor(NATIONAL, META, g), META.years)?.value ?? null)} cases
              </span>
            ))}{' '}
            of drug possession, drunk driving and illegal firearms were found by police rather
            than reported by the public, and SAPS counts them separately — so they are not part
            of the shares above. They also measure police activity as much as criminal activity:
            when drug arrests rise, it can mean more policing rather than more drugs.
          </p>
        </Panel>

        <Panel title="Violence against the person" subtitle="Contact crime, broken into its parts">
          <CompositionBar rows={composition(NATIONAL, META, 'Contact crime (Crimes against the person)')
            .map((r) => ({ ...r, category: shortCategory(r.category) }))} />
        </Panel>
      </div>

      <Panel title="The crimes that moved most" subtitle="Year on year, categories with more than 400 cases">
        <div className="hidden px-5 py-2.5 md:grid md:grid-cols-[2fr_1fr_1fr_1fr_1fr] md:gap-4 md:border-b md:border-white/[0.06]">
          {['Category', formatYear(totals.end.period), 'Year on year', 'Decade trend', '10-year shape'].map((h) => (
            <span key={h} className="label">{h}</span>
          ))}
        </div>
        {movers.slice(0, 12).map((m) => (
          <Link key={m.category} to={`/categories/${encodeURIComponent(m.category)}`}
            className="row grid-cols-2 md:grid-cols-[2fr_1fr_1fr_1fr_1fr]">
            <p className="col-span-2 flex items-center gap-2 font-medium text-white md:col-span-1">
              {shortCategory(m.category)}
              <ArrowUpRight className="h-3.5 w-3.5 text-bone-600" aria-hidden="true" />
            </p>
            <p className="readout text-[13px]">{formatCount(m.value)}</p>
            <Delta percent={m.yoy!.percent} className="text-[13px]" />
            <p className="readout text-[13px] text-bone-400">
              {m.trend === null ? '—' : `${m.trend > 0 ? '+' : ''}${formatNumber(m.trend, 1)}%/yr`}
            </p>
            <div className="w-24">
              <Spark series={m.series} tone={m.yoy!.percent! > 0 ? 'up' : 'down'} />
            </div>
          </Link>
        ))}
      </Panel>

      <Panel
        title="Provinces by murder rate"
        subtitle="Per 100 000 residents — the only fair way to set a province of 16 million beside one of 1,4 million"
      >
        <div className="hidden px-5 py-2.5 md:grid md:grid-cols-[1.6fr_1.4fr_1fr_1fr] md:gap-4 md:border-b md:border-white/[0.06]">
          {['Province', 'Murder rate / 100k', 'Murders', 'All serious crime'].map((h) => (
            <span key={h} className="label">{h}</span>
          ))}
        </div>
        {provinceRows.map((r) => (
          <Link key={r.p.name} to={`/provinces/${provinceSlug(r.p.name)}`}
            className="row grid-cols-2 md:grid-cols-[1.6fr_1.4fr_1fr_1fr]">
            <p className="col-span-2 flex items-center gap-2 font-medium text-white md:col-span-1">
              {r.p.name}
              <ArrowUpRight className="h-3.5 w-3.5 text-bone-600" aria-hidden="true" />
            </p>
            <div className="flex items-center gap-3">
              <span className="readout w-12 shrink-0 text-[13px] text-blood-300">{formatRate(r.murderRate)}</span>
              <Bar value={r.murderRate} max={worstRate} tone="up" />
            </div>
            <p className="readout text-[13px]">{formatCount(r.murders)}</p>
            <p className="readout text-[13px] text-bone-400">{formatCount(r.all)}</p>
          </Link>
        ))}
        <p className="border-t border-white/[0.06] px-5 py-4 text-[11px] leading-relaxed text-bone-500">
          Gauteng records the most murders of any province and does not have the highest rate.
          Ranking by count measures where the most people live nearly as much as it measures
          crime; ranking by rate is what tells you where you are most likely to become a victim.
        </p>
      </Panel>

      <Panel title="Headline offences" subtitle={`Latest reported year, ${formatYear(totals.end.period)}`}>
        <div className="grid gap-0 sm:grid-cols-2 xl:grid-cols-4 xl:divide-x xl:divide-white/[0.05]">
          {HEADLINE.map((c) => {
            const s = seriesFor(NATIONAL, META, c);
            const end = latest(s, META.years);
            const yoy = yearOnYear(NATIONAL, META, c);
            if (!end) return null;
            return (
              <div key={c}>
                <Stat
                  label={shortCategory(c)}
                  value={formatCount(end.value)}
                  tone="neutral"
                  hint={<><Delta percent={yoy?.percent ?? null} /> on the year · {formatRate(ratePer100k(end.value, NATIONAL_POPULATION))} per 100k</>}
                />
              </div>
            );
          })}
        </div>
      </Panel>

      <div className="space-y-2">
        <SourceLine />
        <p className="text-[11px] leading-relaxed text-bone-500">
          Monthly figures run to {formatMonth(META.months[META.months.length - 1])}. SAPS
          publishes quarterly, so this is the most recent data in existence — there is no
          incident-level feed for South Africa, and nothing here is estimated or projected.
        </p>
      </div>
    </div>
  );
}
