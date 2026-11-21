import { Card, Countdown, PlayerDot } from '../components/ui';
import { useNow, useMe } from '../hooks';
import { useAllTips, usePlayers, useRaces, useSeason, useStandings } from '../data/queries';
import { SESSION_LABEL } from '../domain/rules';
import { fmtDateTime, flag } from '../format';
import { href } from '../router';

export function HomePage() {
  const season = useSeason();
  const races = useRaces(season);
  const tips = useAllTips();
  const players = usePlayers();
  const standings = useStandings(season);
  const { me } = useMe();
  const now = useNow(30_000);

  if (!races || !players) return <p className="muted">Lade…</p>;

  const upcoming = races
    .flatMap((race) => race.sessions.map((session) => ({ race, session })))
    .filter(({ session }) => new Date(session.start) > now)
    .sort((a, b) => a.session.start.localeCompare(b.session.start));
  const next = upcoming[0];
  const tipped = (sessionId: string, p: string) => tips?.some((t) => t.id === `${sessionId}:${p}` && t.order.some(Boolean));
  const name = (id: string) => players.find((p) => p.id === id)?.name ?? id;
  const missing = upcoming.filter(({ session }) => !tipped(session.id, me)).slice(0, 3);

  return (
    <div className="stack">
      {standings && (
        <Card className="scoreboard">
          {(['p1', 'p2'] as const).map((p) => (
            <div key={p} className={`score ${p} ${me === p ? 'me' : ''}`}>
              <span className="name"><PlayerDot id={p} /> {name(p)}</span>
              <span className="points">{standings.totals[p]}</span>
            </div>
          ))}
          <a className="link" href={href('wertung')}>Zur Wertung ›</a>
        </Card>
      )}

      {next ? (
        <Card className="next">
          <p className="eyebrow">Nächste Session</p>
          <h2>{flag(next.race.country)} {next.race.name}</h2>
          <p className="big">{SESSION_LABEL[next.session.type]}</p>
          <p className="muted">{fmtDateTime(next.session.start)}</p>
          <p className="lights-in">Tippschluss in <Countdown to={next.session.start} /></p>
          <div className="tip-status">
            {(['p1', 'p2'] as const).map((p) => (
              <span key={p}><PlayerDot id={p} /> {name(p)}: {tipped(next.session.id, p) ? '✅ getippt' : '⏳ offen'}</span>
            ))}
          </div>
          <a className="btn primary" href={href('tipp', next.session.id)}>
            {tipped(next.session.id, me) ? 'Tipp ändern' : 'Jetzt tippen'}
          </a>
        </Card>
      ) : (
        <Card>
          <h2>Keine offene Session</h2>
          <p className="muted">
            Kein kommender Termin in Saison {season}. Unter <a href={href('mehr')}>Mehr</a> kannst du die Saison wechseln,
            den Kalender neu laden oder ein Test-Wochenende anlegen.
          </p>
        </Card>
      )}

      {missing.length > 1 && (
        <Card>
          <h3>Noch nicht getippt</h3>
          <ul className="list">
            {missing.map(({ race, session }) => (
              <li key={session.id}>
                <a href={href('tipp', session.id)}>
                  <span>{flag(race.country)} {race.name} · {SESSION_LABEL[session.type]}</span>
                  <span className="muted">{fmtDateTime(session.start)}</span>
                </a>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
