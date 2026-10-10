import { makeQuickBuild, type ClassSource } from '@/types/sources';
import type { FeatureChoiceGrant, Grant, SpellChoiceGrant } from '@/types/grants';
import { createChoiceKey } from '@/types/choices';
import { FIGHTING_STYLE_IDS } from '@/lib/dnd-helpers';

const EMPTY_LEVEL = { grants: [] } as const;

const ROGUE_SKILL_POOL = [
  'acrobatics',
  'athletics',
  'deception',
  'insight',
  'intimidation',
  'investigation',
  'perception',
  'performance',
  'persuasion',
  'sleightofhand',
  'stealth',
] as const;

const SORCERER_METAMAGIC_OPTIONS: FeatureChoiceGrant['options'] = [
  {
    optionId: 'careful-spell',
    featureId: 'metamagic-careful-spell',
    grants: [{ type: 'feature', feature: { id: 'metamagic-careful-spell' } }],
  },
  {
    optionId: 'distant-spell',
    featureId: 'metamagic-distant-spell',
    grants: [{ type: 'feature', feature: { id: 'metamagic-distant-spell' } }],
  },
  {
    optionId: 'empowered-spell',
    featureId: 'metamagic-empowered-spell',
    grants: [{ type: 'feature', feature: { id: 'metamagic-empowered-spell' } }],
  },
  {
    optionId: 'extended-spell',
    featureId: 'metamagic-extended-spell',
    grants: [{ type: 'feature', feature: { id: 'metamagic-extended-spell' } }],
  },
  {
    optionId: 'heightened-spell',
    featureId: 'metamagic-heightened-spell',
    grants: [{ type: 'feature', feature: { id: 'metamagic-heightened-spell' } }],
  },
  {
    optionId: 'quickened-spell',
    featureId: 'metamagic-quickened-spell',
    grants: [{ type: 'feature', feature: { id: 'metamagic-quickened-spell' } }],
  },
  {
    optionId: 'seeking-spell',
    featureId: 'metamagic-seeking-spell',
    grants: [{ type: 'feature', feature: { id: 'metamagic-seeking-spell' } }],
  },
  {
    optionId: 'subtle-spell',
    featureId: 'metamagic-subtle-spell',
    grants: [{ type: 'feature', feature: { id: 'metamagic-subtle-spell' } }],
  },
  {
    optionId: 'transmuted-spell',
    featureId: 'metamagic-transmuted-spell',
    grants: [{ type: 'feature', feature: { id: 'metamagic-transmuted-spell' } }],
  },
  {
    optionId: 'twinned-spell',
    featureId: 'metamagic-twinned-spell',
    grants: [{ type: 'feature', feature: { id: 'metamagic-twinned-spell' } }],
  },
];

type FullCasterId = 'sorcerer' | 'warlock' | 'wizard';

/** A spell-choice grant: `count` picks of exactly `spellLevel` from the class list (0 = cantrips). */
const spellPick = (classId: FullCasterId, n: number, count: number, spellLevel: SpellChoiceGrant['spellLevel']) =>
  ({
    type: 'spell-choice',
    key: createChoiceKey('spell-choice', 'class', classId, n),
    count,
    spellList: classId,
    spellLevel,
  }) as const satisfies SpellChoiceGrant;

/** Standard ASI-or-General-feat pair for the nth Ability Score Improvement of a class. */
const asiOrFeat = (classId: FullCasterId, n: number): readonly Grant[] => [
  { type: 'asi', key: createChoiceKey('asi', 'class', classId, n), points: 2, from: null },
  {
    type: 'feat-choice',
    key: createChoiceKey('feat-choice', 'class', classId, n),
    from: null,
    category: 'general',
  },
];

/** Level 19 Epic Boon: display feature plus an Epic Boon feat pick (reuses the old level-19 feat-choice key). */
const epicBoon = (classId: FullCasterId, n: number): readonly Grant[] => [
  { type: 'feature', feature: { id: `${classId}-epic-boon` } },
  {
    type: 'feat-choice',
    key: createChoiceKey('feat-choice', 'class', classId, n),
    from: null,
    category: 'epicBoon',
  },
];

const metamagicPick = (n: number): Grant => ({
  type: 'feature-choice',
  key: createChoiceKey('feature-choice', 'class', 'sorcerer', n),
  options: SORCERER_METAMAGIC_OPTIONS,
});

const WARLOCK_INVOCATIONS = [
  ['blade', 'warlock-pact-of-the-blade'],
  ['chain', 'warlock-pact-of-the-chain'],
  ['tome', 'warlock-pact-of-the-tome'],
  ...[
    'agonizing-blast',
    'armor-of-shadows',
    'ascendant-step',
    'devils-sight',
    'devouring-blade',
    'eldritch-mind',
    'eldritch-smite',
    'fiendish-vigor',
    'gaze-of-two-minds',
    'lessons-of-the-first-ones',
    'lifedrinker',
    'mask-of-many-faces',
    'master-of-myriad-forms',
    'misty-visions',
    'one-with-shadows',
    'otherworldly-leap',
    'repelling-blast',
    'thirsting-blade',
    'visions-of-distant-realms',
    'whispers-of-the-grave',
    'witch-sight',
  ].map((id) => [id, `warlock-invocation-${id}`] as const),
] as const;

// Prerequisites (level/pact/cantrip) are not modelled; the player is trusted to pick legal invocations.
const WARLOCK_INVOCATION_OPTIONS = WARLOCK_INVOCATIONS.map(([optionId, featureId]) => ({
  optionId,
  featureId,
  grants: [{ type: 'feature', feature: { id: featureId } }],
})) as unknown as FeatureChoiceGrant['options'];

const invocationPick = (n: number): Grant => ({
  type: 'feature-choice',
  key: createChoiceKey('feature-choice', 'class', 'warlock', n),
  options: WARLOCK_INVOCATION_OPTIONS,
});

const longRestPool = (poolId: string, value = 1): Grant => ({
  type: 'resource-pool',
  poolId,
  max: { mode: 'fixed', value },
  regen: 'long-rest',
});

