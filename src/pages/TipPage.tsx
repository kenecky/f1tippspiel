import { useState } from 'react';
import { BackLink, Card, DriverTag, LockBadge, PlayerDot, SaveState } from '../components/ui';
import { DriverSelect } from '../components/SheetSelect';
import { DriverPicker } from '../components/DriverPicker';
import { BonusEditor } from '../components/BonusEditor';
import { useAllDrivers, useDrivers, usePlayers, useTeams, useRace, useResult, useTipsForSession } from '../data/queries';
import { repo } from '../data/localRepository';
import { driverOfTheDayLockTime, isDriverOfTheDayWindow, isSessionLocked, TipLockedError } from '../domain/lock';
import { RULES, SESSION_LABEL } from '../domain/rules';
import { maxPoints, scoreTip } from '../domain/scoring';
import type { BonusAnswers, Driver, Team, Tip } from '../domain/types';
import { fmtDateTime, flag } from '../format';
import { useMe, useNow } from '../hooks';
import { href } from '../router';

export const raceIdOf = (sessionId: string) => sessionId.split('-').slice(0, 2).join('-');

export function TipPage({ sessionId }: { sessionId?: string }) {
  const race = useRace(sessionId ? raceIdOf(sessionId) : undefined);
  const session = race?.sessions.find((s) => s.id === sessionId);
  const drivers = useDrivers(race?.season);
  const allDrivers = useAllDrivers(race?.season);
  const teams = useTeams(race?.season);
  const tips = useTipsForSession(sessionId);
  const result = useResult(sessionId);
  const players = usePlayers();
  const { me } = useMe();
  const now = useNow(1000);

  if (!race || !session || !drivers || !allDrivers || !teams || !tips || !players || result === undefined) return <p className="muted">Lade…</p>;

  const locked = isSessionLocked(session, now);
  const dotdOpen = isDriverOfTheDayWindow(session, now);
  const depth = RULES.tipDepth[session.type];

  return (
    <div className="stack">
      <BackLink to={href('rennen', race.id)} label={race.name} />
      <div className="row">
        <h1>{SESSION_LABEL[session.type]}</h1>
        <LockBadge locked={locked} until={session.start} />
      </div>
      <p className="muted">{flag(race.country)} {race.name} · {fmtDateTime(session.start)}</p>
      <p className="small muted">
        Top {depth} tippen · 1 Pkt pro Fahrer in den Top {depth}, +2 bei exakter Position
        {session.type === 'race' && ' · Rennen zählt doppelt'} · max. {maxPoints(session.type)} Pkt
      </p>

      {locked ? (
        <>
          {dotdOpen && (
            <DriverOfTheDayCard
              key={`${session.id}:${me}`}
              sessionId={session.id}
              lockAt={driverOfTheDayLockTime(session).toISOString()}
              drivers={drivers}
              teams={teams}
              initial={tips.find((t) => t.playerId === me)?.bonus?.driverOfTheDay}
            />
          )}
          <LockedView depth={depth} drivers={allDrivers} tips={tips} players={players} result={result ?? undefined} type={session.type} sessionId={session.id} dotdOpen={dotdOpen} />
        </>
      ) : (
        <>
          <TipEditor
            key={`${session.id}:${me}`}
            sessionId={session.id}
            depth={depth}
            drivers={drivers}
            teams={teams}
            existing={tips.find((t) => t.playerId === me)}
            withBonus={session.type === 'race'}
          />
          <Card>
            <h3>Gegner</h3>
            {players.filter((p) => p.id !== me).map((p) => (
              <p key={p.id}>
                <PlayerDot id={p.id} /> {p.name}: {tips.some((t) => t.playerId === p.id && t.order.some(Boolean)) ? '✅ hat getippt' : '⏳ noch kein Tipp'}
                <br /><small className="muted">Tipps werden erst nach Sessionbeginn sichtbar.</small>
              </p>
            ))}
          </Card>
        </>
      )}
    </div>
  );
}

function TipEditor({ sessionId, depth, drivers, teams, existing, withBonus }: {
  sessionId: string; depth: number; drivers: Driver[]; teams: Team[]; existing?: Tip; withBonus: boolean;
}) {
  const { me } = useMe();
  const [order, setOrder] = useState<string[]>(existing?.order ?? []);
  const [bonus, setBonus] = useState<BonusAnswers>(existing?.bonus ?? {});
  const [state, setState] = useState<'idle' | 'saved' | 'error'>(existing ? 'saved' : 'idle');
  const [error, setError] = useState('');

  // Jede Änderung wird sofort gespeichert (später: an den Server)
  const persist = async (nextOrder: string[], nextBonus: BonusAnswers) => {
    try {
      await repo.saveTip({ sessionId, playerId: me, order: nextOrder, bonus: withBonus ? nextBonus : undefined });
      setState('saved');
      setError('');
    } catch (e) {
      setState('error');
      setError(e instanceof TipLockedError ? e.message : `Fehler: ${(e as Error).message}`);
    }
  };

  const filled = order.filter(Boolean).length;

  return (
    <>
      <Card>
        <div className="row">
          <h3>Dein Tipp <span className="muted small">{filled}/{depth}</span></h3>
          <SaveState state={state} />
        </div>
        {error && <p className="error small">{error}</p>}
        <DriverPicker
          drivers={drivers}
          teams={teams}
          depth={depth}
          value={order}
          onChange={(o) => {
            setOrder(o);
            persist(o, bonus);
          }}
        />
      </Card>
      {withBonus && (
        <Card>
          <h3>Bonusfragen</h3>
          <BonusEditor
            showDotdHint
            drivers={drivers}
            teams={teams}
            value={bonus}
            onChange={(b) => {
              setBonus(b);
              persist(order, b);
            }}
          />
        </Card>
      )}
    </>
  );
}

