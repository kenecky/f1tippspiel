import Dexie, { type EntityTable } from 'dexie';
import type {
  Driver, Message, Race, SeasonResult, SeasonTip, SessionResult, Team, Tip,
} from '../domain/types';

export interface MetaEntry {
  key: string;
  value: unknown;
}

export class LightsOutDB extends Dexie {
  meta!: EntityTable<MetaEntry, 'key'>;
  races!: EntityTable<Race, 'id'>;
  drivers!: EntityTable<Driver & { pk: string }, 'pk'>;
  teams!: EntityTable<Team & { pk: string }, 'pk'>;
  tips!: EntityTable<Tip, 'id'>;
  results!: EntityTable<SessionResult, 'sessionId'>;
  seasonTips!: EntityTable<SeasonTip, 'id'>;
  seasonResults!: EntityTable<SeasonResult, 'season'>;
  messages!: EntityTable<Message, 'id'>;

  constructor() {
    super('lights-out');
    this.version(1).stores({
      meta: 'key',
      races: 'id, season, round',
      drivers: 'pk, season',
      teams: 'pk, season',
      tips: 'id, sessionId, playerId',
      results: 'sessionId',
      seasonTips: 'id, season',
      seasonResults: 'season',
      messages: '++id, to, sentAt',
    });
  }
}

export const db = new LightsOutDB();
