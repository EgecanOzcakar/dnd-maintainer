import type { PoolsUsed, SpellSlotsUsed } from '@/lib/rest';
import { poolRemaining, spendPool } from '@/lib/rest';
import { SLOT_CREATION_COST, SLOT_CREATION_MIN_LEVEL, SORCERY_POINTS } from '@/lib/sources/metamagic';

export interface SorceryState {
  readonly slots: SpellSlotsUsed;
  readonly pools: PoolsUsed;
}

/** Pays Sorcery Points; null when there aren't enough. */
export function spendSorceryPoints(pools: PoolsUsed, spMax: number, cost: number): PoolsUsed | null {
  return poolRemaining(pools, SORCERY_POINTS, spMax) >= cost ? spendPool(pools, SORCERY_POINTS, spMax, cost) : null;
}

/** Font of Magic: expend a slot, gain Sorcery Points equal to its level (capped at the maximum). */
export function slotToPoints(
  { slots, pools }: SorceryState,
  slotMax: SpellSlotsUsed,
  spMax: number,
  level: number
): SorceryState | null {
  const key = String(level);
  if ((slotMax[key] ?? 0) - (slots[key] ?? 0) <= 0) return null;
  return {
    slots: { ...slots, [key]: (slots[key] ?? 0) + 1 },
    pools: spendPool(pools, SORCERY_POINTS, spMax, -level),
  };
}

/**
 * Font of Magic: pay Sorcery Points for a spell slot. A created slot is stored as a negative
 * `spent` count, i.e. one more slot than the maximum, and vanishes on a long rest like any used slot.
 * `spMax` is the Sorcery Points maximum, which equals the Sorcerer level — the slot level also needs a minimum Sorcerer level.
 */
export function createSlot({ slots, pools }: SorceryState, spMax: number, level: number): SorceryState | null {
  const cost = SLOT_CREATION_COST[level];
  const paid =
    cost === undefined || spMax < SLOT_CREATION_MIN_LEVEL[level] ? null : spendSorceryPoints(pools, spMax, cost);
  if (!paid) return null;
  const key = String(level);
  return { slots: { ...slots, [key]: (slots[key] ?? 0) - 1 }, pools: paid };
}
