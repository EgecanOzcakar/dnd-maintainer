import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { MAGIC_ITEM_CATALOG, getMagicItemDef, requireMagicItemDef } from '@/lib/sources/magic-items';
import { MAGIC_ITEM_CATEGORIES, MAGIC_ITEM_RARITIES } from '@/types/magic-items';

describe('MAGIC_ITEM_CATALOG', () => {
  it('is non-empty', () => {
    expect(MAGIC_ITEM_CATALOG.length).toBeGreaterThan(200);
  });

  it('has unique ids', () => {
    const ids = MAGIC_ITEM_CATALOG.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('uses only known rarity and category enums', () => {
    for (const item of MAGIC_ITEM_CATALOG) {
      expect(MAGIC_ITEM_RARITIES).toContain(item.rarity);
      expect(MAGIC_ITEM_CATEGORIES).toContain(item.category);
    }
  });

  it('has non-empty name and description for every item', () => {
    for (const item of MAGIC_ITEM_CATALOG) {
      expect(item.name.length).toBeGreaterThan(0);
      expect(item.description.length).toBeGreaterThan(0);
    }
  });

  it('every variantOf points at a real catalog item', () => {
    const ids = new Set(MAGIC_ITEM_CATALOG.map((i) => i.id));
    for (const item of MAGIC_ITEM_CATALOG) {
      if (item.variantOf) expect(ids.has(item.variantOf)).toBe(true);
    }
  });

  it('flags attunement whenever the text requires it', () => {
    for (const item of MAGIC_ITEM_CATALOG) {
      if (/requires attunement/i.test(item.description)) expect(item.attunement).toBe(true);
    }
  });

  it('carries the SRD CC-BY attribution in the generated module header', () => {
    const src = readFileSync('src/lib/sources/magic-items.ts', 'utf8');
    expect(src).toContain('System Reference Document 5.2.1');
    expect(src).toContain('Creative Commons Attribution 4.0');
  });

  it('lookups resolve', () => {
    const first = MAGIC_ITEM_CATALOG[0];
    expect(getMagicItemDef(first.id)).toEqual(first);
    expect(requireMagicItemDef(first.id)).toEqual(first);
    expect(getMagicItemDef('nope')).toBeUndefined();
    expect(() => requireMagicItemDef('nope')).toThrow();
  });
});
