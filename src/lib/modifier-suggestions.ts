import { DND_SKILLS, type SkillId } from '@/lib/dnd-helpers';
import { DAMAGE_TYPES, type Grant, type RollModifierGrant, type RollTarget } from '@/types/grants';
import type { AbilityKey } from '@/types/database';

/** A modifier the player may approve, found by keyword in free text (an item or feature description). */
export interface ModifierSuggestion {
  /** The sentence that matched, shown so the player can judge conditions the parser can't see. */
  readonly snippet: string;
  /** Short English summary, e.g. `+1 to saving throws`. */
  readonly label: string;
  readonly grants: readonly Grant[];
}

const ABILITY_NAMES: Record<string, AbilityKey> = {
  strength: 'str',
  dexterity: 'dex',
  constitution: 'con',
  intelligence: 'int',
  wisdom: 'wis',
  charisma: 'cha',
  str: 'str',
  dex: 'dex',
  con: 'con',
  int: 'int',
  wis: 'wis',
  cha: 'cha',
};
const ABILITY_WORD = `(${Object.keys(ABILITY_NAMES).join('|')})`;

const squash = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '');
const SKILL_IDS = DND_SKILLS.map((s) => s.id);

/** Roll kinds, abilities and skills named in a phrase such as "Strength checks" or "attack and damage rolls". */
function parsePhrase(phrase: string): {
  targets: RollTarget[];
  abilities?: AbilityKey[];
  skills?: SkillId[];
  ac: boolean;
} {
  const p = phrase.toLowerCase();
  const targets: RollTarget[] = [];
  if (/saving throw|\bsaves?\b/.test(p)) targets.push('save');
  if (/\bchecks?\b/.test(p)) targets.push('check');
  if (/spell attack/.test(p)) targets.push('spell-attack');
  if (/spell save dc/.test(p)) targets.push('spell-dc');
  if (/attack/.test(p) && !/spell attack/.test(p)) targets.push('attack');
  if (/damage roll/.test(p)) targets.push('damage');
  const abilities = [
    ...new Set(
      Object.entries(ABILITY_NAMES)
        .filter(([name]) => new RegExp(`\\b${name}\\b`).test(p))
        .map(([, key]) => key)
    ),
  ];
  const squashed = squash(p);
  const skills = SKILL_IDS.filter((id) => squashed.includes(id));
  // "Strength checks" names an ability; "Athletics checks" names a skill (which already fixes the ability).
  return {
    targets,
    ac: /armor class|\bac\b/.test(p),
    ...(abilities.length ? { abilities } : {}),
    ...(skills.length ? { skills } : {}),
  };
}

// Signed amount ("+1", "-1", "+1d4", "add 1d4") then the rolls it applies to; "to"/"on" is optional so
// homebrew shorthand like "-1 dex check" parses. A phrase naming no roll yields no grant.
const FLAT_OR_DICE =
  /(?:(?<!\w)([+-])|\badd\s+(?:a\s+|an\s+)?)(\d+d\d+|\d+)\s+(?:bonus\s+)?(?:(?:to|on)\s+)?(?:your\s+|all\s+|any\s+)?([^.;,]*)/gi;
// "+2 Strength", "+1 to your DEX score" — a stat bump, not a roll modifier.
const STAT_BONUS = new RegExp(
  `(?<!\\w)([+-]\\d+)\\s+(?:bonus\\s+)?(?:to\\s+)?(?:your\\s+)?${ABILITY_WORD}\\b(?:\\s+score)?(?!\\s+(?:checks?|saves?|saving))`,
  'gi'
);
const ADV_DIS = /\b(advantage|disadvantage)\s+on\s+([^.;]*)/gi;
const RESISTANCE = /\bresistance\s+to\s+([a-z, ]+?)\s+damage/gi;
const SCORE =
  /\b(strength|dexterity|constitution|intelligence|wisdom|charisma)\s+score\s+(?:is|changes to|becomes)\s+(\d+)/gi;

