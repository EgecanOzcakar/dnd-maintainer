import type { RollPreset } from '@/components/character-sheet/roll-preset';

export type D20Mode = 'normal' | 'advantage' | 'disadvantage';

export interface DiceRollInput {
  die: number;
  count: number;
  modifier: number;
  /** Advantage/disadvantage; only applies to a single d20 (and not on a crit). */
  mode?: D20Mode;
  /** Critical hit: doubles the dice count, never the modifier (2024 rules). */
  crit?: boolean;
  /** Any die rolling below this counts as this (Reliable Talent). */
  min?: number;
}

export interface DiceRollOutput {
  /** Every die rolled (both d20s when rolling with advantage/disadvantage). */
  rolls: number[];
  /** Dice that count toward the total. */
  kept: number[];
  total: number;
  natural: 'nat20' | 'nat1' | null;
  formula: string;
  /** A die was raised to `min` (Reliable Talent). */
  floored: boolean;
}

export function rollDice(
  { die, count, modifier, mode = 'normal', crit = false, min = 1 }: DiceRollInput,
  rng: () => number = Math.random
): DiceRollOutput {
  let floored = false;
  const roll = () => {
    const r = Math.floor(rng() * die) + 1;
    if (r < min) floored = true;
    return Math.max(min, r);
  };
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
    floored,
  };
}

export interface ExtraDiceRoll {
  /** e.g. `+1d4` or `-1d4`. */
  formula: string;
  rolls: number[];
  /** Signed contribution to the total. */
  total: number;
}

export interface PresetRollOutput extends DiceRollOutput {
  extras: ExtraDiceRoll[];
  mode: D20Mode;
  crit: boolean;
}

/** Modifier keys held during the click: Shift = advantage / critical hit, Alt = disadvantage. */
export interface RollKeys {
  shift?: boolean;
  alt?: boolean;
}

/**
 * Rolls a sheet button's preset: its dice plus any extra dice (Bless, Hunter's Mark), with the
 * preset's own adv/dis (active effects, conditions) unless Shift/Alt overrides it.
 */
export function rollPreset(
  preset: Pick<RollPreset, 'die' | 'count' | 'modifier' | 'kind' | 'mode' | 'extra' | 'min'>,
  keys: RollKeys = {},
  rng: () => number = Math.random
): PresetRollOutput {
  const isDamage = preset.kind === 'damage' || preset.die !== 20;
  const fromPreset: D20Mode = preset.mode === 'adv' ? 'advantage' : preset.mode === 'dis' ? 'disadvantage' : 'normal';
  const keyMode = Boolean(keys.shift) === Boolean(keys.alt) ? null : keys.shift ? 'advantage' : 'disadvantage';
  const mode: D20Mode = isDamage || preset.die !== 20 ? 'normal' : (keyMode ?? fromPreset);
  const crit = isDamage && Boolean(keys.shift);

  const main = rollDice(
    { die: preset.die, count: preset.count, modifier: preset.modifier, mode, crit, min: preset.min },
    rng
  );
  const extras = (preset.extra ?? []).flatMap((e): ExtraDiceRoll[] => {
    const m = /^([+-])(\d+)d(\d+)$/.exec(e);
    if (!m) return [];
    const n = Number(m[2]) * (crit ? 2 : 1);
    const rolls = Array.from({ length: n }, () => Math.floor(rng() * Number(m[3])) + 1);
    const sum = rolls.reduce((a, b) => a + b, 0);
    return [{ formula: `${m[1]}${n}d${m[3]}`, rolls, total: m[1] === '-' ? -sum : sum }];
  });
  return {
    ...main,
    total: main.total + extras.reduce((s, e) => s + e.total, 0),
    formula: main.formula + extras.map((e) => e.formula).join(''),
    extras,
    mode,
    crit,
  };
}
