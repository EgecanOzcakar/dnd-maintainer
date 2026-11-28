import { ABILITY_KEYS, DND_SKILLS, type SkillId } from '@/lib/dnd-helpers';
import { DAMAGE_TYPES, ROLL_TARGETS, type DamageTypeId, type Grant, type RollTarget } from '@/types/grants';
import type { AbilityKey } from '@/types/database';
import type { GrantBundle } from '@/types/sources';
import { customItemName } from '@/lib/custom-items';

/**
 * Homebrew item effects in a fixed rule syntax, one rule per line (or separated by `;`):
 *
 *   check stealth +1            save str,dex +1d4         attack +1      damage +1d6
 *   check stealth,athletics adv check perception -1       spell-dc +1    ac +1
 *   (list several abilities/skills with commas or spaces; multi-word skills as sleight-of-hand)
 *   str +2   str =19   resist thunder,fire   speed +10   hp +5
 *
 * `# text` after a rule labels it (shown in roll breakdowns). A leading `?` marks a situational rule
 * ("? check stealth adv # in swamps"): it is checked and shown as a reminder but never applied.
 */
export interface EffectLine {
  readonly text: string;
  readonly grant?: Grant;
  readonly note?: string;
  readonly situational: boolean;
  /** Set when the line could not be read; the line is then ignored. */
  readonly error?: string;
}

const SKILLS = new Map(DND_SKILLS.map((s) => [s.id as string, s.id]));
const isAbility = (w: string): w is AbilityKey => (ABILITY_KEYS as readonly string[]).includes(w);
const isRollTarget = (w: string): w is RollTarget => (ROLL_TARGETS as readonly string[]).includes(w);
const isDamageType = (w: string): w is DamageTypeId => (DAMAGE_TYPES as readonly string[]).includes(w);
const FLAT = /^[+-]\d+$/;
const DICE = /^[+-]\d+d\d+$/;

function parseRule(rule: string, label: string | undefined): Grant[] | string {
  const [head = '', ...rest] = rule.toLowerCase().split(/\s+/);
  const value = rest[rest.length - 1] ?? '';

  if (isRollTarget(head)) {
    if (rest.length === 0) return 'missing value (+1, -1, +1d4, adv or dis)';
    const narrow = rest
      .slice(0, -1)
      .join(' ')
      .split(/[\s,]+/)
      .filter(Boolean);
    const abilities: AbilityKey[] = [];
    const skills: SkillId[] = [];
    for (const w of narrow) {
      const skill = SKILLS.get(w.replace(/[-_]/g, ''));
      if (isAbility(w)) abilities.push(w);
      else if (skill && head === 'check') skills.push(skill);
      else return `unknown ${head === 'check' ? 'ability or skill' : 'ability'} "${w}"`;
    }
    if (narrow.length > 0 && head !== 'save' && head !== 'check') return `${head} can't be narrowed`;
    const amount =
      value === 'adv' || value === 'dis'
        ? { mode: value as 'adv' | 'dis' }
        : DICE.test(value)
          ? { dice: value }
          : FLAT.test(value)
            ? { bonus: Number(value) }
            : null;
    if (!amount) return `bad value "${value}" (use +1, -1, +1d4, adv or dis)`;
    return [
      {
        type: 'roll-modifier',
        target: head,
        ...(abilities.length ? { abilities } : {}),
        ...(skills.length ? { skills } : {}),
        ...amount,
        ...(label ? { label } : {}),
      },
    ];
  }

  const flat = rest.length === 1 && FLAT.test(value) ? Number(value) : null;
  if (head === 'ac') return flat !== null ? [{ type: 'ac-bonus', bonus: flat }] : 'use: ac +1';
  if (head === 'speed')
    return flat !== null ? [{ type: 'speed', mode: 'walk', value: flat, additive: true }] : 'use: speed +10';
  if (head === 'hp') return flat !== null ? [{ type: 'hp-bonus', perLevel: 0, flat }] : 'use: hp +5';
  if (isAbility(head)) {
    if (flat !== null) return [{ type: 'ability-bonus', ability: head, bonus: flat }];
    if (rest.length === 1 && /^=\d+$/.test(value))
      return [{ type: 'ability-set', ability: head, score: Number(value.slice(1)) }];
    return `use: ${head} +2 or ${head} =19`;
  }
  if (head === 'resist') {
    const types = rest
      .join(' ')
      .split(/[\s,]+/)
      .filter(Boolean);
    const bad = types.find((t) => !isDamageType(t));
    if (types.length === 0 || bad !== undefined) return `unknown damage type "${bad ?? ''}"`;
    return types.filter(isDamageType).map((damageType) => ({ type: 'resistance', damageType }));
  }
  return `unknown rule "${head}"`;
}

/** Parses effect rules. `itemName` labels roll modifiers in breakdowns. */
export function parseEffects(text: string, itemName?: string): EffectLine[] {
  return text
    .split(/\n|;/)
    .map((raw) => raw.trim())
    .filter(Boolean)
    .flatMap((raw): EffectLine[] => {
      const situational = raw.startsWith('?');
      const [body = '', ...noteParts] = raw.replace(/^\?\s*/, '').split('#');
      const note = noteParts.join('#').trim() || undefined;
      const label = itemName && note ? `${itemName} (${note})` : (itemName ?? note);
      const parsed = parseRule(body.trim(), label);
      const base = { text: raw, situational, ...(note ? { note } : {}) };
      if (typeof parsed === 'string') return [{ ...base, error: parsed }];
      return parsed.map((grant) => ({ ...base, grant }));
    });
}

/** Grants that apply now: valid, non-situational rules. */
export function effectGrants(text: string, itemName?: string): Grant[] {
  return parseEffects(text, itemName).flatMap((l) => (l.grant && !l.situational ? [l.grant] : []));
}

/** Effect rules stored on a custom item's loot source tag, or ''. */
export function getItemEffects(source: unknown): string {
  return typeof source === 'object' && source !== null && 'effects' in source && typeof source.effects === 'string'
    ? source.effects
    : '';
}

/** One grant bundle per equipped item that carries effect rules (each item id counted once). */
export function itemEffectBundles(
  items: readonly { readonly itemId: string; readonly equipped: boolean; readonly source: unknown }[]
): GrantBundle[] {
  const seen = new Set<string>();
  return items.flatMap((item) => {
    const text = getItemEffects(item.source);
    if (!item.equipped || !text || seen.has(item.itemId)) return [];
    seen.add(item.itemId);
    return [{ source: { origin: 'item', id: item.itemId }, grants: effectGrants(text, customItemName(item.itemId)) }];
  });
}
