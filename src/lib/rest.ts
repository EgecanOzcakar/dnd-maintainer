import type { Character } from '@/types/database';
import type { ResolvedCharacter } from '@/types/resolved';

// Local aliases for clarity
export type HitDiceUsed = Record<string, number>;
export type SpellSlotsUsed = Record<string, number>;

/** Uses spent per feature resource pool (rage, channel-divinity, ...). */
export type PoolsUsed = Record<string, number>;

export interface RestUsed {
  readonly hitDiceUsed: HitDiceUsed;
  readonly spellSlotsUsed: SpellSlotsUsed;
}

/**
 * Returns the maximum hit dice available, keyed by die size string.
 * E.g. { "8": 3 } for a level-3 cleric.
 */
export function getHitDiceMax(resolved: ResolvedCharacter): HitDiceUsed {
  const max: Record<string, number> = {};
  for (const { die, count } of resolved.hitDie) {
    const key = String(die);
    max[key] = (max[key] ?? 0) + count;
  }
  return max;
}

/**
 * Returns the maximum spell slots available, keyed by spell-level string "1".."9".
 * Pact magic is keyed as "pact" with value pactMagic.count.
 * Levels with 0 slots are omitted.
 */
export function getSpellSlotMax(resolved: ResolvedCharacter): SpellSlotsUsed {
  if (!resolved.spellcasting) return {};

  const max: Record<string, number> = {};

  // Normal spell slots: slots[i] = slots for spell level i+1
  resolved.spellcasting.slots.forEach((count, index) => {
    if (count > 0) {
      max[String(index + 1)] = count;
    }
  });

  // Pact magic
  if (resolved.spellcasting.pactMagic !== null) {
    max['pact'] = resolved.spellcasting.pactMagic.count;
  }

  return max;
}

/**
 * Spends one hit die of the given size.
 * Increments used[String(dieSize)] clamped to the max for that die.
 * Returns a new object (no mutation).
 */
export function spendHitDie(used: HitDiceUsed, dieSize: number, maxByDie: HitDiceUsed): HitDiceUsed {
  const key = String(dieSize);
  const currentUsed = used[key] ?? 0;
  const max = maxByDie[key] ?? 0;
  if (currentUsed >= max) return used;
  return { ...used, [key]: currentUsed + 1 };
}

/**
 * Marks one spell slot of the given level as used.
 * Increments used[String(level)] clamped to max[String(level)].
 * level may be a number (1-9) or 'pact'.
 * Returns a new object (no mutation).
 */
export function markSpellSlot(used: SpellSlotsUsed, level: number | 'pact', max: SpellSlotsUsed): SpellSlotsUsed {
  const key = String(level);
  const currentUsed = used[key] ?? 0;
  const maxForLevel = max[key] ?? 0;
  if (currentUsed >= maxForLevel) return used;
  return { ...used, [key]: currentUsed + 1 };
}

/**
 * Recovers one spell slot of the given level (decrements used).
 * Clamped at 0 — cannot go negative.
 * level may be a number (1-9) or 'pact'.
 * Returns a new object (no mutation).
 */
export function recoverSpellSlot(used: SpellSlotsUsed, level: number | 'pact'): SpellSlotsUsed {
  const key = String(level);
  const currentUsed = used[key] ?? 0;
  if (currentUsed <= 0) return used;
  return { ...used, [key]: currentUsed - 1 };
}

/**
 * Builds the Partial<Character> update payload for a short or long rest.
 * Pure function — safe to test without any component or mutation machinery.
 */
export function buildRestUpdate(
  kind: 'short' | 'long',
  character: Pick<Character, 'hit_dice_used' | 'spell_slots_used' | 'resource_pools_used'>,
  resolved: ResolvedCharacter
): { hit_dice_used: HitDiceUsed; spell_slots_used: SpellSlotsUsed; resource_pools_used: PoolsUsed } {
  const restUsed: RestUsed = {
    hitDiceUsed: character.hit_dice_used ?? {},
    spellSlotsUsed: character.spell_slots_used ?? {},
  };
  const next = kind === 'short' ? applyShortRest(restUsed, resolved) : applyLongRest(restUsed, resolved);
  return {
    hit_dice_used: next.hitDiceUsed,
    spell_slots_used: next.spellSlotsUsed,
    resource_pools_used: applyPoolRest(character.resource_pools_used ?? {}, resolved, kind),
  };
}

