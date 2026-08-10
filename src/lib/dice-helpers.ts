import type { DieSize } from '@/components/character-sheet/DiceRoller';

export interface ParsedDice {
  count: number;
  die: DieSize;
  modifier: number;
}

const VALID_DIE_SIZES: Set<number> = new Set([4, 6, 8, 10, 12, 20, 100]);

/**
 * Parses a dice formula string such as "1d8+3", "8d6", "2d6-1", or "d20+5".
 * Returns a fallback of 1d20+0 if the formula cannot be parsed.
 */
export function parseDiceFormula(formula: string): ParsedDice {
  if (!formula) {
    return { count: 1, die: 20, modifier: 0 };
  }

  // Match patterns like "8d6", "1d8+3", "d20-2", "2d6 + 4"
  const regex = /^\s*(\d*)\s*d\s*(\d+)\s*([+-]\s*\d+)?\s*$/i;
  const match = formula.match(regex);

  if (!match) {
    return { count: 1, die: 20, modifier: 0 };
  }

  const countStr = match[1];
  const dieStr = match[2];
  const modStr = match[3];

  const count = countStr ? Math.max(1, parseInt(countStr, 10)) : 1;
  const rawDie = parseInt(dieStr, 10);
  const die: DieSize = VALID_DIE_SIZES.has(rawDie) ? (rawDie as DieSize) : 20;
  const modifier = modStr ? parseInt(modStr.replace(/\s+/g, ''), 10) || 0 : 0;

  return { count, die, modifier };
}

/**
 * Helper to extract the first dice formula found inside a text string (e.g. spell description).
 * For example: "Deals 8d6 fire damage" -> returns "8d6".
 */
export function extractDiceFromText(text: string): string | null {
  if (!text) return null;
  const match = text.match(/\b(\d*d\d+([+-]\d+)?)\b/i);
  return match ? match[1] : null;
}