/** Short English description of a modifier grant, for the approval list. */
export function describeGrant(g: Grant): string {
  switch (g.type) {
    case 'roll-modifier': {
      const signed = g.dice ?? `${(g.bonus ?? 0) >= 0 ? '+' : ''}${g.bonus}`;
      const what = g.mode ? (g.mode === 'adv' ? 'Advantage on' : 'Disadvantage on') : `${signed} to`;
      const narrow = [...(g.abilities ?? []), ...(g.skills ?? [])].join('/');
      return `${what} ${g.target}${narrow ? ` (${narrow})` : ''}`;
    }
    case 'ac-bonus':
      return `${g.bonus >= 0 ? '+' : ''}${g.bonus} AC`;
    case 'resistance':
      return `Resistance: ${g.damageType}`;
    case 'ability-bonus':
      return `${g.bonus >= 0 ? '+' : ''}${g.bonus} ${g.ability.toUpperCase()}`;
    case 'speed':
      return `${typeof g.value === 'number' && g.value >= 0 ? '+' : ''}${g.value} ft speed`;
    case 'hp-bonus':
      return `${(g.flat ?? 0) >= 0 ? '+' : ''}${g.flat ?? 0} max HP`;
    case 'ability-set':
      return `${g.ability.toUpperCase()} score ${g.score}`;
    default:
      return g.type;
  }
}

/**
 * Finds numeric roll bonuses, extra dice, advantage/disadvantage, AC bonuses, damage resistances and
 * fixed ability scores in prose. Heuristic only: the player approves each suggestion (see CustomModifiersPanel).
 */
export function suggestModifiers(text: string, label?: string): ModifierSuggestion[] {
  const out: ModifierSuggestion[] = [];
  const seen = new Set<string>();
  const add = (snippet: string, grants: Grant[]) => {
    const key = JSON.stringify(grants);
    if (grants.length && !seen.has(key)) {
      seen.add(key);
      out.push({ snippet, label: grants.map(describeGrant).join(', '), grants });
    }
  };
  const rollGrants = (
    phrase: string,
    extra: Pick<RollModifierGrant, 'bonus' | 'dice' | 'mode'>,
    allowAc?: number
  ): Grant[] => {
    const { targets, abilities, skills, ac } = parsePhrase(phrase);
    const grants: Grant[] = targets.map((target) => ({
      type: 'roll-modifier',
      target,
      ...(abilities && (target === 'save' || target === 'check') ? { abilities } : {}),
      ...(skills && target === 'check' ? { skills } : {}),
      ...extra,
      ...(label ? { label } : {}),
    }));
    if (ac && allowAc) grants.push({ type: 'ac-bonus', bonus: allowAc });
    return grants;
  };
  for (const sentence of text.split(/(?<=[.!?])\s+|\n+/)) {
    for (const [, sign = '+', amount, phrase] of sentence.matchAll(FLAT_OR_DICE)) {
      const isDice = amount.includes('d');
      const bonus = Number(`${sign}${amount}`);
      const grants = rollGrants(phrase, isDice ? { dice: `${sign}${amount}` } : { bonus }, isDice ? 0 : bonus);
      add(sentence, grants);
    }
    for (const [, amount, name] of sentence.matchAll(STAT_BONUS)) {
      add(sentence, [{ type: 'ability-bonus', ability: ABILITY_NAMES[name.toLowerCase()], bonus: Number(amount) }]);
    }
    for (const [, kind, phrase] of sentence.matchAll(ADV_DIS)) {
      const grants = rollGrants(phrase, { mode: kind.toLowerCase() === 'advantage' ? 'adv' : 'dis' });
      add(sentence, grants);
    }
    for (const [, types] of sentence.matchAll(RESISTANCE)) {
      const grants: Grant[] = types
        .split(/,|\band\b/)
        .map((t) => t.trim().toLowerCase())
        .filter((t): t is (typeof DAMAGE_TYPES)[number] => (DAMAGE_TYPES as readonly string[]).includes(t))
        .map((damageType) => ({ type: 'resistance', damageType }));
      add(sentence, grants);
    }
    for (const [, name, score] of sentence.matchAll(SCORE)) {
      const ability = ABILITY_NAMES[name.toLowerCase()];
      add(sentence, [{ type: 'ability-set', ability, score: Number(score) }]);
    }
  }
  return out;
}
