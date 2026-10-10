import { z } from 'zod';
import { ABILITY_KEYS } from '@/lib/dnd-helpers';
import type { ResolvedAction } from '@/lib/resolver/actions';
import type { ResolvedCharacter, SpellLevel } from '@/types/resolved';

export const HOMEBREW_DAMAGE_TYPES = [
  'acid',
  'bludgeoning',
  'cold',
  'fire',
  'force',
  'lightning',
  'necrotic',
  'piercing',
  'poison',
  'psychic',
  'radiant',
  'slashing',
  'thunder',
] as const;

const ability = z.enum(ABILITY_KEYS);
const dice = z.string().regex(/^\d+d\d+$/, 'dice');
const int = z.number().int();

const attack = z
  .object({ bonus: int.optional(), ability: ability.optional(), proficient: z.boolean().optional() })
  .refine((a) => a.bonus !== undefined || a.ability !== undefined, 'attack');
const save = z
  .object({ ability, dc: int.min(1).optional(), dcAbility: ability.optional() })
  .refine((s) => s.dc !== undefined || s.dcAbility !== undefined, 'save');

export const homebrewSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1, 'name').max(80),
  description: z.string().max(2000).optional(),
  kind: z.enum(['attack', 'spell', 'feature']),
  activation: z.enum(['action', 'bonus-action', 'reaction', 'free', 'special']),
  spellLevel: int.min(0).max(9).optional(),
  attack: attack.optional(),
  save: save.optional(),
  damage: z.object({ dice, type: z.string().min(1), bonus: int.optional(), ability: ability.optional() }).optional(),
  heal: z.object({ dice: dice.optional(), bonus: int.optional(), ability: ability.optional() }).optional(),
  uses: z.object({ max: int.min(1).max(99), rest: z.enum(['short', 'long']) }).optional(),
});

export type HomebrewAction = z.infer<typeof homebrewSchema>;

/** Keeps the valid entries of untrusted JSON; malformed ones (or a non-array) are dropped, never thrown. */
export function parseHomebrew(raw: unknown): HomebrewAction[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((e) => {
    const r = homebrewSchema.safeParse(e);
    return r.success ? [r.data] : [];
  });
}

export function homebrewToActions(
  entries: readonly HomebrewAction[],
  resolved: Pick<ResolvedCharacter, 'abilities' | 'proficiencyBonus'>
): ResolvedAction[] {
  const pb = resolved.proficiencyBonus;
  const mod = (a?: keyof ResolvedCharacter['abilities']) => (a ? resolved.abilities[a].modifier : 0);
  return entries.map((e) => {
    const toHit = e.attack ? (e.attack.bonus ?? mod(e.attack.ability) + (e.attack.proficient ? pb : 0)) : undefined;
    const dmg = e.damage;
    return {
      key: `homebrew:${e.id}`,
      kind: e.kind === 'spell' ? 'spell' : e.kind === 'attack' ? 'weapon' : 'feature',
      refId: e.id,
      name: e.name,
      homebrewId: e.id,
      activation: e.activation,
      isAttack: toHit !== undefined || Boolean(dmg),
      ...(e.spellLevel !== undefined ? { spellLevel: e.spellLevel as SpellLevel } : {}),
      ...(toHit !== undefined ? { toHit } : {}),
      ...(e.save ? { save: { ability: e.save.ability, dc: e.save.dc ?? 8 + pb + mod(e.save.dcAbility) } } : {}),
      ...(dmg ? { damage: { dice: dmg.dice, bonus: (dmg.bonus ?? 0) + mod(dmg.ability), type: dmg.type } } : {}),
      ...(e.heal ? { heal: { dice: e.heal.dice ?? '', bonus: (e.heal.bonus ?? 0) + mod(e.heal.ability) } } : {}),
      ...(e.uses ? { usesPerRest: e.uses } : {}),
    };
  });
}
