import { useEffect, useState } from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { Building2, FileText, Layers, Map, ScrollText, Sigma } from 'lucide-react';
import { useReleaseFeed } from './state/useReleaseFeed';
import { LiveBar } from './components/LiveBar';
import National from './pages/National';
import Categories from './pages/Categories';
import CategoryDetail from './pages/CategoryDetail';
import { Provinces, ProvinceDetail } from './pages/Provinces';
import Stations from './pages/Stations';
import Method from './pages/Method';

const NAV = [
  { to: '/', label: 'National', icon: Map, end: true },
  { to: '/categories', label: 'Categories', icon: Layers },
  { to: '/provinces', label: 'Provinces', icon: Building2 },
  { to: '/stations', label: 'Stations', icon: ScrollText },
  { to: '/method', label: 'Method & sources', icon: Sigma },
];

export default function App() {
  const feed = useReleaseFeed();
  // A ticking clock so "checked 40s ago" stays true without re-fetching.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-white/[0.07] bg-ink-950/85 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-6 gap-y-3 px-5 py-3">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-md border border-tab-400/30 bg-tab-400/10">
              <FileText className="h-4 w-4 text-tab-300" aria-hidden="true" />
            </span>
            <div>
              <p className="font-semibold leading-none tracking-tight text-white">Docket</p>
              <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.2em] text-bone-500">
                South African crime statistics
              </p>
            </div>
          </div>
          <nav className="flex flex-wrap items-center gap-1" aria-label="Sections">
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end}
                className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}>
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] space-y-6 px-5 py-7">
        <LiveBar feed={feed} now={now} />
        <Routes>
          <Route path="/" element={<National />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/categories/:category" element={<CategoryDetail />} />
          <Route path="/provinces" element={<Provinces />} />
          <Route path="/provinces/:slug" element={<ProvinceDetail />} />
          <Route path="/stations" element={<Stations />} />
          <Route path="/method" element={<Method feed={feed} now={now} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <footer className="mx-auto max-w-[1400px] px-5 pb-10 pt-4">
        <p className="border-t border-white/[0.06] pt-5 text-[11px] leading-relaxed text-bone-500">
          Crime figures are published by the South African Police Service and reproduced here
          unmodified; population is the Statistics South Africa mid-2026 estimate. SAPS
          publishes quarterly — there is no real-time crime feed for South Africa, and nothing
          on this site is estimated, projected or simulated. The live indicator reports the
          state of the SAPS publications page, not the arrival of new crime.
        </p>
      </footer>
    </div>
  );
}
