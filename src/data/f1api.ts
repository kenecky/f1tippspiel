import type { BonusAnswers, Driver, Race, Session, SessionType, Team } from '../domain/types';
import { selectLineup, type ResultEntry } from '../domain/lineup';

/** Anzahl der letzten Rennen, aus denen das Stammfahrer-Feld ermittelt wird */
const LINEUP_ROUNDS = 3;

/**
 * Jolpica API (Nachfolger von Ergast) – kostenlos, ohne Key.
 * https://github.com/jolpica/jolpica-f1
 */
const BASE = 'https://api.jolpi.ca/ergast/f1';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}/${path}${path.includes('?') ? '&' : '?'}limit=100`);
  if (!res.ok) throw new Error(`F1-API Fehler ${res.status}`);
  return (await res.json()) as T;
}

interface ApiDateTime { date: string; time?: string }
interface ApiRace extends ApiDateTime {
  season: string;
  round: string;
  raceName: string;
  Circuit: { circuitName: string; Location: { locality: string; country: string } };
  Qualifying?: ApiDateTime;
  Sprint?: ApiDateTime;
  SprintQualifying?: ApiDateTime;
  SprintShootout?: ApiDateTime;
}
interface ApiDriver {
  driverId: string;
  code?: string;
  permanentNumber?: string;
  givenName: string;
  familyName: string;
}
interface ApiConstructor { constructorId: string; name: string }

function toIso(dt: ApiDateTime): string {
  return new Date(`${dt.date}T${dt.time ?? '00:00:00Z'}`).toISOString();
}

export async function fetchCalendar(season: number): Promise<Race[]> {
  const data = await get<{ MRData: { RaceTable: { Races: ApiRace[] } } }>(`${season}.json`);
  return data.MRData.RaceTable.Races.map((r) => {
    const round = Number(r.round);
    const id = `${season}-${round}`;
    const sessions: Session[] = [];
    const add = (type: SessionType, dt?: ApiDateTime) => {
      if (dt) sessions.push({ id: `${id}-${type}`, type, start: toIso(dt) });
    };
    add('sprintQuali', r.SprintQualifying ?? r.SprintShootout);
    add('sprint', r.Sprint);
    add('quali', r.Qualifying);
    add('race', r);
    sessions.sort((a, b) => a.start.localeCompare(b.start));
    return {
      id,
      season,
      round,
      name: r.raceName,
      circuit: r.Circuit.circuitName,
      locality: r.Circuit.Location.locality,
      country: r.Circuit.Location.country,
      sessions,
    };
  });
}

/**
 * Fahrer & Teams einer Saison. Ersatzfahrer werden anhand der letzten
 * 3 Rennergebnisse erkannt und als `regular: false` markiert.
 */
export async function fetchDriversAndTeams(
  season: number,
  races: Race[],
): Promise<{ drivers: Driver[]; teams: Team[] }> {
  const [d, c] = await Promise.all([
    get<{ MRData: { DriverTable: { Drivers: ApiDriver[] } } }>(`${season}/drivers.json`),
    get<{ MRData: { ConstructorTable: { Constructors: ApiConstructor[] } } }>(`${season}/constructors.json`),
  ]);

  const now = Date.now();
  const lastRounds = races
    .filter((r) => r.round < 900 && r.sessions.some((s) => s.type === 'race' && new Date(s.start).getTime() < now))
    .map((r) => r.round)
    .sort((a, b) => b - a)
    .slice(0, LINEUP_ROUNDS);

  const settled = await Promise.allSettled(
    lastRounds.map((round) =>
      get<{ MRData: { RaceTable: { Races: { Results: ApiResultRow[] }[] } } }>(`${season}/${round}/results.json`),
    ),
  );
  const rounds: ResultEntry[][] = settled
    .map((res) => (res.status === 'fulfilled' ? res.value.MRData.RaceTable.Races[0]?.Results ?? [] : []))
    .filter((rows) => rows.length > 0)
    .map((rows) =>
      rows
        .filter((row) => row.Constructor)
        .map((row) => ({ driverId: row.Driver.driverId, teamId: row.Constructor!.constructorId })),
    );

  // Vor dem ersten Rennen gibt es keine Ergebnisse → alle gemeldeten Fahrer gelten als Stammfahrer
  const lineup = rounds.length ? selectLineup(rounds) : undefined;
  const lastTeam = new Map<string, string>();
  [...rounds].reverse().forEach((entries) => entries.forEach((e) => lastTeam.set(e.driverId, e.teamId)));

  const activeTeams = lineup ? new Set(lineup.values()) : undefined;

  return {
    drivers: d.MRData.DriverTable.Drivers.map((x) => ({
      id: x.driverId,
      season,
      code: x.code ?? x.familyName.slice(0, 3).toUpperCase(),
      number: x.permanentNumber ?? '',
      firstName: x.givenName,
      lastName: x.familyName,
      teamId: lineup?.get(x.driverId) ?? lastTeam.get(x.driverId),
      regular: lineup ? lineup.has(x.driverId) : true,
    })),
    teams: c.MRData.ConstructorTable.Constructors
      .filter((x) => !activeTeams || activeTeams.has(x.constructorId))
      .map((x) => ({ id: x.constructorId, season, name: x.name })),
  };
}

interface ApiResultRow {
  position: string;
  Driver: { driverId: string };
  Constructor?: { constructorId: string };
  FastestLap?: { rank?: string };
}

/**
 * Lädt ein Ergebnis. Sprint-Qualifying wird von der API nicht geliefert
 * → manuelle Eingabe. Driver of the Day und Safety Car ebenfalls manuell.
 */
export async function fetchResult(
  season: number,
  round: number,
  type: SessionType,
): Promise<{ order: string[]; bonus?: BonusAnswers } | undefined> {
  if (type === 'sprintQuali') return undefined;

  const endpoint = { quali: 'qualifying', sprint: 'sprint', race: 'results' }[type];
  const key = { quali: 'QualifyingResults', sprint: 'SprintResults', race: 'Results' }[type];
  const data = await get<{ MRData: { RaceTable: { Races: Record<string, ApiResultRow[]>[] } } }>(
    `${season}/${round}/${endpoint}.json`,
  );
  const rows = data.MRData.RaceTable.Races[0]?.[key];
  if (!rows?.length) return undefined;

  const order = [...rows]
    .sort((a, b) => Number(a.position) - Number(b.position))
    .map((r) => r.Driver.driverId);

  if (type !== 'race') return { order };
  const fastest = rows.find((r) => r.FastestLap?.rank === '1')?.Driver.driverId;
  return { order, bonus: fastest ? { fastestLap: fastest } : undefined };
}
