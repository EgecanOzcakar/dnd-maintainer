import type { AbilityKey } from '@/types/database';
import type { FeatureChoiceGrant } from '@/types/grants';

/** What rolling the Superiority Die does for a maneuver. */
export type ManeuverRoll = 'damage' | 'attack' | 'check' | 'ac' | 'reduce' | 'temp-hp';

export interface ManeuverDef {
  /** Feature id is `maneuver-<id>`. */
  readonly id: string;
  readonly kind: 'attack' | 'defense' | 'utility';
  readonly roll: ManeuverRoll;
  /** Saving throw the target makes against the Combat Superiority DC, if any. */
  readonly save?: AbilityKey;
  /** Flat part of the roll: STR/DEX modifier (Parry) or half Fighter level (Rally). */
  readonly adds?: 'str-dex' | 'half-level';
}

/** The 20 Battle Master maneuvers of the 2024 PHB. The rules text lives in gamedata `features.maneuver-*`. */
export const MANEUVERS: readonly ManeuverDef[] = [
  { id: 'ambush', kind: 'utility', roll: 'check' },
  { id: 'bait-and-switch', kind: 'defense', roll: 'ac' },
  { id: 'commanders-strike', kind: 'attack', roll: 'damage' },
  { id: 'commanding-presence', kind: 'utility', roll: 'check' },
  { id: 'disarming-attack', kind: 'attack', roll: 'damage', save: 'str' },
  { id: 'distracting-strike', kind: 'attack', roll: 'damage' },
  { id: 'evasive-footwork', kind: 'defense', roll: 'ac' },
  { id: 'feinting-attack', kind: 'attack', roll: 'damage' },
  { id: 'goading-attack', kind: 'attack', roll: 'damage', save: 'wis' },
  { id: 'lunging-attack', kind: 'attack', roll: 'damage' },
  { id: 'maneuvering-attack', kind: 'attack', roll: 'damage' },
  { id: 'menacing-attack', kind: 'attack', roll: 'damage', save: 'wis' },
  { id: 'parry', kind: 'defense', roll: 'reduce', adds: 'str-dex' },
  { id: 'precision-attack', kind: 'attack', roll: 'attack' },
  { id: 'pushing-attack', kind: 'attack', roll: 'damage', save: 'str' },
  { id: 'rally', kind: 'defense', roll: 'temp-hp', adds: 'half-level' },
  { id: 'riposte', kind: 'attack', roll: 'damage' },
  { id: 'sweeping-attack', kind: 'attack', roll: 'damage' },
  { id: 'tactical-assessment', kind: 'utility', roll: 'check' },
  { id: 'trip-attack', kind: 'attack', roll: 'damage', save: 'str' },
];

export const maneuverFeatureId = (id: string) => `maneuver-${id}`;
export const MANEUVER_BY_FEATURE: ReadonlyMap<string, ManeuverDef> = new Map(
  MANEUVERS.map((m) => [maneuverFeatureId(m.id), m])
);

const [first, ...rest] = MANEUVERS;
const option = (m: ManeuverDef): FeatureChoiceGrant['options'][number] => ({
  optionId: m.id,
  featureId: maneuverFeatureId(m.id),
  grants: [{ type: 'feature', feature: { id: maneuverFeatureId(m.id) } }],
});
export const MANEUVER_OPTIONS: FeatureChoiceGrant['options'] = [option(first), ...rest.map(option)];

export const SUPERIORITY_DICE = 'superiority-dice';
