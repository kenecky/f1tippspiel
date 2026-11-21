import { Card, PlayerDot } from '../components/ui';
import { usePlayers, useSeason, useStandings } from '../data/queries';
import { SESSION_SHORT } from '../domain/rules';
import { flag } from '../format';
import { href } from '../router';

export function StandingsPage() {
  const season = useSeason();
  const standings = useStandings(season);
  const players = usePlayers();
  if (!standings || !players) return <p className="muted">Lade…</p>;

  const name = (id: string) => players.find((p) => p.id === id)?.name ?? id;
  const { totals } = standings;
  const leader = totals.p1 === totals.p2 ? null : totals.p1 > totals.p2 ? 'p1' : 'p2';

  // Nach Rennen gruppieren, nur Wochenenden mit Ergebnis
  const byRace = new Map<string, typeof standings.sessions>();
  for (const s of standings.sessions) {
    if (!s.result) continue;
    byRace.set(s.race.id, [...(byRace.get(s.race.id) ?? []), s]);
  }

  return (
    <div className="stack">
      <h1>Wertung {season}</h1>
      <Card className="scoreboard">
        {(['p1', 'p2'] as const).map((p) => (
          <div key={p} className={`score ${p} ${leader === p ? 'leader' : ''}`}>
            <span className="name"><PlayerDot id={p} /> {name(p)} {leader === p && '👑'}</span>
            <span className="points">{totals[p]}</span>
            <small className="muted">{standings.weekendWins[p]} Wochenendsiege{standings.seasonPoints[p] ? ` · +${standings.seasonPoints[p]} Saison` : ''}</small>
          </div>
        ))}
        {leader && <p className="small muted center">Abstand: {Math.abs(totals.p1 - totals.p2)} Punkte</p>}
      </Card>

      <h2>Wochenenden</h2>
      {byRace.size === 0 && <p className="muted">Noch keine Ergebnisse ausgewertet.</p>}
      {[...byRace.values()].reverse().map((sessions) => {
        const race = sessions[0].race;
        const sum = (p: 'p1' | 'p2') => sessions.reduce((a, s) => a + s.scores[p].total, 0);
        return (
          <Card key={race.id}>
            <a href={href('rennen', race.id)} className="row">
              <h3>{flag(race.country)} {race.name}</h3>
              <span className="muted">›</span>
            </a>
            <table className="compare">
              <thead>
                <tr><th></th>{sessions.map((s) => <th key={s.session.id}>{SESSION_SHORT[s.session.type]}</th>)}<th>Σ</th></tr>
              </thead>
              <tbody>
                {(['p1', 'p2'] as const).map((p) => (
                  <tr key={p}>
                    <td><PlayerDot id={p} /> {name(p)}</td>
                    {sessions.map((s) => <td key={s.session.id}>{s.scores[p].total}</td>)}
                    <td><b>{sum(p)}</b></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        );
      })}
    </div>
  );
}
