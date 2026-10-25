import { describe, it, expect } from 'vitest';
import {
  BUNDLE_CATALOG,
  getBundleDef,
  getItemsForSlot,
  requireBundleDef,
  resolveBundleRef,
} from '@/lib/sources/bundles';
import { getItemDef } from '@/lib/sources/items';

describe('BUNDLE_CATALOG', () => {
  it('has unique ids', () => {
    const ids = BUNDLE_CATALOG.map((b) => b.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('every bundle has at least one fixed item or slot', () => {
    for (const bundle of BUNDLE_CATALOG) {
      expect(
        bundle.contents.length + bundle.slots.length,
        `bundle "${bundle.id}" must have at least one item or slot`
      ).toBeGreaterThan(0);
    }
  });

  it('all content itemIds resolve via getItemDef', () => {
    for (const bundle of BUNDLE_CATALOG) {
      for (const { itemId } of bundle.contents) {
        const def = getItemDef(itemId);
        expect(def, `bundle "${bundle.id}" references unknown itemId "${itemId}"`).toBeDefined();
      }
    }
  });

  it('every slot filter yields a non-empty candidate list', () => {
    for (const bundle of BUNDLE_CATALOG) {
      for (const slot of bundle.slots) {
        const candidates = getItemsForSlot(slot.filter);
        expect(
          candidates.length,
          `bundle "${bundle.id}" slot "${slot.slotKey}" has no candidate items`
        ).toBeGreaterThan(0);
      }
    }
  });

  it('all bundles have unique slotKey values within their slots', () => {
    for (const bundle of BUNDLE_CATALOG) {
      const slotKeys = bundle.slots.map((s) => s.slotKey);
      const uniqueKeys = new Set(slotKeys);
      expect(uniqueKeys.size, `bundle "${bundle.id}" has duplicate slotKeys: ${slotKeys.join(', ')}`).toBe(
        slotKeys.length
      );
    }
  });

  it('all bundles have a valid category', () => {
    const validCategories = ['loadout', 'armor', 'melee-weapon', 'ranged-weapon', 'pack', 'gear'] as const;
    for (const bundle of BUNDLE_CATALOG) {
      expect(validCategories, `bundle "${bundle.id}" has invalid category "${bundle.category}"`).toContain(
        bundle.category
      );
    }
  });
});

describe('getBundleDef', () => {
  it('returns the correct bundle for a known id', () => {
    const bundle = getBundleDef('fighter-chainmail');
    expect(bundle).toBeDefined();
    expect(bundle?.id).toBe('fighter-chainmail');
    expect(bundle?.category).toBe('loadout');
    expect(bundle?.contents).toHaveLength(1);
    expect(bundle?.contents[0].itemId).toBe('chain-mail');
  });

  it('returns undefined for an unknown id', () => {
    expect(getBundleDef('nonexistent-bundle')).toBeUndefined();
  });
});

describe('requireBundleDef', () => {
  it('returns the bundle for a known id', () => {
    const bundle = requireBundleDef('fighter-archer-kit');
    expect(bundle.id).toBe('fighter-archer-kit');
    expect(bundle.category).toBe('loadout');
    expect(bundle.contents).toHaveLength(3);
  });

  it('throws for an unknown id', () => {
    expect(() => requireBundleDef('nonexistent-bundle')).toThrow('Unknown bundle id');
  });
});

describe('starting-equipment loadouts (2024 PHB)', () => {
  const contents = (id: string) => Object.fromEntries(resolveBundleRef(id).contents.map((c) => [c.itemId, c.quantity]));

  it('rogue-loadout is Option A with 8 GP left over', () => {
    expect(contents('rogue-loadout')).toEqual({
      leather: 1,
      dagger: 2,
      shortsword: 1,
      shortbow: 1,
      'arrows-20': 1,
      quiver: 1,
      'thieves-tools': 1,
      'burglars-pack': 1,
    });
    expect(getBundleDef('rogue-loadout')?.gp).toBe(8);
  });

  it("fighter-loadout-a is chain mail, greatsword, flail, 8 javelins and a Dungeoneer's Pack (+4 GP)", () => {
    expect(contents('fighter-loadout-a')).toEqual({
      'chain-mail': 1,
      greatsword: 1,
      flail: 1,
      javelin: 8,
      'dungeoneers-pack': 1,
    });
    expect(getBundleDef('fighter-loadout-a')?.gp).toBe(4);
  });

  it('fighter-loadout-b is the archer kit with studded leather (+11 GP)', () => {
    expect(contents('fighter-loadout-b')).toEqual({
      'studded-leather': 1,
      scimitar: 1,
      shortsword: 1,
      longbow: 1,
      'arrows-20': 1,
      quiver: 1,
      'dungeoneers-pack': 1,
    });
    expect(getBundleDef('fighter-loadout-b')?.gp).toBe(11);
  });

  it('barbarian-loadout keeps 15 GP', () => {
    expect(getBundleDef('barbarian-loadout')?.gp).toBe(15);
  });
});

describe('resolveBundleRef', () => {
  it('resolves a fixed bundle id to its contents with kind "bundle"', () => {
    const result = resolveBundleRef('fighter-archer-kit');
    expect(result.kind).toBe('bundle');
    expect(result.contents).toHaveLength(3);
    expect(result.contents.map((c) => c.itemId)).toContain('longbow');
  });

  it('resolves a slotted bundle id, returning only the fixed contents (ignores slots)', () => {
    // martial-weapon-and-shield has zero fixed items and two slots (weapon + shield).
    // resolveBundleRef returns only the fixed contents; slot resolution lives in the resolver.
    const result = resolveBundleRef('martial-weapon-and-shield');
    expect(result.kind).toBe('bundle');
    expect(result.contents).toHaveLength(0);
    const bundle = getBundleDef('martial-weapon-and-shield');
    expect(bundle?.slots).toHaveLength(2);
  });

  it('resolves a pack item id to its contents with kind "pack"', () => {
    const result = resolveBundleRef('dungeoneers-pack');
    expect(result.kind).toBe('pack');
    expect(result.contents.length).toBeGreaterThan(0);
    expect(result.contents.map((c) => c.itemId)).toContain('backpack');
  });

  it('resolves explorers-pack to contents with kind "pack"', () => {
    const result = resolveBundleRef('explorers-pack');
    expect(result.kind).toBe('pack');
    expect(result.contents.map((c) => c.itemId)).toContain('bedroll');
  });

  it('throws for an unknown id', () => {
    expect(() => resolveBundleRef('completely-unknown')).toThrow('Unknown bundle or pack id');
  });

  // Spot checks for each Fighter bundle
  it('fighter-chainmail contains chain-mail', () => {
    const result = resolveBundleRef('fighter-chainmail');
    expect(result.contents[0].itemId).toBe('chain-mail');
    expect(result.contents[0].quantity).toBe(1);
  });

  it('fighter-archer-kit contains leather, longbow, arrows-20', () => {
    const result = resolveBundleRef('fighter-archer-kit');
    const ids = result.contents.map((c) => c.itemId);
    expect(ids).toContain('leather');
    expect(ids).toContain('longbow');
    expect(ids).toContain('arrows-20');
  });

  it('two-martial-weapons has no fixed contents (two slots instead)', () => {
    const result = resolveBundleRef('two-martial-weapons');
    expect(result.kind).toBe('bundle');
    expect(result.contents).toHaveLength(0);
    const bundle = getBundleDef('two-martial-weapons');
    expect(bundle?.slots).toHaveLength(2);
  });

  it('light-crossbow-kit contains light-crossbow and bolts-20', () => {
    const result = resolveBundleRef('light-crossbow-kit');
    const ids = result.contents.map((c) => c.itemId);
    expect(ids).toContain('light-crossbow');
    expect(ids).toContain('bolts-20');
  });
});
