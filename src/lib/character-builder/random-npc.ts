import { CLASS_SOURCES } from '@/lib/sources/classes';
import { BACKGROUND_SOURCES } from '@/lib/sources/backgrounds';
import { getLogger } from '@/lib/logger';

const logger = getLogger('random-npc');
import { LINEAGE_GRANTS_REGISTRY, SPECIES_SOURCES } from '@/lib/sources/species';
import {
  DND_ALIGNMENTS,
  DND_LANGUAGES,
  DND_SKILLS,
  DND_SPECIES_NAMES,
  generateCharacterName,
  type AbilityKey,
  type AlignmentId,
  type BackgroundId,
  type ClassId,
  type DndGender,
  type FightingStyleId,
  type SkillId,
  type SpeciesId,
  type ToolProficiencyId,
} from '@/lib/dnd-helpers';
import type { AbilityScores, Character } from '@/types/database';
import type { ClassSource } from '@/types/sources';
import { createChoiceKey, parseChoiceKey, type ChoiceDecision, type ChoiceKey } from '@/types/choices';
import { SUBCLASS_IDS_BY_CLASS } from '@/lib/sources/subclasses';
import { FEAT_SOURCES } from '@/lib/sources';
import { getSpellsForList } from '@/lib/sources/spells';
import { getBundleDef, getItemsForSlot } from '@/lib/sources/bundles';
import { reconstructBuild, type BuildLevelRow } from '@/lib/build-reconstruction';
import { collectBundles } from '@/lib/sources/index';
import { resolveCharacter } from '@/lib/resolver/index';
import type { PendingChoice, ResolvedCharacter } from '@/types/resolved';

export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8] as const;
const ABILITY_KEYS: readonly AbilityKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

export type RandomNpcFailure = 'unknown-class' | 'name-generation' | 'empty-data-source';

interface RandomNpcBasicsBase {
  readonly gender: DndGender;
  readonly species: SpeciesId;
  readonly alignment: AlignmentId;
  readonly name: string;
  readonly classId: ClassId;
  readonly lineageDecision?: {
    readonly key: ChoiceKey;
    readonly lineageId: string;
  };
}

export type RandomNpcBasics =
  | (RandomNpcBasicsBase & {
      readonly targetStep: 'class';
      readonly baseAbilities: AbilityScores;
      readonly suggestedBackground: BackgroundId;
      readonly backgroundAsiDecision?: {
        readonly key: ChoiceKey;
        readonly allocation: Partial<Record<AbilityKey, number>>;
      };
    })
  | (RandomNpcBasicsBase & {
      readonly targetStep: 'abilities';
    });

export type RandomNpcResult =
  | { readonly ok: true; readonly basics: RandomNpcBasics }
  | { readonly ok: false; readonly failure: RandomNpcFailure };

type Rng = () => number;

function pick<T>(arr: readonly T[], rng: Rng): T | undefined {
  if (arr.length === 0) return undefined;
  return arr[Math.floor(rng() * arr.length)];
}

function shuffle<T>(arr: readonly T[], rng: Rng): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function getQuickNpcClassIds(): readonly ClassId[] {
  return CLASS_SOURCES.map((c) => c.id);
}

/**
 * If the species has lineage options (e.g. dragonborn, elf, gnome, goliath, tiefling),
 * pick a random lineage and return a ready-to-store choice decision. Returns null
 * for species without lineage choices (dwarf, halfling, human, orc, aasimar).
 */
export function pickRandomLineage(
  speciesId: SpeciesId,
  rng: Rng = Math.random
): { readonly key: ChoiceKey; readonly lineageId: string } | null {
  const lineageMap = (LINEAGE_GRANTS_REGISTRY as Partial<Record<SpeciesId, Readonly<Record<string, unknown>>>>)[
    speciesId
  ];
  if (!lineageMap) return null;
  const lineageIds = Object.keys(lineageMap);
  const lineageId = pick(lineageIds, rng);
  if (!lineageId) return null;
  return {
    key: createChoiceKey('lineage-choice', 'species', speciesId, 0),
    lineageId,
  };
}

/**
 * Assigns the Standard Array per PHB Quick Build: 15 to highest, 14 to secondary,
 * and [13, 12, 10, 8] shuffled among the remaining four abilities.
 */
