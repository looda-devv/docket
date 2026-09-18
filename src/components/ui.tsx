import type { ReactNode } from 'react';
import { formatChange } from '../lib/format';

export function Panel({
  title, subtitle, action, children, className = '',
}: { title?: string; subtitle?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`panel ${className}`}>
      {title && (
        <header className="panel-head">
          <div className="min-w-0">
            <h2 className="text-[13px] font-semibold tracking-wide text-white">{title}</h2>
            {subtitle && <p className="mt-0.5 text-[11px] text-bone-500">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function Stat({
  label, value, unit, hint, tone = 'neutral', size = 'md',
}: {
  label: string; value: string; unit?: string; hint?: ReactNode;
  tone?: 'neutral' | 'up' | 'down' | 'warn' | 'accent'; size?: 'md' | 'lg';
}) {
  const toneClass = {
    neutral: 'text-white', up: 'text-blood-300', down: 'text-fall-300',
    warn: 'text-tab-300', accent: 'text-tab-200',
  }[tone];
  return (
    <div className="px-5 py-4">
      <p className="label">{label}</p>
      <p className="mt-2 flex items-baseline gap-1.5">
        <span className={`readout ${toneClass} ${size === 'lg' ? 'text-3xl' : 'text-2xl'}`}>{value}</span>
        {unit && <span className="font-mono text-[11px] text-bone-500">{unit}</span>}
      </p>
      {hint && <p className="mt-1.5 text-[11px] leading-relaxed text-bone-500">{hint}</p>}
    </div>
  );
}

/**
 * A change, coloured by what it means rather than by its sign.
 *
 * More crime is bad and less crime is good, so a fall is green and a rise is
 * red — the opposite of a financial chart. Getting this backwards would make
 * every improving category look like a crisis.
 */
export function Delta({ percent, className = '' }: { percent: number | null; className?: string }) {
  const tone =
    percent === null ? 'text-bone-500'
      : percent > 0 ? 'text-blood-300'
      : percent < 0 ? 'text-fall-300'
      : 'text-bone-400';
  return <span className={`readout ${tone} ${className}`}>{formatChange(percent)}</span>;
}

export function Bar({
  value, max, tone = 'accent', className = '',
}: { value: number; max: number; tone?: 'accent' | 'up' | 'down' | 'warn'; className?: string }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const bg = { accent: 'bg-tab-400', up: 'bg-blood-400', down: 'bg-fall-400', warn: 'bg-tab-300' }[tone];
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06] ${className}`}>
      <div className={`h-full rounded-full ${bg} transition-[width] duration-700 ease-out`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="px-5 py-10 text-center text-[13px] text-bone-500">{children}</p>;
}

export function Loading({ what = 'data' }: { what?: string }) {
  return (
    <div className="flex items-center gap-3 px-5 py-10 text-[13px] text-bone-500">
      <span className="h-2 w-2 animate-pulse rounded-full bg-tab-400" />
      Loading {what}…
    </div>
  );
}
