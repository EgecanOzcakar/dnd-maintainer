import type { ClassId } from '@/lib/dnd-helpers';
import { ABILITY_KEYS } from '@/lib/dnd-helpers';
import type { ResolvedAction } from '@/lib/resolver/actions';
import { ACTIVE_EFFECTS, type ActiveEffectDef } from '@/lib/sources/active-effects';
import type { AbilityKey } from '@/types/database';
import type { ResolvedCharacter } from '@/types/resolved';

/** Net roll state once advantage and disadvantage sources cancel. */
export type RollMode = 'adv' | 'dis' | null;

export interface AdjustedAction extends ResolvedAction {
  /** Advantage/disadvantage on this action's attack roll. */
  readonly mode?: RollMode;
  /** Extra dice on the attack roll, e.g. `+1d4` (Bless). */
  readonly toHitExtra?: readonly string[];
  /** Extra dice on the damage roll, e.g. `+1d6` (Hunter's Mark). */
  readonly damageExtra?: readonly string[];
}

export interface AdjustedSave {
  readonly bonus: number;
  readonly mode: RollMode;
  readonly extra: readonly string[];
}

export interface AppliedEffects {
  readonly armorClass: number;
  readonly speed: ResolvedCharacter['speed'];
  readonly actions: readonly AdjustedAction[];
  readonly savingThrows: Readonly<Record<AbilityKey, AdjustedSave>>;
  /** Ability check state per ability (exhaustion penalty is in `checkPenalty`). */
  readonly checks: Readonly<Record<AbilityKey, RollMode>>;
  readonly checkPenalty: number;
  /** Attacks against the character have disadvantage (Dodge). */
  readonly attacksAgainst: RollMode;
  /** Resistances granted by effects (on top of `resolved.resistances`). */
  readonly resistances: readonly string[];
}

export interface EffectContext {
  readonly activeEffects: readonly string[];
  readonly conditions: readonly string[];
  readonly exhaustionLevel: number;
  readonly classLevels: Readonly<Partial<Record<ClassId, number>>>;
}

/** 2024 Rage damage by Barbarian level. */
export function rageDamage(barbarianLevel: number): number {
  return barbarianLevel >= 16 ? 4 : barbarianLevel >= 9 ? 3 : 2;
}

/** Any advantage plus any disadvantage cancel out, regardless of count. */
export function combineMode(adv: boolean, dis: boolean): RollMode {
  return adv === dis ? null : adv ? 'adv' : 'dis';
}

/** Effects the character can currently toggle (has the feature or spell, or `always`). */
export function availableEffects(resolved: ResolvedCharacter): ActiveEffectDef[] {
  const featureIds = new Set(resolved.features.map((f) => f.feature.id));
  const sc = resolved.spellcasting;
  const spellIds = new Set([
    ...(sc?.cantrips ?? []),
    ...(sc?.knownSpells.map((s) => s.spellId) ?? []),
    ...(sc?.alwaysPreparedSpells ?? []),
  ]);
  return ACTIVE_EFFECTS.filter(
    (e) =>
      e.requires === 'always' ||
      ('feature' in e.requires ? featureIds.has(e.requires.feature) : spellIds.has(e.requires.spell))
  );
}

/** 2024 conditions that impose disadvantage. */
const CONDITION_ATTACK_DIS = new Set(['poisoned', 'prone', 'restrained', 'blinded', 'frightened']);
const CONDITION_CHECK_DIS = new Set(['poisoned', 'frightened']);

