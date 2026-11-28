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
/** Table shorthand seen on homebrew items ("sth +1", "pasif perc +2", "inv/perception +2"). */
const SKILL_ALIASES: Record<string, SkillId> = {
  sth: 'stealth',
  perc: 'perception',
  inv: 'investigation',
  ath: 'athletics',
  acro: 'acrobatics',
};

/** Roll kinds, abilities and skills named in a phrase such as "Strength checks" or "attack and damage rolls". */
function parsePhrase(phrase: string): {
  targets: RollTarget[];
  abilities?: AbilityKey[];
  skills?: SkillId[];
  ac: boolean;
} {
  const p = phrase.toLowerCase();
  const targets: RollTarget[] = [];
  if (/saving|savng|\bsaves?\b/.test(p)) targets.push('save');
  if (/\bchecks?\b/.test(p)) targets.push('check');
  if (/spell attack/.test(p)) targets.push('spell-attack');
  if (/spell save dc/.test(p)) targets.push('spell-dc');
  if (/attack|\batk\b/.test(p) && !/spell attack/.test(p)) targets.push('attack');
  if (/damage roll/.test(p)) targets.push('damage');
  const abilities = [
    ...new Set(
      Object.entries(ABILITY_NAMES)
        .filter(([name]) => new RegExp(`\\b${name}\\b`).test(p))
        .map(([, key]) => key)
    ),
  ];
  const squashed = squash(p);
  const skills = [
    ...new Set([
      ...SKILL_IDS.filter((id) => squashed.includes(id)),
      ...Object.entries(SKILL_ALIASES)
        .filter(([alias]) => new RegExp(`\\b${alias}\\b`).test(p))
        .map(([, id]) => id),
    ]),
  ];
  // A bare skill name ("stealth +1") means a check with that skill.
  if (targets.length === 0 && skills.length > 0) targets.push('check');
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
  `(?<!\\w)([+-]\\d+)\\s+(?:bonus\\s+)?(?:to\\s+)?(?:your\\s+)?${ABILITY_WORD}\\b(?:\\s+score)?(?!\\s+(?:checks?|saves?|saving|savng))`,
  'gi'
);
// Amount after the rolls, as homebrew notes are often written ("sth +1", "athletics ve acrobatics +1").
const DAMAGE_WORD = `(?:slash|pierc|bludgeon|${DAMAGE_TYPES.join('|')})\\w*`;
const POSTFIX = new RegExp(`([^.;,()+:]+?)\\s*(?<!\\w)([+-])(\\d+d\\d+|\\d+)(?!\\w)(?!\\s+${DAMAGE_WORD})`, 'gi');
// "+1d4 slash", "+1d6 piercing": extra damage of a type.
const TYPED_DAMAGE = new RegExp(`(?<!\\w)([+-]\\d+d\\d+|[+-]\\d+)\\s+${DAMAGE_WORD}`, 'gi');
const ADV_DIS = /\b(advantage|disadvantage)\s+on\s+([^.;]*)/gi;
// Turkish word order: "dex stealth str athletics avantaj", "stealth dezavantaj". Only the bare word, so
// "avantajlı" / "dezavantajlarını yok sayar" (ignores disadvantage) don't match.
const ADV_DIS_TR = /([^.;,()]+?)\s+(avantaj|dezavantaj)(?![\wçğıöşü])/gi;
const RESISTANCE = /\bresistance\s+to\s+([a-z, ]+?)\s+damage/gi;
const TYPE_RESISTANCE = new RegExp(`\\b(${DAMAGE_TYPES.join('|')})\\s+resistance\\b`, 'gi');
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
    for (const [, phrase, sign, amount] of sentence.matchAll(POSTFIX)) {
      const isDice = amount.includes('d');
      add(sentence, rollGrants(phrase, isDice ? { dice: `${sign}${amount}` } : { bonus: Number(`${sign}${amount}`) }));
    }
    for (const [, amount] of sentence.matchAll(TYPED_DAMAGE)) {
      const extra = amount.includes('d') ? { dice: amount } : { bonus: Number(amount) };
      add(sentence, [{ type: 'roll-modifier', target: 'damage', ...extra, ...(label ? { label } : {}) }]);
    }
    for (const [, amount, name] of sentence.matchAll(STAT_BONUS)) {
      add(sentence, [{ type: 'ability-bonus', ability: ABILITY_NAMES[name.toLowerCase()], bonus: Number(amount) }]);
    }
    for (const [, kind, phrase] of sentence.matchAll(ADV_DIS)) {
      const grants = rollGrants(phrase, { mode: kind.toLowerCase() === 'advantage' ? 'adv' : 'dis' });
      add(sentence, grants);
    }
    for (const [, phrase, kind] of sentence.matchAll(ADV_DIS_TR)) {
      add(sentence, rollGrants(phrase, { mode: kind.toLowerCase() === 'avantaj' ? 'adv' : 'dis' }));
    }
    for (const [, damageType] of sentence.matchAll(TYPE_RESISTANCE)) {
      add(sentence, [{ type: 'resistance', damageType: damageType.toLowerCase() as (typeof DAMAGE_TYPES)[number] }]);
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