/**
 * Applies a short rest.
 * - Resets pact magic slots to 0 if the character has pact magic.
 * - Hit dice and normal spell slots are unchanged.
 * Returns new objects (no mutation).
 */
export function applyShortRest(used: RestUsed, resolved: ResolvedCharacter): RestUsed {
  if (resolved.spellcasting?.pactMagic !== null && resolved.spellcasting?.pactMagic !== undefined) {
    return {
      hitDiceUsed: used.hitDiceUsed,
      spellSlotsUsed: { ...used.spellSlotsUsed, pact: 0 },
    };
  }
  return used;
}

/**
 * Applies a long rest.
 * - Resets ALL spell slots (including pact) to 0.
 * - Recovers hit dice: budget = max(1, floor(totalLevel / 2)), allocated
 *   largest-die-first (documented simplification — RAW lets the player choose).
 * Returns new objects (no mutation).
 */
export function applyLongRest(used: RestUsed, resolved: ResolvedCharacter): RestUsed {
  // Reset all spell slots
  const spellSlotsUsed: SpellSlotsUsed = {};
  for (const key of Object.keys(used.spellSlotsUsed)) {
    spellSlotsUsed[key] = 0;
  }

  // Recover hit dice: budget = max(1, floor(totalLevel / 2))
  const totalLevel = resolved.hitDie.reduce((sum, { count }) => sum + count, 0);
  let budget = Math.max(1, Math.floor(totalLevel / 2));

  const hitDiceUsed = { ...used.hitDiceUsed };

  // Sort hit die entries by die size descending (largest first)
  const sortedDice = [...resolved.hitDie].sort((a, b) => b.die - a.die);

  for (const { die } of sortedDice) {
    if (budget <= 0) break;
    const key = String(die);
    const currentUsed = hitDiceUsed[key] ?? 0;
    if (currentUsed <= 0) continue;
    // Recover as many dice of this size as the budget allows
    const recover = Math.min(budget, currentUsed);
    hitDiceUsed[key] = currentUsed - recover;
    budget -= recover;
  }

  return { hitDiceUsed, spellSlotsUsed };
}

/** Uses left in a pool. */
export function poolRemaining(used: PoolsUsed, poolId: string, max: number): number {
  return Math.max(0, max - (used[poolId] ?? 0));
}

/** Spends (`delta` > 0) or restores (`delta` < 0) uses of a pool, clamped to 0..max. */
export function spendPool(used: PoolsUsed, poolId: string, max: number, delta = 1): PoolsUsed {
  return { ...used, [poolId]: Math.min(max, Math.max(0, (used[poolId] ?? 0) + delta)) };
}

/**
 * Pool recovery: a long rest restores everything; a short rest restores `short-rest` pools fully
 * and `compound` pools by their `shortRestAmount` (e.g. Psionic Energy regains 1 die).
 */
export function applyPoolRest(used: PoolsUsed, resolved: ResolvedCharacter, kind: 'short' | 'long'): PoolsUsed {
  if (kind === 'long') return {};
  const next = { ...used };
  for (const { poolId, regen } of resolved.resourcePools) {
    if (regen === 'short-rest') delete next[poolId];
    else if (typeof regen === 'object' && next[poolId])
      next[poolId] = Math.max(0, next[poolId] - regen.shortRestAmount);
  }
  // Sorcerous Restoration: regain half your level in Sorcery Points on a short rest, once per long rest.
  const restoration = resolved.resourcePools.find((p) => p.poolId === 'sorcerous-restoration');
  const points = resolved.resourcePools.find((p) => p.poolId === 'sorcery-points');
  if (
    restoration &&
    points &&
    (next['sorcerous-restoration'] ?? 0) < restoration.max &&
    (next['sorcery-points'] ?? 0) > 0
  ) {
    next['sorcery-points'] = Math.max(0, next['sorcery-points'] - Math.floor(points.max / 2));
    next['sorcerous-restoration'] = (next['sorcerous-restoration'] ?? 0) + 1;
  }
  return next;
}
