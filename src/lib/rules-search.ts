import { CONDITION_IDS } from '@/lib/sources/conditions';
import { SPELL_CATALOG } from '@/lib/sources/spells';
import { SPELL_MECHANICS } from '@/lib/sources/spell-mechanics';
import type { SpellDef } from '@/types/spells';
import type { SpellMechanics } from '@/types/actions';
import gamedata from '@/locales/en/gamedata.json';

export const RULE_CATEGORIES = ['spell', 'condition', 'action', 'feat', 'mastery', 'property'] as const;
export type RuleCategory = (typeof RULE_CATEGORIES)[number];

export const BASIC_ACTION_IDS = [
  'dash',
  'disengage',
  'dodge',
  'help',
  'hide',
  'influence',
  'magic',
  'ready',
  'search',
  'study',
  'utilize',
] as const;
export const EXTRA_ACTION_IDS = ['opportunityAttack', 'grappleShove'] as const;

/** Looks up a translated string by full key. */
export type Translate = (key: string) => string;

export interface RuleEntry {
  readonly id: string;
  readonly category: RuleCategory;
  readonly name: string;
  readonly description: string;
  readonly spell?: SpellDef;
  readonly mechanics?: SpellMechanics;
}

export interface SpellFilters {
  classId: string;
  level: string;
  school: string;
  concentration: boolean;
  ritual: boolean;
}

export const NO_SPELL_FILTERS: SpellFilters = {
  classId: '',
  level: '',
  school: '',
  concentration: false,
  ritual: false,
};

export function hasSpellFilters(f: SpellFilters): boolean {
  return Boolean(f.classId || f.level || f.school || f.concentration || f.ritual);
}

const keysOf = (group: string): string[] => Object.keys((gamedata as unknown as Record<string, object>)[group] ?? {});

/** Builds the full searchable list. `tg` resolves gamedata keys, `tc` resolves common keys. */
export function buildRuleEntries(tg: Translate, tc: Translate): RuleEntry[] {
  const entries: RuleEntry[] = [];
  for (const spell of SPELL_CATALOG as readonly SpellDef[]) {
    entries.push({
      id: spell.id,
      category: 'spell',
      name: tg(`spells.${spell.id}.name`),
      description: tg(`spells.${spell.id}.description`),
      spell,
      mechanics: SPELL_MECHANICS[spell.id],
    });
  }
  for (const id of CONDITION_IDS) {
    entries.push({
      id,
      category: 'condition',
      name: tg(`conditions.${id}.name`),
      description: tg(`conditions.${id}.description`),
    });
  }
  for (const id of BASIC_ACTION_IDS) {
    entries.push({
      id,
      category: 'action',
      name: tc(`characterSheet.combatView.actions.basic.${id}`),
      description: tc(`rules.actions.${id}.description`),
    });
  }
  for (const id of EXTRA_ACTION_IDS) {
    entries.push({
      id,
      category: 'action',
      name: tc(`rules.actions.${id}.name`),
      description: tc(`rules.actions.${id}.description`),
    });
  }
  for (const id of keysOf('feats')) {
    entries.push({
      id,
      category: 'feat',
      name: tg(`feats.${id}.name`),
      description: tg(`feats.${id}.description`),
    });
  }
  for (const id of keysOf('weaponMasteries')) {
    entries.push({
      id,
      category: 'mastery',
      name: tg(`weaponMasteries.${id}.name`),
      description: tg(`weaponMasteries.${id}.description`),
    });
  }
  // Weapon properties only carry a label in gamedata, so they match on name alone.
  for (const id of keysOf('weaponProperties')) {
    entries.push({ id, category: 'property', name: tg(`weaponProperties.${id}`), description: '' });
  }
  return entries;
}

/** Spell-only filters; non-spell entries are hidden while any spell filter is active. */
export function matchesSpellFilters(entry: RuleEntry, f: SpellFilters): boolean {
  if (!hasSpellFilters(f)) return true;
  const s = entry.spell;
  if (!s) return false;
  if (f.classId && !(s.nativeClasses as readonly string[]).includes(f.classId)) return false;
  if (f.level !== '' && s.level !== Number(f.level)) return false;
  if (f.school && s.school !== f.school) return false;
  if (f.concentration && !s.concentration) return false;
  if (f.ritual && !s.ritual) return false;
  return true;
}

/** Every whitespace-separated term must appear in the name or description (case-insensitive). */
export function matchesQuery(entry: RuleEntry, query: string): boolean {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;
  const haystack = `${entry.name} ${entry.description}`.toLowerCase();
  return terms.every((term) => haystack.includes(term));
}

export function searchRules(entries: readonly RuleEntry[], query: string, filters: SpellFilters): RuleEntry[] {
  return entries.filter((e) => matchesSpellFilters(e, filters) && matchesQuery(e, query));
}

/** Groups results by category in display order, dropping empty groups. */
export function groupByCategory(results: readonly RuleEntry[]): { category: RuleCategory; entries: RuleEntry[] }[] {
  return RULE_CATEGORIES.map((category) => ({
    category,
    entries: results.filter((e) => e.category === category),
  })).filter((g) => g.entries.length > 0);
}