export function applyEffects(
  resolved: ResolvedCharacter,
  actions: readonly ResolvedAction[],
  ctx: EffectContext
): AppliedEffects {
  const { conditions, classLevels } = ctx;
  const exhaustion = Math.max(0, Math.min(6, ctx.exhaustionLevel));
  const d20Penalty = 2 * exhaustion;
  // Only effects the character actually has available count, so stale ids are ignored.
  const available = new Set(availableEffects(resolved).map((e) => e.id));
  const active = ACTIVE_EFFECTS.filter((e) => ctx.activeEffects.includes(e.id) && available.has(e.id));
  const mods = active.map((e) => e.mods);
  const sum = (pick: (m: (typeof mods)[number]) => number | undefined) =>
    mods.reduce((total, m) => total + (pick(m) ?? 0), 0);

  // --- Armor class ---
  const dexMod = resolved.abilities.dex.modifier;
  const bodyArmorWorn = resolved.equipment.some(
    (e) => e.equipped && e.itemDef.type === 'armor' && e.itemDef.category !== 'shield'
  );
  let armorClass = resolved.armorClass.effective;
  if (mods.some((m) => m.unarmoredBase13) && !bodyArmorWorn) {
    const bestBase = Math.max(10 + dexMod, ...resolved.armorClass.calculations.map((c) => c.baseValue));
    armorClass += Math.max(0, 13 + dexMod - bestBase);
  }
  armorClass += sum((m) => m.acBonus);
  for (const m of mods) if (m.acMin !== undefined) armorClass = Math.max(armorClass, m.acMin);

  // --- Speed ---
  const multiplier = mods.reduce((acc, m) => acc * (m.speedMultiplier ?? 1), 1);
  const speed = Object.fromEntries(
    Object.entries(resolved.speed).map(([mode, s]) => [
      mode,
      s && { ...s, value: Math.max(0, s.value * multiplier - 5 * exhaustion) },
    ])
  ) as ResolvedCharacter['speed'];

  // --- Attack roll state ---
  const hasCondition = (set: Set<string>) => conditions.some((c) => set.has(c));
  const attackDis = hasCondition(CONDITION_ATTACK_DIS);
  const attackAdvAll = mods.some((m) => m.attackAdvantage === 'all') || conditions.includes('invisible');
  const attackAdvStr = mods.some((m) => m.attackAdvantage === 'str-melee');
  const barbarianLevel = classLevels.barbarian ?? 0;
  const d20Dice = mods.flatMap((m) => (m.d20Die ? [m.d20Die] : []));
  const rage = mods.some((m) => m.rageDamage) ? rageDamage(barbarianLevel) : 0;

  const strMeleeKeys = new Set(
    resolved.attacks
      .filter((a) => {
        if (a.range !== 'melee') return false;
        const finesse = a.properties.includes('finesse');
        return !finesse || resolved.abilities.str.modifier >= dexMod;
      })
      .map((a) => `weapon:${a.weaponId}${a.offHand ? ':off-hand' : ''}`)
  );

  const adjusted = actions.map((a): AdjustedAction => {
    if (a.toHit === undefined && !a.damage) return a;
    const isStrMelee = strMeleeKeys.has(a.key);
    const adv = attackAdvAll || (attackAdvStr && isStrMelee);
    const rollsAttack = a.toHit !== undefined;
    const damageExtra = mods.flatMap((m) =>
      m.damageDie && rollsAttack && a.damage && (m.damageDie.filter === 'attack' || a.kind === 'weapon')
        ? [m.damageDie.dice]
        : []
    );
    return {
      ...a,
      ...(rollsAttack
        ? { toHit: (a.toHit ?? 0) - d20Penalty, mode: combineMode(adv, attackDis), toHitExtra: d20Dice }
        : {}),
      ...(a.damage && rage && isStrMelee ? { damage: { ...a.damage, bonus: a.damage.bonus + rage } } : {}),
      ...(damageExtra.length ? { damageExtra } : {}),
    };
  });

  // --- Saves and checks ---
  const savingThrows = {} as Record<AbilityKey, AdjustedSave>;
  const checks = {} as Record<AbilityKey, RollMode>;
  const checkDis = hasCondition(CONDITION_CHECK_DIS);
  for (const ab of ABILITY_KEYS) {
    const saveAdv = mods.some((m) => m.saveAdvantage?.includes(ab));
    const saveDis = ab === 'dex' && conditions.includes('restrained');
    savingThrows[ab] = {
      bonus: resolved.savingThrows[ab].bonus - d20Penalty,
      mode: combineMode(saveAdv, saveDis),
      extra: d20Dice,
    };
    checks[ab] = combineMode(
      mods.some((m) => m.checkAdvantage?.includes(ab)),
      checkDis
    );
  }

  return {
    armorClass,
    speed,
    actions: adjusted,
    savingThrows,
    checks,
    checkPenalty: d20Penalty,
    attacksAgainst: mods.some((m) => m.attacksAgainstDisadvantage) ? 'dis' : null,
    resistances: [...new Set(mods.flatMap((m) => m.resistances ?? []))],
  };
}
