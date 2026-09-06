/**
 * Magic-item reference data (D&D 2024 SRD).
 *
 * This is a standalone browse/lookup catalog — magic items are intentionally NOT
 * part of the `ItemDef` union in `@/types/items` and carry no inventory /
 * attunement wiring. The catalog itself is generated: see
 * `src/lib/sources/magic-items.ts` and `scripts/gen-srd-items.ts`.
 */

export const MAGIC_ITEM_RARITIES = [
  'common',
  'uncommon',
  'rare',
  'very-rare',
  'legendary',
  'artifact',
  'varies',
] as const;
export type MagicItemRarity = (typeof MAGIC_ITEM_RARITIES)[number];

export const MAGIC_ITEM_CATEGORIES = [
  'armor',
  'weapon',
  'wondrous-item',
  'ring',
  'staff',
  'wand',
  'potion',
  'other',
] as const;
export type MagicItemCategory = (typeof MAGIC_ITEM_CATEGORIES)[number];

export interface MagicItemDef {
  readonly id: string;
  /** English name from the SRD (reference data — not translated). */
  readonly name: string;
  readonly category: MagicItemCategory;
  readonly rarity: MagicItemRarity;
  readonly attunement: boolean;
  /** Free-text qualifier when attunement is restricted, e.g. "a spellcaster". */
  readonly attunementNote?: string;
  /** CC-BY-4.0 SRD 5.2.1 text. Attribution lives in the generated module header. */
  readonly description: string;
  /** Parent item id when this is a graded variant (e.g. `armor-1` -> `armor`). */
  readonly variantOf?: string;
}
