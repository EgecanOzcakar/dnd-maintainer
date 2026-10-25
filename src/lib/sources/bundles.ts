import type { BundleDef, ItemDef, SlotFilter } from '@/types/items';
import { ARMOR_CATALOG, getItemDef, WEAPON_CATALOG } from '@/lib/sources/items';

export const BUNDLE_CATALOG: readonly BundleDef[] = [
  // Barbarian starting equipment (2024 PHB, Option A): a single fixed package.
  {
    id: 'barbarian-loadout',
    category: 'loadout',
    contents: [
      { itemId: 'greataxe', quantity: 1 },
      { itemId: 'handaxe', quantity: 4 },
      { itemId: 'explorers-pack', quantity: 1 },
    ],
    gp: 15,
    slots: [],
  },
  // Fighter starting equipment (2024 PHB): Option A and B; Option C (155 GP) is buy-with-gold.
  {
    id: 'fighter-loadout-a',
    category: 'loadout',
    contents: [
      { itemId: 'chain-mail', quantity: 1 },
      { itemId: 'greatsword', quantity: 1 },
      { itemId: 'flail', quantity: 1 },
      { itemId: 'javelin', quantity: 8 },
      { itemId: 'dungeoneers-pack', quantity: 1 },
    ],
    gp: 4,
    slots: [],
  },
  {
    id: 'fighter-loadout-b',
    category: 'loadout',
    contents: [
      { itemId: 'studded-leather', quantity: 1 },
      { itemId: 'scimitar', quantity: 1 },
      { itemId: 'shortsword', quantity: 1 },
      { itemId: 'longbow', quantity: 1 },
      { itemId: 'arrows-20', quantity: 1 },
      { itemId: 'quiver', quantity: 1 },
      { itemId: 'dungeoneers-pack', quantity: 1 },
    ],
    gp: 11,
    slots: [],
  },
  {
    id: 'fighter-chainmail',
    category: 'loadout',
    contents: [{ itemId: 'chain-mail', quantity: 1 }],
    slots: [],
  },
  {
    id: 'fighter-archer-kit',
    category: 'loadout',
    contents: [
      { itemId: 'leather', quantity: 1 },
      { itemId: 'longbow', quantity: 1 },
      { itemId: 'arrows-20', quantity: 1 },
    ],
    slots: [],
  },
  {
    id: 'martial-weapon-and-shield',
    category: 'melee-weapon',
    contents: [],
    slots: [
      {
        slotKey: 'weapon',
        quantity: 1,
        filter: { kind: 'weapon', category: 'martial' },
      },
      {
        slotKey: 'shield',
        quantity: 1,
        filter: { kind: 'armor', category: 'shield' },
      },
    ],
  },
  {
    id: 'two-martial-weapons',
    category: 'melee-weapon',
    contents: [],
    slots: [
      {
        slotKey: 'weapon-1',
        quantity: 1,
        filter: { kind: 'weapon', category: 'martial' },
      },
      {
        slotKey: 'weapon-2',
        quantity: 1,
        filter: { kind: 'weapon', category: 'martial' },
      },
    ],
  },
  {
    id: 'light-crossbow-kit',
    category: 'ranged-weapon',
    contents: [
      { itemId: 'light-crossbow', quantity: 1 },
      { itemId: 'bolts-20', quantity: 1 },
    ],
    slots: [],
  },
  // Rogue starting equipment (2024 PHB, Option A); Option B (100 GP) is buy-with-gold.
  {
    id: 'rogue-loadout',
    category: 'loadout',
    contents: [
      { itemId: 'leather', quantity: 1 },
      { itemId: 'dagger', quantity: 2 },
      { itemId: 'shortsword', quantity: 1 },
      { itemId: 'shortbow', quantity: 1 },
      { itemId: 'arrows-20', quantity: 1 },
      { itemId: 'quiver', quantity: 1 },
      { itemId: 'thieves-tools', quantity: 1 },
      { itemId: 'burglars-pack', quantity: 1 },
    ],
    gp: 8,
    slots: [],
  },
];

export function getBundleDef(id: string): BundleDef | undefined {
  return BUNDLE_CATALOG.find((b) => b.id === id);
}

export function requireBundleDef(id: string): BundleDef {
  const bundle = getBundleDef(id);
  if (!bundle) throw new Error(`Unknown bundle id: "${id}"`);
  return bundle;
}

/** Returns the i18n key for a bundle's display name. */
export function getBundleNameKey(bundleId: string): `bundles.${string}.name` {
  return `bundles.${bundleId}.name`;
}

/**
 * Resolves a bundle or pack id to its fixed contents and kind.
 * Note: this ignores any bundle slots — callers that need slot-materialized items must
 * resolve them separately via `getItemsForSlot` and user slot picks.
 * Checks BUNDLE_CATALOG first, then falls back to pack-type items in ITEM_CATALOG.
 * Throws if the id is unknown or does not resolve to a bundle/pack.
 */
export function resolveBundleRef(id: string): {
  readonly contents: readonly { readonly itemId: string; readonly quantity: number }[];
  readonly kind: 'bundle' | 'pack';
} {
  const bundle = getBundleDef(id);
  if (bundle) return { contents: bundle.contents, kind: 'bundle' };

  const item = getItemDef(id);
  if (item?.type === 'pack') return { contents: item.contents, kind: 'pack' };

  throw new Error(`Unknown bundle or pack id: "${id}"`);
}

/**
 * Returns every item from WEAPON_CATALOG / ARMOR_CATALOG that satisfies the given SlotFilter.
 * Used by the ChoicePicker slot UI to populate the Select dropdown for slotted bundles,
 * and by the resolver to validate persisted slot picks against the current catalog.
 */
export function getItemsForSlot(filter: SlotFilter): readonly ItemDef[] {
  if (filter.kind === 'weapon') {
    return WEAPON_CATALOG.filter((w) => {
      if (filter.category !== undefined && w.category !== filter.category) return false;
      if (filter.range !== undefined && w.range !== filter.range) return false;
      return true;
    });
  }
  // armor
  return ARMOR_CATALOG.filter((a) => a.category === filter.category);
}
