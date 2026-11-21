import { RULES } from './rules';
import type { BonusAnswers, SessionResult, SessionType, Tip } from './types';

export interface SessionScore {
  driversInTop: number;
  exactPositions: number;
  basePoints: number;
  multiplier: number;
  bonusPoints: number;
  bonusHits: { fastestLap: boolean; driverOfTheDay: boolean; safetyCar: boolean };
  total: number;
}

export function emptyScore(type: SessionType): SessionScore {
  return {
    driversInTop: 0,
    exactPositions: 0,
    basePoints: 0,
    multiplier: RULES.multiplier[type],
    bonusPoints: 0,
    bonusHits: { fastestLap: false, driverOfTheDay: false, safetyCar: false },
    total: 0,
  };
}

/**
 * Punkte für einen Tipp:
 *  - 1 Punkt pro getipptem Fahrer, der tatsächlich in den Top N landet
 *  - +2 Punkte, wenn zusätzlich die Position exakt stimmt
 *  - Session-Multiplikator (Rennen x2)
 *  - Bonusfragen (nur Rennen) werden addiert, nicht multipliziert
 */
export function scoreTip(type: SessionType, tip: Tip | undefined, result: SessionResult | undefined): SessionScore {
  const score = emptyScore(type);
  if (!tip || !result) return score;

  const n = RULES.tipDepth[type];
  const actualTop = result.order.slice(0, n);
  const predicted = tip.order.slice(0, n);

  predicted.forEach((driverId, idx) => {
    if (!driverId) return;
    if (actualTop.includes(driverId)) {
      score.driversInTop++;
      if (actualTop[idx] === driverId) score.exactPositions++;
    }
  });

  score.basePoints =
    score.driversInTop * RULES.pointsDriverInTop + score.exactPositions * RULES.pointsExactPosition;

  if (type === 'race') {
    const hits = bonusHits(tip.bonus, result.bonus);
    score.bonusHits = hits;
    score.bonusPoints =
      (hits.fastestLap ? RULES.bonusPoints.fastestLap : 0) +
      (hits.driverOfTheDay ? RULES.bonusPoints.driverOfTheDay : 0) +
      (hits.safetyCar ? RULES.bonusPoints.safetyCar : 0);
  }

  score.total = score.basePoints * score.multiplier + score.bonusPoints;
  return score;
}

function bonusHits(tip: BonusAnswers | undefined, actual: BonusAnswers | undefined) {
  return {
    fastestLap: !!tip?.fastestLap && tip.fastestLap === actual?.fastestLap,
    driverOfTheDay: !!tip?.driverOfTheDay && tip.driverOfTheDay === actual?.driverOfTheDay,
    safetyCar: tip?.safetyCar !== undefined && actual?.safetyCar !== undefined && tip.safetyCar === actual.safetyCar,
  };
}

/** Theoretisches Maximum einer Session (für Anzeige) */
export function maxPoints(type: SessionType): number {
  const n = RULES.tipDepth[type];
  const base = n * (RULES.pointsDriverInTop + RULES.pointsExactPosition) * RULES.multiplier[type];
  if (type !== 'race') return base;
  const b = RULES.bonusPoints;
  return base + b.fastestLap + b.driverOfTheDay + b.safetyCar;
}