export function assignStandardArray(highest: AbilityKey, secondary: AbilityKey, rng: Rng = Math.random): AbilityScores {
  if (highest === secondary) {
    throw new Error(`assignStandardArray: highest and secondary must differ (got "${highest}" for both)`);
  }
  const remaining = ABILITY_KEYS.filter((k) => k !== highest && k !== secondary);
  const shuffledRemainder = shuffle([13, 12, 10, 8] as const, rng);
  const scores: AbilityScores = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
  scores[highest] = 15;
  scores[secondary] = 14;
  remaining.forEach((key, idx) => {
    scores[key] = shuffledRemainder[idx];
  });
  return scores;
}

/**
 * Distribute `points` ASI points across a shuffled `from` pool.
 * Gives min(2, remaining) to each ability in order until points are exhausted.
 * e.g. points=3, shuffled=['str','con','dex'] → { str: 2, con: 1 }
 */
export function randomAsiAllocation(
  points: number,
  from: readonly AbilityKey[],
  rng: Rng
): Partial<Record<AbilityKey, number>> {
  const shuffled = shuffle(from, rng);
  const allocation: Partial<Record<AbilityKey, number>> = {};
  let remaining = points;
  for (const ability of shuffled) {
    if (remaining <= 0) break;
    const give = Math.min(2, remaining);
    allocation[ability] = give;
    remaining -= give;
  }
  return allocation;
}

/**
 * Generate randomized NPC basics for the given class. Returns `{ basics, failure }`
 * so callers can surface a specific reason for null results. All randomness flows
 * through the injected `rng` for deterministic testing.
 */
export function generateRandomNpcBasicsDetailed(
  classId: ClassId,
  rng: Rng = Math.random,
  classSources: readonly ClassSource[] = CLASS_SOURCES
): RandomNpcResult {
  const classSource = classSources.find((c) => c.id === classId);
  if (!classSource) {
    logger.error('Unknown classId for Quick NPC', { classId });
    return { ok: false, failure: 'unknown-class' };
  }

  const gender = pick(['male', 'female'] as const, rng);
  const eligibleSpecies = SPECIES_SOURCES.filter((s) => {
    const nameData = DND_SPECIES_NAMES[s.id];
    return nameData && nameData.male.length > 0 && nameData.female.length > 0;
  });
  const raceSource = pick(eligibleSpecies, rng);
  const alignmentSource = pick(DND_ALIGNMENTS, rng);
  if (!gender || !raceSource || !alignmentSource) {
    logger.error('Empty data source for Quick NPC', {
      classId,
      eligibleSpecies: eligibleSpecies.length,
      alignments: DND_ALIGNMENTS.length,
    });
    return { ok: false, failure: 'empty-data-source' };
  }
  const species = raceSource.id;
  const alignment = alignmentSource.id;
  const name = generateCharacterName(species, gender, rng);
  if (!name) {
    logger.error('Name generation returned null', { classId, species, gender });
    return { ok: false, failure: 'name-generation' };
  }

  const lineageDecision = pickRandomLineage(species, rng) ?? undefined;

  const qb = classSource.quickBuild;
  if (!qb) {
    return {
      ok: true,
      basics: {
        gender,
        species,
        alignment,
        name,
        classId,
        targetStep: 'abilities',
        ...(lineageDecision !== undefined ? { lineageDecision } : {}),
      },
    };
  }

  const highest = pick(qb.highestAbility, rng);
  if (!highest) {
    logger.error('quickBuild.highestAbility is empty', { classId });
    return { ok: false, failure: 'empty-data-source' };
  }
  const baseAbilities = assignStandardArray(highest, qb.secondaryAbility, rng);

  const bgSource = BACKGROUND_SOURCES.find((b) => b.id === qb.suggestedBackground);
  const asiGrant = bgSource?.grants.find((g) => g.type === 'asi');
  const backgroundAsiDecision =
    asiGrant && asiGrant.from !== null
      ? {
          key: asiGrant.key,
          allocation: randomAsiAllocation(asiGrant.points, asiGrant.from, rng),
        }
      : undefined;

  return {
    ok: true,
    basics: {
      gender,
      species,
      alignment,
      name,
      classId,
      baseAbilities,
      suggestedBackground: qb.suggestedBackground,
      targetStep: 'class',
      ...(backgroundAsiDecision !== undefined ? { backgroundAsiDecision } : {}),
      ...(lineageDecision !== undefined ? { lineageDecision } : {}),
    },
  };
}

