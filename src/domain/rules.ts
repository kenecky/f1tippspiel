import type { SessionType } from './types';

/**
 * Alle Spielregeln an einer Stelle – später identisch auf dem Server.
 */
export const RULES = {
  /** Wie viele Plätze pro Session getippt werden */
  tipDepth: {
    quali: 10,
    sprintQuali: 10,
    sprint: 8,
    race: 10,
  } satisfies Record<SessionType, number>,

  /** Fahrer richtig in den Top N (egal welche Position) */
  pointsDriverInTop: 1,
  /** Zusätzlich, wenn auch die Position stimmt */
  pointsExactPosition: 2,

  /** Multiplikator pro Session (Rennen zählt doppelt) */
  multiplier: {
    quali: 1,
    sprintQuali: 1,
    sprint: 1,
    race: 2,
  } satisfies Record<SessionType, number>,

  /** Bonusfragen beim Rennen (werden NICHT verdoppelt) */
  bonusPoints: {
    fastestLap: 2,
    driverOfTheDay: 2,
    safetyCar: 2,
  },

  /** Saisontipps */
  seasonPoints: {
    championDriver: 10,
    championTeam: 10,
  },
} as const;

export const SESSION_LABEL: Record<SessionType, string> = {
  quali: 'Qualifying',
  sprintQuali: 'Sprint-Qualifying',
  sprint: 'Sprint',
  race: 'Rennen',
};

export const SESSION_SHORT: Record<SessionType, string> = {
  quali: 'Q',
  sprintQuali: 'SQ',
  sprint: 'S',
  race: 'R',
};
