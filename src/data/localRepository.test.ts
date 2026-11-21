import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import { LocalRepository } from './localRepository';
import { TipLockedError } from '../domain/lock';
import type { Race } from '../domain/types';

const repo = new LocalRepository();
const race = (minutesUntilStart: number): Race => ({
  id: '2026-1', season: 2026, round: 1, name: 'Test', circuit: '', locality: '', country: '',
  sessions: [{ id: '2026-1-race', type: 'race', start: new Date(Date.now() + minutesUntilStart * 60_000).toISOString() }],
});

describe('LocalRepository – Sperre', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('nimmt Tipps vor Sessionbeginn an', async () => {
    await db.races.put(race(10));
    const tip = await repo.saveTip({ sessionId: '2026-1-race', playerId: 'p1', order: ['a'] });
    expect(tip.id).toBe('2026-1-race:p1');
  });

  it('lehnt Tipps nach Sessionbeginn ab', async () => {
    await db.races.put(race(-1));
    await expect(repo.saveTip({ sessionId: '2026-1-race', playerId: 'p1', order: ['a'] })).rejects.toBeInstanceOf(TipLockedError);
    expect(await db.tips.count()).toBe(0);
  });

  it('sperrt Saisontipps ab der ersten Session', async () => {
    await db.races.put(race(-1));
    await expect(repo.saveSeasonTip({ season: 2026, playerId: 'p2', championDriverId: 'x' })).rejects.toBeInstanceOf(TipLockedError);
  });
});
