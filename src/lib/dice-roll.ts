export type D20Mode = 'normal' | 'advantage' | 'disadvantage';

export interface DiceRollInput {
  die: number;
  count: number;
  modifier: number;
  /** Advantage/disadvantage; only applies to a single d20 (and not on a crit). */
  mode?: D20Mode;
  /** Critical hit: doubles the dice count, never the modifier (2024 rules). */
  crit?: boolean;
}

export interface DiceRollOutput {
  /** Every die rolled (both d20s when rolling with advantage/disadvantage). */
  rolls: number[];
  /** Dice that count toward the total. */
  kept: number[];
  total: number;
  natural: 'nat20' | 'nat1' | null;
  formula: string;
}

export function rollDice(
  { die, count, modifier, mode = 'normal', crit = false }: DiceRollInput,
  rng: () => number = Math.random
): DiceRollOutput {
  const roll = () => Math.floor(rng() * die) + 1;
  const n = Math.max(1, count) * (crit ? 2 : 1);
  const twoD20 = die === 20 && count === 1 && !crit && mode !== 'normal';
  const rolls = Array.from({ length: twoD20 ? 2 : n }, roll);
  const kept = twoD20 ? [mode === 'advantage' ? Math.max(...rolls) : Math.min(...rolls)] : rolls;
  const total = kept.reduce((s, v) => s + v, 0) + modifier;
  const single = die === 20 && kept.length === 1 ? kept[0] : null;
  const mod = modifier === 0 ? '' : modifier > 0 ? `+${modifier}` : `${modifier}`;
  const suffix = twoD20 ? (mode === 'advantage' ? ' adv' : ' dis') : '';
  return {
    rolls,
    kept,
    total,
    natural: single === 20 ? 'nat20' : single === 1 ? 'nat1' : null,
    formula: `${n}d${die}${mod}${suffix}`,
  };
}
