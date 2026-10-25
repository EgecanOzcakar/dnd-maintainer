import type { SpellSlotsUsed } from '@/lib/rest';

/** Combined slot levels a Wizard can recover: half their Wizard level, rounded up. */
export const arcaneBudget = (wizardLevel: number): number => Math.ceil(wizardLevel / 2);

/** Recovers one spent slot of `level` (5th or lower, within the remaining budget); null when it can't. */
export function recoverSlot(
  spent: SpellSlotsUsed,
  level: number,
  budget: number
): { slots: SpellSlotsUsed; budget: number } | null {
  const key = String(level);
  if (level > 5 || level > budget || (spent[key] ?? 0) <= 0) return null;
  return { slots: { ...spent, [key]: (spent[key] ?? 0) - 1 }, budget: budget - level };
}
