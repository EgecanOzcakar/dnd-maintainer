import type { SkillId } from '@/lib/dnd-helpers';
import type { BreakdownPart } from '@/lib/resolver/actions';
import { combineMode, type AdjustedSave, type AppliedEffects, type RollMode } from '@/lib/resolver/effects';
import type { AbilityKey } from '@/types/database';
import type { ResolvedCharacter } from '@/types/resolved';

export interface CheckRollMods {
  readonly mode: RollMode;
  /** Flat change on top of the printed bonus: Jack of All Trades minus the exhaustion penalty. */
  readonly bonus: number;
  /** The terms behind `bonus`, for display. */
  readonly parts: readonly BreakdownPart[];
  /** Reliable Talent: any d20 below this counts as this. */
  readonly min?: number;
  /** Extra dice from items / custom modifiers, e.g. `1d4`. */
  readonly extra?: readonly string[];
}

interface CheckTarget {
  readonly ability: AbilityKey;
  readonly skillId?: SkillId;
}

/**
 * Everything beyond the printed bonus that changes an ability check, skill check roll:
 * active effects and conditions, untrained armor (STR/DEX), Reliable Talent, Remarkable Athlete, and
 * Jack of All Trades (raw ability checks; skills already include it in their bonus).
 */
export function checkRollMods(
  resolved: ResolvedCharacter,
  { ability, skillId }: CheckTarget,
  applied?: Pick<AppliedEffects, 'checks' | 'checkPenalty' | 'checkFor'>
): CheckRollMods {
  const has = (id: string) => resolved.features.some((f) => f.feature.id === id);
  const armorDis = Boolean(resolved.savingThrows[ability].disadvantageFromArmor);
  const athleteAdv = skillId === 'athletics' && has('champion-remarkable-athlete');
  const reliable = skillId && resolved.skills[skillId].proficient && has('rogue-reliable-talent');
  const base = applied?.checks[ability] ?? null;
  const jack = !skillId && has('bard-jack-of-all-trades') ? Math.floor(resolved.proficiencyBonus / 2) : 0;
  const penalty = applied?.checkPenalty ?? 0;
  const item = applied?.checkFor(ability, skillId);
  const parts: BreakdownPart[] = [
    ...(jack ? [{ type: 'ability-check-bonus', label: 'bard-jack-of-all-trades', value: jack }] : []),
    ...(penalty ? [{ type: 'exhaustion', label: 'exhaustion', value: -penalty }] : []),
    ...(item?.parts ?? []),
  ];
  return {
    mode: combineMode(
      base === 'adv' || athleteAdv || Boolean(item?.adv),
      base === 'dis' || armorDis || Boolean(item?.dis)
    ),
    bonus: jack - penalty + (item?.bonus ?? 0),
    parts,
    ...(reliable ? { min: 10 } : {}),
    ...(item?.extra.length ? { extra: item.extra } : {}),
  };
}

/** Bonus, adv/dis and extra dice for a saving throw: active effects, conditions and untrained armor. */
export function saveRollMods(save: { bonus: number; disadvantageFromArmor?: boolean }, fx?: AdjustedSave) {
  return {
    modifier: fx?.bonus ?? save.bonus,
    mode: combineMode(fx?.mode === 'adv', fx?.mode === 'dis' || Boolean(save.disadvantageFromArmor)),
    extra: fx?.extra,
  };
}
