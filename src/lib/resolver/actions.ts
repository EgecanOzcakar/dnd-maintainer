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

/** One term of a to-hit or damage bonus, e.g. `{ type: 'ability', label: 'str', value: 3 }`. */
export interface BreakdownPart {
  readonly type: string;
  readonly label: string;
  readonly value: number;
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
  /** What `toHit` and `damage.bonus` are made of, shown on the roll. */
  readonly toHitParts?: readonly BreakdownPart[];
  readonly damageParts?: readonly BreakdownPart[];
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
  /** Homebrew rows: literal display name (instead of an i18n lookup) and the source entry id. */
  readonly name?: string;
  readonly homebrewId?: string;
  readonly usesPerRest?: { readonly max: number; readonly rest: 'short' | 'long' };
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

/**
 * Adds an upcast bonus (`1d6` or a flat `10` per slot level) for `steps` levels above the spell's own.
 * Same-die dice merge into the base roll; a different die comes back as `extra` to roll alongside.
 */
export function upcastRoll(
  base: ResolvedRoll,
  upcast: string | undefined,
  steps: number
): { roll: ResolvedRoll; extra: string[] } {
  if (!upcast || steps <= 0) return { roll: base, extra: [] };
  const add = /^(\d+)d(\d+)$/.exec(upcast);
  if (!add) return { roll: { ...base, bonus: base.bonus + Number(upcast) * steps }, extra: [] };
  const count = Number(add[1]) * steps;
  const have = /^(\d+)d(\d+)$/.exec(base.dice);
  if (have && have[2] === add[2]) return { roll: { ...base, dice: `${Number(have[1]) + count}d${add[2]}` }, extra: [] };
  return { roll: base, extra: [`+${count}d${add[2]}`] };
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

  const abilityOf = (source: ModSource): string => (source === 'spellcasting' ? (spellcasting?.ability ?? '') : source);

  // Weapons (already resolved with full to-hit/damage breakdowns).
  for (const attack of resolved.attacks) {
    actions.push({
      key: `weapon:${attack.weaponId}${attack.offHand ? ':off-hand' : ''}`,
      kind: 'weapon',
      refId: attack.weaponId,
      activation: attack.offHand ? 'bonus-action' : 'action',
      isAttack: true,
      toHit: attack.attackBonus,
      toHitParts: attack.attackBreakdown,
      damageParts: attack.damageBreakdown,
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
        ...(mech.attack
          ? {
              toHit: pb + mod,
              toHitParts: [
                { type: 'ability', label: ability ?? '', value: mod },
                { type: 'proficiency', label: 'proficiency', value: pb },
              ],
            }
          : {}),
        ...(mech.damage && (mech.damage.addMod || mech.damage.flat)
          ? {
              damageParts: [
                ...(mech.damage.addMod && ability ? [{ type: 'ability', label: ability, value: mod }] : []),
                ...(mech.damage.flat ? [{ type: 'flat', label: 'flat', value: mech.damage.flat }] : []),
              ],
            }
          : {}),
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
      ...(meta.attack
        ? {
            toHit: pb + modOf(meta.attack.ability),
            toHitParts: [
              { type: 'ability', label: abilityOf(meta.attack.ability), value: modOf(meta.attack.ability) },
              { type: 'proficiency', label: 'proficiency', value: pb },
            ],
          }
        : {}),
      ...(meta.damage && damageRoll
        ? {
            damageParts: [
              ...(meta.damage.addMod
                ? [{ type: 'ability', label: abilityOf(meta.damage.addMod), value: modOf(meta.damage.addMod) }]
                : []),
              ...(meta.damage.addLevel !== undefined
                ? [{ type: 'level', label: 'level', value: levelBonus(meta.damage.addLevel) }]
                : []),
              ...(meta.damage.flat ? [{ type: 'flat', label: 'flat', value: meta.damage.flat }] : []),
            ],
          }
        : {}),
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
