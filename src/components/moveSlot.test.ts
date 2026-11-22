import { describe, expect, it } from 'vitest';
import { moveSlot } from './DriverPicker';

describe('moveSlot (Drag & Drop)', () => {
  it('P1 nach P3: die anderen rutschen nach oben', () => {
    expect(moveSlot(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd']);
  });
  it('P4 nach P1: die anderen rutschen nach unten', () => {
    expect(moveSlot(['a', 'b', 'c', 'd'], 3, 0)).toEqual(['d', 'a', 'b', 'c']);
  });
  it('leere Plätze bleiben erhalten', () => {
    expect(moveSlot(['a', '', 'c'], 0, 2)).toEqual(['', 'c', 'a']);
  });
});
