import { AsiOrFeatPicker } from '@/components/character-sheet/AsiOrFeatPicker';
import { DamageTypePicker } from '@/components/character-sheet/DamageTypePicker';
import { ExpertiseChoicePicker } from '@/components/character-sheet/ExpertiseChoicePicker';
import { FightingStylePicker } from '@/components/character-sheet/FightingStylePicker';
import { SubclassPicker } from '@/components/character-sheet/SubclassPicker';
import { ChoicePicker } from '@/components/character-builder/ChoicePicker';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RollingNumber } from '@/components/ui/rolling-number';
import type { ClassId, FeatId, FightingStyleId } from '@/lib/dnd-helpers';
import { getGrantsForLevel } from '@/lib/sources/level-grants';
import { getFeatSource } from '@/lib/sources';
import { collectChoiceGrantsFromGrants } from '@/lib/use-all-choice-grants';
import { parseChoiceKey } from '@/types/choices';
import type { ChoiceDecision, ChoiceKey } from '@/types/choices';
import type { FeatureGrant } from '@/types/grants';
import type { PendingChoice, ResolvedCharacter } from '@/types/resolved';
import type { SourceTag, SubclassId } from '@/types/sources';
import { Dices } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface LevelUpDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onConfirm: (hpRoll: number, decisions: ReadonlyMap<ChoiceKey, ChoiceDecision>) => void;
  /** The hit die sides (e.g. 10 for d10). Used to roll and compute average. */
  readonly hitDie: number;
  /** The translated class name (e.g. "Fighter"). */
  readonly className: string;
  /** The character level the character will advance to. Currently assumes single-class; multiclass will need per-class level calculation. */
  readonly targetLevel: number;
  /** The class being leveled up. */
  readonly classId: ClassId;
  /** The already-chosen subclass (for subclass feature grants at higher levels). */
  readonly currentSubclassId: SubclassId | null;
  /** Current resolved abilities (needed for ASI allocator). */
  readonly currentAbilities: ResolvedCharacter['abilities'] | null;
  /** Fighting styles already chosen by the character (to exclude from picker). */
  readonly alreadyChosenStyles: readonly FightingStyleId[];
  /** Weapon proficiencies from the resolved character — needed for mastery picker dedup. */
  readonly resolvedWeaponProficiencies: readonly { readonly value: string }[];
  /** Resolved skills from the resolved character — needed for expertise picker. */
  readonly resolvedSkills: ResolvedCharacter['skills'] | null;
  /** All decisions already made across all level rows — for expertise cross-dedup. */
  readonly allDecisions: Readonly<Record<ChoiceKey, ChoiceDecision>>;
}

/** Returns true when a single PendingChoice is satisfied by the given decision map. */
function isChoiceSatisfied(choice: PendingChoice, decisions: ReadonlyMap<ChoiceKey, ChoiceDecision>): boolean {
  const decision = decisions.get(choice.choiceKey);
  switch (choice.type) {
    case 'asi':
      if (decision?.type !== 'asi') return false;
      return Object.values(decision.allocation).reduce((s, v) => s + (v ?? 0), 0) === choice.points;
    case 'feat-choice':
      return decision?.type === 'feat-choice' && decision.featId.length > 0;
    case 'subclass':
      return decision?.type === 'subclass';
    case 'fighting-style-choice':
      return decision?.type === 'fighting-style-choice' && decision.styles.length >= choice.count;
    case 'damage-choice':
      return decision?.type === 'damage-choice' && decision.damageTypes.length >= choice.count;
    case 'weapon-mastery-choice':
      return decision?.type === 'weapon-mastery-choice' && decision.weaponIds.length >= choice.count;
    case 'expertise-choice':
      if (decision?.type !== 'expertise-choice') return false;
      return decision.skills.length + decision.tools.length === choice.count;
    case 'skill-choice':
      return decision?.type === 'skill-choice' && decision.skills.length >= choice.count;
    case 'tool-choice':
      return decision?.type === 'tool-choice' && decision.tools.length >= choice.count;
    case 'language-choice':
      return decision?.type === 'language-choice' && decision.languages.length >= choice.count;
    case 'saving-throw-choice':
      return decision?.type === 'saving-throw-choice' && decision.savingThrows.length >= choice.count;
    case 'ability-choice':
      return decision?.type === 'ability-choice' && decision.abilities.length >= choice.count;
    case 'spell-choice':
      return decision?.type === 'spell-choice' && decision.spellIds.length >= choice.count;
    case 'bundle-choice':
      return decision?.type === 'bundle-choice' && decision.bundleId.length > 0;
    case 'lineage-choice':
      return decision?.type === 'lineage-choice' && decision.lineageId.length > 0;
    case 'feature-choice':
      return decision?.type === 'feature-choice' && decision.optionId.length > 0;
    default: {
      const _exhaustive: never = choice;
      console.warn(`isChoiceSatisfied: unhandled choice type — treating as unsatisfied`, _exhaustive);
      return false;
    }
  }
}

