export type PlayerId = 'p1' | 'p2';

export type SessionType = 'quali' | 'sprintQuali' | 'sprint' | 'race';

export interface Player {
  id: PlayerId;
  name: string;
}

export interface Session {
  /** `${season}-${round}-${type}` */
  id: string;
  type: SessionType;
  /** Startzeit als ISO-String (UTC) */
  start: string;
}

export interface Race {
  /** `${season}-${round}` */
  id: string;
  season: number;
  round: number;
  name: string;
  circuit: string;
  locality: string;
  country: string;
  sessions: Session[];
}

export interface Driver {
  id: string;
  season: number;
  code: string;
  number: string;
  firstName: string;
  lastName: string;
  teamId?: string;
}

export interface Team {
  id: string;
  season: number;
  name: string;
}

/** Bonusfragen – nur beim Rennen */
export interface BonusAnswers {
  fastestLap?: string; // driverId
  driverOfTheDay?: string; // driverId
  safetyCar?: boolean; // SC oder VSC
}

export interface Tip {
  /** `${sessionId}:${playerId}` */
  id: string;
  sessionId: string;
  playerId: PlayerId;
  /** driverIds in Reihenfolge P1..PN */
  order: string[];
  bonus?: BonusAnswers;
  updatedAt: string;
}

export interface SessionResult {
  sessionId: string;
  /** Gesamtes Ergebnis oder mindestens Top N, driverIds P1.. */
  order: string[];
  bonus?: BonusAnswers;
  source: 'api' | 'manual';
  updatedAt: string;
}

export interface SeasonTip {
  /** `${season}:${playerId}` */
  id: string;
  season: number;
  playerId: PlayerId;
  championDriverId?: string;
  championTeamId?: string;
  updatedAt: string;
}

export interface SeasonResult {
  season: number;
  championDriverId?: string;
  championTeamId?: string;
}

export interface Message {
  id?: number;
  from: PlayerId;
  to: PlayerId;
  text: string;
  sentAt: string;
  readAt?: string;
}
