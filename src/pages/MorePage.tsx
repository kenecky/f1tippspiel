import { useEffect, useState } from 'react';
import { Card, sortDrivers } from '../components/ui';
import { useAllDrivers, useCalendarSyncedAt, usePlayers, useSeason, useTeams } from '../data/queries';
import { repo } from '../data/localRepository';
import { db } from '../data/db';
import { demoRace } from '../data/fallback';
import { ensureDrivers, syncSeason } from '../data/sync';
import { RULES } from '../domain/rules';
import type { Player } from '../domain/types';
import { fmtDateTime } from '../format';

export function MorePage() {
  const season = useSeason();
  const players = usePlayers();
  const synced = useCalendarSyncedAt(season);
  const [names, setNames] = useState<Player[]>([]);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  // Namen nur beim ersten Laden übernehmen (danach ist das Formular führend)
  useEffect(() => {
    if (players && names.length === 0) setNames(players);
  }, [players, names.length]);

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
        <h3>Spieler</h3>
        {names.map((p, i) => (
          <label key={p.id} className="field">
            <span>{i === 0 ? 'Dein Name' : 'Gegner:in'}</span>
            <input
              value={p.name}
              maxLength={16}
              onChange={(e) => {
                const next = names.map((n) => (n.id === p.id ? { ...n, name: e.target.value } : n));
                setNames(next);
                // Sofort speichern; leere Namen erst beim Verlassen des Feldes ersetzen
                repo.savePlayers(next.map((n) => ({ ...n, name: n.name.trim() || n.name })));
              }}
              onBlur={() => repo.savePlayers(names.map((n, j) => ({ ...n, name: n.name.trim() || `Spieler ${j + 1}` })))}
            />
          </label>
        ))}
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

      <DriversCard season={season} />

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
          <li>Rennen-Bonus: Schnellste Runde +{RULES.bonusPoints.fastestLap}, Driver of the Day +{RULES.bonusPoints.driverOfTheDay}, SC/VSC +{RULES.bonusPoints.safetyCar}</li>
          <li>Saison: Fahrer- und Team-Weltmeister – je +{RULES.seasonPoints.championDriver}</li>
          <li>Tippschluss = Sessionbeginn. Gegnertipps erst danach sichtbar.</li>
        </ul>
      </Card>
      <p className="small muted center">Lights Out v{__APP_VERSION__} · Testphase (lokale Daten)</p>
    </div>
  );
}

function DriversCard({ season }: { season: number }) {
  const drivers = useAllDrivers(season);
  const teams = useTeams(season);
  const [open, setOpen] = useState(false);
  if (!drivers) return null;

  const visible = drivers.filter((d) => d.visible).length;
  const reserves = drivers.filter((d) => d.regular === false).length;
  const teamName = (id?: string) => teams?.find((t) => t.id === id)?.name ?? '–';

  return (
    <Card>
      <button className="row plain" onClick={() => setOpen(!open)} aria-expanded={open}>
        <h3>🏎️ Fahrer ({visible} aktiv)</h3>
        <span className="muted">{open ? '▲' : '▼'}</span>
      </button>
      <p className="small muted">
        Ersatzfahrer werden automatisch erkannt (letzte 3 Rennen, 2 Fahrer pro Team)
        {reserves > 0 ? ` – ${reserves} ausgeblendet` : ''}. Hier kannst du Fahrer von Hand ein- oder ausblenden.
      </p>
      {open && (
        <ul className="driver-admin">
          {sortDrivers(drivers).map((d) => (
            <li key={d.id} className={`team-${d.teamId ?? 'none'} ${d.visible ? '' : 'off'}`}>
              <label>
                <input
                  type="checkbox"
                  checked={d.visible}
                  onChange={(e) => repo.setDriverVisibility(season, d.id, e.target.checked === (d.regular !== false) ? undefined : e.target.checked)}
                />
                <span className="driver"><b>{d.code}</b> {d.firstName} {d.lastName}</span>
              </label>
              <small className="muted">
                {teamName(d.teamId)}
                {d.regular === false && ' · Ersatz'}
                {d.overridden && ' · manuell'}
              </small>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
