import https from 'node:https';
import tls from 'node:tls';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Live check against the SAPS publication feed.
 *
 * What this endpoint is, and what it is not: South Africa has no incident-level
 * crime feed. SAPS publishes quarterly, so the *data* moves four times a year.
 * What this does is watch the source continuously, so the moment a new release
 * appears on saps.gov.za the dashboard knows — rather than shipping a snapshot
 * that silently goes stale for three months.
 *
 * Two problems make this server-side work rather than a browser fetch:
 *
 *   - saps.gov.za sends no CORS header, so a page cannot read it directly; and
 *   - it serves an incomplete certificate chain, omitting the Sectigo
 *     intermediate. Browsers paper over this by fetching the issuer themselves;
 *     Node does not, and the request fails outright.
 *
 * The intermediate is bundled and added to the trust store rather than turning
 * verification off. Disabling it would work and would mean this endpoint could
 * be fed anything by anyone able to intercept the connection.
 */

const SAPS_HOST = 'www.saps.gov.za';
const SAPS_PATH = '/services/crimestats.php';
const OLDER_PATH = '/services/older_crimestats.php';
const TIMEOUT_MS = 12_000;

let cachedCa: string | null = null;
function extraCa(): string | undefined {
  if (cachedCa === null) {
    try {
      cachedCa = readFileSync(join(process.cwd(), 'api/_certs/sectigo-ov-r36.pem'), 'utf8');
    } catch {
      cachedCa = '';
    }
  }
  return cachedCa || undefined;
}

function get(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const ca = extraCa();
    const req = https.request(
      {
        host: SAPS_HOST,
        path,
        method: 'GET',
        timeout: TIMEOUT_MS,
        // Passing `ca` REPLACES Node's trust store rather than adding to it,
        // so the defaults have to be carried along explicitly. Supplying the
        // intermediate alone leaves its own issuer untrusted and every request
        // fails with UNABLE_TO_GET_ISSUER_CERT.
        ca: ca ? [...tls.rootCertificates, ca] : undefined,
        headers: {
          'User-Agent': 'Docket/1.0 (+https://github.com/looda-devv/docket)',
          Accept: 'text/html',
        },
      },
      (res) => {
        if ((res.statusCode ?? 0) >= 400) {
          res.resume();
          reject(new Error(`SAPS responded ${res.statusCode}`));
          return;
        }
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (c) => { body += c; });
        res.on('end', () => resolve(body));
      },
    );
    req.on('timeout', () => req.destroy(new Error('SAPS timed out')));
    req.on('error', reject);
    req.end();
  });
}

interface Release {
  title: string;
  url: string;
  year: string;
  kind: 'annual' | 'quarter' | 'calendar' | 'notice' | 'other';
  format: string;
}

/**
 * Formats SAPS publishes in.
 *
 * Matching only xlsx and pdf missed the 2026/27 first quarter entirely: that
 * release went up as a macro-enabled .xlsm with a .pptx presentation instead
 * of the usual .xlsx and .pdf. The dashboard reported the newest data as the
 * previous quarter while the current one sat on the page unnoticed — a live
 * feed that silently ignores a release is worse than no live feed, so the
 * match is now broad and the format is reported rather than assumed.
 */
const DATA_FORMATS = ['xlsx', 'xlsm', 'xls', 'csv'];
const DOC_FORMATS = ['pdf', 'pptx', 'ppt', 'docx'];

/** Pull the downloadable releases out of a SAPS listing page. */
function parseReleases(html: string): Release[] {
  const out: Release[] = [];
  const re = new RegExp(
    `href="([^"]+\\.(${[...DATA_FORMATS, ...DOC_FORMATS].join('|')}))"[^>]*>([\\s\\S]*?)</a>`,
    'gi',
  );
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const href = m[1];
    const format = m[2].toLowerCase();
    const text = m[3].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    // The filename is more reliable than the link text, which is often blank.
    const subject = `${href} ${text}`;
    const year = subject.match(/(20\d{2})[-_ ]?(20\d{2})?/)?.[0]?.replace(/_/g, '-') ?? '';
    // Notices are tested first on purpose. A letter announcing that the first
    // quarter has been postponed contains the words "first quarter", and
    // classifying by data patterns first ranks that announcement above the
    // actual data — so the dashboard would report a postponement notice as the
    // newest crime release.
    const kind: Release['kind'] =
      /postpone|omission|letter|statement|media/i.test(subject) ? 'notice'
        : /calendar/i.test(subject) ? 'calendar'
        : /annual/i.test(subject) ? 'annual'
        : /quarter|_-_\dst|_-_\dnd|_-_\drd|_-_\dth/i.test(subject) ? 'quarter'
        : 'other';
    out.push({
      title: text || href.split('/').pop() || href,
      url: href.startsWith('http') ? href : `https://${SAPS_HOST}/services/${href.replace(/^\//, '')}`,
      year,
      kind,
      format,
    });
  }
  return out;
}

/** Sort key: newest financial year first, machine-readable data ahead of slides. */
function recency(r: Release): number {
  const years = r.year.match(/20\d{2}/g)?.map(Number) ?? [];
  const y = years.length ? Math.max(...years) : 0;
  return y * 10 + (DATA_FORMATS.includes(r.format) ? 1 : 0);
}

export default async function handler(req: unknown, res: any) {
  const checkedAt = new Date().toISOString();
  try {
    const [current, older] = await Promise.allSettled([get(SAPS_PATH), get(OLDER_PATH)]);
    const html = [current, older]
      .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled')
      .map((r) => r.value)
      .join('\n');

    if (!html) throw new Error('no SAPS page could be read');

    const seen = new Set<string>();
    const releases = parseReleases(html)
      .filter((r) => (seen.has(r.url) ? false : (seen.add(r.url), true)))
      .sort((a, b) => recency(b) - recency(a));

    const data = releases.filter((r) => r.kind === 'quarter' || r.kind === 'annual');
    const notices = releases.filter((r) => r.kind === 'notice' || r.kind === 'calendar');

    // A short cache keeps the dashboard responsive and keeps us off a
    // government web server; stale-while-revalidate means a visitor never
    // waits on the upstream fetch.
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=3600');
    res.status(200).json({
      checkedAt,
      reachable: true,
      latest: data[0]?.title ?? null,
      latestUrl: data[0]?.url ?? null,
      releaseCount: data.length,
      releases: data.slice(0, 24),
      notices: notices.slice(0, 6),
    });
  } catch (error) {
    // Reachability is itself worth reporting: a government statistics site
    // being down is information, not an error to swallow. The dashboard keeps
    // showing its data and says the live check failed.
    res.setHeader('Cache-Control', 's-maxage=60');
    res.status(200).json({
      checkedAt,
      reachable: false,
      latest: null,
      releases: [],
      notices: [],
      note: error instanceof Error ? error.message : 'unknown error',
    });
  }
}
