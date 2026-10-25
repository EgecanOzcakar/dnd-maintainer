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
};

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
  const abilities = Object.entries(ABILITY_NAMES)
    .filter(([name]) => p.includes(name))
    .map(([, key]) => key);
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

const FLAT_OR_DICE =
  /(?:\+|\badd\s+(?:a\s+|an\s+)?)(\d+d\d+|\d+)\s+(?:bonus\s+)?(?:to|on)\s+(?:your\s+|all\s+|any\s+)?([^.;,]*)/gi;
const ADV_DIS = /\b(advantage|disadvantage)\s+on\s+([^.;]*)/gi;
const RESISTANCE = /\bresistance\s+to\s+([a-z, ]+?)\s+damage/gi;
const SCORE =
  /\b(strength|dexterity|constitution|intelligence|wisdom|charisma)\s+score\s+(?:is|changes to|becomes)\s+(\d+)/gi;

/** Short English description of a modifier grant, for the approval list. */
export function describeGrant(g: Grant): string {
  switch (g.type) {
    case 'roll-modifier': {
      const what = g.mode ? (g.mode === 'adv' ? 'Advantage on' : 'Disadvantage on') : `${g.dice ?? `+${g.bonus}`} to`;
      const narrow = [...(g.abilities ?? []), ...(g.skills ?? [])].join('/');
      return `${what} ${g.target}${narrow ? ` (${narrow})` : ''}`;
    }
    case 'ac-bonus':
      return `+${g.bonus} AC`;
    case 'resistance':
      return `Resistance: ${g.damageType}`;
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
    for (const [, amount, phrase] of sentence.matchAll(FLAT_OR_DICE)) {
      const isDice = amount.includes('d');
      const grants = rollGrants(
        phrase,
        isDice ? { dice: `+${amount}` } : { bonus: Number(amount) },
        isDice ? 0 : Number(amount)
      );
      add(sentence, grants);
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
