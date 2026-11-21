import type { Race, Session } from './types';

/**
 * Sperrlogik. In der Testphase läuft sie im lokalen Repository,
 * später unverändert auf dem Server – dort mit Serverzeit.
 */
export function isSessionLocked(session: Pick<Session, 'start'>, now: Date = new Date()): boolean {
  return now.getTime() >= new Date(session.start).getTime();
}

/** Saisontipps sperren mit der ersten Session der Saison */
export function seasonLockTime(races: Race[]): Date | undefined {
  const starts = races.flatMap((r) => r.sessions.map((s) => new Date(s.start).getTime()));
  if (starts.length === 0) return undefined;
  return new Date(Math.min(...starts));
}

export function isSeasonLocked(races: Race[], now: Date = new Date()): boolean {
  const t = seasonLockTime(races);
  return t !== undefined && now.getTime() >= t.getTime();
}

export class TipLockedError extends Error {
  constructor(message = 'Die Session hat bereits begonnen – Tippen nicht mehr möglich.') {
    super(message);
    this.name = 'TipLockedError';
  }
}
