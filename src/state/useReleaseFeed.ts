import { useCallback, useEffect, useRef, useState } from 'react';

export interface ReleaseItem {
  title: string; url: string; year: string; kind: string; format: string;
}

export interface FeedState {
  status: 'connecting' | 'live' | 'unreachable';
  checkedAt: string | null;
  latest: string | null;
  latestUrl: string | null;
  releaseCount: number;
  releases: ReleaseItem[];
  notices: ReleaseItem[];
  note?: string;
  /** Set once a check returns a release the session has not seen before. */
  newSinceLoad: string | null;
}

const POLL_MS = 60_000;

/**
 * Poll the SAPS publication feed.
 *
 * South Africa has no incident-level crime feed — SAPS publishes quarterly, so
 * the underlying numbers move four times a year. What this hook gives is a
 * live connection to the source: the dashboard checks continuously and knows
 * the moment a new release is posted, instead of being a snapshot that quietly
 * goes stale between quarters.
 *
 * It polls rather than holding a socket because the upstream is a government
 * web page being scraped through a cache; a minute of latency on a quarterly
 * publication is immaterial, and a persistent connection would buy nothing.
 */
export function useReleaseFeed(): FeedState & { refresh: () => void } {
  const [state, setState] = useState<FeedState>({
    status: 'connecting', checkedAt: null, latest: null, latestUrl: null,
    releaseCount: 0, releases: [], notices: [], newSinceLoad: null,
  });
  // The release seen on the first successful check, to compare later ones against.
  const baseline = useRef<string | null>(null);

  const check = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await fetch('/api/saps-releases', { signal, cache: 'no-store' });
      if (!res.ok) throw new Error(`the live check returned ${res.status}`);
      // In a plain static preview there is no serverless function behind this
      // path, so the dev server hands back the page or the raw module instead.
      // Parsing that produces a JSON syntax error, which is true but useless
      // to a reader — say what it means instead.
      const body = await res.text();
      let d: any;
      try {
        d = JSON.parse(body);
      } catch {
        throw new Error('the live check is not available in this environment');
      }
      setState((prev) => {
        if (baseline.current === null && d.latest) baseline.current = d.latest;
        const isNew = Boolean(d.latest && baseline.current && d.latest !== baseline.current);
        return {
          status: d.reachable ? 'live' : 'unreachable',
          checkedAt: d.checkedAt ?? new Date().toISOString(),
          latest: d.latest ?? null,
          latestUrl: d.latestUrl ?? null,
          releaseCount: d.releaseCount ?? 0,
          releases: d.releases ?? [],
          notices: d.notices ?? [],
          note: d.note,
          newSinceLoad: isNew ? d.latest : prev.newSinceLoad,
        };
      });
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      setState((prev) => ({
        ...prev, status: 'unreachable',
        checkedAt: new Date().toISOString(),
        note: e instanceof Error ? e.message : 'check failed',
      }));
    }
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    check(ac.signal);
    const id = setInterval(() => {
      // Polling a hidden tab wastes the visitor's battery and our upstream
      // budget for a feed that changes four times a year.
      if (document.visibilityState === 'visible') check(ac.signal);
    }, POLL_MS);
    const onVisible = () => { if (document.visibilityState === 'visible') check(ac.signal); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      ac.abort();
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [check]);

  return { ...state, refresh: () => check() };
}