export function generateRandomNpcBasics(
  classId: ClassId,
  rng: Rng = Math.random,
  classSources: readonly ClassSource[] = CLASS_SOURCES
): RandomNpcBasics | null {
  const result = generateRandomNpcBasicsDetailed(classId, rng, classSources);
  return result.ok ? result.basics : null;
}

function resolveSubclassToClassId(subclassId: string): string {
  for (const [classId, subclassIds] of Object.entries(SUBCLASS_IDS_BY_CLASS)) {
    if ((subclassIds as readonly string[]).includes(subclassId)) return classId;
  }
  return subclassId;
}

function findGrantRowIndex(
  classId: string,
  grantType: 'subclass' | 'asi',
  grantIndex: number,
  rows: readonly BuildLevelRow[]
): { ok: true; index: number } | { ok: false; error: string } {
  const classSource = CLASS_SOURCES.find((cs) => cs.id === classId);
  if (!classSource) {
    return { ok: false, error: `No class source found for "${classId}"` };
  }
  const matchingClassLevels: number[] = [];
  for (let i = 0; i < classSource.levels.length; i++) {
    if (classSource.levels[i].grants.some((g) => g.type === grantType)) {
      matchingClassLevels.push(i + 1);
    }
  }
  if (matchingClassLevels.length === 0) {
    return { ok: false, error: `No ${grantType} grant found in class "${classId}"` };
  }
  if (grantIndex >= matchingClassLevels.length) {
    return { ok: false, error: `Grant index ${grantIndex} exceeds available ${grantType} grants` };
  }
  const grantClassLevel = matchingClassLevels[grantIndex];
  const idx = rows.findIndex(
    (r) => r.sequence !== 0 && r.class_id === classId && r.class_level === grantClassLevel && r.deleted_at == null
  );
  if (idx === -1) {
    return { ok: false, error: `No active row at class level ${grantClassLevel} for class "${classId}"` };
  }
  return { ok: true, index: idx };
}

export function applyDecisionToRows(rows: BuildLevelRow[], choiceKey: ChoiceKey, decision: ChoiceDecision): string | null {
  if (decision.type === 'subclass' || decision.type === 'asi') {
    const { origin, id: classId, index: grantIndex } = parseChoiceKey(choiceKey);
    if (decision.type === 'asi' && (origin === 'background' || origin === 'species')) {
      const idx = rows.findIndex((r) => r.sequence === 0);
      if (idx === -1) return 'No creation row found for background ASI choice';
      rows[idx] = {
        ...rows[idx],
        choices: { ...(rows[idx].choices ?? {}), [choiceKey]: decision },
      };
      return null;
    }
    const result = findGrantRowIndex(classId, decision.type, grantIndex, rows);
    if (!result.ok) return result.error;
    if (decision.type === 'subclass') {
      rows[result.index] = { ...rows[result.index], subclass_id: decision.subclassId };
    } else {
      rows[result.index] = { ...rows[result.index], asi_allocation: decision.allocation as Record<string, number> };
    }
    return null;
  }

  const { origin, id: classId } = parseChoiceKey(choiceKey);
  let targetSeq: number;
  if (origin === 'species' || origin === 'background' || origin === 'feat') {
    targetSeq = 0;
  } else if (origin === 'subclass') {
    const parentClassId = resolveSubclassToClassId(classId);
    const levelRow = rows.find((r) => r.sequence !== 0 && r.class_id === parentClassId && r.deleted_at == null);
    if (!levelRow) return `No active level row found for parent class "${parentClassId}" of subclass "${classId}"`;
    targetSeq = levelRow.sequence;
  } else {
    const levelRow = rows.find((r) => r.sequence !== 0 && r.class_id === classId && r.deleted_at == null);
    if (!levelRow) return `No active level row found for class "${classId}"`;
    targetSeq = levelRow.sequence;
  }

  const idx = rows.findIndex((r) => r.sequence === targetSeq);
  if (idx === -1) return `No row found for sequence ${targetSeq}`;

  let nextDecision: ChoiceDecision = decision;
  if (decision.type === 'bundle-choice') {
    const existing = rows[idx].choices?.[choiceKey] as ChoiceDecision | undefined;
    if (existing?.type === 'bundle-choice' && existing.bundleId === decision.bundleId) {
      nextDecision = {
        type: 'bundle-choice',
        bundleId: decision.bundleId,
        slotPicks: { ...existing.slotPicks, ...decision.slotPicks },
      };
    }
  }

  rows[idx] = {
    ...rows[idx],
    choices: { ...(rows[idx].choices ?? {}), [choiceKey]: nextDecision },
  };
  return null;
}

