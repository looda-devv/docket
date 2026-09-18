import { ExternalLink } from 'lucide-react';
import { META } from '../state/data';
import { NATIONAL_POPULATION, POPULATION_SOURCE } from '../data/population';
import { Panel } from '../components/ui';
import { LiveBar } from '../components/LiveBar';
import { formatMonth, formatNumber, formatYear } from '../lib/format';
import type { FeedState } from '../state/useReleaseFeed';

export default function Method({ feed, now }: { feed: FeedState & { refresh: () => void }; now: number }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-white">Method &amp; sources</h1>
        <p className="mt-1.5 max-w-3xl text-[13px] leading-relaxed text-bone-400">
          What this data is, where it comes from, what it cannot tell you, and what "live"
          honestly means for South African crime statistics.
        </p>
      </div>

      <LiveBar feed={feed} now={now} />

      <Panel title="How live this actually is" subtitle="The most important thing on this page">
        <div className="space-y-3 px-5 py-5 text-[12px] leading-relaxed text-bone-400">
          <p>
            <span className="text-bone-100">South Africa has no real-time crime feed.</span>{' '}
            No incident stream, no daily update, no public API. Some countries publish
            incident-level data within days; South Africa does not publish any.
          </p>
          <p>
            SAPS releases crime statistics <span className="text-bone-100">quarterly</span>,
            as spreadsheets and a press presentation, and each release lands weeks after the
            quarter it covers. The finest granularity in the data is monthly, and those months
            only become public when their quarter is released. A release can also simply not
            arrive — the first quarter of 2026/27 was postponed, which is why the newest
            figures here end at {formatMonth(META.months[META.months.length - 1])}.
          </p>
          <p>
            So this dashboard cannot update as crimes happen, and any site claiming to do so
            for South Africa is not using SAPS data. What it does instead is hold a live
            connection to the source: a server-side check polls the SAPS publications page
            every minute and reports what is currently published there. When SAPS posts a new
            release, the banner above says so within a minute of a visitor looking.
          </p>
          <p className="text-bone-500">
            That is the honest version of "updates as it happens": the dashboard updates when
            reality updates, which for South African crime data is four times a year.
          </p>
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Sources" subtitle="Everything here is published, and nothing is estimated">
          <div className="space-y-3 px-5 py-5 text-[12px] leading-relaxed text-bone-400">
            <p>
              <a href="https://www.saps.gov.za/services/crimestats.php" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-tab-200 underline underline-offset-4">
                SAPS crime statistics <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>{' '}
              — the annual release, which carries ten financial years per station, and the four
              quarterly releases, each carrying its own quarter's months across five years.
              Together they give {META.months.length} continuous months and {META.years.length}{' '}
              financial years.
            </p>
            <p>
              <a href={POPULATION_SOURCE.url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-tab-200 underline underline-offset-4">
                {POPULATION_SOURCE.title} <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>{' '}
              — provincial populations for rates per 100 000. The nine provinces sum to the
              published national total of {formatNumber(NATIONAL_POPULATION)}.
            </p>
            <p className="text-bone-500">
              Coverage: {META.categories.length} categories, {formatNumber(META.stationCount)}{' '}
              stations, {META.districts.length} districts, 9 provinces,{' '}
              {formatYear(META.years[0])}–{formatYear(META.years[META.years.length - 1])}.
            </p>
          </div>
        </Panel>

        <Panel title="Two traps in the source" subtitle="Both silently multiply the numbers">
          <div className="space-y-3 px-5 py-5 text-[12px] leading-relaxed text-bone-400">
            <p>
              <span className="text-bone-100">Stacked aggregation levels.</span> The
              spreadsheet puts station, district, province and national rows in one table.
              Summing it gives roughly four times the country's real crime. A "Comp level"
              column separates them, and as a check all four levels agree to the unit —
              murders came to 24 692 whichever level was used.
            </p>
            <p>
              <span className="text-bone-100">Categories that contain other categories.</span>{' '}
              Of the {META.categories.length} categories, several are subtotals: "17 Community
              reported serious crime" is the grand total, four groups sit beneath it, and
              sexual offences and TRIO crime are cross-cutting rollups of offences already
              counted. Adding every category together roughly doubles the total. Every
              parent was checked against the sum of its children before being used.
            </p>
            <p className="text-bone-500">
              Throughout, a missing value stays missing. SAPS added categories over the decade,
              and writing an unreported year as zero would draw a line claiming no crime
              occurred.
            </p>
          </div>
        </Panel>

        <Panel title="What recorded crime is not" subtitle="The limits worth knowing before quoting any of this">
          <div className="space-y-3 px-5 py-5 text-[12px] leading-relaxed text-bone-400">
            <p>
              These are <span className="text-bone-100">recorded</span> crimes — offences
              someone reported and a station captured on the system. The gap between crimes
              committed and crimes recorded is large and uneven: Statistics South Africa's
              victim surveys have long found that a substantial share of assaults and
              housebreakings are never reported, and reporting rates differ by offence, by
              place and by how much people trust the police.
            </p>
            <p>
              Murder is the exception, and it is why criminologists lean on it. A body is hard
              to not report, so the murder count is the closest thing to a reliable
              measurement in the set. A fall in reported assaults can mean less assault or
              less reporting; a fall in murders is much more likely to be real.
            </p>
            <p>
              Station-level figures carry a further caveat: SAPS precincts are not census
              areas and have no published resident population, so no per-capita rate can be
              computed for them. Where you see rates in this dashboard they are national or
              provincial, never by station.
            </p>
          </div>
        </Panel>

        <Panel title="Getting the data out" subtitle="Reproducible from the source">
          <div className="space-y-3 px-5 py-5 text-[12px] leading-relaxed text-bone-400">
            <p>
              The workbooks are read by a script in <code className="font-mono text-bone-300">scripts/</code>,
              which separates the aggregation levels, verifies each category subtotal against
              its parts, and emits the compact arrays this site loads.
            </p>
            <p>
              The live check runs server-side for two reasons: saps.gov.za sends no CORS
              header, so a browser cannot read it, and it serves an incomplete certificate
              chain. The missing Sectigo intermediate is bundled and added to the trust store
              rather than turning verification off.
            </p>
          </div>
        </Panel>
      </div>
    </div>
  );
}
