import { describe, expect, it } from 'vitest';
import { selectLineup } from './lineup';

const r = (...pairs: [string, string][]) => pairs.map(([driverId, teamId]) => ({ driverId, teamId }));

describe('selectLineup', () => {
  it('einmaliger Ersatzfahrer im letzten Rennen fliegt raus', () => {
    const lineup = selectLineup([
      r(['reserve', 'haas'], ['ocon', 'haas']), // letztes Rennen: Bearman ersetzt
      r(['bearman', 'haas'], ['ocon', 'haas']),
      r(['bearman', 'haas'], ['ocon', 'haas']),
    ]);
    expect([...lineup.keys()].sort()).toEqual(['bearman', 'ocon']);
  });

  it('Ersatzfahrer aus früheren Rennen fliegt raus', () => {
    const lineup = selectLineup([
      r(['a', 't'], ['b', 't']),
      r(['a', 't'], ['b', 't']),
      r(['a', 't'], ['reserve', 't']),
    ]);
    expect([...lineup.keys()].sort()).toEqual(['a', 'b']);
  });

  it('Teamwechsel: Fahrer zählt beim neuen Team', () => {
    const lineup = selectLineup([
      r(['x', 'red_bull'], ['max', 'red_bull'], ['y', 'rb'], ['z', 'rb']),
      r(['x', 'rb'], ['max', 'red_bull'], ['y', 'rb'], ['w', 'red_bull']),
    ]);
    expect(lineup.get('x')).toBe('red_bull');
    expect(lineup.has('w')).toBe(false);
  });

  it('max. 2 Fahrer pro Team', () => {
    const lineup = selectLineup([r(['a', 't'], ['b', 't'], ['c', 't'])]);
    expect(lineup.size).toBe(2);
  });
});