export const CLASS_SOURCES: readonly ClassSource[] = [
  // ─── Barbarian ───────────────────────────────────────────────────────────────
  {
    id: 'barbarian',
    primaryAbility: 'str',
    quickBuild: makeQuickBuild({
      highestAbility: ['str'],
      secondaryAbility: 'con',
      suggestedBackground: 'soldier',
    }),
    levels: [
      {
        grants: [
          { type: 'hit-die', die: 12 },
          { type: 'proficiency', category: 'armor', id: 'light' },
          { type: 'proficiency', category: 'armor', id: 'medium' },
          { type: 'proficiency', category: 'armor', id: 'shields' },
          { type: 'proficiency', category: 'weapon', id: 'simple' },
          { type: 'proficiency', category: 'weapon', id: 'martial' },
          { type: 'proficiency', category: 'saving-throw', id: 'str' },
          { type: 'proficiency', category: 'saving-throw', id: 'con' },
          {
            type: 'proficiency-choice',
            category: 'skill',
            key: createChoiceKey('skill-choice', 'class', 'barbarian', 0),
            count: 2,
            from: ['athletics', 'animalhandling', 'intimidation', 'nature', 'perception', 'survival'],
          },
          { type: 'feature', feature: { id: 'barbarian-rage' } },
          {
            type: 'resource-pool',
            poolId: 'rage',
            max: {
              mode: 'level-steps',
              classId: 'barbarian',
              steps: [
                { minLevel: 1, value: 2 },
                { minLevel: 3, value: 3 },
                { minLevel: 6, value: 4 },
                { minLevel: 12, value: 5 },
                { minLevel: 17, value: 6 },
              ],
            },
            regen: 'long-rest',
          },
          { type: 'feature', feature: { id: 'barbarian-unarmored-defense' } },
          { type: 'feature', feature: { id: 'barbarian-weapon-mastery' } },
          { type: 'armor-class', calculation: { mode: 'unarmored', formula: 'barbarian' } },
          {
            type: 'weapon-mastery-choice',
            key: createChoiceKey('weapon-mastery-choice', 'class', 'barbarian', 0),
            count: 2,
          },
          {
            type: 'bundle-choice',
            key: createChoiceKey('bundle-choice', 'class', 'barbarian', 0),
            category: 'loadout',
            bundleIds: ['barbarian-loadout'],
          },
        ],
      },
      {
        grants: [
          { type: 'feature', feature: { id: 'barbarian-reckless-attack' } },
          { type: 'feature', feature: { id: 'barbarian-danger-sense' } },
        ],
      },
      {
        grants: [
          { type: 'subclass', classId: 'barbarian', key: createChoiceKey('subclass', 'class', 'barbarian', 0) },
          { type: 'feature', feature: { id: 'barbarian-primal-knowledge' } },
          {
            type: 'proficiency-choice',
            category: 'skill',
            key: createChoiceKey('skill-choice', 'class', 'barbarian', 1),
            count: 1,
            from: ['athletics', 'animalhandling', 'intimidation', 'nature', 'perception', 'survival'],
          },
        ],
      },
      {
        grants: [
          { type: 'asi', key: createChoiceKey('asi', 'class', 'barbarian', 0), points: 2, from: null },
          {
            type: 'feat-choice',
            key: createChoiceKey('feat-choice', 'class', 'barbarian', 0),
            from: null,
            category: 'general',
          },
          {
            type: 'weapon-mastery-choice',
            key: createChoiceKey('weapon-mastery-choice', 'class', 'barbarian', 1),
            count: 1,
          },
        ],
      },
      {
        grants: [
          { type: 'feature', feature: { id: 'barbarian-extra-attack' } },
          { type: 'feature', feature: { id: 'barbarian-fast-movement' } },
        ],
      },
      EMPTY_LEVEL,
      {
        grants: [
          { type: 'feature', feature: { id: 'barbarian-feral-instinct' } },
          { type: 'feature', feature: { id: 'barbarian-instinctive-pounce' } },
        ],
      },
      {
        grants: [
          { type: 'asi', key: createChoiceKey('asi', 'class', 'barbarian', 1), points: 2, from: null },
          {
            type: 'feat-choice',
            key: createChoiceKey('feat-choice', 'class', 'barbarian', 1),
            from: null,
            category: 'general',
          },
        ],
      },
      { grants: [{ type: 'feature', feature: { id: 'barbarian-brutal-strike' } }] },
      {
        grants: [
          {
            type: 'weapon-mastery-choice',
            key: createChoiceKey('weapon-mastery-choice', 'class', 'barbarian', 2),
            count: 1,
          },
        ],
      },
      { grants: [{ type: 'feature', feature: { id: 'barbarian-relentless-rage' } }] },
      {
        grants: [
          { type: 'asi', key: createChoiceKey('asi', 'class', 'barbarian', 2), points: 2, from: null },
          {
            type: 'feat-choice',
            key: createChoiceKey('feat-choice', 'class', 'barbarian', 2),
            from: null,
            category: 'general',
          },
        ],
      },
      { grants: [{ type: 'feature', feature: { id: 'barbarian-improved-brutal-strike' } }] },
      EMPTY_LEVEL,
      { grants: [{ type: 'feature', feature: { id: 'barbarian-persistent-rage' } }] },
      {
        grants: [
          { type: 'asi', key: createChoiceKey('asi', 'class', 'barbarian', 3), points: 2, from: null },
          {
            type: 'feat-choice',
            key: createChoiceKey('feat-choice', 'class', 'barbarian', 3),
            from: null,
            category: 'general',
          },
        ],
      },
      { grants: [{ type: 'feature', feature: { id: 'barbarian-improved-brutal-strike-2' } }] },
      { grants: [{ type: 'feature', feature: { id: 'barbarian-indomitable-might' } }] },
      { grants: [{ type: 'feature', feature: { id: 'barbarian-epic-boon' } }] },
      { grants: [{ type: 'feature', feature: { id: 'barbarian-primal-champion' } }] },
    ],
  },

  // ─── Bard ─────────────────────────────────────────────────────────────────
  {
    id: 'bard',
    primaryAbility: 'cha',
    quickBuild: makeQuickBuild({
      highestAbility: ['cha'],
      secondaryAbility: 'dex',
      suggestedBackground: 'entertainer',
    }),
    levels: [
      {
        // L1
        grants: [
          { type: 'hit-die', die: 8 },
          { type: 'proficiency', category: 'armor', id: 'light' },
          { type: 'proficiency', category: 'weapon', id: 'simple' },
          { type: 'proficiency', category: 'weapon', id: 'handcrossbow' },
          { type: 'proficiency', category: 'weapon', id: 'longsword' },
          { type: 'proficiency', category: 'weapon', id: 'rapier' },
          { type: 'proficiency', category: 'weapon', id: 'shortsword' },
          { type: 'proficiency', category: 'saving-throw', id: 'dex' },
          { type: 'proficiency', category: 'saving-throw', id: 'cha' },
          {
            type: 'proficiency-choice',
            category: 'skill',
            key: createChoiceKey('skill-choice', 'class', 'bard', 0),
            count: 3,
            from: null,
          },
          {
            type: 'proficiency-choice',
            category: 'tool',
            key: createChoiceKey('tool-choice', 'class', 'bard', 1),
            count: 3,
            from: ['bagpipes', 'drum', 'dulcimer', 'flute', 'lute', 'lyre', 'horn', 'panflute', 'shawm', 'viol'],
          },
          { type: 'spellcasting', ability: 'cha', source: 'class' },
          { type: 'feature', feature: { id: 'bard-bardic-inspiration' } },
          { type: 'armor-class', calculation: { mode: 'armored' } },
          // Cantrips: +2 at L1 (index 0)
          {
            type: 'spell-choice',
            key: createChoiceKey('spell-choice', 'class', 'bard', 0),
            count: 2,
            spellList: 'bard',
            spellLevel: 0,
          },
          // Spells known: +4 at L1 (highest spell level available: 1)
          {
            type: 'spell-choice',
            key: createChoiceKey('spell-choice', 'class', 'bard', 3),
            count: 4,
            spellList: 'bard',
            spellLevel: 1,
          },
        ],
      },
      {
        // L2: +1 spell known (highest: 1)
        grants: [
          { type: 'feature', feature: { id: 'bard-jack-of-all-trades' } },
          { type: 'feature', feature: { id: 'bard-song-of-rest' } },
          {
            type: 'spell-choice',
            key: createChoiceKey('spell-choice', 'class', 'bard', 4),
            count: 1,
            spellList: 'bard',
            spellLevel: 1,
          },
        ],
      },
      {
        // L3: +1 spell known (highest: 2)
        grants: [
          { type: 'subclass', classId: 'bard', key: createChoiceKey('subclass', 'class', 'bard', 0) },
          {
            type: 'expertise-choice',
            key: createChoiceKey('expertise-choice', 'class', 'bard', 0),
            count: 2,
            from: null,
            fromTools: [],
          },
          {
            type: 'spell-choice',
            key: createChoiceKey('spell-choice', 'class', 'bard', 5),
            count: 1,
            spellList: 'bard',
            spellLevel: 2,
          },
        ],
      },
      {
        // L4: +1 cantrip (index 1), +1 spell known (highest: 2)
        grants: [
          { type: 'asi', key: createChoiceKey('asi', 'class', 'bard', 0), points: 2, from: null },
          {
            type: 'feat-choice',
            key: createChoiceKey('feat-choice', 'class', 'bard', 0),
            from: null,
            category: 'general',
          },
          {
            type: 'spell-choice',
            key: createChoiceKey('spell-choice', 'class', 'bard', 1),
            count: 1,
            spellList: 'bard',
            spellLevel: 0,
          },
          {
            type: 'spell-choice',
            key: createChoiceKey('spell-choice', 'class', 'bard', 6),
            count: 1,
            spellList: 'bard',
            spellLevel: 2,
          },
        ],
      },
      {
        // L5: +1 spell known (highest: 3)
        grants: [
          { type: 'feature', feature: { id: 'bard-font-of-inspiration' } },
          {
            type: 'spell-choice',
            key: createChoiceKey('spell-choice', 'class', 'bard', 7),
            count: 1,
            spellList: 'bard',
            spellLevel: 3,
          },
        ],
      },
      {
        // L6: +1 spell known (highest: 3)
        grants: [
          {
            type: 'spell-choice',
            key: createChoiceKey('spell-choice', 'class', 'bard', 8),
            count: 1,
            spellList: 'bard',
            spellLevel: 3,
          },
        ],
      },
      {
        // L7: +1 spell known (highest: 4)
        grants: [
          { type: 'feature', feature: { id: 'bard-countercharm' } },
          {
            type: 'spell-choice',
            key: createChoiceKey('spell-choice', 'class', 'bard', 9),
            count: 1,
            spellList: 'bard',
            spellLevel: 4,
          },
        ],
      },
      {
        // L8: +1 spell known (highest: 4)
        grants: [
          { type: 'asi', key: createChoiceKey('asi', 'class', 'bard', 1), points: 2, from: null },
          {
            type: 'feat-choice',
            key: createChoiceKey('feat-choice', 'class', 'bard', 1),
            from: null,
            category: 'general',
          },
          {
            type: 'spell-choice',
            key: createChoiceKey('spell-choice', 'class', 'bard', 10),
            count: 1,
            spellList: 'bard',
            spellLevel: 4,
          },
        ],
      },
      {
        // L9: +1 spell known (highest: 5)
        grants: [
          {
            type: 'spell-choice',
            key: createChoiceKey('spell-choice', 'class', 'bard', 11),
            count: 1,
            spellList: 'bard',
            spellLevel: 5,
          },
        ],
      },
      {
        // L10: +1 cantrip (index 2), +2 spells known (highest: 5)
        grants: [
          { type: 'feature', feature: { id: 'bard-magical-secrets' } },
          {
            type: 'expertise-choice',
            key: createChoiceKey('expertise-choice', 'class', 'bard', 1),
            count: 2,
            from: null,
            fromTools: [],
          },
          {
            type: 'spell-choice',
            key: createChoiceKey('spell-choice', 'class', 'bard', 2),
            count: 1,
            spellList: 'bard',
            spellLevel: 0,
          },
          {
            type: 'spell-choice',
            key: createChoiceKey('spell-choice', 'class', 'bard', 12),
            count: 2,
            spellList: 'bard',
            spellLevel: 5,
          },
        ],
      },
      {
        // L11: +1 spell known (highest: 6)
        grants: [
          {
            type: 'spell-choice',
            key: createChoiceKey('spell-choice', 'class', 'bard', 13),
            count: 1,
            spellList: 'bard',
            spellLevel: 6,
          },
        ],
      },
      {
        grants: [
          { type: 'asi', key: createChoiceKey('asi', 'class', 'bard', 2), points: 2, from: null },
          {
            type: 'feat-choice',
            key: createChoiceKey('feat-choice', 'class', 'bard', 2),
            from: null,
            category: 'general',
          },
        ],
      },
      {
        // L13: +1 spell known (highest: 7)
        grants: [
          {
            type: 'spell-choice',
            key: createChoiceKey('spell-choice', 'class', 'bard', 14),
            count: 1,
            spellList: 'bard',
            spellLevel: 7,
          },
        ],
      },
      {
        // L14: +2 spells known (highest: 7)
        grants: [
          {
            type: 'spell-choice',
            key: createChoiceKey('spell-choice', 'class', 'bard', 15),
            count: 2,
            spellList: 'bard',
            spellLevel: 7,
          },
        ],
      },
      {
        // L15: +1 spell known (highest: 8)
        grants: [
          { type: 'feature', feature: { id: 'bard-superior-inspiration' } },
          {
            type: 'spell-choice',
            key: createChoiceKey('spell-choice', 'class', 'bard', 16),
            count: 1,
            spellList: 'bard',
            spellLevel: 8,
          },
        ],
      },
      {
        grants: [
          { type: 'asi', key: createChoiceKey('asi', 'class', 'bard', 3), points: 2, from: null },
          {
            type: 'feat-choice',
            key: createChoiceKey('feat-choice', 'class', 'bard', 3),
            from: null,
            category: 'general',
          },
        ],
      },
      {
        // L17: +1 spell known (highest: 9)
        grants: [
          {
            type: 'spell-choice',
            key: createChoiceKey('spell-choice', 'class', 'bard', 17),
            count: 1,
            spellList: 'bard',
            spellLevel: 9,
          },
        ],
      },
      {
        // L18: +2 spells known (highest: 9)
        grants: [
          { type: 'feature', feature: { id: 'bard-words-of-creation' } },
          {
            type: 'spell-choice',
            key: createChoiceKey('spell-choice', 'class', 'bard', 18),
            count: 2,
            spellList: 'bard',
            spellLevel: 9,
          },
        ],
      },
      {
        grants: [
          { type: 'asi', key: createChoiceKey('asi', 'class', 'bard', 4), points: 2, from: null },
          {
            type: 'feat-choice',
            key: createChoiceKey('feat-choice', 'class', 'bard', 4),
            from: null,
            category: 'general',
          },
        ],
      },
      { grants: [{ type: 'feature', feature: { id: 'bard-epic-boon' } }] },
    ],
  },

  // ─── Cleric ───────────────────────────────────────────────────────────────
  {
    id: 'cleric',
    primaryAbility: 'wis',
    quickBuild: makeQuickBuild({
      highestAbility: ['wis'],
      secondaryAbility: 'con',
      suggestedBackground: 'acolyte',
    }),
    levels: [
      {
        grants: [
          { type: 'hit-die', die: 8 },
          { type: 'proficiency', category: 'armor', id: 'light' },
          { type: 'proficiency', category: 'armor', id: 'medium' },
          { type: 'proficiency', category: 'armor', id: 'shields' },
          { type: 'proficiency', category: 'weapon', id: 'simple' },
          { type: 'proficiency', category: 'saving-throw', id: 'wis' },
          { type: 'proficiency', category: 'saving-throw', id: 'cha' },
          {
            type: 'proficiency-choice',
            category: 'skill',
            key: createChoiceKey('skill-choice', 'class', 'cleric', 0),
            count: 2,
            from: ['history', 'insight', 'medicine', 'persuasion', 'religion'],
          },
          { type: 'spellcasting', ability: 'wis', source: 'class' },
          // Cantrips: +3 at L1 (index 0)
          {
            type: 'spell-choice',
            key: createChoiceKey('spell-choice', 'class', 'cleric', 0),
            count: 3,
            spellList: 'cleric',
            spellLevel: 0,
          },
          {
            type: 'feature-choice',
            key: createChoiceKey('feature-choice', 'class', 'cleric', 0),
            options: [
              {
                optionId: 'protector',
                featureId: 'cleric-divine-order-protector',
                grants: [
                  { type: 'proficiency', category: 'weapon', id: 'martial' },
                  { type: 'proficiency', category: 'armor', id: 'heavy' },
                ],
              },
              {
                optionId: 'thaumaturge',
                featureId: 'cleric-divine-order-thaumaturge',
                // Extra cantrip now modeled as +1 cantrip spell-choice (index 1).
                // Wis-mod bonus to Arcana/Religion checks remains inert pending
                // an ability-check-bonus grant model.
                grants: [
                  {
                    type: 'spell-choice',
                    key: createChoiceKey('spell-choice', 'class', 'cleric', 1),
                    count: 1,
                    spellList: 'cleric',
                    spellLevel: 0,
                  },
                ],
              },
            ],
          },
          { type: 'armor-class', calculation: { mode: 'armored' } },
        ],
      },
      {
        grants: [{ type: 'feature', feature: { id: 'cleric-channel-divinity' } }],
      },
      { grants: [{ type: 'subclass', classId: 'cleric', key: createChoiceKey('subclass', 'class', 'cleric', 0) }] },
      {
        grants: [
          { type: 'asi', key: createChoiceKey('asi', 'class', 'cleric', 0), points: 2, from: null },
          {
            type: 'feat-choice',
            key: createChoiceKey('feat-choice', 'class', 'cleric', 0),
            from: null,
            category: 'general',
          },
        ],
      },
      { grants: [{ type: 'feature', feature: { id: 'cleric-smite-undead' } }] },
      EMPTY_LEVEL,
      {
        grants: [
          {
            type: 'feature-choice',
            key: createChoiceKey('feature-choice', 'class', 'cleric', 1),
            options: [
              {
                optionId: 'divine-strike',
                featureId: 'cleric-blessed-strikes-divine-strike',
                // On-hit damage rider (+1d8 necrotic/radiant on weapon hits) has no grant model yet.
                grants: [],
              },
              {
                optionId: 'potent-spellcasting',
                featureId: 'cleric-blessed-strikes-potent-spellcasting',
                // Cantrip-damage modifier (+Wis mod) has no grant model yet.
                grants: [],
              },
            ],
          },
        ],
      },
      {
        grants: [
          { type: 'asi', key: createChoiceKey('asi', 'class', 'cleric', 1), points: 2, from: null },
          {
            type: 'feat-choice',
            key: createChoiceKey('feat-choice', 'class', 'cleric', 1),
            from: null,
            category: 'general',
          },
        ],
      },
      EMPTY_LEVEL,
      { grants: [{ type: 'feature', feature: { id: 'cleric-divine-intervention' } }] },
      EMPTY_LEVEL,
      {
        grants: [
          { type: 'asi', key: createChoiceKey('asi', 'class', 'cleric', 2), points: 2, from: null },
          {
            type: 'feat-choice',
            key: createChoiceKey('feat-choice', 'class', 'cleric', 2),
            from: null,
            category: 'general',
          },
        ],
      },
      EMPTY_LEVEL,
      { grants: [{ type: 'feature', feature: { id: 'cleric-improved-blessed-strikes' } }] },
      EMPTY_LEVEL,
      {
        grants: [
          { type: 'asi', key: createChoiceKey('asi', 'class', 'cleric', 3), points: 2, from: null },
          {
            type: 'feat-choice',
            key: createChoiceKey('feat-choice', 'class', 'cleric', 3),
            from: null,
            category: 'general',
          },
        ],
      },
      EMPTY_LEVEL,
      { grants: [{ type: 'feature', feature: { id: 'cleric-channel-divinity-3' } }] },
      {
        grants: [
          { type: 'asi', key: createChoiceKey('asi', 'class', 'cleric', 4), points: 2, from: null },
          {
            type: 'feat-choice',
            key: createChoiceKey('feat-choice', 'class', 'cleric', 4),
            from: null,
            category: 'general',
          },
        ],
      },
      { grants: [{ type: 'feature', feature: { id: 'cleric-greater-divine-intervention' } }] },
    ],
  },

  // ─── Druid ────────────────────────────────────────────────────────────────
  {
    id: 'druid',
    primaryAbility: 'wis',
    quickBuild: makeQuickBuild({
      highestAbility: ['wis'],
      secondaryAbility: 'con',
      suggestedBackground: 'hermit',
    }),
    levels: [
      {
        grants: [
          { type: 'hit-die', die: 8 },
          { type: 'proficiency', category: 'armor', id: 'light' },
          { type: 'proficiency', category: 'armor', id: 'medium-nonmetal' },
          { type: 'proficiency', category: 'armor', id: 'shields-nonmetal' },
          { type: 'proficiency', category: 'weapon', id: 'club' },
          { type: 'proficiency', category: 'weapon', id: 'dagger' },
          { type: 'proficiency', category: 'weapon', id: 'dart' },
          { type: 'proficiency', category: 'weapon', id: 'javelin' },
          { type: 'proficiency', category: 'weapon', id: 'mace' },
          { type: 'proficiency', category: 'weapon', id: 'quarterstaff' },
          { type: 'proficiency', category: 'weapon', id: 'scimitar' },
          { type: 'proficiency', category: 'weapon', id: 'sickle' },
          { type: 'proficiency', category: 'weapon', id: 'sling' },
          { type: 'proficiency', category: 'weapon', id: 'spear' },
          { type: 'proficiency', category: 'tool', id: 'herbalismkit' },
          { type: 'proficiency', category: 'saving-throw', id: 'int' },
          { type: 'proficiency', category: 'saving-throw', id: 'wis' },
          {
            type: 'proficiency-choice',
            category: 'skill',
            key: createChoiceKey('skill-choice', 'class', 'druid', 0),
            count: 2,
            from: ['arcana', 'animalhandling', 'insight', 'medicine', 'nature', 'perception', 'religion', 'survival'],
          },
          { type: 'spellcasting', ability: 'wis', source: 'class' },
          {
            type: 'spell-choice',
            key: createChoiceKey('spell-choice', 'class', 'druid', 0),
            count: 2,
            spellList: 'druid',
            spellLevel: 0,
          },
          {
            type: 'feature-choice',
            key: createChoiceKey('feature-choice', 'class', 'druid', 0),
            options: [
              {
                optionId: 'magician',
                featureId: 'druid-primal-order-magician',
                // Extra cantrip now modeled as +1 cantrip spell-choice (index 2).
                // Wis-mod bonus to Arcana/Nature checks remains inert pending
                // an ability-check-bonus grant model.
                grants: [
                  {
                    type: 'spell-choice',
                    key: createChoiceKey('spell-choice', 'class', 'druid', 2),
                    count: 1,
                    spellList: 'druid',
                    spellLevel: 0,
                  },
                ],
              },
              {
                optionId: 'warden',
                featureId: 'druid-primal-order-warden',
                grants: [
                  { type: 'proficiency', category: 'weapon', id: 'martial' },
                  { type: 'proficiency', category: 'armor', id: 'medium' },
                ],
              },
            ],
          },
          { type: 'armor-class', calculation: { mode: 'armored' } },
          { type: 'feature', feature: { id: 'druid-druidic' } },
        ],
      },
      {
        grants: [
          { type: 'feature', feature: { id: 'druid-wild-shape' } },
          // Wild Shape uses: 2 (L2), 3 (L6), 4 (L17). A Short Rest regains one use; modeled as long-rest only.
          {
            type: 'resource-pool',
            poolId: 'wild-shape',
            max: {
              mode: 'level-steps',
              classId: 'druid',
              steps: [
                { minLevel: 2, value: 2 },
                { minLevel: 6, value: 3 },
                { minLevel: 17, value: 4 },
              ],
            },
            regen: 'long-rest',
          },
          { type: 'feature', feature: { id: 'druid-wild-companion' } },
        ],
      },
      { grants: [{ type: 'subclass', classId: 'druid', key: createChoiceKey('subclass', 'class', 'druid', 0) }] },
      {
        // L4: +1 cantrip (index 1)
        grants: [
          { type: 'asi', key: createChoiceKey('asi', 'class', 'druid', 0), points: 2, from: null },
          {
            type: 'feat-choice',
            key: createChoiceKey('feat-choice', 'class', 'druid', 0),
            from: null,
            category: 'general',
          },
          { type: 'feature', feature: { id: 'druid-wild-shape-improvement-1' } },
          {
            type: 'spell-choice',
            key: createChoiceKey('spell-choice', 'class', 'druid', 1),
            count: 1,
            spellList: 'druid',
            spellLevel: 0,
          },
        ],
      },
      { grants: [{ type: 'feature', feature: { id: 'druid-wild-resurgence' } }] },
      EMPTY_LEVEL,
      {
        grants: [
          {
            type: 'feature-choice',
            key: createChoiceKey('feature-choice', 'class', 'druid', 1),
            options: [
              {
                optionId: 'potent-spellcasting',
                featureId: 'druid-elemental-fury-potent-spellcasting',
                // inert pending cantrip-damage model
                grants: [],
              },
              {
                optionId: 'primal-strike',
                featureId: 'druid-elemental-fury-primal-strike',
                // inert pending on-hit damage model
                grants: [],
              },
            ],
          },
        ],
      },
      {
        grants: [
          { type: 'asi', key: createChoiceKey('asi', 'class', 'druid', 1), points: 2, from: null },
          {
            type: 'feat-choice',
            key: createChoiceKey('feat-choice', 'class', 'druid', 1),
            from: null,
            category: 'general',
          },
          { type: 'feature', feature: { id: 'druid-wild-shape-improvement-2' } },
        ],
      },
      EMPTY_LEVEL,
      EMPTY_LEVEL,
      EMPTY_LEVEL,
      {
        grants: [
          { type: 'asi', key: createChoiceKey('asi', 'class', 'druid', 2), points: 2, from: null },
          {
            type: 'feat-choice',
            key: createChoiceKey('feat-choice', 'class', 'druid', 2),
            from: null,
            category: 'general',
          },
        ],
      },
      EMPTY_LEVEL,
      EMPTY_LEVEL,
      { grants: [{ type: 'feature', feature: { id: 'druid-improved-elemental-fury' } }] },
      {
        grants: [
          { type: 'asi', key: createChoiceKey('asi', 'class', 'druid', 3), points: 2, from: null },
          {
            type: 'feat-choice',
            key: createChoiceKey('feat-choice', 'class', 'druid', 3),
            from: null,
            category: 'general',
          },
        ],
      },
      EMPTY_LEVEL,
      { grants: [{ type: 'feature', feature: { id: 'druid-beast-spells' } }] },
      { grants: [{ type: 'feature', feature: { id: 'druid-epic-boon' } }] },
      { grants: [{ type: 'feature', feature: { id: 'druid-archdruid' } }] },
    ],
  },

  // ─── Fighter ──────────────────────────────────────────────────────────────
  {
    id: 'fighter',
    primaryAbility: 'str',
    quickBuild: makeQuickBuild({
      highestAbility: ['str', 'dex'],
      secondaryAbility: 'con',
      suggestedBackground: 'soldier',
    }),
    levels: [
      {
        grants: [
          { type: 'hit-die', die: 10 },
          { type: 'proficiency', category: 'armor', id: 'light' },
          { type: 'proficiency', category: 'armor', id: 'medium' },
          { type: 'proficiency', category: 'armor', id: 'heavy' },
          { type: 'proficiency', category: 'armor', id: 'shields' },
          { type: 'proficiency', category: 'weapon', id: 'simple' },
          { type: 'proficiency', category: 'weapon', id: 'martial' },
          { type: 'proficiency', category: 'saving-throw', id: 'str' },
          { type: 'proficiency', category: 'saving-throw', id: 'con' },
          {
            type: 'proficiency-choice',
            category: 'skill',
            key: createChoiceKey('skill-choice', 'class', 'fighter', 0),
            count: 2,
            from: [
              'acrobatics',
              'animalhandling',
              'athletics',
              'history',
              'insight',
              'intimidation',
              'perception',
              'survival',
            ],
          },
          { type: 'armor-class', calculation: { mode: 'armored' } },
          {
            type: 'fighting-style-choice',
            key: createChoiceKey('fighting-style-choice', 'class', 'fighter', 0),
            count: 1,
            from: FIGHTING_STYLE_IDS,
          },
          {
            type: 'weapon-mastery-choice',
            key: createChoiceKey('weapon-mastery-choice', 'class', 'fighter', 0),
            count: 3,
          },
          { type: 'feature', feature: { id: 'fighter-second-wind' } },
          // Second Wind uses: 2 (L1), 3 (L4), 4 (L10). Short Rest regains one use, Long Rest all; modeled as short-rest.
          {
            type: 'resource-pool',
            poolId: 'second-wind',
            max: {
              mode: 'level-steps',
              classId: 'fighter',
              steps: [
                { minLevel: 1, value: 2 },
                { minLevel: 4, value: 3 },
                { minLevel: 10, value: 4 },
              ],
            },
            regen: 'short-rest',
          },
          {
            type: 'bundle-choice',
            key: createChoiceKey('bundle-choice', 'class', 'fighter', 0),
            category: 'loadout',
            bundleIds: ['fighter-chainmail', 'fighter-archer-kit'],
          },
          {
            type: 'bundle-choice',
            key: createChoiceKey('bundle-choice', 'class', 'fighter', 1),
            category: 'melee-weapon',
            bundleIds: ['martial-weapon-and-shield', 'two-martial-weapons'],
          },
          {
            type: 'bundle-choice',
            key: createChoiceKey('bundle-choice', 'class', 'fighter', 2),
            category: 'ranged-weapon',
            bundleIds: ['light-crossbow-kit', 'two-handaxes'],
          },
          {
            type: 'bundle-choice',
            key: createChoiceKey('bundle-choice', 'class', 'fighter', 3),
            category: 'pack',
            bundleIds: ['dungeoneers-pack', 'explorers-pack'],
          },
        ],
      },
      {
        grants: [
          { type: 'feature', feature: { id: 'fighter-action-surge' } },
          // Action Surge: 1 use (L2), 2 uses (L17)
          {
            type: 'resource-pool',
            poolId: 'action-surge',
            max: {
              mode: 'level-steps',
              classId: 'fighter',
              steps: [
                { minLevel: 2, value: 1 },
                { minLevel: 17, value: 2 },
              ],
            },
            regen: 'short-rest',
          },
          { type: 'feature', feature: { id: 'fighter-tactical-mind' } },
        ],
      },
      { grants: [{ type: 'subclass', classId: 'fighter', key: createChoiceKey('subclass', 'class', 'fighter', 0) }] },
      {
        grants: [
          { type: 'asi', key: createChoiceKey('asi', 'class', 'fighter', 0), points: 2, from: null },
          {
            type: 'feat-choice',
            key: createChoiceKey('feat-choice', 'class', 'fighter', 0),
            from: null,
            category: 'general',
          },
          {
            type: 'weapon-mastery-choice',
            key: createChoiceKey('weapon-mastery-choice', 'class', 'fighter', 1),
            count: 1,
          },
        ],
      },
      {
        grants: [
          { type: 'feature', feature: { id: 'fighter-extra-attack' } },
          { type: 'feature', feature: { id: 'fighter-tactical-shift' } },
        ],
      },
      {
        grants: [
          { type: 'asi', key: createChoiceKey('asi', 'class', 'fighter', 1), points: 2, from: null },
          {
            type: 'feat-choice',
            key: createChoiceKey('feat-choice', 'class', 'fighter', 1),
            from: null,
            category: 'general',
          },
        ],
      },
      EMPTY_LEVEL,
      {
        grants: [
          { type: 'asi', key: createChoiceKey('asi', 'class', 'fighter', 2), points: 2, from: null },
          {
            type: 'feat-choice',
            key: createChoiceKey('feat-choice', 'class', 'fighter', 2),
            from: null,
            category: 'general',
          },
        ],
      },
      {
        grants: [
          { type: 'feature', feature: { id: 'fighter-indomitable' } },
          // Indomitable: 1 use (L9), 2 uses (L13), 3 uses (L17)
          {
            type: 'resource-pool',
            poolId: 'indomitable',
            max: {
              mode: 'level-steps',
              classId: 'fighter',
              steps: [
                { minLevel: 9, value: 1 },
                { minLevel: 13, value: 2 },
                { minLevel: 17, value: 3 },
              ],
            },
            regen: 'long-rest',
          },
          { type: 'feature', feature: { id: 'fighter-tactical-master' } },
        ],
      },
      {
        grants: [
          {
            type: 'weapon-mastery-choice',
            key: createChoiceKey('weapon-mastery-choice', 'class', 'fighter', 2),
            count: 1,
          },
        ],
      },
      { grants: [{ type: 'feature', feature: { id: 'fighter-extra-attack-2' } }] },
      {
        grants: [
          { type: 'asi', key: createChoiceKey('asi', 'class', 'fighter', 3), points: 2, from: null },
          {
            type: 'feat-choice',
            key: createChoiceKey('feat-choice', 'class', 'fighter', 3),
            from: null,
            category: 'general',
          },
        ],
      },
      {
        grants: [
          { type: 'feature', feature: { id: 'fighter-indomitable-2' } },
          { type: 'feature', feature: { id: 'fighter-studied-attacks' } },
        ],
      },
      {
        grants: [
          { type: 'asi', key: createChoiceKey('asi', 'class', 'fighter', 4), points: 2, from: null },
          {
            type: 'feat-choice',
            key: createChoiceKey('feat-choice', 'class', 'fighter', 4),
            from: null,
            category: 'general',
          },
        ],
      },
      EMPTY_LEVEL,
      {
        grants: [
          { type: 'asi', key: createChoiceKey('asi', 'class', 'fighter', 5), points: 2, from: null },
          {
            type: 'feat-choice',
            key: createChoiceKey('feat-choice', 'class', 'fighter', 5),
            from: null,
            category: 'general',
          },
          {
            type: 'weapon-mastery-choice',
            key: createChoiceKey('weapon-mastery-choice', 'class', 'fighter', 3),
            count: 1,
          },
        ],
      },
      {
        grants: [
          { type: 'feature', feature: { id: 'fighter-action-surge-2' } },
          { type: 'feature', feature: { id: 'fighter-indomitable-3' } },
        ],
      },
      EMPTY_LEVEL,
      {
        grants: [
          { type: 'asi', key: createChoiceKey('asi', 'class', 'fighter', 6), points: 2, from: null },
          {
            type: 'feat-choice',
            key: createChoiceKey('feat-choice', 'class', 'fighter', 6),
            from: null,
            category: 'general',
          },
        ],
      },
      { grants: [{ type: 'feature', feature: { id: 'fighter-extra-attack-3' } }] },
    ],
  },

  // ─── Monk ─────────────────────────────────────────────────────────────────
  {
    id: 'monk',
    primaryAbility: 'dex',
    quickBuild: makeQuickBuild({
      highestAbility: ['dex'],
      secondaryAbility: 'wis',
      suggestedBackground: 'hermit',
    }),
    levels: [
      {
        grants: [
          { type: 'hit-die', die: 8 },
          { type: 'proficiency', category: 'weapon', id: 'simple' },
          { type: 'proficiency', category: 'weapon', id: 'shortsword' },
          { type: 'proficiency', category: 'saving-throw', id: 'str' },
          { type: 'proficiency', category: 'saving-throw', id: 'dex' },
          {
            type: 'proficiency-choice',
            category: 'skill',
            key: createChoiceKey('skill-choice', 'class', 'monk', 0),
            count: 2,
            from: ['acrobatics', 'athletics', 'history', 'insight', 'religion', 'stealth'],
          },
          { type: 'feature', feature: { id: 'monk-martial-arts' } },
          { type: 'feature', feature: { id: 'monk-unarmored-defense' } },
          { type: 'armor-class', calculation: { mode: 'unarmored', formula: 'monk' } },
        ],
      },
      {
        grants: [
          { type: 'feature', feature: { id: 'monk-focus-points' } },
          {
            type: 'resource-pool',
            poolId: 'focus-points',
            max: { mode: 'class-level', classId: 'monk' },
            regen: 'short-rest',
          },
          { type: 'feature', feature: { id: 'monk-flurry-of-blows' } },
          { type: 'feature', feature: { id: 'monk-patient-defense' } },
          { type: 'feature', feature: { id: 'monk-step-of-the-wind' } },
          { type: 'feature', feature: { id: 'monk-unarmored-movement' } },
          { type: 'feature', feature: { id: 'monk-uncanny-metabolism' } },
          { type: 'resource-pool', poolId: 'uncanny-metabolism', max: { mode: 'fixed', value: 1 }, regen: 'long-rest' },
        ],
      },
      {
        grants: [
          { type: 'subclass', classId: 'monk', key: createChoiceKey('subclass', 'class', 'monk', 0) },
          { type: 'feature', feature: { id: 'monk-deflect-attacks' } },
        ],
      },
      {
        grants: [
          { type: 'asi', key: createChoiceKey('asi', 'class', 'monk', 0), points: 2, from: null },
          {
            type: 'feat-choice',
            key: createChoiceKey('feat-choice', 'class', 'monk', 0),
            from: null,
            category: 'general',
          },
          { type: 'feature', feature: { id: 'monk-slow-fall' } },
        ],
      },
      {
        grants: [
          { type: 'feature', feature: { id: 'monk-extra-attack' } },
          { type: 'feature', feature: { id: 'monk-stunning-strike' } },
        ],
      },
      { grants: [{ type: 'feature', feature: { id: 'monk-empowered-strikes' } }] },
      { grants: [{ type: 'feature', feature: { id: 'monk-evasion' } }] },
      {
        grants: [
          { type: 'asi', key: createChoiceKey('asi', 'class', 'monk', 1), points: 2, from: null },
          {
            type: 'feat-choice',
            key: createChoiceKey('feat-choice', 'class', 'monk', 1),
            from: null,
            category: 'general',
          },
        ],
      },
      { grants: [{ type: 'feature', feature: { id: 'monk-acrobatic-movement' } }] },
      {
        grants: [
          { type: 'feature', feature: { id: 'monk-heightened-focus' } },
          { type: 'feature', feature: { id: 'monk-self-restoration' } },
        ],
      },
      EMPTY_LEVEL,
      {
        grants: [
          { type: 'asi', key: createChoiceKey('asi', 'class', 'monk', 2), points: 2, from: null },
          {
            type: 'feat-choice',
            key: createChoiceKey('feat-choice', 'class', 'monk', 2),
            from: null,
            category: 'general',
          },
        ],
      },
      { grants: [{ type: 'feature', feature: { id: 'monk-deflect-energy' } }] },
      {
        grants: [
          { type: 'feature', feature: { id: 'monk-disciplined-survivor' } },
          // Proficiency in all saving throws (STR and DEX already granted at L1)
          { type: 'proficiency', category: 'saving-throw', id: 'con' },
          { type: 'proficiency', category: 'saving-throw', id: 'int' },
          { type: 'proficiency', category: 'saving-throw', id: 'wis' },
          { type: 'proficiency', category: 'saving-throw', id: 'cha' },
        ],
      },
      { grants: [{ type: 'feature', feature: { id: 'monk-perfect-focus' } }] },
      {
        grants: [
          { type: 'asi', key: createChoiceKey('asi', 'class', 'monk', 3), points: 2, from: null },
          {
            type: 'feat-choice',
            key: createChoiceKey('feat-choice', 'class', 'monk', 3),
            from: null,
            category: 'general',
          },
        ],
      },
      EMPTY_LEVEL,
      { grants: [{ type: 'feature', feature: { id: 'monk-superior-defense' } }] },
      { grants: [{ type: 'feature', feature: { id: 'monk-epic-boon' } }] },
      { grants: [{ type: 'feature', feature: { id: 'monk-body-and-mind' } }] },
    ],
  },

  // ─── Paladin ──────────────────────────────────────────────────────────────
  {
    id: 'paladin',
    primaryAbility: 'str',
    quickBuild: makeQuickBuild({
      highestAbility: ['str'],
      secondaryAbility: 'cha',
      suggestedBackground: 'noble',
    }),
    levels: [
      {
        grants: [
          { type: 'hit-die', die: 10 },
          { type: 'proficiency', category: 'armor', id: 'light' },
          { type: 'proficiency', category: 'armor', id: 'medium' },
          { type: 'proficiency', category: 'armor', id: 'heavy' },
          { type: 'proficiency', category: 'armor', id: 'shields' },
          { type: 'proficiency', category: 'weapon', id: 'simple' },
          { type: 'proficiency', category: 'weapon', id: 'martial' },
          { type: 'proficiency', category: 'saving-throw', id: 'wis' },
          { type: 'proficiency', category: 'saving-throw', id: 'cha' },
          {
            type: 'proficiency-choice',
            category: 'skill',
            key: createChoiceKey('skill-choice', 'class', 'paladin', 0),
            count: 2,
            from: ['athletics', 'insight', 'intimidation', 'medicine', 'persuasion', 'religion'],
          },
          { type: 'spellcasting', ability: 'cha', source: 'class' },
          { type: 'feature', feature: { id: 'paladin-lay-on-hands' } },
          // Lay On Hands pool: 5 x Paladin level HP, refreshed on a Long Rest.
          {
            type: 'resource-pool',
            poolId: 'lay-on-hands',
            max: {
              mode: 'level-steps',
              classId: 'paladin',
              steps: Array.from({ length: 20 }, (_, i) => ({ minLevel: i + 1, value: (i + 1) * 5 })),
            },
            regen: 'long-rest',
          },
          { type: 'feature', feature: { id: 'paladin-divine-sense' } },
          { type: 'armor-class', calculation: { mode: 'armored' } },
          {
            type: 'weapon-mastery-choice',
            key: createChoiceKey('weapon-mastery-choice', 'class', 'paladin', 0),
            count: 2,
          },
          {
            type: 'spell-choice',
            key: createChoiceKey('spell-choice', 'class', 'paladin', 0),
            count: 2,
            spellList: 'paladin',
            spellLevel: 1,
          },
        ],
      },
      {
        grants: [
          // Paladin's Smite (id kept as divine-smite): always-prepared Divine Smite spell is not in the catalog yet.
          { type: 'feature', feature: { id: 'paladin-divine-smite' } },
          {
            type: 'fighting-style-choice',
            key: createChoiceKey('fighting-style-choice', 'class', 'paladin', 0),
            count: 1,
            from: FIGHTING_STYLE_IDS,
          },
        ],
      },
      {
        grants: [
          { type: 'subclass', classId: 'paladin', key: createChoiceKey('subclass', 'class', 'paladin', 0) },
          { type: 'feature', feature: { id: 'paladin-channel-divinity' } },
          // Channel Divinity (2024 PHB): 2 uses at L3, 3 at L11; 1 regained on a Short Rest, all on a Long Rest.
          {
            type: 'resource-pool',
            poolId: 'channel-divinity',
            max: {
              mode: 'level-steps',
              classId: 'paladin',
              steps: [
                { minLevel: 3, value: 2 },
                { minLevel: 11, value: 3 },
              ],
            },
            regen: { mode: 'compound', shortRestAmount: 1 },
          },
        ],
      },
      {
        grants: [
          { type: 'asi', key: createChoiceKey('asi', 'class', 'paladin', 0), points: 2, from: null },
          {
            type: 'feat-choice',
            key: createChoiceKey('feat-choice', 'class', 'paladin', 0),
            from: null,
            category: 'general',
          },
        ],
      },
      {
        grants: [
          { type: 'feature', feature: { id: 'paladin-extra-attack' } },
          // Faithful Steed: always-prepared Find Steed is not in the catalog yet.
          { type: 'feature', feature: { id: 'paladin-faithful-steed' } },
        ],
      },
      { grants: [{ type: 'feature', feature: { id: 'paladin-aura-of-protection' } }] },
      EMPTY_LEVEL,
      {
        grants: [
          { type: 'asi', key: createChoiceKey('asi', 'class', 'paladin', 1), points: 2, from: null },
          {
            type: 'feat-choice',
            key: createChoiceKey('feat-choice', 'class', 'paladin', 1),
            from: null,
            category: 'general',
          },
        ],
      },
      { grants: [{ type: 'feature', feature: { id: 'paladin-abjure-foes' } }] },
      { grants: [{ type: 'feature', feature: { id: 'paladin-aura-of-courage' } }] },
      { grants: [{ type: 'feature', feature: { id: 'paladin-radiant-strikes' } }] },
      {
        grants: [
          { type: 'asi', key: createChoiceKey('asi', 'class', 'paladin', 2), points: 2, from: null },
          {
            type: 'feat-choice',
            key: createChoiceKey('feat-choice', 'class', 'paladin', 2),
            from: null,
            category: 'general',
          },
        ],
      },
      EMPTY_LEVEL,
      { grants: [{ type: 'feature', feature: { id: 'paladin-restoring-touch' } }] },
      EMPTY_LEVEL,
      {
        grants: [
          { type: 'asi', key: createChoiceKey('asi', 'class', 'paladin', 3), points: 2, from: null },
          {
            type: 'feat-choice',
            key: createChoiceKey('feat-choice', 'class', 'paladin', 3),
            from: null,
            category: 'general',
          },
        ],
      },
      EMPTY_LEVEL,
      { grants: [{ type: 'feature', feature: { id: 'paladin-aura-expansion' } }] },
      { grants: [{ type: 'feature', feature: { id: 'paladin-epic-boon' } }] },
      // L20: the Oath capstone comes from the subclass.
      EMPTY_LEVEL,
    ],
  },

  // ─── Ranger ───────────────────────────────────────────────────────────────
  {
    id: 'ranger',
    primaryAbility: 'dex',
    quickBuild: makeQuickBuild({
      highestAbility: ['dex'],
      secondaryAbility: 'wis',
      suggestedBackground: 'guide',
    }),
    levels: [
      {
        grants: [
          { type: 'hit-die', die: 10 },
          { type: 'proficiency', category: 'armor', id: 'light' },
          { type: 'proficiency', category: 'armor', id: 'medium' },
          { type: 'proficiency', category: 'armor', id: 'shields' },
          { type: 'proficiency', category: 'weapon', id: 'simple' },
          { type: 'proficiency', category: 'weapon', id: 'martial' },
          { type: 'proficiency', category: 'saving-throw', id: 'str' },
          { type: 'proficiency', category: 'saving-throw', id: 'dex' },
          {
            type: 'proficiency-choice',
            category: 'skill',
            key: createChoiceKey('skill-choice', 'class', 'ranger', 0),
            count: 3,
            from: [
              'animalhandling',
              'athletics',
              'insight',
              'investigation',
              'nature',
              'perception',
              'stealth',
              'survival',
            ],
          },
          { type: 'feature', feature: { id: 'ranger-favored-enemy' } },
          { type: 'feature', feature: { id: 'ranger-weapon-mastery' } },
          // Favored Enemy: Hunter's Mark always prepared, with free casts (2/3/4/5/6 at L1/5/9/13/17) per Long Rest.
          { type: 'spell', spellId: 'hunters-mark', alwaysPrepared: true },
          {
            type: 'resource-pool',
            poolId: 'favored-enemy',
            max: {
              mode: 'level-steps',
              classId: 'ranger',
              steps: [
                { minLevel: 1, value: 2 },
                { minLevel: 5, value: 3 },
                { minLevel: 9, value: 4 },
                { minLevel: 13, value: 5 },
                { minLevel: 17, value: 6 },
              ],
            },
            regen: 'long-rest',
          },
          // Spellcasting starts at Level 1 in the 2024 PHB.
          { type: 'spellcasting', ability: 'wis', source: 'class' },
          {
            type: 'spell-choice',
            key: createChoiceKey('spell-choice', 'class', 'ranger', 0),
            count: 2,
            spellList: 'ranger',
            spellLevel: 1,
          },
          { type: 'armor-class', calculation: { mode: 'armored' } },
          {
            type: 'weapon-mastery-choice',
            key: createChoiceKey('weapon-mastery-choice', 'class', 'ranger', 0),
            count: 2,
          },
        ],
      },
      {
        grants: [
          { type: 'feature', feature: { id: 'ranger-deft-explorer' } },
          // Deft Explorer: Expertise in one proficient skill + two languages.
          {
            type: 'expertise-choice',
            key: createChoiceKey('expertise-choice', 'class', 'ranger', 0),
            count: 1,
            from: null,
            fromTools: [],
          },
          {
            type: 'proficiency-choice',
            category: 'language',
            key: createChoiceKey('language-choice', 'class', 'ranger', 0),
            count: 2,
            from: null,
          },
          {
            type: 'fighting-style-choice',
            key: createChoiceKey('fighting-style-choice', 'class', 'ranger', 0),
            count: 1,
            from: FIGHTING_STYLE_IDS,
          },
        ],
      },
      {
        grants: [{ type: 'subclass', classId: 'ranger', key: createChoiceKey('subclass', 'class', 'ranger', 0) }],
      },
      {
        grants: [
          { type: 'asi', key: createChoiceKey('asi', 'class', 'ranger', 0), points: 2, from: null },
          {
            type: 'feat-choice',
            key: createChoiceKey('feat-choice', 'class', 'ranger', 0),
            from: null,
            category: 'general',
          },
        ],
      },
      { grants: [{ type: 'feature', feature: { id: 'ranger-extra-attack' } }] },
      {
        grants: [
          // Roving (L6, 2024 PHB): climb + swim equal to walking speed. The +10
          // walking-speed bump (and its heavy-armor restriction) stays in feature
          // text — needs additive-speed and conditional-grant infrastructure.
          { type: 'feature', feature: { id: 'ranger-roving' } },
          { type: 'speed', mode: 'climb', value: 'walk-equivalent' },
          { type: 'speed', mode: 'swim', value: 'walk-equivalent' },
        ],
      },
      EMPTY_LEVEL,
      {
        grants: [
          { type: 'asi', key: createChoiceKey('asi', 'class', 'ranger', 1), points: 2, from: null },
          {
            type: 'feat-choice',
            key: createChoiceKey('feat-choice', 'class', 'ranger', 1),
            from: null,
            category: 'general',
          },
        ],
      },
      {
        grants: [
          {
            type: 'expertise-choice',
            key: createChoiceKey('expertise-choice', 'class', 'ranger', 1),
            count: 2,
            from: null,
            fromTools: [],
          },
        ],
      },
      { grants: [{ type: 'feature', feature: { id: 'ranger-tireless' } }] },
      EMPTY_LEVEL,
      {
        grants: [
          { type: 'asi', key: createChoiceKey('asi', 'class', 'ranger', 2), points: 2, from: null },
          {
            type: 'feat-choice',
            key: createChoiceKey('feat-choice', 'class', 'ranger', 2),
            from: null,
            category: 'general',
          },
        ],
      },
      { grants: [{ type: 'feature', feature: { id: 'ranger-relentless-hunter' } }] },
      { grants: [{ type: 'feature', feature: { id: 'ranger-natures-veil' } }] },
      EMPTY_LEVEL,
      {
        grants: [
          { type: 'asi', key: createChoiceKey('asi', 'class', 'ranger', 3), points: 2, from: null },
          {
            type: 'feat-choice',
            key: createChoiceKey('feat-choice', 'class', 'ranger', 3),
            from: null,
            category: 'general',
          },
        ],
      },
      { grants: [{ type: 'feature', feature: { id: 'ranger-precise-hunter' } }] },
      { grants: [{ type: 'feature', feature: { id: 'ranger-feral-senses' } }] },
      { grants: [{ type: 'feature', feature: { id: 'ranger-epic-boon' } }] },
      { grants: [{ type: 'feature', feature: { id: 'ranger-foe-slayer' } }] },
    ],
  },

  // ─── Rogue ────────────────────────────────────────────────────────────────
  {
    id: 'rogue',
    primaryAbility: 'dex',
    quickBuild: makeQuickBuild({
      highestAbility: ['dex'],
      secondaryAbility: 'int',
      suggestedBackground: 'criminal',
    }),
    levels: [
      {
        grants: [
          { type: 'hit-die', die: 8 },
          { type: 'proficiency', category: 'armor', id: 'light' },
          { type: 'proficiency', category: 'weapon', id: 'simple' },
          { type: 'proficiency', category: 'weapon', id: 'handcrossbow' },
          { type: 'proficiency', category: 'weapon', id: 'longsword' },
          { type: 'proficiency', category: 'weapon', id: 'rapier' },
          { type: 'proficiency', category: 'weapon', id: 'shortsword' },
          { type: 'proficiency', category: 'tool', id: 'thievestools' },
          { type: 'proficiency', category: 'saving-throw', id: 'dex' },
          { type: 'proficiency', category: 'saving-throw', id: 'int' },
          {
            type: 'proficiency-choice',
            category: 'skill',
            key: createChoiceKey('skill-choice', 'class', 'rogue', 0),
            count: 4,
            from: ROGUE_SKILL_POOL,
          },
          { type: 'armor-class', calculation: { mode: 'armored' } },
          {
            type: 'expertise-choice',
            key: createChoiceKey('expertise-choice', 'class', 'rogue', 0),
            count: 2,
            from: null,
            fromTools: ['thievestools'],
          },
          { type: 'feature', feature: { id: 'rogue-sneak-attack' } },
          { type: 'feature', feature: { id: 'rogue-thieves-cant' } },
          {
            type: 'weapon-mastery-choice',
            key: createChoiceKey('weapon-mastery-choice', 'class', 'rogue', 0),
            count: 2,
          },
          {
            type: 'bundle-choice',
            key: createChoiceKey('bundle-choice', 'class', 'rogue', 0),
            category: 'loadout',
            bundleIds: ['rogue-loadout'],
          },
          {
            type: 'bundle-choice',
            key: createChoiceKey('bundle-choice', 'class', 'rogue', 1),
            category: 'melee-weapon',
            bundleIds: ['rogue-rapier', 'rogue-shortsword-melee'],
          },
          {
            type: 'bundle-choice',
            key: createChoiceKey('bundle-choice', 'class', 'rogue', 2),
            category: 'ranged-weapon',
            bundleIds: ['rogue-shortbow-kit', 'rogue-shortsword-ranged'],
          },
          {
            type: 'bundle-choice',
            key: createChoiceKey('bundle-choice', 'class', 'rogue', 3),
            category: 'pack',
            bundleIds: ['burglars-pack', 'dungeoneers-pack', 'explorers-pack'],
          },
        ],
      },
      { grants: [{ type: 'feature', feature: { id: 'rogue-cunning-action' } }] },
      {
        grants: [
          { type: 'subclass', classId: 'rogue', key: createChoiceKey('subclass', 'class', 'rogue', 0) },
          { type: 'feature', feature: { id: 'rogue-steady-aim' } },
        ],
      },
      {
        grants: [
          { type: 'asi', key: createChoiceKey('asi', 'class', 'rogue', 0), points: 2, from: null },
          {
            type: 'feat-choice',
            key: createChoiceKey('feat-choice', 'class', 'rogue', 0),
            from: null,
            category: 'general',
          },
        ],
      },
      {
        grants: [
          { type: 'feature', feature: { id: 'rogue-uncanny-dodge' } },
          { type: 'feature', feature: { id: 'rogue-cunning-strike' } },
        ],
      },
      {
        grants: [
          {
            type: 'expertise-choice',
            key: createChoiceKey('expertise-choice', 'class', 'rogue', 1),
            count: 2,
            from: null,
            fromTools: ['thievestools'],
          },
        ],
      },
      {
        grants: [
          { type: 'feature', feature: { id: 'rogue-evasion' } },
          { type: 'feature', feature: { id: 'rogue-reliable-talent' } },
        ],
      },
      {
        grants: [
          { type: 'asi', key: createChoiceKey('asi', 'class', 'rogue', 1), points: 2, from: null },
          {
            type: 'feat-choice',
            key: createChoiceKey('feat-choice', 'class', 'rogue', 1),
            from: null,
            category: 'general',
          },
        ],
      },
      EMPTY_LEVEL,
      {
        grants: [
          { type: 'asi', key: createChoiceKey('asi', 'class', 'rogue', 2), points: 2, from: null },
          {
            type: 'feat-choice',
            key: createChoiceKey('feat-choice', 'class', 'rogue', 2),
            from: null,
            category: 'general',
          },
        ],
      },
      { grants: [{ type: 'feature', feature: { id: 'rogue-improved-cunning-strike' } }] },
      {
        grants: [
          { type: 'asi', key: createChoiceKey('asi', 'class', 'rogue', 3), points: 2, from: null },
          {
            type: 'feat-choice',
            key: createChoiceKey('feat-choice', 'class', 'rogue', 3),
            from: null,
            category: 'general',
          },
        ],
      },
      EMPTY_LEVEL,
      { grants: [{ type: 'feature', feature: { id: 'rogue-devious-strikes' } }] },
      {
        grants: [
          { type: 'feature', feature: { id: 'rogue-slippery-mind' } },
          { type: 'proficiency', category: 'saving-throw', id: 'wis' },
          { type: 'proficiency', category: 'saving-throw', id: 'cha' },
        ],
      },
      {
        grants: [
          { type: 'asi', key: createChoiceKey('asi', 'class', 'rogue', 4), points: 2, from: null },
          {
            type: 'feat-choice',
            key: createChoiceKey('feat-choice', 'class', 'rogue', 4),
            from: null,
            category: 'general',
          },
        ],
      },
      EMPTY_LEVEL,
      { grants: [{ type: 'feature', feature: { id: 'rogue-elusive' } }] },
      { grants: [{ type: 'feature', feature: { id: 'rogue-epic-boon' } }] },
      { grants: [{ type: 'feature', feature: { id: 'rogue-stroke-of-luck' } }] },
    ],
  },

  // ─── Sorcerer ─────────────────────────────────────────────────────────────
  // Prepared spells (2024 table): 2,4,6,7,9,10,11,12,14,15,16,16,17,17,18,18,19,20,21,22.
  // Cantrips: 4 (L1), 5 (L4), 6 (L10). Each level's new spells are picked at that level's highest slot level.
  {
    id: 'sorcerer',
    primaryAbility: 'cha',
    quickBuild: makeQuickBuild({
      highestAbility: ['cha'],
      secondaryAbility: 'con',
      suggestedBackground: 'sage',
    }),
    levels: [
      {
        grants: [
          { type: 'hit-die', die: 6 },
          { type: 'proficiency', category: 'weapon', id: 'dagger' },
          { type: 'proficiency', category: 'weapon', id: 'dart' },
          { type: 'proficiency', category: 'weapon', id: 'sling' },
          { type: 'proficiency', category: 'weapon', id: 'quarterstaff' },
          { type: 'proficiency', category: 'weapon', id: 'lightcrossbow' },
          { type: 'proficiency', category: 'saving-throw', id: 'con' },
          { type: 'proficiency', category: 'saving-throw', id: 'cha' },
          {
            type: 'proficiency-choice',
            category: 'skill',
            key: createChoiceKey('skill-choice', 'class', 'sorcerer', 0),
            count: 2,
            from: ['arcana', 'deception', 'insight', 'intimidation', 'persuasion', 'religion'],
          },
          { type: 'spellcasting', ability: 'cha', source: 'class' },
          { type: 'feature', feature: { id: 'sorcerer-innate-sorcery' } },
          longRestPool('innate-sorcery', 2),
          { type: 'armor-class', calculation: { mode: 'armored' } },
          spellPick('sorcerer', 0, 4, 0),
          spellPick('sorcerer', 1, 2, 1),
        ],
      },
      {
        grants: [
          { type: 'feature', feature: { id: 'sorcerer-font-of-magic' } },
          { type: 'feature', feature: { id: 'sorcerer-metamagic' } },
          {
            type: 'resource-pool',
            poolId: 'sorcery-points',
            max: { mode: 'class-level', classId: 'sorcerer' },
            regen: 'long-rest',
          },
          metamagicPick(0),
          metamagicPick(1),
          spellPick('sorcerer', 2, 2, 1),
        ],
      },
      {
        grants: [
          { type: 'subclass', classId: 'sorcerer', key: createChoiceKey('subclass', 'class', 'sorcerer', 0) },
          spellPick('sorcerer', 3, 2, 2),
        ],
      },
      { grants: [...asiOrFeat('sorcerer', 0), spellPick('sorcerer', 4, 1, 0), spellPick('sorcerer', 5, 1, 2)] },
      {
        grants: [
          { type: 'feature', feature: { id: 'sorcerer-sorcerous-restoration' } },
          longRestPool('sorcerous-restoration'),
          spellPick('sorcerer', 6, 2, 3),
        ],
      },
      { grants: [spellPick('sorcerer', 7, 1, 3)] },
      {
        grants: [{ type: 'feature', feature: { id: 'sorcerer-sorcery-incarnate' } }, spellPick('sorcerer', 8, 1, 4)],
      },
      { grants: [...asiOrFeat('sorcerer', 1), spellPick('sorcerer', 9, 1, 4)] },
      { grants: [spellPick('sorcerer', 10, 2, 5)] },
      {
        grants: [
          { type: 'feature', feature: { id: 'sorcerer-metamagic-options' } },
          metamagicPick(2),
          metamagicPick(3),
          spellPick('sorcerer', 11, 1, 0),
          spellPick('sorcerer', 12, 1, 5),
        ],
      },
      { grants: [spellPick('sorcerer', 13, 1, 6)] },
      { grants: asiOrFeat('sorcerer', 2) },
      { grants: [spellPick('sorcerer', 14, 1, 7)] },
      EMPTY_LEVEL,
      { grants: [spellPick('sorcerer', 15, 1, 8)] },
      { grants: asiOrFeat('sorcerer', 3) },
      // L17: two more Metamagic options (moved from L18; choice keys 4/5 unchanged)
      { grants: [metamagicPick(4), metamagicPick(5), spellPick('sorcerer', 16, 1, 9)] },
      { grants: [spellPick('sorcerer', 17, 1, 9)] },
      { grants: [...epicBoon('sorcerer', 4), spellPick('sorcerer', 18, 1, 9)] },
      { grants: [{ type: 'feature', feature: { id: 'sorcerer-arcane-apotheosis' } }, spellPick('sorcerer', 19, 1, 9)] },
    ],
  },

  // ─── Warlock ──────────────────────────────────────────────────────────────
  // Prepared spells (2024 table): 2,3,4,5,6,7,8,9,10,10,11,11,12,12,13,13,14,14,15,15 (picked at the Pact slot level).
  // Cantrips: 2 (L1), 3 (L4), 4 (L10). Invocations: 1,3,3,5,5,6,6,7,7,7,7,8,8,8,9,9,9,10,10,10.
  // Pact of the Blade/Chain/Tome are Eldritch Invocations in 2024 (choice 0 keeps its old option ids).
  {
    id: 'warlock',
    primaryAbility: 'cha',
    quickBuild: makeQuickBuild({
      highestAbility: ['cha'],
      secondaryAbility: 'con',
      suggestedBackground: 'charlatan',
    }),
    levels: [
      {
        grants: [
          { type: 'hit-die', die: 8 },
          { type: 'proficiency', category: 'armor', id: 'light' },
          { type: 'proficiency', category: 'weapon', id: 'simple' },
          { type: 'proficiency', category: 'saving-throw', id: 'wis' },
          { type: 'proficiency', category: 'saving-throw', id: 'cha' },
          {
            type: 'proficiency-choice',
            category: 'skill',
            key: createChoiceKey('skill-choice', 'class', 'warlock', 0),
            count: 2,
            from: ['arcana', 'deception', 'history', 'intimidation', 'investigation', 'nature', 'religion'],
          },
          { type: 'spellcasting', ability: 'cha', source: 'class' },
          { type: 'feature', feature: { id: 'warlock-eldritch-invocations' } },
          { type: 'feature', feature: { id: 'warlock-pact-magic' } },
          invocationPick(0),
          { type: 'armor-class', calculation: { mode: 'armored' } },
          spellPick('warlock', 0, 2, 0),
          spellPick('warlock', 1, 2, 1),
        ],
      },
      {
        grants: [
          { type: 'feature', feature: { id: 'warlock-magical-cunning' } },
          longRestPool('magical-cunning'),
          invocationPick(1),
          invocationPick(2),
          spellPick('warlock', 2, 1, 1),
        ],
      },
      {
        grants: [
          { type: 'subclass', classId: 'warlock', key: createChoiceKey('subclass', 'class', 'warlock', 0) },
          spellPick('warlock', 3, 1, 2),
        ],
      },
      { grants: [...asiOrFeat('warlock', 0), spellPick('warlock', 4, 1, 0), spellPick('warlock', 5, 1, 2)] },
      { grants: [invocationPick(3), invocationPick(4), spellPick('warlock', 6, 1, 3)] },
      { grants: [spellPick('warlock', 7, 1, 3)] },
      { grants: [invocationPick(5), spellPick('warlock', 8, 1, 4)] },
      { grants: [...asiOrFeat('warlock', 1), spellPick('warlock', 9, 1, 4)] },
      {
        grants: [
          { type: 'feature', feature: { id: 'warlock-contact-patron' } },
          longRestPool('contact-patron'),
          invocationPick(6),
          spellPick('warlock', 10, 1, 5),
        ],
      },
      { grants: [spellPick('warlock', 11, 1, 0)] },
      {
        grants: [
          { type: 'feature', feature: { id: 'warlock-mystic-arcanum-6' } },
          spellPick('warlock', 13, 1, 6),
          spellPick('warlock', 12, 1, 5),
        ],
      },
      { grants: [...asiOrFeat('warlock', 2), invocationPick(7)] },
      {
        grants: [
          { type: 'feature', feature: { id: 'warlock-mystic-arcanum-7' } },
          spellPick('warlock', 15, 1, 7),
          spellPick('warlock', 14, 1, 5),
        ],
      },
      EMPTY_LEVEL,
      {
        grants: [
          { type: 'feature', feature: { id: 'warlock-mystic-arcanum-8' } },
          spellPick('warlock', 17, 1, 8),
          spellPick('warlock', 16, 1, 5),
          invocationPick(8),
        ],
      },
      { grants: asiOrFeat('warlock', 3) },
      {
        grants: [
          { type: 'feature', feature: { id: 'warlock-mystic-arcanum-9' } },
          spellPick('warlock', 19, 1, 9),
          spellPick('warlock', 18, 1, 5),
        ],
      },
      { grants: [invocationPick(9)] },
      { grants: [...epicBoon('warlock', 4), spellPick('warlock', 20, 1, 5)] },
      { grants: [{ type: 'feature', feature: { id: 'warlock-eldritch-master' } }, longRestPool('eldritch-master')] },
    ],
  },

  // ─── Wizard ───────────────────────────────────────────────────────────────
  // Cantrips: 3 (L1), 4 (L4), 5 (L10). Spellbook: 6 spells at L1, +2 per level (picked at the highest slot level).
  // NOTE: the 2024 prepared-spell count is a table (4,5,6,7,9,10,11,12,14,15,16,16,17,18,19,21,22,23,24,25),
  // but getPreparedSpellCount() in dnd-helpers still uses level + INT mod.
  {
    id: 'wizard',
    primaryAbility: 'int',
    quickBuild: makeQuickBuild({
      highestAbility: ['int'],
      secondaryAbility: 'con',
      suggestedBackground: 'sage',
    }),
    levels: [
      {
        grants: [
          { type: 'hit-die', die: 6 },
          { type: 'proficiency', category: 'weapon', id: 'dagger' },
          { type: 'proficiency', category: 'weapon', id: 'dart' },
          { type: 'proficiency', category: 'weapon', id: 'sling' },
          { type: 'proficiency', category: 'weapon', id: 'quarterstaff' },
          { type: 'proficiency', category: 'weapon', id: 'lightcrossbow' },
          { type: 'proficiency', category: 'saving-throw', id: 'int' },
          { type: 'proficiency', category: 'saving-throw', id: 'wis' },
          {
            type: 'proficiency-choice',
            category: 'skill',
            key: createChoiceKey('skill-choice', 'class', 'wizard', 0),
            count: 2,
            from: ['arcana', 'history', 'insight', 'investigation', 'medicine', 'religion'],
          },
          { type: 'spellcasting', ability: 'int', source: 'class' },
          { type: 'feature', feature: { id: 'wizard-ritual-adept' } },
          { type: 'feature', feature: { id: 'wizard-arcane-recovery' } },
          longRestPool('arcane-recovery'),
          { type: 'armor-class', calculation: { mode: 'armored' } },
          spellPick('wizard', 0, 3, 0),
          spellPick('wizard', 1, 6, 1),
        ],
      },
      {
        grants: [
          { type: 'feature', feature: { id: 'wizard-scholar' } },
          {
            type: 'expertise-choice',
            key: createChoiceKey('expertise-choice', 'class', 'wizard', 0),
            count: 1,
            from: ['arcana', 'history', 'investigation', 'medicine', 'nature', 'religion'],
            fromTools: [],
          },
          spellPick('wizard', 2, 2, 1),
        ],
      },
      {
        grants: [
          { type: 'subclass', classId: 'wizard', key: createChoiceKey('subclass', 'class', 'wizard', 0) },
          spellPick('wizard', 3, 2, 2),
        ],
      },
      { grants: [...asiOrFeat('wizard', 0), spellPick('wizard', 4, 1, 0), spellPick('wizard', 5, 2, 2)] },
      {
        grants: [{ type: 'feature', feature: { id: 'wizard-memorize-spell' } }, spellPick('wizard', 6, 2, 3)],
      },
      { grants: [spellPick('wizard', 7, 2, 3)] },
      { grants: [spellPick('wizard', 8, 2, 4)] },
      { grants: [...asiOrFeat('wizard', 1), spellPick('wizard', 9, 2, 4)] },
      { grants: [spellPick('wizard', 10, 2, 5)] },
      { grants: [spellPick('wizard', 11, 1, 0), spellPick('wizard', 12, 2, 5)] },
      { grants: [spellPick('wizard', 13, 2, 6)] },
      { grants: [...asiOrFeat('wizard', 2), spellPick('wizard', 14, 2, 6)] },
      { grants: [spellPick('wizard', 15, 2, 7)] },
      { grants: [spellPick('wizard', 16, 2, 7)] },
      { grants: [spellPick('wizard', 17, 2, 8)] },
      { grants: [...asiOrFeat('wizard', 3), spellPick('wizard', 18, 2, 8)] },
      { grants: [spellPick('wizard', 19, 2, 9)] },
      { grants: [{ type: 'feature', feature: { id: 'wizard-spell-mastery' } }, spellPick('wizard', 20, 2, 9)] },
      { grants: [...epicBoon('wizard', 4), spellPick('wizard', 21, 2, 9)] },
      {
        grants: [
          { type: 'feature', feature: { id: 'wizard-signature-spells' } },
          {
            type: 'resource-pool',
            poolId: 'signature-spells',
            max: { mode: 'fixed', value: 2 },
            regen: 'short-rest',
          },
          spellPick('wizard', 22, 2, 9),
        ],
      },
    ],
  },
];
