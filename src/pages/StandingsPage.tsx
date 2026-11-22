import { Card, PlayerDot } from '../components/ui';
import { usePlayers, useSeason, useStandings } from '../data/queries';
import { SESSION_SHORT } from '../domain/rules';
import type { SessionType } from '../domain/types';

/** Einheitliche Spalten für alle Wochenenden */
const COLUMNS: SessionType[] = ['sprintQuali', 'sprint', 'quali', 'race'];
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

  const allOfRace = (raceId: string) => standings.sessions.filter((x) => x.race.id === raceId);

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
            <table className="compare weekend">
              <thead>
                <tr>
                  <th></th>
                  {COLUMNS.map((t) => <th key={t}>{SESSION_SHORT[t]}</th>)}
                  <th>Σ</th>
                </tr>
              </thead>
              <tbody>
                {(['p1', 'p2'] as const).map((p) => (
                  <tr key={p}>
                    <td className="name"><PlayerDot id={p} /> {name(p)}</td>
                    {COLUMNS.map((t) => {
                      const entry = allOfRace(race.id).find((x) => x.session.type === t);
                      // „–“ = Session gibt es an diesem Wochenende nicht, „…“ = noch kein Ergebnis
                      const cell = !entry ? '–' : !entry.result ? '…' : String(entry.scores[p].total);
                      return <td key={t} className={!entry || !entry.result ? 'muted' : ''}>{cell}</td>;
                    })}
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
