import { describe, expect, it } from 'vitest';
import { maxPoints, scoreTip } from './scoring';
import { isSessionLocked } from './lock';
import type { SessionResult, Tip } from './types';

const tip = (order: string[], bonus?: Tip['bonus']): Tip => ({
  id: 'x', sessionId: 's', playerId: 'p1', order, bonus, updatedAt: '',
});
const result = (order: string[], bonus?: SessionResult['bonus']): SessionResult => ({
  sessionId: 's', order, bonus, source: 'manual', updatedAt: '',
});

const top10 = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l'];

describe('scoreTip', () => {
  it('perfekter Quali-Tipp = 30 Punkte', () => {
    expect(scoreTip('quali', tip(top10.slice(0, 10)), result(top10)).total).toBe(30);
  });

  it('richtige Fahrer, falsche Reihenfolge = 1 Punkt je Fahrer', () => {
    const reversed = top10.slice(0, 10).reverse();
    const s = scoreTip('quali', tip(reversed), result(top10));
    expect(s.driversInTop).toBe(10);
    expect(s.exactPositions).toBe(0);
    expect(s.total).toBe(10);
  });

  it('Fahrer außerhalb der Top N zählen nicht', () => {
    const s = scoreTip('quali', tip(['k', 'l', 'c']), result(top10));
    expect(s.driversInTop).toBe(1);
    expect(s.exactPositions).toBe(1);
    expect(s.total).toBe(3);
  });

  it('Sprint wertet nur Top 8', () => {
    // i ist P9 → im Sprint kein Treffer
    const s = scoreTip('sprint', tip(['a', 'i']), result(top10));
    expect(s.total).toBe(3);
  });

  it('Rennen zählt doppelt, Bonus einfach', () => {
    const s = scoreTip(
      'race',
      tip(['a', 'c'], { fastestLap: 'a', driverOfTheDay: 'b', safetyCar: true }),
      result(top10, { fastestLap: 'a', driverOfTheDay: 'z', safetyCar: true }),
    );
    // a exakt (3) + c in Top 10 (1) => 4 * 2 = 8; Bonus: schnellste Runde 5 + SC 3 = 8
    expect(s.basePoints).toBe(4);
    expect(s.bonusPoints).toBe(8);
    expect(s.total).toBe(16);
  });

  it('SC-Tipp "nein" wird korrekt gewertet', () => {
    const s = scoreTip('race', tip([], { safetyCar: false }), result(top10, { safetyCar: false }));
    expect(s.bonusHits.safetyCar).toBe(true);
  });

  it('ohne Ergebnis 0 Punkte', () => {
    expect(scoreTip('race', tip(top10), undefined).total).toBe(0);
  });

  it('Maximalpunkte', () => {
    expect(maxPoints('quali')).toBe(30);
    expect(maxPoints('sprint')).toBe(24);
    expect(maxPoints('race')).toBe(78);
  });
});

describe('isSessionLocked', () => {
  it('sperrt ab Sessionbeginn', () => {
    const start = '2026-03-01T12:00:00Z';
    expect(isSessionLocked({ start }, new Date('2026-03-01T11:59:59Z'))).toBe(false);
    expect(isSessionLocked({ start }, new Date('2026-03-01T12:00:00Z'))).toBe(true);
  });
});
