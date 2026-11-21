import { isSeasonLocked, isSessionLocked, TipLockedError } from '../domain/lock';
import type { Driver, Player, PlayerId, Race, SeasonResult, SeasonTip, SessionResult, Team, Tip } from '../domain/types';
import { db } from './db';
import type { Repository } from './repository';

export const DEFAULT_PLAYERS: Player[] = [
  { id: 'p1', name: 'Spieler 1' },
  { id: 'p2', name: 'Spieler 2' },
];

/**
 * Lokale Implementierung für die Testphase.
 * Die Sperrprüfung hier simuliert den späteren Server-Check.
 */
export class LocalRepository implements Repository {
  async getPlayers(): Promise<Player[]> {
    const entry = await db.meta.get('players');
    return (entry?.value as Player[] | undefined) ?? DEFAULT_PLAYERS;
  }

  async savePlayers(players: Player[]) {
    await db.meta.put({ key: 'players', value: players });
  }

  async getSeason(): Promise<number> {
    const entry = await db.meta.get('season');
    return (entry?.value as number | undefined) ?? new Date().getFullYear();
  }

  async setSeason(season: number) {
    await db.meta.put({ key: 'season', value: season });
  }

  async saveCalendar(season: number, races: Race[], drivers: Driver[], teams: Team[]) {
    await db.transaction('rw', [db.races, db.drivers, db.teams, db.meta], async () => {
      // Bestehende Rennen der Saison ersetzen, Demo-Rennen behalten
      const old = await db.races.where('season').equals(season).toArray();
      await db.races.bulkDelete(old.filter((r) => r.round < 900).map((r) => r.id));
      await db.races.bulkPut(races);
      if (drivers.length) {
        await db.drivers.where('season').equals(season).delete();
        await db.drivers.bulkPut(drivers.map((d) => ({ ...d, pk: `${season}:${d.id}` })));
      }
      if (teams.length) {
        await db.teams.where('season').equals(season).delete();
        await db.teams.bulkPut(teams.map((t) => ({ ...t, pk: `${season}:${t.id}` })));
      }
      await db.meta.put({ key: `calendarSyncedAt:${season}`, value: new Date().toISOString() });
    });
  }

  async saveTip(input: Omit<Tip, 'id' | 'updatedAt'>): Promise<Tip> {
    const session = await findSession(input.sessionId);
    if (!session) throw new Error('Session nicht gefunden.');
    // ↓ Später serverseitig mit Serverzeit
    if (isSessionLocked(session)) throw new TipLockedError();

    const tip: Tip = {
      ...input,
      order: [...input.order],
      id: `${input.sessionId}:${input.playerId}`,
      updatedAt: new Date().toISOString(),
    };
    await db.tips.put(tip);
    return tip;
  }

  async saveSeasonTip(input: Omit<SeasonTip, 'id' | 'updatedAt'>): Promise<SeasonTip> {
    const races = await db.races.where('season').equals(input.season).toArray();
    if (isSeasonLocked(races.filter((r) => r.round < 900))) {
      throw new TipLockedError('Die Saison hat begonnen – Saisontipps sind gesperrt.');
    }
    const tip: SeasonTip = {
      ...input,
      id: `${input.season}:${input.playerId}`,
      updatedAt: new Date().toISOString(),
    };
    await db.seasonTips.put(tip);
    return tip;
  }

  async saveResult(result: Omit<SessionResult, 'updatedAt'>) {
    await db.results.put({ ...result, updatedAt: new Date().toISOString() });
  }

  async saveSeasonResult(result: SeasonResult) {
    await db.seasonResults.put(result);
  }

  async sendMessage(from: PlayerId, to: PlayerId, text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    await db.messages.add({ from, to, text: trimmed.slice(0, 280), sentAt: new Date().toISOString() });
  }

  async markMessagesRead(to: PlayerId) {
    const now = new Date().toISOString();
    await db.messages
      .where('to')
      .equals(to)
      .filter((m) => !m.readAt)
      .modify({ readAt: now });
  }

  async resetAll() {
    await db.delete();
    await db.open();
  }
}

async function findSession(sessionId: string) {
  const raceId = sessionId.split('-').slice(0, 2).join('-');
  const race = await db.races.get(raceId);
  return race?.sessions.find((s) => s.id === sessionId);
}

export const repo: Repository = new LocalRepository();
