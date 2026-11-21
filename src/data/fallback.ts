import type { Driver, Race, Team } from '../domain/types';

/**
 * Fallback-Fahrerfeld 2026, falls die API (noch) nichts liefert.
 * Wird durch API-Daten überschrieben, sobald verfügbar.
 */
const GRID: [string, string, string, string, string, string][] = [
  // driverId, code, (Startnr. ungenutzt), first, last, teamId
  ['max_verstappen', 'VER', '1', 'Max', 'Verstappen', 'red_bull'],
  ['hadjar', 'HAD', '6', 'Isack', 'Hadjar', 'red_bull'],
  ['norris', 'NOR', '4', 'Lando', 'Norris', 'mclaren'],
  ['piastri', 'PIA', '81', 'Oscar', 'Piastri', 'mclaren'],
  ['leclerc', 'LEC', '16', 'Charles', 'Leclerc', 'ferrari'],
  ['hamilton', 'HAM', '44', 'Lewis', 'Hamilton', 'ferrari'],
  ['russell', 'RUS', '63', 'George', 'Russell', 'mercedes'],
  ['antonelli', 'ANT', '12', 'Andrea Kimi', 'Antonelli', 'mercedes'],
  ['alonso', 'ALO', '14', 'Fernando', 'Alonso', 'aston_martin'],
  ['stroll', 'STR', '18', 'Lance', 'Stroll', 'aston_martin'],
  ['albon', 'ALB', '23', 'Alexander', 'Albon', 'williams'],
  ['sainz', 'SAI', '55', 'Carlos', 'Sainz', 'williams'],
  ['gasly', 'GAS', '10', 'Pierre', 'Gasly', 'alpine'],
  ['colapinto', 'COL', '43', 'Franco', 'Colapinto', 'alpine'],
  ['ocon', 'OCO', '31', 'Esteban', 'Ocon', 'haas'],
  ['bearman', 'BEA', '87', 'Oliver', 'Bearman', 'haas'],
  ['lawson', 'LAW', '30', 'Liam', 'Lawson', 'rb'],
  ['arvid_lindblad', 'LIN', '41', 'Arvid', 'Lindblad', 'rb'],
  ['hulkenberg', 'HUL', '27', 'Nico', 'Hülkenberg', 'audi'],
  ['bortoleto', 'BOR', '5', 'Gabriel', 'Bortoleto', 'audi'],
  ['perez', 'PER', '11', 'Sergio', 'Pérez', 'cadillac'],
  ['bottas', 'BOT', '77', 'Valtteri', 'Bottas', 'cadillac'],
];

const TEAMS: [string, string][] = [
  ['red_bull', 'Red Bull'], ['mclaren', 'McLaren'], ['ferrari', 'Ferrari'], ['mercedes', 'Mercedes'],
  ['aston_martin', 'Aston Martin'], ['williams', 'Williams'], ['alpine', 'Alpine'], ['haas', 'Haas'],
  ['rb', 'Racing Bulls'], ['audi', 'Audi'], ['cadillac', 'Cadillac'],
];

export function fallbackDrivers(season: number): Driver[] {
  return GRID.map(([id, code, , firstName, lastName, teamId]) => ({
    id, season, code, number: '', firstName, lastName, teamId,
  }));
}

export function fallbackTeams(season: number): Team[] {
  return TEAMS.map(([id, name]) => ({ id, season, name }));
}

/**
 * Test-Wochenende (Sprint-Format) mit Sessions ab „jetzt“,
 * um Tippen, Sperre und Auswertung auszuprobieren.
 * Runden ≥ 900 sind Testdaten.
 */
export function demoRace(season: number, round = 900): Race {
  const now = Date.now();
  const at = (min: number) => new Date(now + min * 60_000).toISOString();
  const id = `${season}-${round}`;
  return {
    id,
    season,
    round,
    name: 'Test Grand Prix',
    circuit: 'Testring',
    locality: 'Teststadt',
    country: 'Testland',
    sessions: [
      { id: `${id}-sprintQuali`, type: 'sprintQuali', start: at(2) },
      { id: `${id}-sprint`, type: 'sprint', start: at(5) },
      { id: `${id}-quali`, type: 'quali', start: at(10) },
      { id: `${id}-race`, type: 'race', start: at(30) },
    ],
  };
}