/**
 * Given the local decisions map, collect all chosen feat IDs from feat-choice decisions.
 * Returns an array of { featId, featChoiceKey } pairs.
 */
function getChosenFeats(decisions: ReadonlyMap<ChoiceKey, ChoiceDecision>): Array<{ featId: FeatId; featChoiceKey: ChoiceKey }> {
  const result: Array<{ featId: FeatId; featChoiceKey: ChoiceKey }> = [];
  for (const [key, decision] of decisions) {
    if (decision.type === 'feat-choice' && decision.featId.length > 0) {
      result.push({ featId: decision.featId as FeatId, featChoiceKey: key });
    }
  }
  return result;
}

export function LevelUpDialog({
  open,
  onOpenChange,
  onConfirm,
  hitDie,
  className,
  targetLevel,
  classId,
  currentSubclassId,
  currentAbilities,
  alreadyChosenStyles,
  resolvedWeaponProficiencies,
  resolvedSkills,
  allDecisions,
}: LevelUpDialogProps) {
  const { t } = useTranslation('common');
  const { t: tg } = useTranslation('gamedata');
  const hpAverageGrant = Math.floor(hitDie / 2) + 1;

  const [rolledValue, setRolledValue] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [hpSelection, setHpSelection] = useState<number | null>(hpAverageGrant);
  const [decisions, setDecisions] = useState<Map<ChoiceKey, ChoiceDecision>>(new Map());
  const rollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (rollIntervalRef.current) clearInterval(rollIntervalRef.current);
    };
  }, []);

  const hpRange = useMemo(() => [1, hitDie] as const, [hitDie]);

  const preview = useMemo(
    () => getGrantsForLevel(classId, targetLevel, currentSubclassId),
    [classId, targetLevel, currentSubclassId]
  );

  // Features to display (not choices)
  const featureGrants = useMemo(() => {
    const allGrants = [...preview.classGrants, ...preview.subclassGrants];
    return allGrants.filter((g): g is FeatureGrant => g.type === 'feature');
  }, [preview]);

  // Source tag for this level's grants
  const source: SourceTag = useMemo(
    () => ({ origin: 'class', id: classId, level: targetLevel }),
    [classId, targetLevel]
  );

  // Collect ALL choice-producing grants for this level.
  // Do NOT pass choices/decisions — we want both ASI and companion feat-choice to always appear
  // so AsiOrFeatPicker can offer both options; either-or is enforced by the picker + gate.
  const levelChoices = useMemo(
    () =>
      collectChoiceGrantsFromGrants([...preview.classGrants, ...preview.subclassGrants], source, {
        resolvedWeaponProficiencies: resolvedWeaponProficiencies,
        alreadyClaimedMasteries: new Set(),
        allChosenStyles: [...alreadyChosenStyles],
      }),
    [preview, source, resolvedWeaponProficiencies, alreadyChosenStyles]
  );

  // Pair each ASI choice with its companion feat-choice (same origin/id/index, different category)
  const { asiOrFeatPairs, standaloneChoices } = useMemo(() => {
    const pairs: Array<{
      asiChoice: Extract<PendingChoice, { type: 'asi' }>;
      featChoice: Extract<PendingChoice, { type: 'feat-choice' }>;
    }> = [];
    const pairedFeatKeys = new Set<ChoiceKey>();

    const asiChoices = levelChoices.filter((c): c is Extract<PendingChoice, { type: 'asi' }> => c.type === 'asi');
    const featChoices = levelChoices.filter(
      (c): c is Extract<PendingChoice, { type: 'feat-choice' }> => c.type === 'feat-choice'
    );

    for (const asi of asiChoices) {
      let parsedAsi: ReturnType<typeof parseChoiceKey>;
      try {
        parsedAsi = parseChoiceKey(asi.choiceKey);
      } catch (err) {
        console.warn(`LevelUpDialog: failed to parse ASI choice key "${asi.choiceKey}" — skipping pair`, err);
        continue;
      }
      const companion = featChoices.find((fc) => {
        let p: ReturnType<typeof parseChoiceKey>;
        try {
          p = parseChoiceKey(fc.choiceKey);
        } catch (err) {
          console.warn(`LevelUpDialog: failed to parse feat-choice key "${fc.choiceKey}" — skipping`, err);
          return false;
        }
        return p.origin === parsedAsi.origin && p.id === parsedAsi.id && p.index === parsedAsi.index;
      });
      if (companion) {
        pairs.push({ asiChoice: asi, featChoice: companion });
        pairedFeatKeys.add(companion.choiceKey);
      }
    }

    // Standalone choices = everything that is NOT an asi with a companion,
    // and NOT a paired companion feat-choice
    const standalone = levelChoices.filter((c) => {
      if (c.type === 'asi') return false; // all ASIs handled by pairs
      if (c.type === 'feat-choice' && pairedFeatKeys.has(c.choiceKey)) return false;
      return true;
    });

    return { asiOrFeatPairs: pairs, standaloneChoices: standalone };
  }, [levelChoices]);

  // --- Feat sub-choices: when a feat is chosen in an ASI/feat pair, derive the feat's own choices ---
  const featSubChoices = useMemo(() => {
    const chosenFeats = getChosenFeats(decisions);
    const result: PendingChoice[] = [];
    for (const { featId, featChoiceKey } of chosenFeats) {
      const featSource = getFeatSource(featId);
      if (!featSource) continue;
      // Source tag for this feat's grants
      const featSourceTag: SourceTag = { origin: 'feat', id: featId };
      // Collect choices from the feat's grants. Pass the current local decisions so that
      // feature-choice selections immediately unlock their nested grants (future: fixpoint).
      const featChoices = collectChoiceGrantsFromGrants(featSource.grants, featSourceTag, {
        resolvedWeaponProficiencies,
        alreadyClaimedMasteries: new Set(),
        allChosenStyles: [...alreadyChosenStyles],
      });
      // Filter out the feat-choice grant itself (already handled by the ASI/feat picker)
      // and any purely informational choices that don't need a decision
      for (const fc of featChoices) {
        // Avoid duplicating any choice already in levelChoices
        const alreadyInLevel = levelChoices.some((lc) => lc.choiceKey === fc.choiceKey);
        if (!alreadyInLevel) {
          // Tag each sub-choice with its parent feat-choice key so we can clear them on feat change
          result.push({ ...fc, _parentFeatChoiceKey: featChoiceKey } as unknown as PendingChoice);
        }
      }
    }
    return result;
  }, [decisions, resolvedWeaponProficiencies, alreadyChosenStyles, levelChoices]);

  // When the feat selection changes for an ASI/feat pair, clear stale sub-choice decisions
  const handleDecide = (key: ChoiceKey, decision: ChoiceDecision) => {
    setDecisions((prev) => {
      const next = new Map(prev);

      // If this is a feat-choice decision, clear any previously decided sub-choices
      // that were derived from the old feat for this key
      if (decision.type === 'feat-choice') {
        const oldDecision = prev.get(key);
        if (oldDecision?.type === 'feat-choice' && oldDecision.featId !== decision.featId) {
          // Clear all sub-choice decisions whose keys came from the old feat's grants
          const oldFeatSource = oldDecision.featId ? getFeatSource(oldDecision.featId as FeatId) : undefined;
          if (oldFeatSource) {
            const oldSubChoices = collectChoiceGrantsFromGrants(
              oldFeatSource.grants,
              { origin: 'feat', id: oldDecision.featId as FeatId },
              {}
            );
            for (const sc of oldSubChoices) {
              next.delete(sc.choiceKey);
            }
          }
        }
      }

      next.set(key, decision);
      return next;
    });
  };

  const handleClear = (key: ChoiceKey) => {
    setDecisions((prev) => {
      const next = new Map(prev);
      next.delete(key);
      return next;
    });
  };

  // Combined choices for gate: level choices + feat sub-choices
  const allChoicesMade = useMemo(() => {
    // Check ASI/feat pairs: exactly one of the pair must be satisfied
    for (const { asiChoice, featChoice } of asiOrFeatPairs) {
      const asiSatisfied = isChoiceSatisfied(asiChoice, decisions);
      const featSatisfied = isChoiceSatisfied(featChoice, decisions);
      if (!asiSatisfied && !featSatisfied) return false;
      // If feat is selected, ensure all feat sub-choices for this pair are also satisfied
      if (featSatisfied) {
        const pairSubChoices = featSubChoices.filter(
          (sc) =>
            (sc as PendingChoice & { _parentFeatChoiceKey?: ChoiceKey })._parentFeatChoiceKey ===
            featChoice.choiceKey
        );
        for (const subChoice of pairSubChoices) {
          if (!isChoiceSatisfied(subChoice, decisions)) return false;
        }
      }
    }
    // Check all standalone choices (including feat sub-choices for standalone feat-choices)
    for (const choice of standaloneChoices) {
      if (!isChoiceSatisfied(choice, decisions)) return false;
      // If this is a standalone feat-choice that has been satisfied, check its sub-choices too
      if (choice.type === 'feat-choice') {
        const pairSubChoices = featSubChoices.filter(
          (sc) =>
            (sc as PendingChoice & { _parentFeatChoiceKey?: ChoiceKey })._parentFeatChoiceKey ===
            choice.choiceKey
        );
        for (const subChoice of pairSubChoices) {
          if (!isChoiceSatisfied(subChoice, decisions)) return false;
        }
      }
    }
    return true;
  }, [asiOrFeatPairs, standaloneChoices, featSubChoices, decisions]);

  const canConfirm = hpSelection !== null && allChoicesMade;

  const handleRoll = useCallback(() => {
    if (isRolling) return;
    setIsRolling(true);
    setHpSelection(null);

    const finalValue = Math.floor(Math.random() * hitDie) + 1;
    let ticks = 0;
    const totalTicks = 12;

    if (rollIntervalRef.current) clearInterval(rollIntervalRef.current);
    rollIntervalRef.current = setInterval(() => {
      ticks++;
      if (ticks >= totalTicks) {
        if (rollIntervalRef.current) clearInterval(rollIntervalRef.current);
        setRolledValue(finalValue);
        setIsRolling(false);
      }
    }, 60);
  }, [isRolling, hitDie]);

  const handleSelectHp = (value: number) => {
    setHpSelection(value);
  };

  const handleConfirm = () => {
    if (hpSelection === null) return;
    onConfirm(hpSelection, decisions);
    resetState();
    onOpenChange(false);
  };

  const resetState = () => {
    if (rollIntervalRef.current) clearInterval(rollIntervalRef.current);
    setRolledValue(null);
    setIsRolling(false);
    setHpSelection(null);
    setDecisions(new Map());
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) resetState();
    onOpenChange(nextOpen);
  };

  // Merged decisions: allDecisions (from prior levels) + local dialog decisions
  const mergedDecisions = useMemo(
    () => ({ ...allDecisions, ...Object.fromEntries(decisions) }),
    [allDecisions, decisions]
  );

  // All expertise choice keys (level-level + feat sub-choices)
  const expertiseKeys = useMemo(
    () =>
      [...standaloneChoices, ...featSubChoices]
        .filter((c) => c.type === 'expertise-choice')
        .map((c) => c.choiceKey),
    [standaloneChoices, featSubChoices]
  );

  /** Render a single PendingChoice into the appropriate picker component. */
  const renderChoice = (choice: PendingChoice) => {
    const currentDecision = decisions.get(choice.choiceKey);

    if (choice.type === 'subclass') {
      return (
        <SubclassPicker
          key={choice.choiceKey}
          choice={choice}
          currentDecision={currentDecision}
          onDecide={(key, subclassId) => handleDecide(key, { type: 'subclass', subclassId })}
          onClear={handleClear}
          autoCommit
        />
      );
    }

    if (choice.type === 'fighting-style-choice') {
      return (
        <FightingStylePicker
          key={choice.choiceKey}
          choice={choice}
          currentDecision={currentDecision}
          onDecide={handleDecide}
          onClear={handleClear}
        />
      );
    }

    if (choice.type === 'damage-choice') {
      return (
        <DamageTypePicker
          key={choice.choiceKey}
          choice={choice}
          currentDecision={currentDecision}
          onDecide={handleDecide}
          onClear={handleClear}
        />
      );
    }

    if (choice.type === 'expertise-choice') {
      return (
        <ExpertiseChoicePicker
          key={choice.choiceKey}
          choice={choice}
          currentDecision={currentDecision}
          allDecisions={mergedDecisions}
          allExpertiseChoiceKeys={expertiseKeys}
          resolvedSkills={resolvedSkills ?? ({} as ResolvedCharacter['skills'])}
          onDecide={handleDecide}
          onClear={handleClear}
        />
      );
    }

    // Everything else (skill/tool/language/saving-throw/ability/bundle/lineage/feat/feature/weapon-mastery/spell)
    return (
      <ChoicePicker
        key={choice.choiceKey}
        choice={choice}
        currentDecision={currentDecision}
        onDecide={handleDecide}
        onClear={handleClear}
      />
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {t('characterSheet.levelManagement.levelUpTitle', { className, level: targetLevel })}
          </DialogTitle>
        </DialogHeader>

        {/* Features gained */}
        {featureGrants.length > 0 && (
          <div className="space-y-1">
            {featureGrants.map((grant) => (
              <div key={grant.feature.id} className="rounded-lg border bg-muted/30 p-3">
                <p className="text-sm font-medium text-foreground">
                  {tg(`features.${grant.feature.id}.name`, { defaultValue: grant.feature.id })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {tg(`features.${grant.feature.id}.description`, { defaultValue: '' })}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* HP selection */}
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{t('characterSheet.levelManagement.hpRollPrompt')}</p>

          <div className="grid grid-cols-2 gap-2">
            {/* Take average option */}
            <div
              className={`flex flex-col items-center gap-2 rounded-lg border p-3 text-center ${
                hpSelection === hpAverageGrant ? 'border-primary bg-primary/5' : 'bg-muted/30'
              }`}
            >
              <p className="text-sm font-medium text-foreground">{t('characterSheet.levelManagement.takeAverage')}</p>
              <p className="text-xs text-muted-foreground">
                {t('characterSheet.levelManagement.takeAverageHint', { value: hpAverageGrant })}
              </p>
              <Button
                className="mt-auto"
                variant={hpSelection === hpAverageGrant ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleSelectHp(hpAverageGrant)}
              >
                {hpSelection === hpAverageGrant ? t('buttons.selected') : t('buttons.select')}
              </Button>
            </div>
            {/* Roll HP option */}
            <div
              className={`flex flex-col items-center gap-2 rounded-lg border p-3 text-center ${
                hpSelection !== null && hpSelection === rolledValue ? 'border-primary bg-primary/5' : 'bg-muted/30'
              }`}
            >
              <p className="text-sm font-medium text-foreground">{t('characterSheet.levelManagement.rollHp')}</p>
              <p className="text-xs text-muted-foreground">
                {t('characterSheet.levelManagement.rollHpHint', { die: hitDie })}
              </p>
              {(isRolling || rolledValue !== null) && (
                <RollingNumber
                  value={rolledValue}
                  isRolling={isRolling}
                  range={hpRange}
                  className="text-lg font-bold text-foreground tabular-nums"
                />
              )}
              <div className="flex flex-row gap-1 mt-auto">
                <Button variant="outline" size="sm" onClick={handleRoll} disabled={isRolling}>
                  <Dices className={`size-4 mr-1 ${isRolling ? 'animate-spin' : ''}`} />
                  {rolledValue !== null && !isRolling
                    ? t('buttons.reRoll')
                    : t('characterSheet.levelManagement.rollHp')}
                </Button>
                {rolledValue !== null && !isRolling && (
                  <Button
                    size="sm"
                    variant={hpSelection === rolledValue ? 'default' : 'outline'}
                    onClick={() => handleSelectHp(rolledValue)}
                  >
                    {hpSelection === rolledValue ? t('buttons.selected') : t('buttons.select')}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ASI / feat pairs + their feat sub-choices */}
        {asiOrFeatPairs.map(({ asiChoice, featChoice }) => {
          const featDecision = decisions.get(featChoice.choiceKey);
          const featIsChosen = featDecision?.type === 'feat-choice' && featDecision.featId.length > 0;
          // Sub-choices for the feat selected in this particular pair
          const pairSubChoices = featIsChosen
            ? featSubChoices.filter(
                (sc) =>
                  // Include sub-choices derived from this pair's feat decision
                  (sc as PendingChoice & { _parentFeatChoiceKey?: ChoiceKey })._parentFeatChoiceKey ===
                  featChoice.choiceKey
              )
            : [];

          return (
            <div key={asiChoice.choiceKey} className="space-y-3">
              {currentAbilities ? (
                <AsiOrFeatPicker
                  asiChoice={asiChoice}
                  featChoice={featChoice}
                  abilities={currentAbilities}
                  asiDecision={decisions.get(asiChoice.choiceKey)}
                  featDecision={featDecision}
                  onDecide={handleDecide}
                  onClear={handleClear}
                />
              ) : (
                <p className="text-sm text-destructive">
                  {t('characterSheet.levelUp.abilitiesUnavailable')}
                </p>
              )}
              {/* Render sub-choices from the chosen feat */}
              {pairSubChoices.map((subChoice) => renderChoice(subChoice))}
            </div>
          );
        })}

        {/* All other standalone choice types — feat-choice entries also show their sub-choices */}
        {standaloneChoices.map((choice) => {
          const standaloneFeatDecision = decisions.get(choice.choiceKey);
          const standaloneFeatIsChosen =
            choice.type === 'feat-choice' &&
            standaloneFeatDecision?.type === 'feat-choice' &&
            standaloneFeatDecision.featId.length > 0;
          const standaloneSubChoices = standaloneFeatIsChosen
            ? featSubChoices.filter(
                (sc) =>
                  (sc as PendingChoice & { _parentFeatChoiceKey?: ChoiceKey })._parentFeatChoiceKey ===
                  choice.choiceKey
              )
            : [];
          return (
            <div key={choice.choiceKey} className={standaloneSubChoices.length > 0 ? 'space-y-3' : undefined}>
              {renderChoice(choice)}
              {standaloneSubChoices.map((subChoice) => renderChoice(subChoice))}
            </div>
          );
        })}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={() => handleOpenChange(false)}>
            {t('buttons.cancel')}
          </Button>
          <Button disabled={!canConfirm} onClick={handleConfirm}>
            {t('characterSheet.levelManagement.confirmLevelUp')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