export function generateDecisionForPendingChoice(
  choice: PendingChoice,
  resolved: ResolvedCharacter,
  characterClass: ClassId,
  rng: Rng = Math.random
): ChoiceDecision | null {
  switch (choice.type) {
    case 'ability-choice': {
      const pool = choice.from ?? ABILITY_KEYS;
      const picked = shuffle(pool, rng).slice(0, choice.count);
      return { type: 'ability-choice', abilities: picked };
    }
    case 'skill-choice': {
      const allSkills = DND_SKILLS.map((s) => s.id);
      const pool = (choice.from ?? allSkills).filter((s): s is SkillId => allSkills.includes(s as SkillId));
      const unchosen = pool.filter((s) => !resolved.skills[s]?.proficient);
      const eligible = unchosen.length >= choice.count ? unchosen : pool;
      const picked = shuffle(eligible, rng).slice(0, choice.count);
      return { type: 'skill-choice', skills: picked };
    }
    case 'tool-choice': {
      const pool = choice.from ?? [
        'thieves-tools',
        'alchemists-supplies',
        'herbalism-kit',
        'disguise-kit',
        'forgery-kit',
      ];
      const picked = shuffle(pool, rng).slice(0, choice.count);
      return { type: 'tool-choice', tools: picked as ToolProficiencyId[] };
    }
    case 'language-choice': {
      const pool = choice.from ?? DND_LANGUAGES;
      const unchosen = pool.filter((l) => !resolved.languages.some((rl) => rl.value === l));
      const eligible = unchosen.length >= choice.count ? unchosen : pool;
      const picked = shuffle(eligible, rng).slice(0, choice.count);
      return { type: 'language-choice', languages: picked };
    }
    case 'saving-throw-choice': {
      const pool = choice.from ?? ABILITY_KEYS;
      const unchosen = pool.filter((a) => !resolved.savingThrows[a]?.proficient);
      const eligible = unchosen.length >= choice.count ? unchosen : pool;
      const picked = shuffle(eligible, rng).slice(0, choice.count);
      return { type: 'saving-throw-choice', savingThrows: picked };
    }
    case 'expertise-choice': {
      const allSkills = DND_SKILLS.map((s) => s.id);
      const pool = (choice.from ?? allSkills).filter((s): s is SkillId => allSkills.includes(s as SkillId));
      const proficientSkills = pool.filter((s) => resolved.skills[s]?.proficient && !resolved.skills[s]?.expertise);
      const pickedSkills = shuffle(proficientSkills, rng).slice(0, choice.count);
      const remainingCount = choice.count - pickedSkills.length;
      let pickedTools: ToolProficiencyId[] = [];
      if (remainingCount > 0 && choice.fromTools && choice.fromTools.length > 0) {
        pickedTools = shuffle(choice.fromTools, rng).slice(0, remainingCount);
      }
      return { type: 'expertise-choice', skills: pickedSkills, tools: pickedTools };
    }
    case 'asi': {
      const pool = choice.from ?? ABILITY_KEYS;
      const allocation = randomAsiAllocation(choice.points, pool, rng);
      return { type: 'asi', allocation };
    }
    case 'subclass': {
      const subclasses = SUBCLASS_IDS_BY_CLASS[choice.classId] ?? [];
      const subclassId = pick(subclasses, rng);
      if (!subclassId) return null;
      return { type: 'subclass', subclassId };
    }
    case 'fighting-style-choice': {
      const pool = choice.from.filter((s) => !choice.alreadyChosen.includes(s));
      const eligible = pool.length >= choice.count ? pool : choice.from;
      const picked = shuffle(eligible, rng).slice(0, choice.count);
      return { type: 'fighting-style-choice', styles: picked };
    }
    case 'weapon-mastery-choice': {
      const pool = choice.from.filter((w) => !choice.alreadyChosen.includes(w));
      const eligible = pool.length >= choice.count ? pool : choice.from;
      const picked = shuffle(eligible, rng).slice(0, choice.count);
      return { type: 'weapon-mastery-choice', weaponIds: picked };
    }
    case 'damage-choice': {
      const picked = shuffle(choice.from, rng).slice(0, choice.count);
      return { type: 'damage-choice', damageTypes: picked };
    }
    case 'bundle-choice': {
      const bundleId = pick(choice.bundleIds, rng);
      if (!bundleId) return null;
      const bundleDef = getBundleDef(bundleId);
      const slotPicks: Record<string, string> = {};
      if (bundleDef?.slots) {
        for (const [slotKey, slot] of Object.entries(bundleDef.slots)) {
          const items = getItemsForSlot(slot, characterClass);
          const chosenItem = pick(items, rng);
          if (chosenItem) {
            slotPicks[slotKey] = chosenItem.id;
          }
        }
      }
      return { type: 'bundle-choice', bundleId, slotPicks };
    }
    case 'lineage-choice': {
      const lineageId = pick(choice.from, rng);
      if (!lineageId) return null;
      return { type: 'lineage-choice', lineageId };
    }
    case 'feat-choice': {
      const pool =
        choice.from ??
        FEAT_SOURCES.filter((f) => (choice.category === 'origin' ? f.category === 'origin' : true)).map((f) => f.id);
      const featId = pick(pool, rng);
      if (!featId) return null;
      return { type: 'feat-choice', featId };
    }
    case 'feature-choice': {
      const opt = pick(choice.options, rng);
      if (!opt) return null;
      return { type: 'feature-choice', optionId: opt.optionId };
    }
    case 'spell-choice': {
      const spells = getSpellsForList(choice.spellList, choice.spellLevel);
      const known = new Set([
        ...(resolved.spellcasting?.cantrips ?? []),
        ...(resolved.spellcasting?.knownSpells.map((s) => s.spellId) ?? []),
      ]);
      const unchosen = spells.map((s) => s.id).filter((id) => !known.has(id));
      const pool = unchosen.length >= choice.count ? unchosen : spells.map((s) => s.id);
      const picked = shuffle(pool, rng).slice(0, choice.count);
      return { type: 'spell-choice', spellIds: picked };
    }
    default:
      return null;
  }
}

