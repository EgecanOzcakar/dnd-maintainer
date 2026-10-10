import type { DieSize } from '@/components/character-sheet/DiceRoller';

/** A roll handed to the dice roller: `count` dice of `die` plus `modifier`. */
export interface RollPreset {
  die: DieSize;
  count: number;
  modifier: number;
  contextLabel: string;
}
