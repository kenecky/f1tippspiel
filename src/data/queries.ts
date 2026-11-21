import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import { repo } from './localRepository';
import { scoreTip, type SessionScore } from '../domain/scoring';
import { RULES } from '../domain/rules';
import type { Driver, Player, PlayerId, Race, SeasonTip, Session, SessionResult, Team, Tip } from '../domain/types';

/**
 * Lesende Hooks. Später: gleiche Signaturen, aber Daten vom Server
 * (z. B. mit lokalem Cache für Offline).
 */

export function useSeason(): number | undefined {
  return useLiveQuery(() => repo.getSeason(), []);
}

export function usePlayers(): Player[] | undefined {
  return useLiveQuery(() => repo.getPlayers(), []);
}

export function useRaces(season?: number): Race[] | undefined {
  return useLiveQuery(
    async () => (season ? (await db.races.where('season').equals(season).sortBy('round')) : []),
    [season],
  );
}

export function useRace(raceId?: string): Race | undefined {
  return useLiveQuery(async () => (raceId ? await db.races.get(raceId) : undefined), [raceId]);
}

export type DriverWithVisibility = Driver & { visible: boolean; overridden: boolean };

/** Alle Fahrer inkl. Ersatzfahrer, mit berechneter Sichtbarkeit */
export function useAllDrivers(season?: number): DriverWithVisibility[] | undefined {
  return useLiveQuery(async () => {
    if (!season) return [];
    const [drivers, overrides] = await Promise.all([
      db.drivers.where('season').equals(season).toArray(),
      db.meta.get(`driverOverrides:${season}`).then((e) => (e?.value as Record<string, boolean> | undefined) ?? {}),
    ]);
    return drivers.map((d) => ({
      ...d,
      overridden: d.id in overrides,
      visible: overrides[d.id] ?? d.regular !== false,
    }));
  }, [season]);
}

/** Nur sichtbare Fahrer (Stammfahrer + manuell eingeblendete) – für Tipp-Auswahl */
export function useDrivers(season?: number): Driver[] | undefined {
  const all = useAllDrivers(season);
  return all?.filter((d) => d.visible);
}

export function useTeams(season?: number): Team[] | undefined {
  return useLiveQuery(
    async () => (season ? await db.teams.where('season').equals(season).sortBy('name') : []),
    [season],
  );
}

export function useTipsForSession(sessionId?: string): Tip[] | undefined {
  return useLiveQuery(
    async () => (sessionId ? await db.tips.where('sessionId').equals(sessionId).toArray() : []),
    [sessionId],
  );
}

export function useAllTips(): Tip[] | undefined {
  return useLiveQuery(() => db.tips.toArray(), []);
}

export function useResult(sessionId?: string): SessionResult | undefined {
  return useLiveQuery(async () => (sessionId ? await db.results.get(sessionId) : undefined), [sessionId]);
}

export function useAllResults(): SessionResult[] | undefined {
  return useLiveQuery(() => db.results.toArray(), []);
}

export function useSeasonTips(season?: number): SeasonTip[] | undefined {
  return useLiveQuery(
    async () => (season ? await db.seasonTips.where('season').equals(season).toArray() : []),
    [season],
  );
}

export function useSeasonResult(season?: number) {
  return useLiveQuery(async () => (season ? await db.seasonResults.get(season) : undefined), [season]);
}

export function useMessages() {
  return useLiveQuery(() => db.messages.orderBy('sentAt').toArray(), []);
}

export function useUnreadCount(player: PlayerId) {
  return useLiveQuery(
    () => db.messages.where('to').equals(player).filter((m) => !m.readAt).count(),
    [player],
  ) ?? 0;
}

export function useCalendarSyncedAt(season?: number) {
  return useLiveQuery(
    async () => (season ? ((await db.meta.get(`calendarSyncedAt:${season}`))?.value as string | undefined) : undefined),
    [season],
  );
}

// ---------- Wertung ----------

export interface ScoredSession {
  race: Race;
  session: Session;
  result?: SessionResult;
  scores: Record<PlayerId, SessionScore>;
}

export interface Standings {
  totals: Record<PlayerId, number>;
  seasonPoints: Record<PlayerId, number>;
  sessions: ScoredSession[];
  weekendWins: Record<PlayerId, number>;
}

export function computeStandings(
  races: Race[],
  tips: Tip[],
  results: SessionResult[],
  seasonTips: SeasonTip[],
  seasonResult?: { championDriverId?: string; championTeamId?: string },
): Standings {
  const tipMap = new Map(tips.map((t) => [t.id, t]));
  const resMap = new Map(results.map((r) => [r.sessionId, r]));
  const totals: Record<PlayerId, number> = { p1: 0, p2: 0 };
  const weekendWins: Record<PlayerId, number> = { p1: 0, p2: 0 };
  const sessions: ScoredSession[] = [];

  for (const race of races) {
    const weekend: Record<PlayerId, number> = { p1: 0, p2: 0 };
    let anyResult = false;
    for (const session of race.sessions) {
      const result = resMap.get(session.id);
      if (result) anyResult = true;
      const scores = {
        p1: scoreTip(session.type, tipMap.get(`${session.id}:p1`), result),
        p2: scoreTip(session.type, tipMap.get(`${session.id}:p2`), result),
      };
      (['p1', 'p2'] as const).forEach((p) => {
        totals[p] += scores[p].total;
        weekend[p] += scores[p].total;
      });
      sessions.push({ race, session, result, scores });
    }
    if (anyResult && weekend.p1 !== weekend.p2) weekendWins[weekend.p1 > weekend.p2 ? 'p1' : 'p2']++;
  }

  const seasonPoints: Record<PlayerId, number> = { p1: 0, p2: 0 };
  for (const t of seasonTips) {
    if (seasonResult?.championDriverId && t.championDriverId === seasonResult.championDriverId)
      seasonPoints[t.playerId] += RULES.seasonPoints.championDriver;
    if (seasonResult?.championTeamId && t.championTeamId === seasonResult.championTeamId)
      seasonPoints[t.playerId] += RULES.seasonPoints.championTeam;
  }
  totals.p1 += seasonPoints.p1;
  totals.p2 += seasonPoints.p2;

  return { totals, seasonPoints, sessions, weekendWins };
}

export function useStandings(season?: number): Standings | undefined {
  const races = useRaces(season);
  const tips = useAllTips();
  const results = useAllResults();
  const seasonTips = useSeasonTips(season);
  const seasonResult = useSeasonResult(season);
  if (!races || !tips || !results || !seasonTips) return undefined;
  return computeStandings(races, tips, results, seasonTips, seasonResult);
}
