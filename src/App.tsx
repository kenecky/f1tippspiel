import { useEffect } from 'react';
import { ActivePlayerContext, ME, useOnline } from './hooks';
import { href, useRoute } from './router';
import { usePlayers, useSeason, useUnreadCount } from './data/queries';
import { syncSeason, ensureDrivers } from './data/sync';
import { db } from './data/db';
import { HomePage } from './pages/HomePage';
import { CalendarPage } from './pages/CalendarPage';
import { RacePage } from './pages/RacePage';
import { TipPage } from './pages/TipPage';
import { ResultPage } from './pages/ResultPage';
import { StandingsPage } from './pages/StandingsPage';
import { RadioPage } from './pages/RadioPage';
import { MorePage } from './pages/MorePage';

const logo = `${import.meta.env.BASE_URL}favicon.svg`;

/** Erhöhen, wenn gespeicherte Stammdaten neu geladen werden müssen */
const DATA_VERSION = 3;

export function App() {
  const me = ME;
  const route = useRoute();
  const season = useSeason();
  const players = usePlayers();
  const online = useOnline();
  const unread = useUnreadCount(me);

  // Beim ersten Start (oder wenn noch kein Kalender da ist) automatisch laden
  useEffect(() => {
    if (!season) return;
    (async () => {
      const synced = await db.meta.get(`calendarSyncedAt:${season}`);
      const version = (await db.meta.get('dataVersion'))?.value as number | undefined;
      const stale =
        !synced || (version ?? 0) < DATA_VERSION || Date.now() - new Date(synced.value as string).getTime() > 12 * 3600_000;
      if (stale && navigator.onLine) {
        const res = await syncSeason(season);
        if (res.ok) await db.meta.put({ key: 'dataVersion', value: DATA_VERSION });
      }
      else await ensureDrivers(season);
    })();
  }, [season]);

  const [page, ...params] = route;
  let content;
  switch (page ?? '') {
    case '': content = <HomePage />; break;
    case 'kalender': content = <CalendarPage />; break;
    case 'rennen': content = <RacePage raceId={params[0]} />; break;
    case 'tipp': content = <TipPage sessionId={params[0]} />; break;
    case 'ergebnis': content = <ResultPage sessionId={params[0]} />; break;
    case 'wertung': content = <StandingsPage />; break;
    case 'funk': content = <RadioPage />; break;
    case 'mehr': content = <MorePage />; break;
    default: content = <HomePage />;
  }

  const nav = [
    { key: '', label: 'Start', icon: '🏠' },
    { key: 'kalender', label: 'Tipps', icon: '🏁' },
    { key: 'wertung', label: 'Wertung', icon: '🏆' },
    { key: 'funk', label: 'Funk', icon: '📻', badge: unread },
    { key: 'mehr', label: 'Mehr', icon: '⚙️' },
  ];
  const activeNav = ['rennen', 'tipp', 'ergebnis'].includes(page ?? '') ? 'kalender' : page ?? '';

  return (
    <ActivePlayerContext.Provider value={{ me }}>
      <header className="topbar">
        <a href={href()} className="brand">
          <img src={logo} alt="" width={32} height={32} />
          <span>LIGHTS OUT</span>
        </a>
        <a href={href('mehr')} className={`chip ${me} active`}>{players?.find((p) => p.id === me)?.name ?? ''}</a>
      </header>
      {!online && <div className="offline-banner">Offline – gespeicherte Daten werden angezeigt</div>}
      <main className="content">{content}</main>
      <nav className="bottomnav">
        {nav.map((n) => (
          <a key={n.key} href={href(...(n.key ? [n.key] : []))} className={activeNav === n.key ? 'active' : ''}>
            <span className="icon" aria-hidden>{n.icon}</span>
            <span>{n.label}</span>
            {!!n.badge && <span className="badge">{n.badge}</span>}
          </a>
        ))}
      </nav>
    </ActivePlayerContext.Provider>
  );
}
