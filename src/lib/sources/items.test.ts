import { describe, it, expect } from 'vitest';
import {
  WEAPON_CATALOG,
  ARMOR_CATALOG,
  PACK_CATALOG,
  ITEM_CATALOG,
  getItemDef,
  requireItemDef,
} from '@/lib/sources/items';
import { WEAPON_MASTERIES } from '@/types/items';

describe('ITEM_CATALOG', () => {
  it('all item IDs are unique across the combined catalog', () => {
    const ids = ITEM_CATALOG.map((item) => item.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('all weapons have valid damageDice format (NdN)', () => {
    const diceRegex = /^\d+d\d+$/;
    for (const weapon of WEAPON_CATALOG) {
      expect(weapon.damageDice, `weapon ${weapon.id} damageDice`).toMatch(diceRegex);
    }
  });

  it('all armor has baseAc > 0', () => {
    for (const armor of ARMOR_CATALOG) {
      expect(armor.baseAc, `armor ${armor.id} baseAc`).toBeGreaterThan(0);
    }
  });

  it('all pack contents reference valid item IDs in the catalog', () => {
    const allIds = new Set(ITEM_CATALOG.map((item) => item.id));
    for (const pack of PACK_CATALOG) {
      for (const { itemId } of pack.contents) {
        expect(allIds.has(itemId), `pack ${pack.id} references unknown item "${itemId}"`).toBe(true);
      }
    }
  });

  it('longsword is martial melee 1d8 slashing with versatile and versatileDice 1d10', () => {
    const def = getItemDef('longsword');
    expect(def).toBeDefined();
    if (!def || def.type !== 'weapon') throw new Error('longsword should be a weapon');
    expect(def.category).toBe('martial');
    expect(def.range).toBe('melee');
    expect(def.damageDice).toBe('1d8');
    expect(def.damageType).toBe('slashing');
    expect(def.properties).toContain('versatile');
    expect(def.versatileDice).toBe('1d10');
  });

  it('getItemDef returns undefined for unknown item', () => {
    expect(getItemDef('unknown-item-xyz')).toBeUndefined();
  });

  it('requireItemDef throws for unknown item', () => {
    expect(() => requireItemDef('unknown-item-xyz')).toThrow('Unknown item id');
  });

  it('all weapons with "thrown" have normalRange and longRange', () => {
    for (const weapon of WEAPON_CATALOG) {
      if (weapon.properties.includes('thrown')) {
        expect(weapon.normalRange, `thrown weapon ${weapon.id} missing normalRange`).toBeDefined();
        expect(weapon.longRange, `thrown weapon ${weapon.id} missing longRange`).toBeDefined();
      }
    }
  });

  it('all weapons with "versatile" have versatileDice', () => {
    for (const weapon of WEAPON_CATALOG) {
      if (weapon.properties.includes('versatile')) {
        expect(weapon.versatileDice, `versatile weapon ${weapon.id} missing versatileDice`).toBeDefined();
      }
    }
  });

  it('chain mail has baseAc 16 and maxDexBonus 0 (heavy armor)', () => {
    const def = getItemDef('chain-mail');
    expect(def).toBeDefined();
    if (!def || def.type !== 'armor') throw new Error('chain-mail should be armor');
    expect(def.baseAc).toBe(16);
    expect(def.maxDexBonus).toBe(0);
    expect(def.category).toBe('heavy');
  });

  it('shield has baseAc 2 and category shield', () => {
    const def = getItemDef('shield');
    expect(def).toBeDefined();
    if (!def || def.type !== 'armor') throw new Error('shield should be armor');
    expect(def.baseAc).toBe(2);
    expect(def.category).toBe('shield');
  });

  it('rapier has finesse property', () => {
    const def = getItemDef('rapier');
    expect(def).toBeDefined();
    if (!def || def.type !== 'weapon') throw new Error('rapier should be a weapon');
    expect(def.properties).toContain('finesse');
  });

  it('longbow is martial ranged with ammunition and two-handed', () => {
    const def = getItemDef('longbow');
    expect(def).toBeDefined();
    if (!def || def.type !== 'weapon') throw new Error('longbow should be a weapon');
    expect(def.category).toBe('martial');
    expect(def.range).toBe('ranged');
    expect(def.properties).toContain('ammunition');
    expect(def.properties).toContain('two-handed');
  });

  it('explorers-pack has expected contents', () => {
    const def = getItemDef('explorers-pack');
    expect(def).toBeDefined();
    if (!def || def.type !== 'pack') throw new Error('explorers-pack should be a pack');
    const contentIds = def.contents.map((c) => c.itemId);
    expect(contentIds).toContain('backpack');
    expect(contentIds).toContain('bedroll');
    expect(contentIds).toContain('rations-10');
  });

  it('insignia-of-rank exists as gear', () => {
    const def = getItemDef('insignia-of-rank');
    expect(def).toBeDefined();
    expect(def!.type).toBe('gear');
  });

  it('arrows-20 exists as gear', () => {
    const def = getItemDef('arrows-20');
    expect(def).toBeDefined();
    expect(def!.type).toBe('gear');
  });

  it('burglars-pack contents all resolve via getItemDef', () => {
    const def = getItemDef('burglars-pack');
    expect(def).toBeDefined();
    if (!def || def.type !== 'pack') throw new Error('burglars-pack should be a pack');
    for (const { itemId } of def.contents) {
      expect(getItemDef(itemId), `burglars-pack references unknown itemId "${itemId}"`).toBeDefined();
    }
  });
});

describe('Weapon mastery data', () => {
  const VALID_MASTERIES = new Set<string>(WEAPON_MASTERIES);

  it('every simple/martial weapon has a defined mastery', () => {
    for (const weapon of WEAPON_CATALOG) {
      expect(weapon.mastery, `weapon "${weapon.id}" is missing a mastery`).toBeDefined();
    }
  });

  it('all mastery values are valid WeaponMasteryId members', () => {
    for (const weapon of WEAPON_CATALOG) {
      if (weapon.mastery !== undefined) {
        expect(
          VALID_MASTERIES.has(weapon.mastery),
          `weapon "${weapon.id}" has invalid mastery "${weapon.mastery}"`
        ).toBe(true);
      }
    }
  });

  it('longsword has sap mastery', () => {
    const def = getItemDef('longsword');
    if (!def || def.type !== 'weapon') throw new Error('longsword should be a weapon');
    expect(def.mastery).toBe('sap');
  });

  it('greataxe has cleave mastery', () => {
    const def = getItemDef('greataxe');
    if (!def || def.type !== 'weapon') throw new Error('greataxe should be a weapon');
    expect(def.mastery).toBe('cleave');
  });
});

describe('2024 equipment accuracy', () => {
  const weapon = (id: string) => {
    const def = getItemDef(id);
    if (!def || def.type !== 'weapon') throw new Error(`${id} should be a weapon`);
    return def;
  };
  const gear = (id: string) => {
    const def = getItemDef(id);
    if (!def || def.type !== 'gear') throw new Error(`${id} should be gear`);
    return def;
  };
  const pack = (id: string) => {
    const def = getItemDef(id);
    if (!def || def.type !== 'pack') throw new Error(`${id} should be a pack`);
    return def;
  };
  const contents = (id: string) => Object.fromEntries(pack(id).contents.map((c) => [c.itemId, c.quantity]));

  it('lance is 1d10 piercing, Heavy, Reach, Two-Handed', () => {
    expect(weapon('lance')).toMatchObject({ damageDice: '1d10', damageType: 'piercing' });
    expect(weapon('lance').properties).toEqual(expect.arrayContaining(['heavy', 'reach', 'two-handed']));
  });

  it('trident is 1d8 (1d10 versatile) and warhammer weighs 5 lb', () => {
    expect(weapon('trident')).toMatchObject({ damageDice: '1d8', versatileDice: '1d10' });
    expect(weapon('warhammer').weight).toBe(5);
  });

  it('net is adventuring gear, not a weapon', () => {
    expect(WEAPON_CATALOG.some((w) => w.id === 'net')).toBe(false);
    expect(gear('net')).toMatchObject({ weight: 3, costGp: 1 });
  });

  it.each([
    ['component-pouch', 25, 2],
    ['alchemists-fire', 50, 1],
    ['poisoners-kit', 50, 2],
    ['chest', 5, 25],
    ['caltrops', 1, 2],
    ['blanket', 0.5, 3],
    ['basket', 0.4, 2],
    ['parchment', 0.1, 0],
    ['chain', 5, 10],
    ['clothes-fine', 15, 6],
    ['climbers-kit', 25, 12],
    ['robe', 1, 4],
    ['sack', 0.01, 0.5],
    ['viol', 30, 1],
    ['bell', 1, 0],
    ['hemp-rope-50ft', 1, 5],
    ['common-clothes', 2, 4], // Traveler's Clothes
  ])('%s costs %d gp and weighs %d lb', (id, costGp, weight) => {
    expect(gear(id)).toMatchObject({ costGp, weight });
  });

  it("Explorer's Pack (2024): no mess kit, 2 flasks of oil", () => {
    expect(contents('explorers-pack')).toEqual({
      backpack: 1,
      bedroll: 1,
      'oil-flasks-2': 1,
      'rations-10': 1,
      'hemp-rope-50ft': 1,
      tinderbox: 1,
      'torches-10': 1,
      waterskin: 1,
    });
  });

  it("Dungeoneer's Pack (2024): caltrops, 2 oil, 10 rations, 10 torches", () => {
    expect(contents('dungeoneers-pack')).toEqual({
      backpack: 1,
      caltrops: 1,
      crowbar: 1,
      'oil-flasks-2': 1,
      'rations-10': 1,
      'hemp-rope-50ft': 1,
      tinderbox: 1,
      'torches-10': 1,
      waterskin: 1,
    });
  });

  it("Burglar's Pack (2024): 10 candles, 7 oil flasks, 5 rations, bell, no hammer or pitons", () => {
    const c = contents('burglars-pack');
    expect(c['candles-5']).toBe(2);
    expect(c['oil-flask']).toBe(7);
    expect(c['ration']).toBe(5);
    expect(c['bell']).toBe(1);
    expect(c).not.toHaveProperty('hammer');
    expect(c).not.toHaveProperty('pitons-10');
  });

  it('generated packs count single items, not bundles (no 25 candles / 70 rations)', () => {
    expect(contents('entertainers-pack')).toMatchObject({ 'candles-5': 1, ration: 5, costume: 2 });
    expect(contents('priests-pack')).toMatchObject({ ration: 7 });
    expect(contents('scholars-pack')).toMatchObject({ 'oil-flasks-2': 5, parchment: 10 });
    expect(contents('diplomat-pack')).toMatchObject({ 'oil-flasks-2': 2 });
    expect(contents('diplomat-pack')).not.toHaveProperty('flask');
  });
});