export function autoFillPendingChoices(
  character: Character,
  rows: readonly BuildLevelRow[],
  rng: Rng = Math.random
): BuildLevelRow[] {
  const updatedRows = rows.map((r) => ({ ...r }));
  const charClass = (character.class as ClassId) ?? 'fighter';

  for (let iteration = 0; iteration < 10; iteration++) {
    let build;
    try {
      build = reconstructBuild(character, updatedRows, []);
    } catch {
      break;
    }

    const { bundles } = collectBundles(build);
    const resolved = resolveCharacter({
      baseAbilities: build.baseAbilities,
      level: character.level || 1,
      bundles,
      choices: build.choices,
    });

    if (!resolved.pendingChoices || resolved.pendingChoices.length === 0) {
      break;
    }

    let madeAnyDecision = false;

    for (const choice of resolved.pendingChoices) {
      const decision = generateDecisionForPendingChoice(choice, resolved, charClass, rng);
      if (!decision) continue;

      const err = applyDecisionToRows(updatedRows, choice.choiceKey, decision);
      if (!err) {
        madeAnyDecision = true;
      }
    }

    if (!madeAnyDecision) {
      break;
    }
  }

  return updatedRows;
}

export function ensureNpcReadyToCreate(
  character: Character,
  rows: readonly BuildLevelRow[],
  rng: Rng = Math.random
): { readonly character: Character; readonly rows: readonly BuildLevelRow[] } {
  let updatedRows: BuildLevelRow[] = rows.map((r) => ({ ...r }));
  const updatedChar: Character = { ...character, character_type: 'npc' };

  if (!updatedChar.gender) {
    updatedChar.gender = pick(['male', 'female'] as const, rng) ?? 'male';
  }

  const eligibleSpecies = SPECIES_SOURCES.filter((s) => {
    const nameData = DND_SPECIES_NAMES[s.id];
    return nameData && nameData.male.length > 0 && nameData.female.length > 0;
  });

  if (!updatedChar.species || !eligibleSpecies.some((s) => s.id === updatedChar.species)) {
    const pickedSpecies = pick(eligibleSpecies, rng);
    if (pickedSpecies) updatedChar.species = pickedSpecies.id;
  }

  if (!updatedChar.class) {
    const classId = pick(getQuickNpcClassIds(), rng) ?? 'fighter';
    updatedChar.class = classId;
  }

  const classId = updatedChar.class as ClassId;
  updatedChar.level = updatedChar.level && updatedChar.level > 0 ? updatedChar.level : 1;

  // Ensure creation row exists
  let creationIdx = updatedRows.findIndex((r) => r.sequence === 0);
  if (creationIdx === -1) {
    updatedRows.unshift({
      sequence: 0,
      class_id: null,
      class_level: null,
      hp_roll: null,
      subclass_id: null,
      asi_allocation: null,
      ability_method: 'standard-array',
      choices: {},
    });
    creationIdx = 0;
  }

  // Ensure level 1 row exists
  const levelRows = updatedRows.filter((r) => r.sequence !== 0 && r.deleted_at == null);
  if (levelRows.length === 0) {
    updatedRows.push({
      sequence: 1,
      class_id: classId,
      class_level: 1,
      hp_roll: null,
      subclass_id: null,
      asi_allocation: null,
      choices: {},
    });
  } else if (levelRows[0].class_id !== classId) {
    const targetSeq = levelRows[0].sequence;
    updatedRows = updatedRows.map((r) =>
      r.sequence === targetSeq
        ? { ...r, class_id: classId, subclass_id: null, asi_allocation: null, choices: {} }
        : r
    );
  }

  if (!updatedChar.alignment) {
    const pickedAlignment = pick(DND_ALIGNMENTS, rng);
    if (pickedAlignment) updatedChar.alignment = pickedAlignment.id;
  }

  if (!updatedChar.background) {
    const classSource = CLASS_SOURCES.find((c) => c.id === classId);
    const suggestedBg = classSource?.quickBuild?.suggestedBackground;
    if (suggestedBg) {
      updatedChar.background = suggestedBg;
    } else {
      const pickedBg = pick(BACKGROUND_SOURCES, rng);
      if (pickedBg) updatedChar.background = pickedBg.id;
    }
  }

  if (!updatedChar.name && updatedChar.species && updatedChar.gender) {
    const generatedName = generateCharacterName(updatedChar.species as SpeciesId, updatedChar.gender as DndGender, rng);
    if (generatedName) updatedChar.name = generatedName;
  }

  // Ensure base_abilities on creation row
  const creationRow = updatedRows[creationIdx];
  const hasBaseAbilities =
    creationRow.base_abilities &&
    Object.values(creationRow.base_abilities).every((v) => typeof v === 'number' && v > 0);

  const classSource = CLASS_SOURCES.find((c) => c.id === classId);
  const qb = classSource?.quickBuild;
  const highest = qb ? pick(qb.highestAbility, rng) ?? 'str' : (classSource?.primaryAbility as AbilityKey) ?? 'str';
  const secondary = qb ? qb.secondaryAbility : highest === 'con' ? 'str' : 'con';
  const baseAbilities = hasBaseAbilities ? creationRow.base_abilities! : assignStandardArray(highest, secondary, rng);

  updatedRows[creationIdx] = {
    ...updatedRows[creationIdx],
    base_abilities: baseAbilities,
    ability_method: updatedRows[creationIdx].ability_method ?? 'standard-array',
  };

  // Ensure lineage decision if applicable
  if (updatedChar.species) {
    const hasLineageChoice = updatedRows.some((r) =>
      Object.keys(r.choices ?? {}).some((k) => k.startsWith('lineage-choice:'))
    );
    if (!hasLineageChoice) {
      const lineageDecision = pickRandomLineage(updatedChar.species as SpeciesId, rng);
      if (lineageDecision) {
        applyDecisionToRows(updatedRows, lineageDecision.key, {
          type: 'lineage-choice',
          lineageId: lineageDecision.lineageId,
        });
      }
    }
  }

  // Ensure background ASI decision if applicable
  if (updatedChar.background) {
    const hasAsiChoice = updatedRows.some((r) =>
      Object.keys(r.choices ?? {}).some((k) => k.startsWith('asi:background:'))
    );
    if (!hasAsiChoice) {
      const bgSource = BACKGROUND_SOURCES.find((b) => b.id === updatedChar.background);
      const asiGrant = bgSource?.grants.find((g) => g.type === 'asi');
      if (asiGrant && asiGrant.from !== null) {
        const allocation = randomAsiAllocation(asiGrant.points, asiGrant.from, rng);
        applyDecisionToRows(updatedRows, asiGrant.key, {
          type: 'asi',
          allocation,
        });
      }
    }
  }

  // Run autoFillPendingChoices to resolve ALL remaining pending choices
  updatedRows = autoFillPendingChoices(updatedChar, updatedRows, rng);

  return { character: updatedChar, rows: updatedRows };
}

