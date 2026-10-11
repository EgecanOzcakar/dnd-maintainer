import type { ClassId } from '@/lib/dnd-helpers';
import { getSpellsForList } from '@/lib/sources/spells';
import type { ResolvedSpellcasting } from '@/types/resolved';

/**
 * 2024 preparation model:
 * - Wizard prepares from the spellbook (`knownSpells`).
 * - Cleric, druid, paladin and ranger prepare from their whole class list (up to their highest slot level).
 * - Bard, sorcerer and warlock (`preparedCount === 0`) have no daily choice: every known spell is prepared.
 * Cantrips and always-prepared spells never count toward the cap and are never in the pool.
 */
const WHOLE_LIST_CLASSES: ReadonlySet<string> = new Set(['cleric', 'druid', 'paladin', 'ranger']);

/** True when the player chooses prepared spells on a Long Rest. */
export function canPrepareSpells(sc: ResolvedSpellcasting | null | undefined): boolean {
  return !!sc && !sc.cannotCastSpells && sc.preparedCount > 0;
}

function maxSpellLevel(sc: ResolvedSpellcasting): number {
  return sc.slots.reduce((max, n, i) => (n > 0 ? i + 1 : max), 0);
}

/** Leveled spells the player may choose from, excluding always-prepared spells. */
export function getPreparationPool(classId: ClassId | string | null, sc: ResolvedSpellcasting): string[] {
  const always = new Set(sc.alwaysPreparedSpells);
  const ids = new Set(sc.knownSpells.map((s) => s.spellId));
  if (classId && WHOLE_LIST_CLASSES.has(classId)) {
    const top = maxSpellLevel(sc);
    for (const def of getSpellsForList(classId as ClassId)) if (def.level > 0 && def.level <= top) ids.add(def.id);
  }
  return [...ids].filter((id) => !always.has(id));
}

/**
 * The leveled spells currently prepared (cantrips and always-prepared spells are implicit).
 * An empty stored list falls back to `knownSpells` so existing characters lose nothing.
 */
export function getEffectivePrepared(stored: readonly string[] | null | undefined, sc: ResolvedSpellcasting): string[] {
  const always = new Set(sc.alwaysPreparedSpells);
  const base = stored && stored.length > 0 ? stored : sc.knownSpells.map((s) => s.spellId);
  return [...new Set(base)].filter((id) => !always.has(id));
}

/** Toggle a spell; refuses to prepare beyond the cap or a spell outside the pool. Unpreparing always works. */
export function togglePrepared(
  prepared: readonly string[],
  spellId: string,
  cap: number,
  pool: readonly string[]
): string[] {
  if (prepared.includes(spellId)) return prepared.filter((id) => id !== spellId);
  if (prepared.length >= cap || !pool.includes(spellId)) return [...prepared];
  return [...prepared, spellId];
}
