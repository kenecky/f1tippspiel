import { BackLink, Card, Countdown, LockBadge, PlayerDot } from '../components/ui';
import { useAllResults, useAllTips, usePlayers, useRace } from '../data/queries';
import { isSessionLocked } from '../domain/lock';
import { scoreTip } from '../domain/scoring';
import { RULES, SESSION_LABEL } from '../domain/rules';
import { fmtDateTime, flag } from '../format';
import { useNow } from '../hooks';
import { href } from '../router';

export function RacePage({ raceId }: { raceId?: string }) {
  const race = useRace(raceId);
  const tips = useAllTips();
  const results = useAllResults();
  const players = usePlayers();
  const now = useNow(1000);
  if (!race || !tips || !results || !players) return <p className="muted">Lade…</p>;

  return (
    <div className="stack">
      <BackLink to={href('kalender')} label="Kalender" />
      <h1>{flag(race.country)} {race.name}</h1>
      <p className="muted">{race.circuit}, {race.locality}</p>

      {race.sessions.map((s) => {
        const locked = isSessionLocked(s, now);
        const result = results.find((r) => r.sessionId === s.id);
        return (
          <Card key={s.id}>
            <div className="row">
              <h3>{SESSION_LABEL[s.type]} <small className="muted">Top {RULES.tipDepth[s.type]}{s.type === 'race' ? ' · x2' : ''}</small></h3>
              <LockBadge locked={locked} />
            </div>
            <p className="muted">{fmtDateTime(s.start)}{!locked && <> · noch <Countdown to={s.start} /></>}</p>
            <div className="tip-status">
              {players.map((p) => {
                const tip = tips.find((t) => t.id === `${s.id}:${p.id}`);
                const score = result ? scoreTip(s.type, tip, result) : undefined;
                return (
                  <span key={p.id}>
                    <PlayerDot id={p.id} /> {p.name}: {tip?.order.some(Boolean) ? '✅' : '—'}
                    {score && <b> {score.total} Pkt</b>}
                  </span>
                );
              })}
            </div>
            <div className="actions">
              <a className={`btn ${locked ? '' : 'primary'}`} href={href('tipp', s.id)}>{locked ? 'Tipps ansehen' : 'Tippen'}</a>
              {locked && <a className="btn" href={href('ergebnis', s.id)}>{result ? 'Ergebnis' : 'Ergebnis eintragen'}</a>}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
