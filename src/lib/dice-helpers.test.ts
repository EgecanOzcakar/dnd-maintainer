import { describe, it, expect } from 'vitest';
import { parseDiceFormula, extractDiceFromText } from '@/lib/dice-helpers';

describe('dice-helpers', () => {
  describe('parseDiceFormula', () => {
    it('parses standard 1d8+3 formula', () => {
      expect(parseDiceFormula('1d8+3')).toEqual({ count: 1, die: 8, modifier: 3 });
    });

    it('parses 8d6 formula without modifier', () => {
      expect(parseDiceFormula('8d6')).toEqual({ count: 8, die: 6, modifier: 0 });
    });

    it('parses d20+5 formula without count prefix', () => {
      expect(parseDiceFormula('d20+5')).toEqual({ count: 1, die: 20, modifier: 5 });
    });

    it('parses 2d6-1 formula with negative modifier', () => {
      expect(parseDiceFormula('2d6-1')).toEqual({ count: 2, die: 6, modifier: -1 });
    });

    it('falls back to 1d20+0 for invalid formula', () => {
      expect(parseDiceFormula('invalid')).toEqual({ count: 1, die: 20, modifier: 0 });
    });
  });

  describe('extractDiceFromText', () => {
    it('extracts first dice formula from text', () => {
      expect(extractDiceFromText('Target takes 8d6 fire damage on a failed save')).toBe('8d6');
      expect(extractDiceFromText('Heals 1d8+3 hit points')).toBe('1d8+3');
    });

    it('returns null if no dice formula exists', () => {
      expect(extractDiceFromText('Increases speed by 10 feet')).toBeNull();
    });
  });
});
