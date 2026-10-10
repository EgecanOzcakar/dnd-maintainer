import type { ClassId } from '@/lib/dnd-helpers';
import { FEATURE_ACTIONS } from '@/lib/sources/feature-actions';
import { SPELL_MECHANICS } from '@/lib/sources/spell-mechanics';
import { getSpellDef } from '@/lib/sources/spells';
import type {
  ActionDamage,
  ActionDamageType,
  ActionHeal,
  ActivationType,
  LevelBonus,
  ModSource,
  ScaledDice,
  SpellMechanics,
} from '@/types/actions';
import type { AbilityKey } from '@/types/database';
import type { DamageDice } from '@/types/items';
import type { ResolvedCharacter, SpellLevel } from '@/types/resolved';

export interface ResolvedRoll {
  /** Dice expression, e.g. `2d6`; `1` for a non-monk Unarmed Strike; empty for a flat amount. */
  readonly dice: string;
  readonly bonus: number;
}

export interface ResolvedAction {
  /** Unique within the list. */
  readonly key: string;
  readonly kind: 'weapon' | 'spell' | 'feature';
  /** Weapon id, spell id or feature id — the i18n lookup key. */
  readonly refId: string;
  readonly activation: ActivationType;
  /** Listed under the Attack filter: weapon attacks and anything that deals damage. */
  readonly isAttack: boolean;
  readonly toHit?: number;
  readonly save?: { readonly ability: AbilityKey; readonly dc: number };
  readonly damage?: ResolvedRoll & { readonly type: ActionDamageType | string };
  readonly heal?: ResolvedRoll;
  /** Added per slot level above `spellLevel`: dice (`1d6`) or a flat amount (`10`). */
  readonly upcast?: string;
  readonly spellLevel?: SpellLevel;
  readonly poolId?: string;
  readonly offHand?: boolean;
  /** Two-handed damage dice for a Versatile weapon. */
  readonly versatileDice?: DamageDice;
}

export interface ResolvedActions {
  readonly actions: readonly ResolvedAction[];
  /** Attacks per Attack action (Extra Attack and the fighter's later tiers). */
  readonly attacksPerAction: number;
}

/** Dice for a level, or null when the level is below the table's first row. */
export function scaleDice(dice: ScaledDice, level: number): DamageDice | null {
  if (typeof dice === 'string') return dice;
  let picked: DamageDice | null = null;
  for (const [minLevel, d] of dice) if (level >= minLevel) picked = d;
  return picked;
}

/** 2024 cantrip damage: the dice count doubles at 5, triples at 11, quadruples at 17. */
export function cantripDice(dice: DamageDice, characterLevel: number): DamageDice {
  const tier = characterLevel >= 17 ? 4 : characterLevel >= 11 ? 3 : characterLevel >= 5 ? 2 : 1;
  const [count, die] = dice.split('d');
  return `${Number(count) * tier}d${die}` as DamageDice;
}

export function activationFromCastingTime(castingTime: string): ActivationType {
  if (castingTime === 'Action') return 'action';
  if (castingTime === 'Bonus Action') return 'bonus-action';
  if (castingTime.startsWith('Reaction')) return 'reaction';
  return 'special';
}

export function attacksPerAction(featureIds: ReadonlySet<string>): number {
  if (featureIds.has('fighter-extra-attack-3')) return 4;
  if (featureIds.has('fighter-extra-attack-2')) return 3;
  return [...featureIds].some((id) => id.endsWith('-extra-attack')) ? 2 : 1;
}

