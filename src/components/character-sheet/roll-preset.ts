import type { DieSize } from '@/components/character-sheet/DiceRoller';

/** A roll handed to the dice roller: `count` dice of `die` plus `modifier`. */
export interface RollPreset {
  die: DieSize;
  count: number;
  modifier: number;
  contextLabel: string;
  /** 'damage' enables the critical-hit toggle; omitted = inferred from the die. */
  kind?: 'd20' | 'damage';
}
