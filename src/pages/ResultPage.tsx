import { useState } from 'react';
import { SessionIcon } from '../components/ComicIcon';
import { BackLink, Card, SaveState } from '../components/ui';
import { DriverPicker } from '../components/DriverPicker';
import { BonusEditor } from '../components/BonusEditor';
import { useAllDrivers, useRace, useResult, useTeams } from '../data/queries';
import { repo } from '../data/localRepository';
import { syncResult } from '../data/sync';
import { db } from '../data/db';
import { isSessionLocked } from '../domain/lock';
import { RULES, SESSION_LABEL } from '../domain/rules';
import type { BonusAnswers, Race, Session, SessionResult, Driver, Team } from '../domain/types';
import { fmtDateTime } from '../format';
import { useNow } from '../hooks';
import { href } from '../router';
import { raceIdOf } from './TipPage';

export function ResultPage({ sessionId }: { sessionId?: string }) {
  const race = useRace(sessionId ? raceIdOf(sessionId) : undefined);
  const session = race?.sessions.find((s) => s.id === sessionId);
  const drivers = useAllDrivers(race?.season);
  const teams = useTeams(race?.season);
  const result = useResult(sessionId);
  const now = useNow(5000);

  if (!race || !session || !drivers || !teams || result === undefined) return <p className="muted">Lade…</p>;
  const started = isSessionLocked(session, now);

  return (
    <div className="stack">
      <BackLink to={href('tipp', session.id)} label="Tipps" />
      <h1 className="with-icon"><SessionIcon type={session.type} size={28} /> Ergebnis · {SESSION_LABEL[session.type]}</h1>
      <p className="muted">{race.name} · {fmtDateTime(session.start)}</p>
      {!started ? (
        <Card><p>Die Session hat noch nicht begonnen.</p></Card>
      ) : (
        <ResultEditor race={race} session={session} drivers={drivers} teams={teams} initial={result} />
      )}
    </div>
  );
}

function ResultEditor({ race, session, drivers, teams, initial }: {
  race: Race; session: Session; drivers: Driver[]; teams: Team[]; initial: SessionResult | null;
}) {
  const depth = RULES.tipDepth[session.type];
  const [order, setOrder] = useState<string[]>(initial?.order ?? []);
  const [bonus, setBonus] = useState<BonusAnswers>(initial?.bonus ?? {});
  const [source, setSource] = useState(initial?.source);
  const [state, setState] = useState<'idle' | 'saved' | 'error'>(initial ? 'saved' : 'idle');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const persist = async (o: string[], b: BonusAnswers) => {
    await repo.saveResult({
      sessionId: session.id,
      order: o,
      bonus: session.type === 'race' ? b : undefined,
      source: 'manual',
    });
    setSource('manual');
    setState('saved');
  };

  const load = async () => {
    setBusy(true);
    const r = await syncResult(race, session);
    setMsg({ ok: r.ok, text: r.message });
    const fresh = await db.results.get(session.id);
    if (fresh) {
      setOrder(fresh.order);
      setBonus(fresh.bonus ?? {});
      setSource(fresh.source);
      setState('saved');
    }
    setBusy(false);
  };

  return (
    <>
      <Card>
        <p className="small muted">
          {source ? `Quelle: ${source === 'api' ? 'F1-API' : 'manuell'}` : 'Noch kein Ergebnis gespeichert.'}
          {session.type === 'sprintQuali' && ' · Sprint-Qualifying liefert die API nicht – bitte manuell eintragen.'}
          {session.type === 'race' && ' · Driver of the Day und SC/VSC immer manuell ergänzen.'}
        </p>
        {session.type !== 'sprintQuali' && race.round < 900 && (
          <button className="btn" onClick={load} disabled={busy}>{busy ? 'Lade…' : '⬇︎ Von F1-API laden'}</button>
        )}
        {msg && <p className={`small ${msg.ok ? 'ok' : 'error'}`}>{msg.text}</p>}
      </Card>
      <Card>
        <div className="row">
          <h3>Top {depth}</h3>
          <SaveState state={state} />
        </div>
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
      {session.type === 'race' && (
        <Card>
          <h3>Bonus</h3>
          <BonusEditor
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
