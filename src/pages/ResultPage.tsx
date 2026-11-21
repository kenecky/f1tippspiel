import { useEffect, useState } from 'react';
import { BackLink, Card } from '../components/ui';
import { DriverPicker } from '../components/DriverPicker';
import { BonusEditor } from '../components/BonusEditor';
import { useDrivers, useRace, useResult } from '../data/queries';
import { repo } from '../data/localRepository';
import { syncResult } from '../data/sync';
import { isSessionLocked } from '../domain/lock';
import { RULES, SESSION_LABEL } from '../domain/rules';
import type { BonusAnswers } from '../domain/types';
import { fmtDateTime } from '../format';
import { useNow } from '../hooks';
import { href } from '../router';
import { raceIdOf } from './TipPage';

export function ResultPage({ sessionId }: { sessionId?: string }) {
  const race = useRace(sessionId ? raceIdOf(sessionId) : undefined);
  const session = race?.sessions.find((s) => s.id === sessionId);
  const drivers = useDrivers(race?.season);
  const result = useResult(sessionId);
  const now = useNow(5000);

  const [order, setOrder] = useState<string[]>([]);
  const [bonus, setBonus] = useState<BonusAnswers>({});
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (result) {
      setOrder(result.order);
      setBonus(result.bonus ?? {});
    }
  }, [result]);

  if (!race || !session || !drivers) return <p className="muted">Lade…</p>;
  const depth = RULES.tipDepth[session.type];
  const started = isSessionLocked(session, now);

  const load = async () => {
    setBusy(true);
    setMsg(await syncResult(race, session).then((r) => ({ ok: r.ok, text: r.message })));
    setBusy(false);
  };

  const save = async () => {
    await repo.saveResult({
      sessionId: session.id,
      order: order.slice(0, depth),
      bonus: session.type === 'race' ? bonus : undefined,
      source: 'manual',
    });
    setMsg({ ok: true, text: 'Ergebnis gespeichert – Punkte sind aktualisiert.' });
  };

  return (
    <div className="stack">
      <BackLink to={href('tipp', session.id)} label="Tipps" />
      <h1>Ergebnis · {SESSION_LABEL[session.type]}</h1>
      <p className="muted">{race.name} · {fmtDateTime(session.start)}</p>

      {!started ? (
        <Card><p>Die Session hat noch nicht begonnen.</p></Card>
      ) : (
        <>
          <Card>
            <p className="small muted">
              {result ? `Quelle: ${result.source === 'api' ? 'F1-API' : 'manuell'}` : 'Noch kein Ergebnis gespeichert.'}
              {session.type === 'sprintQuali' && ' · Sprint-Qualifying liefert die API nicht – bitte manuell eintragen.'}
              {session.type === 'race' && ' · Driver of the Day und SC/VSC immer manuell ergänzen.'}
            </p>
            {session.type !== 'sprintQuali' && race.round < 900 && (
              <button className="btn" onClick={load} disabled={busy}>{busy ? 'Lade…' : '⬇︎ Von F1-API laden'}</button>
            )}
          </Card>
          <Card>
            <h3>Top {depth}</h3>
            <DriverPicker drivers={drivers} depth={depth} value={order} onChange={setOrder} />
          </Card>
          {session.type === 'race' && (
            <Card>
              <h3>Bonus</h3>
              <BonusEditor drivers={drivers} value={bonus} onChange={setBonus} />
            </Card>
          )}
          <div className="sticky-save">
            {msg && <p className={msg.ok ? 'ok' : 'error'}>{msg.text}</p>}
            <button className="btn primary block" onClick={save} disabled={!order.some(Boolean)}>Ergebnis speichern</button>
          </div>
        </>
      )}
    </div>
  );
}
