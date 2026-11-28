import type { CustomModifier } from '@/types/database';

/**
 * Display name for a user-authored custom item id (`custom-kara-avuc` → `Kara Avuc`).
 * Ids are built by replacing spaces with `-`, so `--` was ` -` (e.g. "-1") and `---` was ` - `.
 */
export function customItemName(itemId: string): string {
  return itemId
    .replace(/^custom-/, '')
    .replace(/-+/g, (run) => (run.length === 1 ? ' ' : run.length === 2 ? ' -' : ' - '))
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Free-text effect notes stored on a custom item's loot source tag, or ''. */
export function getItemNotes(source: unknown): string {
  return typeof source === 'object' && source !== null && 'notes' in source && typeof source.notes === 'string'
    ? source.notes
    : '';
}

/** Modifiers that apply now: ticked, and (when tied to an item) that item is equipped. */
export function activeCustomModifiers(
  modifiers: readonly CustomModifier[],
  equippedItemIds: readonly string[]
): CustomModifier[] {
  return modifiers.filter((m) => m.enabled && (!m.itemId || equippedItemIds.includes(m.itemId)));
}
