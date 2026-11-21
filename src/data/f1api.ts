import type { BonusAnswers, Driver, Race, Session, SessionType, Team } from '../domain/types';

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

export async function fetchDriversAndTeams(season: number): Promise<{ drivers: Driver[]; teams: Team[] }> {
  const [d, c] = await Promise.all([
    get<{ MRData: { DriverTable: { Drivers: ApiDriver[] } } }>(`${season}/drivers.json`),
    get<{ MRData: { ConstructorTable: { Constructors: ApiConstructor[] } } }>(`${season}/constructors.json`),
  ]);

  // Teamzuordnung aus dem letzten Rennergebnis (falls vorhanden)
  const teamOf = new Map<string, string>();
  try {
    const last = await get<{ MRData: { RaceTable: { Races: { Results: ApiResultRow[] }[] } } }>(
      `${season}/last/results.json`,
    );
    for (const row of last.MRData.RaceTable.Races[0]?.Results ?? []) {
      if (row.Constructor) teamOf.set(row.Driver.driverId, row.Constructor.constructorId);
    }
  } catch {
    /* vor Saisonbeginn gibt es noch keine Ergebnisse */
  }

  return {
    drivers: d.MRData.DriverTable.Drivers.map((x) => ({
      id: x.driverId,
      season,
      code: x.code ?? x.familyName.slice(0, 3).toUpperCase(),
      number: x.permanentNumber ?? '',
      firstName: x.givenName,
      lastName: x.familyName,
      teamId: teamOf.get(x.driverId),
    })),
    teams: c.MRData.ConstructorTable.Constructors.map((x) => ({ id: x.constructorId, season, name: x.name })),
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
