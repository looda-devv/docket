import { RefreshCw, Radio, AlertTriangle, ExternalLink } from 'lucide-react';
import type { FeedState } from '../state/useReleaseFeed';
import { timeAgo } from '../lib/format';

/**
 * The live connection to the SAPS publication feed.
 *
 * This bar is careful about what it claims. The dot being green means the
 * dashboard is talking to saps.gov.za right now — not that crime data arrived
 * this second. South Africa publishes quarterly, and saying otherwise would be
 * the single most misleading thing this project could do.
 */
export function LiveBar({ feed, now }: { feed: FeedState & { refresh: () => void }; now: number }) {
  const tone =
    feed.status === 'live' ? 'border-fall-400/30 bg-fall-400/[0.07]'
      : feed.status === 'connecting' ? 'border-white/10 bg-white/[0.03]'
      : 'border-tab-400/30 bg-tab-400/[0.07]';

  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border px-4 py-2.5 ${tone}`}>
      <span className="flex items-center gap-2">
        {feed.status === 'unreachable' ? (
          <AlertTriangle className="h-3.5 w-3.5 text-tab-300" aria-hidden="true" />
        ) : (
          <span
            className={`live-dot h-2 w-2 rounded-full ${feed.status === 'live' ? 'bg-fall-400' : 'bg-bone-500'}`}
            aria-hidden="true"
          />
        )}
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-bone-300">
          {feed.status === 'live' ? 'SAPS feed live'
            : feed.status === 'connecting' ? 'Connecting'
            : 'SAPS unreachable'}
        </span>
      </span>

      {feed.checkedAt && (
        <span className="font-mono text-[10px] text-bone-500">
          checked {timeAgo(feed.checkedAt, now)}
        </span>
      )}

      {feed.status === 'live' && feed.latest && (
        <span className="min-w-0 truncate text-[11px] text-bone-400">
          Newest release on saps.gov.za:{' '}
          <a
            href={feed.latestUrl ?? '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="text-tab-200 underline underline-offset-4 hover:text-tab-300"
          >
            {feed.latest}
          </a>{' '}
          <span className="text-bone-600">· {feed.releaseCount} published releases tracked</span>
        </span>
      )}

      {feed.status === 'unreachable' && (
        <span className="text-[11px] text-bone-400">
          The dashboard is showing its stored copy of the SAPS data. {feed.note}
        </span>
      )}

      {feed.newSinceLoad && (
        <span className="chip border-fall-400/40 bg-fall-400/10 text-fall-300">
          new release detected
        </span>
      )}

      <button
        type="button"
        onClick={feed.refresh}
        className="ml-auto flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-bone-500 transition-colors hover:text-tab-200"
      >
        <RefreshCw className="h-3 w-3" aria-hidden="true" />
        check now
      </button>
    </div>
  );
}

/** Where the numbers come from, stated wherever they are shown. */
export function SourceLine() {
  return (
    <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-bone-500">
      <Radio className="h-3 w-3" aria-hidden="true" />
      <span>South African Police Service crime statistics, 2015/16–2025/26.</span>
      <a
        href="https://www.saps.gov.za/services/crimestats.php"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-tab-200 underline underline-offset-4 hover:text-tab-300"
      >
        saps.gov.za <ExternalLink className="h-3 w-3" aria-hidden="true" />
      </a>
    </p>
  );
}
