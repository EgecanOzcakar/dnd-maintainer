import type { RollMode } from '@/lib/resolver/effects';
import type { DieSize } from '@/components/character-sheet/DiceRoller';

/** One labelled term of a roll's bonus, already translated: `{ label: 'Strength', value: '+3' }`. */
export interface RollPart {
  readonly label: string;
  readonly value: string;
}

/** A roll handed to the dice roller: `count` dice of `die` plus `modifier`. */
export interface RollPreset {
  die: DieSize;
  count: number;
  modifier: number;
  contextLabel: string;
  /** 'damage' enables the critical-hit toggle; omitted = inferred from the die. */
  kind?: 'd20' | 'damage';
  /** Net advantage/disadvantage from active effects, conditions and armor. */
  mode?: RollMode;
  /** Extra dice added to the roll, e.g. `+1d4` (Bless) or `-1d4` (Bane). */
  extra?: readonly string[];
  /** Any d20 below this counts as this (Reliable Talent). */
  min?: number;
  /** What `modifier` is made of (ability, proficiency, ...), shown on the roll result and tooltips. */
  breakdown?: readonly RollPart[];
}
