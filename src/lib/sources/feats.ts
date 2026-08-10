import { createChoiceKey } from '@/types/choices';
import type { FeatSource } from '@/types/sources';
import { ARTISAN_TOOL_IDS, MUSICAL_INSTRUMENT_IDS } from '@/lib/sources/tool-groups';

export const FEAT_SOURCES: readonly FeatSource[] = [
  // Origin feats — no level prerequisite, granted by backgrounds
  {
    id: 'alert',
    category: 'origin',
    prerequisites: [],
    // TODO(#162-followup): needs initiative-bonus grant type — deferred
    grants: [{ type: 'feature', feature: { id: 'feat-alert' } }],
  },
  {
    id: 'crafter',
    category: 'origin',
    prerequisites: [],
    grants: [
      { type: 'feature', feature: { id: 'feat-crafter' } },
      {
        type: 'proficiency-choice',
        category: 'tool',
        key: createChoiceKey('tool-choice', 'feat', 'crafter', 0),
        count: 3,
        from: ARTISAN_TOOL_IDS,
      },
    ],
  },
  {
    id: 'healer',
    category: 'origin',
    prerequisites: [],
    grants: [
      { type: 'feature', feature: { id: 'feat-healer' } },
      { type: 'proficiency', category: 'tool', id: 'herbalismkit' },
    ],
  },
  {
    id: 'lucky',
    category: 'origin',
    prerequisites: [],
    // TODO(#162-followup): needs resource-pool with max=proficiency-bonus mode — deferred
    grants: [{ type: 'feature', feature: { id: 'feat-lucky' } }],
  },
  {
    id: 'magic-initiate',
    category: 'origin',
    prerequisites: [],
    repeatable: true, // TODO(#178): repeatable not yet enforced — per-instance ChoiceKey indexing needed
    grants: [
      {
        type: 'feature-choice',
        key: createChoiceKey('feature-choice', 'feat', 'magic-initiate', 0),
        options: [
          {
            optionId: 'bard',
            featureId: 'feat-magic-initiate-bard',
            grants: [
              { type: 'spellcasting', ability: 'cha', source: 'feat' },
              {
                type: 'spell-choice',
                key: createChoiceKey('spell-choice', 'feat', 'magic-initiate-bard-cantrip', 0),
                count: 2,
                spellList: 'bard',
                spellLevel: 0,
              },
              {
                type: 'spell-choice',
                key: createChoiceKey('spell-choice', 'feat', 'magic-initiate-bard-spell', 0),
                count: 1,
                spellList: 'bard',
                spellLevel: 1,
              },
            ],
          },
          {
            optionId: 'cleric',
            featureId: 'feat-magic-initiate-cleric',
            grants: [
              { type: 'spellcasting', ability: 'wis', source: 'feat' },
              {
                type: 'spell-choice',
                key: createChoiceKey('spell-choice', 'feat', 'magic-initiate-cleric-cantrip', 0),
                count: 2,
                spellList: 'cleric',
                spellLevel: 0,
              },
              {
                type: 'spell-choice',
                key: createChoiceKey('spell-choice', 'feat', 'magic-initiate-cleric-spell', 0),
                count: 1,
                spellList: 'cleric',
                spellLevel: 1,
              },
            ],
          },
          {
            optionId: 'druid',
            featureId: 'feat-magic-initiate-druid',
            grants: [
              { type: 'spellcasting', ability: 'wis', source: 'feat' },
              {
                type: 'spell-choice',
                key: createChoiceKey('spell-choice', 'feat', 'magic-initiate-druid-cantrip', 0),
                count: 2,
                spellList: 'druid',
                spellLevel: 0,
              },
              {
                type: 'spell-choice',
                key: createChoiceKey('spell-choice', 'feat', 'magic-initiate-druid-spell', 0),
                count: 1,
                spellList: 'druid',
                spellLevel: 1,
              },
            ],
          },
          {
            optionId: 'sorcerer',
            featureId: 'feat-magic-initiate-sorcerer',
            grants: [
              { type: 'spellcasting', ability: 'cha', source: 'feat' },
              {
                type: 'spell-choice',
                key: createChoiceKey('spell-choice', 'feat', 'magic-initiate-sorcerer-cantrip', 0),
                count: 2,
                spellList: 'sorcerer',
                spellLevel: 0,
              },
              {
                type: 'spell-choice',
                key: createChoiceKey('spell-choice', 'feat', 'magic-initiate-sorcerer-spell', 0),
                count: 1,
                spellList: 'sorcerer',
                spellLevel: 1,
              },
            ],
          },
          {
            optionId: 'warlock',
            featureId: 'feat-magic-initiate-warlock',
            grants: [
              { type: 'spellcasting', ability: 'cha', source: 'feat' },
              {
                type: 'spell-choice',
                key: createChoiceKey('spell-choice', 'feat', 'magic-initiate-warlock-cantrip', 0),
                count: 2,
                spellList: 'warlock',
                spellLevel: 0,
              },
              {
                type: 'spell-choice',
                key: createChoiceKey('spell-choice', 'feat', 'magic-initiate-warlock-spell', 0),
                count: 1,
                spellList: 'warlock',
                spellLevel: 1,
              },
            ],
          },
          {
            optionId: 'wizard',
            featureId: 'feat-magic-initiate-wizard',
            grants: [
              { type: 'spellcasting', ability: 'int', source: 'feat' },
              {
                type: 'spell-choice',
                key: createChoiceKey('spell-choice', 'feat', 'magic-initiate-wizard-cantrip', 0),
                count: 2,
                spellList: 'wizard',
                spellLevel: 0,
              },
              {
                type: 'spell-choice',
                key: createChoiceKey('spell-choice', 'feat', 'magic-initiate-wizard-spell', 0),
                count: 1,
                spellList: 'wizard',
                spellLevel: 1,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'musician',
    category: 'origin',
    prerequisites: [],
    grants: [
      { type: 'feature', feature: { id: 'feat-musician' } },
      {
        type: 'proficiency-choice',
        category: 'tool',
        key: createChoiceKey('tool-choice', 'feat', 'musician', 0),
        count: 3,
        from: MUSICAL_INSTRUMENT_IDS,
      },
    ],
  },
  {
    id: 'savage-attacker',
    category: 'origin',
    prerequisites: [],
    // TODO(#162-followup): needs damage-reroll grant type — deferred
    grants: [{ type: 'feature', feature: { id: 'feat-savage-attacker' } }],
  },
  {
    id: 'skilled',
    category: 'origin',
    prerequisites: [],
    grants: [
      {
        type: 'proficiency-choice',
        category: 'skill',
        key: createChoiceKey('skill-choice', 'feat', 'skilled', 0),
        count: 3,
        from: null,
      },
    ],
  },
  {
    id: 'tavern-brawler',
    category: 'origin',
    prerequisites: [],
    // TODO(#162-followup): needs unarmed-die upgrade + grapple grant types — deferred
    grants: [{ type: 'feature', feature: { id: 'feat-tavern-brawler' } }],
  },
  {
    id: 'tough',
    category: 'origin',
    prerequisites: [],
    grants: [
      { type: 'feature', feature: { id: 'feat-tough' } },
      { type: 'hp-bonus', perLevel: 2 },
    ],
  },

  // Fighting Style feats — grants must be kept manually in sync with FIGHTING_STYLE_SOURCES
  {
    id: 'archery',
    category: 'fightingStyle',
    prerequisites: [],
    grants: [{ type: 'feature', feature: { id: 'fighting-style-archery' } }],
  },
  {
    id: 'defense',
    category: 'fightingStyle',
    prerequisites: [],
    grants: [
      { type: 'feature', feature: { id: 'fighting-style-defense' } },
      { type: 'ac-bonus', bonus: 1 },
    ],
  },
  {
    id: 'dueling',
    category: 'fightingStyle',
    prerequisites: [],
    grants: [{ type: 'feature', feature: { id: 'fighting-style-dueling' } }],
  },
  {
    id: 'great-weapon-fighting',
    category: 'fightingStyle',
    prerequisites: [],
    grants: [{ type: 'feature', feature: { id: 'fighting-style-great-weapon-fighting' } }],
  },
  {
    id: 'protection',
    category: 'fightingStyle',
    prerequisites: [],
    grants: [{ type: 'feature', feature: { id: 'fighting-style-protection' } }],
  },
  {
    id: 'two-weapon-fighting',
    category: 'fightingStyle',
    prerequisites: [],
    grants: [{ type: 'feature', feature: { id: 'fighting-style-two-weapon-fighting' } }],
  },
  {
    id: 'blind-fighting',
    category: 'fightingStyle',
    prerequisites: [],
    grants: [{ type: 'feature', feature: { id: 'fighting-style-blind-fighting' } }],
  },
  {
    id: 'interception',
    category: 'fightingStyle',
    prerequisites: [],
    grants: [{ type: 'feature', feature: { id: 'fighting-style-interception' } }],
  },
  {
    id: 'thrown-weapon-fighting',
    category: 'fightingStyle',
    prerequisites: [],
    grants: [{ type: 'feature', feature: { id: 'fighting-style-thrown-weapon-fighting' } }],
  },
  {
    id: 'unarmed-fighting',
    category: 'fightingStyle',
    prerequisites: [],
    grants: [{ type: 'feature', feature: { id: 'fighting-style-unarmed-fighting' } }],
  },

  // General feats — level 4+ prerequisite
  {
    id: 'actor',
    category: 'general',
    prerequisites: [{ type: 'level-minimum', level: 4 }],
    grants: [
      { type: 'feature', feature: { id: 'feat-actor' } },
      {
        type: 'ability-choice',
        key: createChoiceKey('ability-choice', 'feat', 'actor', 0),
        count: 1,
        bonus: 1,
        from: ['cha'],
      },
    ],
  },
  {
    id: 'athlete',
    category: 'general',
    prerequisites: [{ type: 'level-minimum', level: 4 }],
    grants: [
      { type: 'feature', feature: { id: 'feat-athlete' } },
      {
        type: 'ability-choice',
        key: createChoiceKey('ability-choice', 'feat', 'athlete', 0),
        count: 1,
        bonus: 1,
        from: ['str', 'dex'],
      },
    ],
  },
  {
    id: 'charger',
    category: 'general',
    prerequisites: [{ type: 'level-minimum', level: 4 }],
    grants: [
      { type: 'feature', feature: { id: 'feat-charger' } },
      {
        type: 'ability-choice',
        key: createChoiceKey('ability-choice', 'feat', 'charger', 0),
        count: 1,
        bonus: 1,
        from: ['str', 'dex'],
      },
    ],
  },
  {
    id: 'chef',
    category: 'general',
    prerequisites: [{ type: 'level-minimum', level: 4 }],
    grants: [
      { type: 'feature', feature: { id: 'feat-chef' } },
      { type: 'proficiency', category: 'tool', id: 'cooksutensils' },
      {
        type: 'ability-choice',
        key: createChoiceKey('ability-choice', 'feat', 'chef', 0),
        count: 1,
        bonus: 1,
        from: ['con', 'wis'],
      },
    ],
  },
  {
    id: 'crossbow-expert',
    category: 'general',
    prerequisites: [{ type: 'level-minimum', level: 4 }],
    grants: [
      { type: 'feature', feature: { id: 'feat-crossbow-expert' } },
      {
        type: 'ability-choice',
        key: createChoiceKey('ability-choice', 'feat', 'crossbow-expert', 0),
        count: 1,
        bonus: 1,
        from: ['dex'],
      },
    ],
  },
  {
    id: 'crusher',
    category: 'general',
    prerequisites: [{ type: 'level-minimum', level: 4 }],
    grants: [
      { type: 'feature', feature: { id: 'feat-crusher' } },
      {
        type: 'ability-choice',
        key: createChoiceKey('ability-choice', 'feat', 'crusher', 0),
        count: 1,
        bonus: 1,
        from: ['str', 'con'],
      },
    ],
  },
  {
    id: 'defensive-duelist',
    category: 'general',
    prerequisites: [{ type: 'level-minimum', level: 4 }],
    grants: [
      { type: 'feature', feature: { id: 'feat-defensive-duelist' } },
      {
        type: 'ability-choice',
        key: createChoiceKey('ability-choice', 'feat', 'defensive-duelist', 0),
        count: 1,
        bonus: 1,
        from: ['dex'],
      },
    ],
  },
  {
    id: 'dual-wielder',
    category: 'general',
    prerequisites: [{ type: 'level-minimum', level: 4 }],
    grants: [
      { type: 'feature', feature: { id: 'feat-dual-wielder' } },
      {
        type: 'ability-choice',
        key: createChoiceKey('ability-choice', 'feat', 'dual-wielder', 0),
        count: 1,
        bonus: 1,
        from: ['str', 'dex'],
      },
    ],
  },
  {
    id: 'durable',
    category: 'general',
    prerequisites: [{ type: 'level-minimum', level: 4 }],
    grants: [
      { type: 'feature', feature: { id: 'feat-durable' } },
      {
        type: 'ability-choice',
        key: createChoiceKey('ability-choice', 'feat', 'durable', 0),
        count: 1,
        bonus: 1,
        from: ['con'],
      },
    ],
  },
  {
    id: 'elemental-adept',
    category: 'general',
    prerequisites: [{ type: 'level-minimum', level: 4 }],
    repeatable: true,
    grants: [
      {
        type: 'ability-choice',
        key: createChoiceKey('ability-choice', 'feat', 'elemental-adept', 0),
        count: 1,
        bonus: 1,
        from: ['int', 'wis', 'cha'],
      },
      {
        type: 'feature-choice',
        key: createChoiceKey('feature-choice', 'feat', 'elemental-adept', 0),
        options: [
          {
            optionId: 'acid',
            featureId: 'feat-elemental-adept-acid',
            grants: [],
          },
          {
            optionId: 'cold',
            featureId: 'feat-elemental-adept-cold',
            grants: [],
          },
          {
            optionId: 'fire',
            featureId: 'feat-elemental-adept-fire',
            grants: [],
          },
          {
            optionId: 'lightning',
            featureId: 'feat-elemental-adept-lightning',
            grants: [],
          },
          {
            optionId: 'thunder',
            featureId: 'feat-elemental-adept-thunder',
            grants: [],
          },
        ],
      },
    ],
  },
  {
    id: 'fey-touched',
    category: 'general',
    prerequisites: [{ type: 'level-minimum', level: 4 }],
    grants: [
      { type: 'feature', feature: { id: 'feat-fey-touched' } },
      {
        type: 'ability-choice',
        key: createChoiceKey('ability-choice', 'feat', 'fey-touched', 0),
        count: 1,
        bonus: 1,
        from: ['int', 'wis', 'cha'],
      },
      { type: 'spell', spellId: 'misty-step', alwaysPrepared: true },
    ],
  },
  {
    id: 'grappler',
    category: 'general',
    prerequisites: [{ type: 'level-minimum', level: 4 }],
    grants: [
      { type: 'feature', feature: { id: 'feat-grappler' } },
      {
        type: 'ability-choice',
        key: createChoiceKey('ability-choice', 'feat', 'grappler', 0),
        count: 1,
        bonus: 1,
        from: ['str', 'dex'],
      },
    ],
  },
  {
    id: 'great-weapon-master',
    category: 'general',
    prerequisites: [{ type: 'level-minimum', level: 4 }],
    grants: [
      { type: 'feature', feature: { id: 'feat-great-weapon-master' } },
      {
        type: 'ability-choice',
        key: createChoiceKey('ability-choice', 'feat', 'great-weapon-master', 0),
        count: 1,
        bonus: 1,
        from: ['str'],
      },
    ],
  },
  {
    id: 'heavily-armored',
    category: 'general',
    prerequisites: [{ type: 'level-minimum', level: 4 }],
    grants: [
      { type: 'feature', feature: { id: 'feat-heavily-armored' } },
      { type: 'proficiency', category: 'armor', id: 'heavy' },
      {
        type: 'ability-choice',
        key: createChoiceKey('ability-choice', 'feat', 'heavily-armored', 0),
        count: 1,
        bonus: 1,
        from: ['str', 'con'],
      },
    ],
  },
  {
    id: 'heavy-armor-master',
    category: 'general',
    prerequisites: [{ type: 'level-minimum', level: 4 }],
    grants: [
      { type: 'feature', feature: { id: 'feat-heavy-armor-master' } },
      {
        type: 'ability-choice',
        key: createChoiceKey('ability-choice', 'feat', 'heavy-armor-master', 0),
        count: 1,
        bonus: 1,
        from: ['str', 'con'],
      },
    ],
  },
  {
    id: 'inspiring-leader',
    category: 'general',
    prerequisites: [{ type: 'level-minimum', level: 4 }],
    grants: [
      { type: 'feature', feature: { id: 'feat-inspiring-leader' } },
      {
        type: 'ability-choice',
        key: createChoiceKey('ability-choice', 'feat', 'inspiring-leader', 0),
        count: 1,
        bonus: 1,
        from: ['wis', 'cha'],
      },
    ],
  },
  {
    id: 'keen-mind',
    category: 'general',
    prerequisites: [{ type: 'level-minimum', level: 4 }],
    grants: [
      { type: 'feature', feature: { id: 'feat-keen-mind' } },
      {
        type: 'ability-choice',
        key: createChoiceKey('ability-choice', 'feat', 'keen-mind', 0),
        count: 1,
        bonus: 1,
        from: ['int'],
      },
      {
        type: 'proficiency-choice',
        category: 'skill',
        key: createChoiceKey('skill-choice', 'feat', 'keen-mind', 0),
        count: 1,
        from: ['arcana', 'history', 'investigation', 'nature', 'religion'],
      },
    ],
  },
  {
    id: 'lightly-armored',
    category: 'general',
    prerequisites: [{ type: 'level-minimum', level: 4 }],
    grants: [
      { type: 'feature', feature: { id: 'feat-lightly-armored' } },
      { type: 'proficiency', category: 'armor', id: 'light' },
      { type: 'proficiency', category: 'armor', id: 'shield' },
      {
        type: 'ability-choice',
        key: createChoiceKey('ability-choice', 'feat', 'lightly-armored', 0),
        count: 1,
        bonus: 1,
        from: ['str', 'dex'],
      },
    ],
  },
  {
    id: 'mage-slayer',
    category: 'general',
    prerequisites: [{ type: 'level-minimum', level: 4 }],
    grants: [
      { type: 'feature', feature: { id: 'feat-mage-slayer' } },
      {
        type: 'ability-choice',
        key: createChoiceKey('ability-choice', 'feat', 'mage-slayer', 0),
        count: 1,
        bonus: 1,
        from: ['str', 'dex'],
      },
    ],
  },
  {
    id: 'medium-armor-master',
    category: 'general',
    prerequisites: [{ type: 'level-minimum', level: 4 }],
    grants: [
      { type: 'feature', feature: { id: 'feat-medium-armor-master' } },
      {
        type: 'ability-choice',
        key: createChoiceKey('ability-choice', 'feat', 'medium-armor-master', 0),
        count: 1,
        bonus: 1,
        from: ['str', 'dex'],
      },
    ],
  },
  {
    id: 'moderately-armored',
    category: 'general',
    prerequisites: [{ type: 'level-minimum', level: 4 }],
    grants: [
      { type: 'feature', feature: { id: 'feat-moderately-armored' } },
      { type: 'proficiency', category: 'armor', id: 'medium' },
      { type: 'proficiency', category: 'armor', id: 'shield' },
      {
        type: 'ability-choice',
        key: createChoiceKey('ability-choice', 'feat', 'moderately-armored', 0),
        count: 1,
        bonus: 1,
        from: ['str', 'dex'],
      },
    ],
  },
  {
    id: 'mounted-combatant',
    category: 'general',
    prerequisites: [{ type: 'level-minimum', level: 4 }],
    grants: [
      { type: 'feature', feature: { id: 'feat-mounted-combatant' } },
      {
        type: 'ability-choice',
        key: createChoiceKey('ability-choice', 'feat', 'mounted-combatant', 0),
        count: 1,
        bonus: 1,
        from: ['str', 'dex', 'wis'],
      },
    ],
  },
  {
    id: 'observant',
    category: 'general',
    prerequisites: [{ type: 'level-minimum', level: 4 }],
    grants: [
      { type: 'feature', feature: { id: 'feat-observant' } },
      {
        type: 'ability-choice',
        key: createChoiceKey('ability-choice', 'feat', 'observant', 0),
        count: 1,
        bonus: 1,
        from: ['int', 'wis'],
      },
      {
        type: 'proficiency-choice',
        category: 'skill',
        key: createChoiceKey('skill-choice', 'feat', 'observant', 0),
        count: 1,
        from: ['insight', 'investigation', 'perception'],
      },
    ],
  },
  {
    id: 'piercer',
    category: 'general',
    prerequisites: [{ type: 'level-minimum', level: 4 }],
    grants: [
      { type: 'feature', feature: { id: 'feat-piercer' } },
      {
        type: 'ability-choice',
        key: createChoiceKey('ability-choice', 'feat', 'piercer', 0),
        count: 1,
        bonus: 1,
        from: ['str', 'dex'],
      },
    ],
  },
  {
    id: 'poisoner',
    category: 'general',
    prerequisites: [{ type: 'level-minimum', level: 4 }],
    grants: [
      { type: 'feature', feature: { id: 'feat-poisoner' } },
      { type: 'proficiency', category: 'tool', id: 'poisonerskit' },
      {
        type: 'ability-choice',
        key: createChoiceKey('ability-choice', 'feat', 'poisoner', 0),
        count: 1,
        bonus: 1,
        from: ['dex', 'int'],
      },
    ],
  },
  {
    id: 'polearm-master',
    category: 'general',
    prerequisites: [{ type: 'level-minimum', level: 4 }],
    grants: [
      { type: 'feature', feature: { id: 'feat-polearm-master' } },
      {
        type: 'ability-choice',
        key: createChoiceKey('ability-choice', 'feat', 'polearm-master', 0),
        count: 1,
        bonus: 1,
        from: ['str', 'dex'],
      },
    ],
  },
  {
    id: 'resilient',
    category: 'general',
    prerequisites: [{ type: 'level-minimum', level: 4 }],
    repeatable: true,
    grants: [
      {
        type: 'feature-choice',
        key: createChoiceKey('feature-choice', 'feat', 'resilient', 0),
        options: [
          {
            optionId: 'strength',
            featureId: 'feat-resilient-strength',
            grants: [
              { type: 'ability-bonus', ability: 'str', bonus: 1 },
              { type: 'proficiency', category: 'saving-throw', id: 'str' },
            ],
          },
          {
            optionId: 'dexterity',
            featureId: 'feat-resilient-dexterity',
            grants: [
              { type: 'ability-bonus', ability: 'dex', bonus: 1 },
              { type: 'proficiency', category: 'saving-throw', id: 'dex' },
            ],
          },
          {
            optionId: 'constitution',
            featureId: 'feat-resilient-constitution',
            grants: [
              { type: 'ability-bonus', ability: 'con', bonus: 1 },
              { type: 'proficiency', category: 'saving-throw', id: 'con' },
            ],
          },
          {
            optionId: 'intelligence',
            featureId: 'feat-resilient-intelligence',
            grants: [
              { type: 'ability-bonus', ability: 'int', bonus: 1 },
              { type: 'proficiency', category: 'saving-throw', id: 'int' },
            ],
          },
          {
            optionId: 'wisdom',
            featureId: 'feat-resilient-wisdom',
            grants: [
              { type: 'ability-bonus', ability: 'wis', bonus: 1 },
              { type: 'proficiency', category: 'saving-throw', id: 'wis' },
            ],
          },
          {
            optionId: 'charisma',
            featureId: 'feat-resilient-charisma',
            grants: [
              { type: 'ability-bonus', ability: 'cha', bonus: 1 },
              { type: 'proficiency', category: 'saving-throw', id: 'cha' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'ritual-caster',
    category: 'general',
    prerequisites: [{ type: 'level-minimum', level: 4 }],
    grants: [
      { type: 'feature', feature: { id: 'feat-ritual-caster' } },
      {
        type: 'ability-choice',
        key: createChoiceKey('ability-choice', 'feat', 'ritual-caster', 0),
        count: 1,
        bonus: 1,
        from: ['int', 'wis', 'cha'],
      },
    ],
  },
  {
    id: 'sentinel',
    category: 'general',
    prerequisites: [{ type: 'level-minimum', level: 4 }],
    grants: [
      { type: 'feature', feature: { id: 'feat-sentinel' } },
      {
        type: 'ability-choice',
        key: createChoiceKey('ability-choice', 'feat', 'sentinel', 0),
        count: 1,
        bonus: 1,
        from: ['str', 'dex'],
      },
    ],
  },
  {
    id: 'shadow-touched',
    category: 'general',
    prerequisites: [{ type: 'level-minimum', level: 4 }],
    grants: [
      { type: 'feature', feature: { id: 'feat-shadow-touched' } },
      {
        type: 'ability-choice',
        key: createChoiceKey('ability-choice', 'feat', 'shadow-touched', 0),
        count: 1,
        bonus: 1,
        from: ['int', 'wis', 'cha'],
      },
      { type: 'spell', spellId: 'invisibility', alwaysPrepared: true },
    ],
  },
  {
    id: 'sharpshooter',
    category: 'general',
    prerequisites: [{ type: 'level-minimum', level: 4 }],
    grants: [
      { type: 'feature', feature: { id: 'feat-sharpshooter' } },
      {
        type: 'ability-choice',
        key: createChoiceKey('ability-choice', 'feat', 'sharpshooter', 0),
        count: 1,
        bonus: 1,
        from: ['dex'],
      },
    ],
  },
  {
    id: 'shield-master',
    category: 'general',
    prerequisites: [{ type: 'level-minimum', level: 4 }],
    grants: [
      { type: 'feature', feature: { id: 'feat-shield-master' } },
      {
        type: 'ability-choice',
        key: createChoiceKey('ability-choice', 'feat', 'shield-master', 0),
        count: 1,
        bonus: 1,
        from: ['str'],
      },
    ],
  },
  {
    id: 'skill-expert',
    category: 'general',
    prerequisites: [{ type: 'level-minimum', level: 4 }],
    grants: [
      { type: 'feature', feature: { id: 'feat-skill-expert' } },
      {
        type: 'ability-choice',
        key: createChoiceKey('ability-choice', 'feat', 'skill-expert', 0),
        count: 1,
        bonus: 1,
        from: null,
      },
      {
        type: 'proficiency-choice',
        category: 'skill',
        key: createChoiceKey('skill-choice', 'feat', 'skill-expert', 0),
        count: 1,
        from: null,
      },
      {
        type: 'expertise-choice',
        key: createChoiceKey('expertise-choice', 'feat', 'skill-expert', 0),
        count: 1,
        from: null,
        fromTools: [],
      },
    ],
  },
  {
    id: 'skulker',
    category: 'general',
    prerequisites: [{ type: 'level-minimum', level: 4 }],
    grants: [
      { type: 'feature', feature: { id: 'feat-skulker' } },
      {
        type: 'ability-choice',
        key: createChoiceKey('ability-choice', 'feat', 'skulker', 0),
        count: 1,
        bonus: 1,
        from: ['dex'],
      },
    ],
  },
  {
    id: 'slasher',
    category: 'general',
    prerequisites: [{ type: 'level-minimum', level: 4 }],
    grants: [
      { type: 'feature', feature: { id: 'feat-slasher' } },
      {
        type: 'ability-choice',
        key: createChoiceKey('ability-choice', 'feat', 'slasher', 0),
        count: 1,
        bonus: 1,
        from: ['str', 'dex'],
      },
    ],
  },
  {
    id: 'speedy',
    category: 'general',
    prerequisites: [{ type: 'level-minimum', level: 4 }],
    grants: [
      { type: 'feature', feature: { id: 'feat-speedy' } },
      { type: 'speed', mode: 'walk', value: 10 },
      {
        type: 'ability-choice',
        key: createChoiceKey('ability-choice', 'feat', 'speedy', 0),
        count: 1,
        bonus: 1,
        from: ['dex', 'con'],
      },
    ],
  },
  {
    id: 'spell-sniper',
    category: 'general',
    prerequisites: [{ type: 'level-minimum', level: 4 }],
    grants: [
      { type: 'feature', feature: { id: 'feat-spell-sniper' } },
      {
        type: 'ability-choice',
        key: createChoiceKey('ability-choice', 'feat', 'spell-sniper', 0),
        count: 1,
        bonus: 1,
        from: ['int', 'wis', 'cha'],
      },
    ],
  },
  {
    id: 'telekinetic',
    category: 'general',
    prerequisites: [{ type: 'level-minimum', level: 4 }],
    grants: [
      { type: 'feature', feature: { id: 'feat-telekinetic' } },
      { type: 'spell', spellId: 'mage-hand', alwaysPrepared: true },
      {
        type: 'ability-choice',
        key: createChoiceKey('ability-choice', 'feat', 'telekinetic', 0),
        count: 1,
        bonus: 1,
        from: ['int', 'wis', 'cha'],
      },
    ],
  },
  {
    id: 'telepathic',
    category: 'general',
    prerequisites: [{ type: 'level-minimum', level: 4 }],
    grants: [
      { type: 'feature', feature: { id: 'feat-telepathic' } },
      { type: 'spell', spellId: 'detect-thoughts', alwaysPrepared: true },
      {
        type: 'ability-choice',
        key: createChoiceKey('ability-choice', 'feat', 'telepathic', 0),
        count: 1,
        bonus: 1,
        from: ['int', 'wis', 'cha'],
      },
    ],
  },
  {
    id: 'war-caster',
    category: 'general',
    prerequisites: [{ type: 'level-minimum', level: 4 }],
    grants: [
      { type: 'feature', feature: { id: 'feat-war-caster' } },
      {
        type: 'ability-choice',
        key: createChoiceKey('ability-choice', 'feat', 'war-caster', 0),
        count: 1,
        bonus: 1,
        from: ['int', 'wis', 'cha'],
      },
    ],
  },
  {
    id: 'weapon-master',
    category: 'general',
    prerequisites: [{ type: 'level-minimum', level: 4 }],
    grants: [
      { type: 'feature', feature: { id: 'feat-weapon-master' } },
      {
        type: 'ability-choice',
        key: createChoiceKey('ability-choice', 'feat', 'weapon-master', 0),
        count: 1,
        bonus: 1,
        from: ['str', 'dex'],
      },
    ],
  },
  {
    id: 'martial-weapon-training',
    category: 'general',
    prerequisites: [{ type: 'level-minimum', level: 4 }],
    grants: [
      { type: 'feature', feature: { id: 'feat-martial-weapon-training' } },
      { type: 'proficiency', category: 'weapon', id: 'martial' },
      {
        type: 'ability-choice',
        key: createChoiceKey('ability-choice', 'feat', 'martial-weapon-training', 0),
        count: 1,
        bonus: 1,
        from: ['str', 'dex'],
      },
    ],
  },

  // Epic Boon feats — level 19+ prerequisite
  {
    id: 'boon-of-combat-prowess',
    category: 'epicBoon',
    prerequisites: [{ type: 'level-minimum', level: 19 }],
    grants: [{ type: 'feature', feature: { id: 'feat-boon-of-combat-prowess' } }],
  },
  {
    id: 'boon-of-dimensional-travel',
    category: 'epicBoon',
    prerequisites: [{ type: 'level-minimum', level: 19 }],
    grants: [{ type: 'feature', feature: { id: 'feat-boon-of-dimensional-travel' } }],
  },
  {
    id: 'boon-of-energy-resistance',
    category: 'epicBoon',
    prerequisites: [{ type: 'level-minimum', level: 19 }],
    grants: [{ type: 'feature', feature: { id: 'feat-boon-of-energy-resistance' } }],
  },
  {
    id: 'boon-of-fate',
    category: 'epicBoon',
    prerequisites: [{ type: 'level-minimum', level: 19 }],
    grants: [{ type: 'feature', feature: { id: 'feat-boon-of-fate' } }],
  },
  {
    id: 'boon-of-fortitude',
    category: 'epicBoon',
    prerequisites: [{ type: 'level-minimum', level: 19 }],
    grants: [
      { type: 'feature', feature: { id: 'feat-boon-of-fortitude' } },
      { type: 'hp-bonus', perLevel: 0 }, // +40 flat; we model as a feature since hp-bonus is perLevel
    ],
  },
  {
    id: 'boon-of-irresistible-offense',
    category: 'epicBoon',
    prerequisites: [{ type: 'level-minimum', level: 19 }],
    grants: [{ type: 'feature', feature: { id: 'feat-boon-of-irresistible-offense' } }],
  },
  {
    id: 'boon-of-night-spirit',
    category: 'epicBoon',
    prerequisites: [{ type: 'level-minimum', level: 19 }],
    grants: [{ type: 'feature', feature: { id: 'feat-boon-of-night-spirit' } }],
  },
  {
    id: 'boon-of-recovery',
    category: 'epicBoon',
    prerequisites: [{ type: 'level-minimum', level: 19 }],
    grants: [{ type: 'feature', feature: { id: 'feat-boon-of-recovery' } }],
  },
  {
    id: 'boon-of-skill',
    category: 'epicBoon',
    prerequisites: [{ type: 'level-minimum', level: 19 }],
    grants: [
      { type: 'feature', feature: { id: 'feat-boon-of-skill' } },
      {
        type: 'expertise-choice',
        key: createChoiceKey('expertise-choice', 'feat', 'boon-of-skill', 0),
        count: 1,
        from: null,
        fromTools: [],
      },
    ],
  },
  {
    id: 'boon-of-speed',
    category: 'epicBoon',
    prerequisites: [{ type: 'level-minimum', level: 19 }],
    grants: [
      { type: 'feature', feature: { id: 'feat-boon-of-speed' } },
      { type: 'speed', mode: 'walk', value: 30 },
    ],
  },
  {
    id: 'boon-of-spell-recall',
    category: 'epicBoon',
    prerequisites: [{ type: 'level-minimum', level: 19 }],
    grants: [{ type: 'feature', feature: { id: 'feat-boon-of-spell-recall' } }],
  },
  {
    id: 'boon-of-truesight',
    category: 'epicBoon',
    prerequisites: [{ type: 'level-minimum', level: 19 }],
    grants: [{ type: 'feature', feature: { id: 'feat-boon-of-truesight' } }],
  },
];
