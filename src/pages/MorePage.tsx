import { useEffect, useState } from 'react';
import { Card } from '../components/ui';
import { useCalendarSyncedAt, usePlayers, useSeason } from '../data/queries';
import { repo } from '../data/localRepository';
import { db } from '../data/db';
import { demoRace } from '../data/fallback';
import { ensureDrivers, syncSeason } from '../data/sync';
import { RULES } from '../domain/rules';
import type { Player } from '../domain/types';
import { fmtDateTime } from '../format';
import { href } from '../router';

export function MorePage() {
  const season = useSeason();
  const players = usePlayers();
  const synced = useCalendarSyncedAt(season);
  const [names, setNames] = useState<Player[]>([]);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (players) setNames(players);
  }, [players]);

  if (!season || !players) return <p className="muted">Lade…</p>;

  const run = async (fn: () => Promise<string>) => {
    setBusy(true);
    try {
      setMsg(await fn());
    } catch (e) {
      setMsg(`Fehler: ${(e as Error).message}`);
    }
    setBusy(false);
  };

  return (
    <div className="stack">
      <h1>Mehr</h1>

      <Card>
        <a className="row" href={href('saison')}><h3>🏆 Saisontipps (Weltmeister)</h3><span>›</span></a>
      </Card>

      <Card>
        <h3>Spieler</h3>
        {names.map((p, i) => (
          <label key={p.id} className="field">
            <span>Spieler {i + 1}</span>
            <input value={p.name} maxLength={16} onChange={(e) => setNames(names.map((n) => (n.id === p.id ? { ...n, name: e.target.value } : n)))} />
          </label>
        ))}
        <button className="btn" onClick={() => run(async () => { await repo.savePlayers(names.map((n) => ({ ...n, name: n.name.trim() || n.id }))); return 'Namen gespeichert.'; })}>Namen speichern</button>
      </Card>

      <Card>
        <h3>Saison & Daten</h3>
        <label className="field">
          <span>Saison</span>
          <select value={season} onChange={(e) => run(async () => { const s = Number(e.target.value); await repo.setSeason(s); return (await syncSeason(s)).message; })}>
            {[season - 1, season, season + 1].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </label>
        <p className="small muted">Kalender-Stand: {synced ? fmtDateTime(synced) : 'noch nie geladen'}</p>
        <button className="btn" disabled={busy} onClick={() => run(async () => (await syncSeason(season)).message)}>🔄 Kalender & Fahrer neu laden</button>
      </Card>

      <Card>
        <h3>🧪 Testphase</h3>
        <p className="small muted">
          Legt ein Test-Wochenende an: Sprint-Quali in 2 Min, Sprint in 5 Min, Quali in 10 Min, Rennen in 30 Min.
          Ideal, um Tippen, Sperre und Auswertung auszuprobieren.
        </p>
        <button className="btn" disabled={busy} onClick={() => run(async () => {
          const existing = await db.races.where('season').equals(season).filter((r) => r.round >= 900).count();
          await ensureDrivers(season);
          await db.races.put(demoRace(season, 900 + existing));
          return 'Test-Wochenende angelegt – siehe Start/Kalender.';
        })}>Test-Wochenende anlegen</button>
        <button className="btn danger" disabled={busy} onClick={() => {
          if (confirm('Wirklich ALLE lokalen Daten löschen (Tipps, Ergebnisse, Nachrichten)?')) {
            run(async () => { await repo.resetAll(); location.reload(); return ''; });
          }
        }}>Alle Daten löschen</button>
      </Card>

      {msg && <p className="ok">{msg}</p>}

      <Card>
        <h3>Spielregeln</h3>
        <ul className="rules">
          <li>Qualifying & Sprint-Qualifying: Top {RULES.tipDepth.quali}</li>
          <li>Sprint: Top {RULES.tipDepth.sprint}</li>
          <li>Rennen: Top {RULES.tipDepth.race} – zählt doppelt</li>
          <li>{RULES.pointsDriverInTop} Pkt pro Fahrer, der in den Top N landet</li>
          <li>+{RULES.pointsExactPosition} Pkt, wenn die Position exakt stimmt</li>
          <li>Rennen-Bonus: Schnellste Runde, Driver of the Day, SC/VSC – je +{RULES.bonusPoints.fastestLap}</li>
          <li>Saison: Fahrer- und Team-Weltmeister – je +{RULES.seasonPoints.championDriver}</li>
          <li>Tippschluss = Sessionbeginn. Gegnertipps erst danach sichtbar.</li>
        </ul>
      </Card>
      <p className="small muted center">Lights Out v{__APP_VERSION__} · Testphase (lokale Daten)</p>
    </div>
  );
}
