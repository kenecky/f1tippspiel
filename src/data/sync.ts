import { db } from './db';
import { fallbackDrivers, fallbackTeams } from './fallback';
import { fetchCalendar, fetchDriversAndTeams, fetchResult } from './f1api';
import { repo } from './localRepository';
import type { Race, Session } from '../domain/types';

export interface SyncReport {
  ok: boolean;
  message: string;
}

/** Kalender + Fahrer laden. Offline bleiben die gespeicherten Daten erhalten. */
export async function syncSeason(season: number): Promise<SyncReport> {
  try {
    const races = await fetchCalendar(season);
    let { drivers, teams } = await fetchDriversAndTeams(season, races).catch(() => ({ drivers: [], teams: [] }));
    let usedFallback = false;
    const haveDrivers = await db.drivers.where('season').equals(season).count();
    if (!drivers.length && !haveDrivers) {
      drivers = fallbackDrivers(season);
      teams = fallbackTeams(season);
      usedFallback = true;
    }
    await repo.saveCalendar(season, races, drivers, teams);
    const reserves = drivers.filter((d) => d.regular === false).length;
    return {
      ok: true,
      message:
        `${races.length} Rennen geladen` +
        (usedFallback ? ' (Fahrerliste: Fallback).' : `, ${drivers.length - reserves} Stammfahrer` + (reserves ? ` (${reserves} Ersatzfahrer ausgeblendet).` : '.')),
    };
  } catch (e) {
    await ensureDrivers(season);
    return { ok: false, message: `Laden fehlgeschlagen (${(e as Error).message}). Gespeicherte Daten werden genutzt.` };
  }
}

export async function ensureDrivers(season: number) {
  const count = await db.drivers.where('season').equals(season).count();
  if (count === 0) {
    await db.drivers.bulkPut(fallbackDrivers(season).map((d) => ({ ...d, pk: `${season}:${d.id}` })));
    await db.teams.bulkPut(fallbackTeams(season).map((t) => ({ ...t, pk: `${season}:${t.id}` })));
  }
}

/** Ergebnis einer Session aus der API holen; manuelle Bonusangaben bleiben erhalten. */
export async function syncResult(race: Race, session: Session): Promise<SyncReport> {
  if (race.round >= 900) return { ok: false, message: 'Test-Rennen: Ergebnis bitte manuell eintragen.' };
  try {
    const res = await fetchResult(race.season, race.round, session.type);
    if (!res) return { ok: false, message: 'Noch kein Ergebnis verfügbar – ggf. manuell eintragen.' };
    const existing = await db.results.get(session.id);
    await repo.saveResult({
      sessionId: session.id,
      order: res.order,
      bonus: { ...existing?.bonus, ...res.bonus },
      source: 'api',
    });
    return { ok: true, message: 'Ergebnis geladen.' };
  } catch (e) {
    return { ok: false, message: `Fehler: ${(e as Error).message}` };
  }
}