/** Nach Rennstart: Driver of the Day noch 30 Min. tippbar */
function DriverOfTheDayCard({ sessionId, lockAt, drivers, teams, initial }: {
  sessionId: string; lockAt: string; drivers: Driver[]; teams: Team[]; initial?: string;
}) {
  const { me } = useMe();
  const [value, setValue] = useState(initial);
  const [state, setState] = useState<'idle' | 'saved' | 'error'>(initial ? 'saved' : 'idle');
  const [error, setError] = useState('');

  return (
    <Card className="dotd">
      <div className="row">
        <h3>Driver of the Day <small className="muted">+{RULES.bonusPoints.driverOfTheDay}</small></h3>
        <LockBadge locked={false} until={lockAt} />
      </div>
      <p className="small muted">Das Rennen läuft – den Driver of the Day kannst du noch bis 30 Min. nach dem Start tippen.</p>
      <DriverSelect
        title="Driver of the Day"
        drivers={drivers}
        teams={teams}
        value={value}
        onChange={async (v) => {
          setValue(v);
          try {
            await repo.saveDriverOfTheDay(sessionId, me, v);
            setState('saved');
            setError('');
          } catch (e) {
            setState('error');
            setError((e as Error).message);
          }
        }}
      />
      <div className="row">
        {error ? <p className="error small">{error}</p> : <span />}
        <SaveState state={state} />
      </div>
    </Card>
  );
}

function LockedView({ depth, drivers, tips, players, result, type, sessionId, dotdOpen }: {
  depth: number; drivers: Driver[]; tips: Tip[]; players: { id: 'p1' | 'p2'; name: string }[];
  result?: import('../domain/types').SessionResult; type: import('../domain/types').SessionType; sessionId: string;
  dotdOpen: boolean;
}) {
  const { me } = useMe();
  const byId = new Map(drivers.map((d) => [d.id, d]));
  const actualTop = result?.order.slice(0, depth) ?? [];
  const tipOf = (p: string) => tips.find((t) => t.playerId === p);
  const name = (id?: string) => (id ? byId.get(id)?.code ?? id : '—');

  return (
    <>
      <Card>
        {!result && (
          <p className="muted">
            Noch kein Ergebnis. <a href={href('ergebnis', sessionId)}>Ergebnis laden/eintragen ›</a>
          </p>
        )}
        <table className="compare positions">
          <thead>
            <tr>
              <th>Pos</th>
              {result && <th>Ergebnis</th>}
              {players.map((p) => <th key={p.id}><PlayerDot id={p.id} /> {p.name}</th>)}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: depth }, (_, i) => (
              <tr key={i}>
                <td className="pos">P{i + 1}</td>
                {result && <td><DriverTag compact driver={byId.get(actualTop[i])} fallbackId={actualTop[i]} /></td>}
                {players.map((p) => {
                  const id = tipOf(p.id)?.order[i];
                  const cls = !result || !id ? '' : actualTop[i] === id ? 'hit-exact' : actualTop.includes(id) ? 'hit' : 'miss';
                  return <td key={p.id} className={cls}>{id ? <DriverTag compact driver={byId.get(id)} fallbackId={id} /> : <span className="muted">—</span>}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {result && <p className="small muted legend"><span className="hit-exact">exakt +3</span> <span className="hit">in Top {depth} +1</span></p>}
      </Card>

      {type === 'race' && (
        <Card>
          <h3>Bonusfragen</h3>
          <table className="compare">
            <thead>
              <tr><th></th>{result && <th>Ergebnis</th>}{players.map((p) => <th key={p.id}>{p.name}</th>)}</tr>
            </thead>
            <tbody>
              {([
                ['Schnellste Runde', (b?: BonusAnswers) => name(b?.fastestLap), 'fastestLap'],
                ['Driver of the Day', (b?: BonusAnswers) => name(b?.driverOfTheDay), 'driverOfTheDay'],
                ['SC / VSC', (b?: BonusAnswers) => (b?.safetyCar === undefined ? '—' : b.safetyCar ? 'Ja' : 'Nein'), 'safetyCar'],
              ] as const).map(([label, show, key]) => (
                <tr key={key}>
                  <td>{label}</td>
                  {result && <td>{show(result.bonus)}</td>}
                  {players.map((p) => {
                    const hit = result && scoreTip(type, tipOf(p.id), result).bonusHits[key];
                    if (key === 'driverOfTheDay' && dotdOpen && p.id !== me) {
                      return <td key={p.id} className="muted">🔒 verdeckt</td>;
                    }
                    return <td key={p.id} className={result ? (hit ? 'hit-exact' : 'miss') : ''}>{show(tipOf(p.id)?.bonus)}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {result && (
        <Card className="scoreboard">
          {players.map((p) => {
            const s = scoreTip(type, tipOf(p.id), result);
            return (
              <div key={p.id} className={`score ${p.id}`}>
                <span className="name"><PlayerDot id={p.id} /> {p.name}</span>
                <span className="points">{s.total}</span>
                <small className="muted">
                  {s.driversInTop}× Top {depth}, {s.exactPositions}× exakt
                  {s.multiplier > 1 && ` · x${s.multiplier}`}{s.bonusPoints > 0 && ` · +${s.bonusPoints} Bonus`}
                </small>
              </div>
            );
          })}
        </Card>
      )}
    </>
  );
}
