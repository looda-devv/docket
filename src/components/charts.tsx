import { useId } from 'react';
import { formatCount, formatMonthShort, formatNumber, formatYear } from '../lib/format';

/**
 * A time series, drawn as a line with an area beneath it.
 *
 * Gaps are real: where a category was not reported the line breaks rather than
 * joining across the hole, because a straight segment through missing years
 * asserts a trend nobody measured.
 */
export function TrendChart({
  series, periods, label, tone = 'accent', height = 220, formatPeriod,
}: {
  series: (number | null)[];
  periods: string[];
  label?: string;
  tone?: 'accent' | 'up';
  height?: number;
  formatPeriod?: (p: string) => string;
}) {
  const gid = useId();
  const W = 760;
  const PAD = { top: 16, right: 14, bottom: 30, left: 56 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = height - PAD.top - PAD.bottom;

  const present = series.filter((v): v is number => v !== null && v !== undefined);
  if (present.length < 2) {
    return <p className="px-5 py-8 text-center text-[12px] text-bone-500">Not enough reported periods to plot.</p>;
  }
  const max = Math.max(...present) * 1.12;
  const min = 0;
  const x = (i: number) => PAD.left + (i / (series.length - 1)) * plotW;
  const y = (v: number) => PAD.top + plotH - ((v - min) / (max - min || 1)) * plotH;

  // Split into unbroken runs so a gap stays a gap.
  const runs: { i: number; v: number }[][] = [];
  let run: { i: number; v: number }[] = [];
  series.forEach((v, i) => {
    if (v === null || v === undefined) { if (run.length) runs.push(run); run = []; }
    else run.push({ i, v });
  });
  if (run.length) runs.push(run);

  const stroke = tone === 'up' ? 'rgb(239 68 68)' : 'rgb(245 166 35)';
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => min + (max - min) * f);
  const fmt = formatPeriod ?? ((p: string) => p);
  const step = Math.max(1, Math.ceil(series.length / 8));

  return (
    <figure className="px-3 pb-2 pt-1">
      <svg viewBox={`0 0 ${W} ${height}`} className="h-auto w-full" role="img"
        aria-label={label ?? 'Trend over time'}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.26" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} y1={y(t)} x2={PAD.left + plotW} y2={y(t)} stroke="rgba(255,255,255,0.055)" />
            <text x={PAD.left - 9} y={y(t) + 3.5} textAnchor="end" className="fill-bone-500 font-mono text-[9px]">
              {formatCount(Math.round(t))}
            </text>
          </g>
        ))}
        {runs.map((r, k) => (
          <g key={k}>
            {r.length > 1 && (
              <polygon
                points={`${x(r[0].i)},${PAD.top + plotH} ${r.map((p) => `${x(p.i)},${y(p.v)}`).join(' ')} ${x(r[r.length - 1].i)},${PAD.top + plotH}`}
                fill={`url(#${gid})`}
              />
            )}
            <polyline points={r.map((p) => `${x(p.i)},${y(p.v)}`).join(' ')} fill="none"
              stroke={stroke} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          </g>
        ))}
        {periods.map((p, i) => (i % step === 0 || i === periods.length - 1) && (
          <text key={p} x={x(i)} y={height - 10}
            textAnchor={i === 0 ? 'start' : i === periods.length - 1 ? 'end' : 'middle'}
            className="fill-bone-500 font-mono text-[9px]">{fmt(p)}</text>
        ))}
      </svg>
    </figure>
  );
}

/** A bare trend line for a table cell. */
export function Spark({ series, tone = 'accent' }: { series: (number | null)[]; tone?: 'accent' | 'up' | 'down' }) {
  const vals = series.filter((v): v is number => v !== null && v !== undefined);
  if (vals.length < 2) return null;
  const W = 110, H = 30;
  const min = Math.min(...vals), max = Math.max(...vals);
  const span = max - min || 1;
  const pts = series
    .map((v, i) => (v === null || v === undefined ? null : `${((i / (series.length - 1)) * W).toFixed(1)},${(H - 3 - ((v - min) / span) * (H - 6)).toFixed(1)}`))
    .filter(Boolean).join(' ');
  const stroke = tone === 'up' ? 'rgb(255 122 114)' : tone === 'down' ? 'rgb(126 224 168)' : 'rgb(245 166 35)';
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" aria-hidden="true">
      <polyline points={pts} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Proportional breakdown of a parent category into its children. */
export function CompositionBar({
  rows,
}: { rows: { category: string; value: number; share: number }[] }) {
  const palette = ['bg-tab-400', 'bg-blood-400', 'bg-tab-300', 'bg-blood-300', 'bg-tab-500', 'bg-bone-400', 'bg-fall-400'];
  return (
    <div className="px-5 py-5">
      <div className="flex h-9 w-full overflow-hidden rounded-md border border-white/10">
        {rows.map((r, i) => (
          <div key={r.category} className={`${palette[i % palette.length]} transition-[width] duration-700`}
            style={{ width: `${r.share}%` }} title={`${r.category}: ${formatNumber(r.value)} (${formatNumber(r.share, 1)}%)`} />
        ))}
      </div>
      <dl className="mt-4 grid gap-2.5 sm:grid-cols-2">
        {rows.map((r, i) => (
          <div key={r.category} className="flex items-start gap-2.5">
            <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-sm ${palette[i % palette.length]}`} />
            <div className="min-w-0">
              <dt className="truncate text-[12px] text-bone-200">{r.category}</dt>
              <dd className="mt-0.5 font-mono text-[11px] text-bone-500">
                {formatNumber(r.value)} · {formatNumber(r.share, 1)}%
              </dd>
            </div>
          </div>
        ))}
      </dl>
    </div>
  );
}

export { formatYear, formatMonthShort };
