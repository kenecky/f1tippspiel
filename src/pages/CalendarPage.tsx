import { Card } from '../components/ui';
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

  return (
    <div className="stack">
      <h1>Tipps {season}</h1>
      {synced && <p className="muted small">Stand: {fmtDateTime(synced)}</p>}
      {races.length === 0 && (
        <Card><p>Noch kein Kalender geladen. Unter <a href={href('mehr')}>Mehr</a> laden oder Test-Wochenende anlegen.</p></Card>
      )}
      <ul className="race-list">
        {races.map((r) => {
          const past = new Date(raceStart(r)) < now;
          const sprint = r.sessions.some((s) => s.type === 'sprint');
          return (
            <li key={r.id} className={`${past ? 'past' : ''} ${r.id === nextId ? 'next' : ''}`}>
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
      {season && <SeasonTipsSection season={season} />}
    </div>
  );
}
