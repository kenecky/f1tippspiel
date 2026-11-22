import { useEffect, useRef } from 'react';
import { ComicIcon, COLORS } from './components/ComicIcon';
import { SWIPE_ORDER, useSwipeNav } from './components/useSwipeNav';
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
  const topbarRef = useRef<HTMLElement>(null);

  // Höhe der Kopfzeile für sticky Elemente bereitstellen
  useEffect(() => {
    const el = topbarRef.current;
    if (!el) return;
    const set = () => document.documentElement.style.setProperty('--topbar-h', `${el.offsetHeight}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
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
  const mainRef = useRef<HTMLElement>(null);
  const isTopLevel = SWIPE_ORDER.includes(page ?? '') && params.length === 0;
  useSwipeNav(mainRef, page ?? '', isTopLevel);
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
    { key: '', label: 'Start', icon: <ComicIcon name="house" color={COLORS.yellow} size={28} /> },
    { key: 'kalender', label: 'Tipps', icon: <ComicIcon name="flag_checkered" color={COLORS.white} size={28} /> },
    { key: 'wertung', label: 'Wertung', icon: <ComicIcon name="trophy" color={COLORS.yellow} size={28} /> },
    { key: 'funk', label: 'Funk', icon: <ComicIcon name="headset" color={COLORS.teal} size={28} />, badge: unread },
    { key: 'mehr', label: 'Mehr', icon: <ComicIcon name="gear_six" color={COLORS.grey} size={28} /> },
  ];
  const activeNav = ['rennen', 'tipp', 'ergebnis'].includes(page ?? '') ? 'kalender' : page ?? '';

  return (
    <ActivePlayerContext.Provider value={{ me }}>
      <header className="topbar" ref={topbarRef}>
        <a href={href()} className="brand">
          <img src={logo} alt="" width={32} height={32} />
          <span>UNDERCUT</span>
        </a>
        <a href={href('mehr')} className={`chip ${me} active`}>{players?.find((p) => p.id === me)?.name ?? ''}</a>
        {!online && <div className="offline-banner">Offline – gespeicherte Daten werden angezeigt</div>}
      </header>
      <main ref={mainRef} className={`content ${page === 'funk' ? 'radio-mode' : ''}`}>{content}</main>
      <nav className="bottomnav">
        {nav.map((n) => (
          <a key={n.key} href={href(...(n.key ? [n.key] : []))} className={activeNav === n.key ? 'active' : ''}>
            <span className="icon">{n.icon}</span>
            <span>{n.label}</span>
            {!!n.badge && <span className="badge">{n.badge}</span>}
          </a>
        ))}
      </nav>
    </ActivePlayerContext.Provider>
  );
}
