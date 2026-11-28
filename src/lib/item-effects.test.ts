import { effectGrants, itemEffectBundles, parseEffects } from '@/lib/item-effects';

describe('parseEffects', () => {
  it.each([
    ['check stealth +1', [{ type: 'roll-modifier', target: 'check', skills: ['stealth'], bonus: 1 }]],
    ['check dex -1', [{ type: 'roll-modifier', target: 'check', abilities: ['dex'], bonus: -1 }]],
    ['save str,dex +1d4', [{ type: 'roll-modifier', target: 'save', abilities: ['str', 'dex'], dice: '+1d4' }]],
    [
      'check stealth athletics adv',
      [{ type: 'roll-modifier', target: 'check', skills: ['stealth', 'athletics'], mode: 'adv' }],
    ],
    ['check sleight-of-hand dis', [{ type: 'roll-modifier', target: 'check', skills: ['sleightofhand'], mode: 'dis' }]],
    ['attack +1', [{ type: 'roll-modifier', target: 'attack', bonus: 1 }]],
    ['damage +1d6 # >30ft', [{ type: 'roll-modifier', target: 'damage', dice: '+1d6', label: '>30ft' }]],
    ['spell-dc +1', [{ type: 'roll-modifier', target: 'spell-dc', bonus: 1 }]],
    ['AC +1', [{ type: 'ac-bonus', bonus: 1 }]],
    ['str +2', [{ type: 'ability-bonus', ability: 'str', bonus: 2 }]],
    ['con =19', [{ type: 'ability-set', ability: 'con', score: 19 }]],
    [
      'resist thunder, fire',
      [
        { type: 'resistance', damageType: 'thunder' },
        { type: 'resistance', damageType: 'fire' },
      ],
    ],
    ['speed +10', [{ type: 'speed', mode: 'walk', value: 10, additive: true }]],
    ['hp +5', [{ type: 'hp-bonus', perLevel: 0, flat: 5 }]],
  ])('%s', (text, grants) => {
    expect(effectGrants(text)).toEqual(grants);
  });

  it('labels roll modifiers with the item name and note', () => {
    expect(effectGrants('check perception +2 # passive, voices', 'Fısıltı Küpesi')).toEqual([
      {
        type: 'roll-modifier',
        target: 'check',
        skills: ['perception'],
        bonus: 2,
        label: 'Fısıltı Küpesi (passive, voices)',
      },
    ]);
  });

  it('reads several rules per line with ; and keeps situational ones out of the applied grants', () => {
    const lines = parseEffects('check stealth +1; ? check athletics adv # in swamps');
    expect(lines.map((l) => [l.situational, l.note])).toEqual([
      [false, undefined],
      [true, 'in swamps'],
    ]);
    expect(effectGrants('check stealth +1; ? check athletics adv # in swamps')).toHaveLength(1);
  });

  it.each([
    ['check stelth +1', 'unknown ability or skill "stelth"'],
    ['save stealth +1', 'unknown ability "stealth"'],
    ['attack dex +1', "attack can't be narrowed"],
    ['check stealth lots', 'bad value "lots" (use +1, -1, +1d4, adv or dis)'],
    ['resist slime', 'unknown damage type "slime"'],
    ['fly 30', 'unknown rule "fly"'],
  ])('reports %s', (text, error) => {
    expect(parseEffects(text)).toEqual([expect.objectContaining({ error })]);
    expect(effectGrants(text)).toEqual([]);
  });
});

describe('itemEffectBundles', () => {
  it('bundles equipped items with effects once, labelled by item name', () => {
    const loot = (effects: string) => ({ origin: 'loot', description: 'x', effects });
    const bundles = itemEffectBundles([
      { itemId: 'custom-sessiz-adim-zirhi', equipped: true, source: loot('check stealth +1') },
      { itemId: 'custom-sessiz-adim-zirhi', equipped: true, source: loot('check stealth +1') },
      { itemId: 'custom-stowed', equipped: false, source: loot('ac +1') },
      { itemId: 'longbow', equipped: true, source: { origin: 'loot', description: 'x' } },
    ]);
    expect(bundles).toEqual([
      {
        source: { origin: 'item', id: 'custom-sessiz-adim-zirhi' },
        grants: [{ type: 'roll-modifier', target: 'check', skills: ['stealth'], bonus: 1, label: 'Sessiz Adim Zirhi' }],
      },
    ]);
  });
});
