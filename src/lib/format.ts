/** Number, date and unit formatting, in South African conventions. */

const nf = new Intl.NumberFormat('en-ZA');

export const formatNumber = (v: number, decimals = 0): string =>
  new Intl.NumberFormat('en-ZA', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(v);

/** Counts, abbreviated once they stop being readable at a glance. */
export function formatCount(v: number | null): string {
  if (v === null) return '—';
  if (Math.abs(v) >= 1_000_000) return `${formatNumber(v / 1_000_000, 2)}m`;
  return nf.format(Math.round(v));
}

export const formatRate = (v: number | null, decimals = 1): string =>
  v === null ? '—' : formatNumber(v, decimals);

/**
 * A change, signed, with the sign carrying the meaning.
 *
 * Null percent is rendered as "new" rather than as a number: a category that
 * went from zero to something has changed, but no percentage describes it.
 */
export function formatChange(percent: number | null, decimals = 1): string {
  if (percent === null) return 'new';
  const sign = percent > 0 ? '+' : '';
  return `${sign}${formatNumber(percent, decimals)}%`;
}

/** SAPS financial year "2024-2025" → "2024/25", how it is spoken and written. */
export function formatYear(y: string): string {
  const m = y.match(/^(\d{4})-(\d{4})$/);
  return m ? `${m[1]}/${m[2].slice(2)}` : y;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-03" → "Mar 2026". */
export function formatMonth(m: string): string {
  const [y, mo] = m.split('-');
  return `${MONTHS[Number(mo) - 1] ?? mo} ${y}`;
}

/** Short form for dense axes: "Mar '26". */
export function formatMonthShort(m: string): string {
  const [y, mo] = m.split('-');
  return `${MONTHS[Number(mo) - 1] ?? mo} '${y.slice(2)}`;
}

/** How long ago, for the live status line. */
export function timeAgo(iso: string, now = Date.now()): string {
  const secs = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (secs < 10) return 'just now';
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

/** A crime category, shortened for table headers where the full name will not fit. */
export function shortCategory(c: string): string {
  return c
    .replace('Assault with the intent to inflict grievous bodily harm', 'Assault GBH')
    .replace('Contact crime (Crimes against the person)', 'Contact crime')
    .replace('17 Community reported serious crime', 'All serious crime')
    .replace('Crime detected as a result of police action', 'Police-detected crime')
    .replace('Sexual offences detected as a result of police action', 'Sexual offences (police-detected)')
    .replace('Driving under the influence of alcohol or drugs', 'Driving under the influence')
    .replace('Illegal possession of firearms and ammunition', 'Illegal firearms')
    .replace('Theft of motor vehicle and motorcycle', 'Vehicle theft')
    .replace('Theft out of or from motor vehicle', 'Theft from vehicle')
    .replace('All theft not mentioned elsewhere', 'Other theft')
    .replace('Burglary at residential premises', 'Residential burglary')
    .replace('Burglary at non-residential premises', 'Non-residential burglary')
    .replace('Robbery at residential premises', 'Residential robbery')
    .replace('Robbery at non-residential premises', 'Non-residential robbery')
    .replace('Robbery with aggravating circumstances', 'Aggravated robbery');
}
