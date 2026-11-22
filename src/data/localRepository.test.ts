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

describe('LocalRepository – Driver of the Day', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('DotD ist bis 30 Min. nach Rennstart tippbar, der Rest nicht', async () => {
    await db.races.put(race(-10)); // Rennen läuft seit 10 Min.
    await expect(
      repo.saveTip({ sessionId: '2026-1-race', playerId: 'p1', order: ['a'], bonus: { fastestLap: 'a' } }),
    ).rejects.toBeInstanceOf(TipLockedError);
    const tip = await repo.saveDriverOfTheDay('2026-1-race', 'p1', 'x');
    expect(tip.bonus?.driverOfTheDay).toBe('x');
  });

  it('DotD-Nachtipp lässt den restlichen Tipp unverändert', async () => {
    await db.races.put(race(5));
    await repo.saveTip({ sessionId: '2026-1-race', playerId: 'p1', order: ['a', 'b'], bonus: { fastestLap: 'a', safetyCar: true } });
    await db.races.put(race(-5));
    const tip = await repo.saveDriverOfTheDay('2026-1-race', 'p1', 'x');
    expect(tip.order).toEqual(['a', 'b']);
    expect(tip.bonus).toEqual({ fastestLap: 'a', safetyCar: true, driverOfTheDay: 'x' });
  });

  it('DotD ist 30 Min. nach Rennstart gesperrt', async () => {
    await db.races.put(race(-31));
    await expect(repo.saveDriverOfTheDay('2026-1-race', 'p1', 'x')).rejects.toBeInstanceOf(TipLockedError);
  });
});
