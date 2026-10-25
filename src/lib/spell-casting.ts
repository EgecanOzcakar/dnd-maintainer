import type { SpellSlotsUsed } from '@/lib/rest';
import { ACTIVE_EFFECTS } from '@/lib/sources/active-effects';

// ponytail: concentration rides in `active_effects` as `concentration:<spellId>`, so no migration.
// Effects ignore unknown ids and a long rest clears them. Move to its own column if it needs more state.
const PREFIX = 'concentration:';

export function getConcentration(activeEffects: readonly string[] | undefined): string | null {
  return activeEffects?.find((e) => e.startsWith(PREFIX))?.slice(PREFIX.length) ?? null;
}

const spellEffects = (spellId: string) =>
  ACTIVE_EFFECTS.filter(
    (e) => typeof e.requires === 'object' && 'spell' in e.requires && e.requires.spell === spellId
  ).map((e) => e.id);

/** Drops the concentration marker and the toggles (Bless, Haste...) that spell switched on. */
export function endConcentration(activeEffects: readonly string[] | undefined): string[] {
  const current = getConcentration(activeEffects);
  const gone = current ? spellEffects(current) : [];
  return (activeEffects ?? []).filter((e) => !e.startsWith(PREFIX) && !gone.includes(e));
}

/** Effects after casting: a concentration spell replaces the previous one; its matching effects switch on. */
export function applyCast(
  activeEffects: readonly string[] | undefined,
  spellId: string,
  concentration: boolean
): string[] {
  const base = concentration ? endConcentration(activeEffects) : (activeEffects ?? []);
  return [...new Set([...base, ...spellEffects(spellId), ...(concentration ? [PREFIX + spellId] : [])])];
}

/** Constitution save DC to keep concentration after taking damage (10, or half the damage, max 30). */
export function concentrationDC(damage: number): number {
  return Math.min(30, Math.max(10, Math.floor(damage / 2)));
}

export interface SlotOption {
  /** Key into `spell_slots_used`: a spell level (`'3'`) or `'pact'`. */
  readonly key: string;
  /** Level the spell is cast at. */
  readonly level: number;
}

/** Slots with a use left that can cast a spell of `spellLevel`, lowest level first. */
export function castOptions(
  max: SpellSlotsUsed,
  used: SpellSlotsUsed,
  pactLevel: number | null,
  spellLevel: number
): SlotOption[] {
  const left = (key: string) => (max[key] ?? 0) - (used[key] ?? 0) > 0;
  const options: SlotOption[] = Object.keys(max)
    .filter((k) => k !== 'pact' && Number(k) >= spellLevel && left(k))
    .map((k) => ({ key: k, level: Number(k) }));
  if (pactLevel !== null && pactLevel >= spellLevel && left('pact')) options.push({ key: 'pact', level: pactLevel });
  return options.sort((a, b) => a.level - b.level || (a.key === 'pact' ? 1 : -1));
}

export function spendSlot(used: SpellSlotsUsed, key: string): SpellSlotsUsed {
  return { ...used, [key]: (used[key] ?? 0) + 1 };
}

/** 2024: concentration ends while you have the Incapacitated condition (or any condition that includes it). */
export const CONCENTRATION_BREAKERS: ReadonlySet<string> = new Set([
  'incapacitated',
  'paralyzed',
  'petrified',
  'stunned',
  'unconscious',
]);