export function resolveActions(
  resolved: ResolvedCharacter,
  classLevels: Readonly<Partial<Record<ClassId, number>>>,
  /** Leveled spells the character has prepared today; omit to list every known spell. */
  preparedSpells?: readonly string[]
): ResolvedActions {
  const { abilities, proficiencyBonus: pb, spellcasting } = resolved;
  const characterLevel = Object.values(classLevels).reduce((sum, n) => sum + (n ?? 0), 0);
  const actions: ResolvedAction[] = [];

  const modOf = (source: ModSource | undefined, spellAbility: AbilityKey | null = spellcasting?.ability ?? null) => {
    if (!source) return 0;
    const ability = source === 'spellcasting' ? spellAbility : source;
    return ability ? abilities[ability].modifier : 0;
  };

  // Weapons (already resolved with full to-hit/damage breakdowns).
  for (const attack of resolved.attacks) {
    actions.push({
      key: `weapon:${attack.weaponId}${attack.offHand ? ':off-hand' : ''}`,
      kind: 'weapon',
      refId: attack.weaponId,
      activation: attack.offHand ? 'bonus-action' : 'action',
      isAttack: true,
      toHit: attack.attackBonus,
      damage: { dice: attack.damageDice, bonus: attack.damageBonus, type: attack.damageType },
      ...(attack.offHand ? { offHand: true } : {}),
      ...(attack.versatileDice ? { versatileDice: attack.versatileDice } : {}),
    });
  }

  // Spells the character can cast: cantrips, known/prepared and always-prepared spells.
  if (spellcasting && !spellcasting.cannotCastSpells) {
    const spellIds = new Set([
      ...spellcasting.cantrips,
      ...(preparedSpells ?? spellcasting.knownSpells.map((s) => s.spellId)),
      ...spellcasting.alwaysPreparedSpells,
    ]);
    for (const spellId of spellIds) {
      const def = getSpellDef(spellId);
      const mech = SPELL_MECHANICS[spellId];
      if (!def || !mech) continue;
      const ability = spellcasting.spellAbilityOverrides[spellId] ?? spellcasting.ability;
      const mod = ability ? abilities[ability].modifier : 0;
      const damageDice = mech.damage
        ? mech.damage.cantripScaling
          ? cantripDice(mech.damage.dice, characterLevel)
          : mech.damage.dice
        : null;
      actions.push({
        key: `spell:${spellId}`,
        kind: 'spell',
        refId: spellId,
        activation: activationFromCastingTime(def.castingTime),
        isAttack: Boolean(mech.attack || mech.damage),
        spellLevel: def.level,
        ...(mech.attack ? { toHit: pb + mod } : {}),
        ...(mech.save ? { save: { ability: mech.save, dc: 8 + pb + mod } } : {}),
        ...(mech.damage && damageDice
          ? {
              damage: {
                dice: damageDice,
                bonus: (mech.damage.addMod ? mod : 0) + (mech.damage.flat ?? 0),
                type: mech.damage.type,
              },
            }
          : {}),
        ...(mech.heal
          ? { heal: { dice: mech.heal.dice ?? '', bonus: (mech.heal.addMod ? mod : 0) + (mech.heal.flat ?? 0) } }
          : {}),
        ...(upcastOf(mech) ? { upcast: upcastOf(mech) } : {}),
      });
    }
  }

  // Features with action-economy data.
  const seen = new Set<string>();
  for (const { feature, source } of resolved.features) {
    const meta = FEATURE_ACTIONS[feature.id];
    if (!meta || seen.has(feature.id)) continue;
    seen.add(feature.id);
    const sourceClass =
      meta.scaleClass ??
      (source.origin === 'class' ? source.id : source.origin === 'subclass' ? source.classId : undefined);
    const level = sourceClass ? (classLevels[sourceClass] ?? 0) : characterLevel;
    const levelBonus = (b?: LevelBonus) =>
      b === undefined ? 0 : b === true ? level : b === 'half' ? Math.floor(level / 2) : b * level;
    // A dice table whose first row is above the current level means "not yet": no roll.
    const rollFor = (r: ActionDamage | ActionHeal | undefined): ResolvedRoll | null => {
      if (!r) return null;
      const dice = r.dice === undefined ? '' : scaleDice(r.dice, level);
      if (dice === null) return null;
      return { dice, bonus: modOf(r.addMod) + levelBonus(r.addLevel) + (r.flat ?? 0) };
    };
    const damageRoll = rollFor(meta.damage);
    const healRoll = rollFor(meta.heal);
    actions.push({
      key: `feature:${feature.id}`,
      kind: 'feature',
      refId: feature.id,
      activation: meta.activation,
      isAttack: Boolean(meta.attack || damageRoll),
      ...(meta.attack ? { toHit: pb + modOf(meta.attack.ability) } : {}),
      ...(meta.save ? { save: { ability: meta.save.ability, dc: 8 + pb + modOf(meta.save.dcAbility) } } : {}),
      ...(meta.damage && damageRoll ? { damage: { ...damageRoll, type: meta.damage.type } } : {}),
      ...(healRoll ? { heal: healRoll } : {}),
      ...(meta.poolId ? { poolId: meta.poolId } : {}),
    });
  }

  return { actions, attacksPerAction: attacksPerAction(new Set(resolved.features.map((f) => f.feature.id))) };
}

function upcastOf(mech: SpellMechanics): string | undefined {
  return mech.damage?.perSlot ?? mech.heal?.perSlot ?? mech.heal?.flatPerSlot?.toString();
}
