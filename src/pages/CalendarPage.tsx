import { Card } from '../components/ui';
import { Collapsible } from '../components/Collapsible';
import { ComicIcon, COLORS } from '../components/ComicIcon';
import type { Race } from '../domain/types';
import { useCalendarSyncedAt, useRaces, useSeason } from '../data/queries';
import { fmtDate, fmtDateTime, flag } from '../format';
import { useNow } from '../hooks';
import { href } from '../router';
import { SeasonTipsSection } from './SeasonTipsPage';

export function CalendarPage() {
  const season = useSeason();
  const races = useRaces(season);
  const synced = useCalendarSyncedAt(season);
  const now = useNow(60_000);
  if (!races) return <p className="muted">Lade…</p>;

  const raceStart = (r: (typeof races)[number]) => r.sessions.find((s) => s.type === 'race')?.start ?? r.sessions.at(-1)?.start ?? '';
  const nextId = races.find((r) => new Date(raceStart(r)) > now)?.id;
  // Abgeschlossen = Rennstart liegt mehr als 3 Std. zurück (laufendes Wochenende bleibt oben)
  const isDone = (r: Race) => new Date(raceStart(r)).getTime() < now.getTime() - 3 * 3600_000;
  const done = races.filter(isDone);
  const open = races.filter((r) => !isDone(r));

  return (
    <div className="stack">
      <h1>Tipps {season}</h1>
      {synced && <p className="muted small">Stand: {fmtDateTime(synced)}</p>}
      {races.length === 0 && (
        <Card><p>Noch kein Kalender geladen. Unter <a href={href('mehr')}>Mehr</a> laden oder Test-Wochenende anlegen.</p></Card>
      )}
      {done.length > 0 && (
        <Collapsible title={<><ComicIcon name="flag_checkered" color={COLORS.white} size={22} /> Abgeschlossene Rennen</>} meta={done.length}>
          <RaceList races={done} raceStart={raceStart} className="done" />
        </Collapsible>
      )}
      <RaceList races={open} raceStart={raceStart} nextId={nextId} />
      {season && (
        <Collapsible title={<><ComicIcon name="trophy" color={COLORS.yellow} size={22} /> Saisontipps</>} className="season">
          <SeasonTipsSection season={season} />
        </Collapsible>
      )}
    </div>
  );
}

function RaceList({ races, raceStart, nextId, className = '' }: {
  races: Race[]; raceStart: (r: Race) => string; nextId?: string; className?: string;
}) {
  return (
    <ul className={`race-list ${className}`}>
      {races.map((r) => {
        const sprint = r.sessions.some((s) => s.type === 'sprint');
        return (
          <li key={r.id} className={r.id === nextId ? 'next' : ''}>
            <a href={href('rennen', r.id)}>
              <span className="round">{r.round >= 900 ? 'TEST' : `R${r.round}`}</span>
              <span className="flag">{flag(r.country)}</span>
              <span className="title">
                <b>{r.name}</b>
                <small className="muted">{r.locality} · {raceStart(r) && fmtDate(raceStart(r))}</small>
              </span>
              {sprint && <span className="pill sprint">Sprint</span>}
            </a>
          </li>
        );
      })}
    </ul>
  );
}
