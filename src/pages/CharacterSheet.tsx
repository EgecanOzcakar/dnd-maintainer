import { getLogger } from '@/lib/logger';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AbilityScoresPanel } from '@/components/character-sheet/AbilityScoresPanel';
import { homebrewToActions, parseHomebrew } from '@/lib/homebrew';
import { ActionsPanel } from '@/components/character-sheet/ActionsPanel';
import { ActiveEffectsPanel } from '@/components/character-sheet/ActiveEffectsPanel';
import { resolveActions } from '@/lib/resolver/actions';
import { combatFeatures } from '@/lib/combat-features';
import { applyEffects } from '@/lib/resolver/effects';
import { canPrepareSpells, getEffectivePrepared } from '@/lib/spell-preparation';
import type { ClassId, ExhaustionLevel } from '@/lib/dnd-helpers';
import { BackstoryPanel } from '@/components/character-sheet/BackstoryPanel';
import { CharacterSheetHeader } from '@/components/character-sheet/CharacterSheetHeader';
import { PlayerSceneViewer } from '@/components/battle-map/PlayerSceneViewer';
import { CombatPanel } from '@/components/character-sheet/CombatPanel';
import { ConditionsPanel } from '@/components/character-sheet/ConditionsPanel';
import { EquipmentPanel } from '@/components/character-sheet/EquipmentPanel';
import { FeaturesPanel } from '@/components/character-sheet/FeaturesPanel';
import { HitPointsPanel } from '@/components/character-sheet/HitPointsPanel';
import { applyHeal, longRestHpUpdate, resolveCurrentHp } from '@/lib/hit-points';
import { useRollParts } from '@/hooks/useRollParts';
import { HitDicePanel } from '@/components/character-sheet/HitDicePanel';
import { PendingChoicesPanel } from '@/components/character-sheet/PendingChoicesPanel';
import { PersonalityPanel } from '@/components/character-sheet/PersonalityPanel';
import { ProficienciesPanel } from '@/components/character-sheet/ProficienciesPanel';
import { ResourcePoolsPanel } from '@/components/character-sheet/ResourcePoolsPanel';
import { SavingThrowsPanel } from '@/components/character-sheet/SavingThrowsPanel';
import { SkillsPanel } from '@/components/character-sheet/SkillsPanel';
import { SpellcastingPanel } from '@/components/character-sheet/SpellcastingPanel';
import { SpellSlotsPanel } from '@/components/character-sheet/SpellSlotsPanel';
import { ConfirmActionDialog, type ConfirmAction } from '@/components/character-sheet/edit-dialogs/ConfirmActionDialog';
import { EditHeaderDialog } from '@/components/character-sheet/edit-dialogs/EditHeaderDialog';
import { EditPersonalityDialog } from '@/components/character-sheet/edit-dialogs/EditPersonalityDialog';
import { EditTextDialog } from '@/components/character-sheet/edit-dialogs/EditTextDialog';
import { buildRestUpdate, getSpellSlotMax } from '@/lib/rest';
import { exportCharacterPdf, PdfTemplateError } from '@/lib/pdf-export';
import { collectFeatSources } from '@/lib/pdf-field-map';
import { useCharacter, useCharacterMutations } from '@/hooks/useCharacters';
import { useCharacterBuildLevels, useCharacterItems } from '@/hooks/useCharacterBuild';
import { usePageTitle } from '@/hooks/usePageTitle';
import { CharacterProvider, useCharacterContext } from '@/hooks/useCharacterContext';
import type { PersistedItem } from '@/lib/resolver/index';
import type { SourceTag } from '@/types/sources';
import { getProficiencyBonus } from '@/lib/dnd-helpers';
import type { Character } from '@/types/database';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useBuilderAutosave } from '@/hooks/useBuilderAutosave';
import type { AutosavePayload } from '@/hooks/useBuilderAutosave';
import { ArcaneRecoveryPanel } from '@/components/character-sheet/ArcaneRecoveryPanel';
import { ChosenOptionsPanel } from '@/components/character-sheet/ChosenOptionsPanel';
import { CurrencyPanel } from '@/components/character-sheet/CurrencyPanel';
import { CustomModifiersPanel } from '@/components/character-sheet/CustomModifiersPanel';
import { ManeuversPanel } from '@/components/character-sheet/ManeuversPanel';
import { MetamagicPanel } from '@/components/character-sheet/MetamagicPanel';
import { ACTIVE_EFFECTS } from '@/lib/sources/active-effects';
import { InventoryTab } from '@/components/character-sheet/InventoryTab';
import { DiceRoller, type DieSize } from '@/components/character-sheet/DiceRoller';
import type { RollPreset } from '@/components/character-sheet/roll-preset';
import { checkRollMods, saveRollMods } from '@/lib/roll-mods';
import {
  CONCENTRATION_BREAKERS,
  applyCast,
  castOptions,
  concentrationDC,
  endConcentration,
  getConcentration,
  spendSlot,
} from '@/lib/spell-casting';
import { getSpellDef } from '@/lib/sources/spells';
import { useRoller } from '@/hooks/useRoller';
import type { RollKeys } from '@/lib/dice-roll';
import { Dices, Star, X } from 'lucide-react';

import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';

const logger = getLogger('CharacterSheet');

const SHEET_TABS = ['sheet', 'combat', 'spells', 'inventory'] as const;
type SheetTab = (typeof SHEET_TABS)[number];

type EditSection = 'header' | 'personality' | 'backstory' | 'appearance' | null;

function CharacterSheetInner({
  character,
  itemsData,
  characterId,
}: {
  character: Character;
  itemsData: Array<{ id: string; item_id: string; equipped?: boolean; quantity: number; source?: unknown }>;
  characterId: string;
}) {
  const { t: tc } = useTranslation('common');
  const { t: tg } = useTranslation('gamedata');
  const [editSection, setEditSection] = useState<EditSection>(null);
  const [activeTab, setActiveTab] = useState<SheetTab>('sheet');

  const navigate = useNavigate();
  const { campaignSlug } = useParams<{ campaignSlug: string }>();
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [cloneName, setCloneName] = useState('');

  usePageTitle(character.name);

  const { update: updateMutation, remove: removeMutation, clone: cloneMutation } = useCharacterMutations();
  const {
    character: ctxCharacter,
    rows,
    resolved,
    bundles,
    build,
    buildError,
    buildWarnings,
    isDirty,
    markSaved,
  } = useCharacterContext();
  const { saveDraft } = useBuilderAutosave(characterId);
  const [saveFailed, setSaveFailed] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [isDiceRollerOpen, setIsDiceRollerOpen] = useState(false);

  const classLevels = useMemo(() => {
    const levels: Partial<Record<ClassId, number>> = {};
    for (const lvl of build?.levels ?? []) levels[lvl.classId] = Math.max(levels[lvl.classId] ?? 0, lvl.classLevel);
    return levels;
  }, [build]);

  const resolvedActions = useMemo(() => {
    if (!resolved || !build) return null;
    const sc = resolved.spellcasting;
    const prepared = sc && canPrepareSpells(sc) ? getEffectivePrepared(character.prepared_spells, sc) : undefined;
    return resolveActions(resolved, classLevels, prepared);
  }, [resolved, build, classLevels, character.prepared_spells]);
  const homebrew = useMemo(() => parseHomebrew(character.homebrew), [character.homebrew]);

  // Effects apply to homebrew actions too (e.g. Bless on a custom attack).
  const applied = useMemo(
    () =>
      resolved
        ? applyEffects(resolved, [...(resolvedActions?.actions ?? []), ...homebrewToActions(homebrew, resolved)], {
            activeEffects: character.active_effects ?? [],
            conditions: character.conditions ?? [],
            exhaustionLevel: character.exhaustion_level ?? 0,
            classLevels,
          })
        : null,
    [
      resolved,
      resolvedActions,
      homebrew,
      classLevels,
      character.active_effects,
      character.conditions,
      character.exhaustion_level,
    ]
  );

  // Shift/Alt held on the click that triggered a roll (read at the capture phase, before the button's handler).
  const rollKeys = useRef<RollKeys>({});
  const roll = useRoller(character.id, character.campaign_id);
  const rollParts = useRollParts();
  const checkMods = useCallback(
    (target: Parameters<typeof checkRollMods>[1]) =>
      resolved ? checkRollMods(resolved, target, applied ?? undefined) : undefined,
    [resolved, applied]
  );
  const handleSelectRollPreset = useCallback((preset: RollPreset) => roll(preset, rollKeys.current), [roll]);

  // Autosave when isDirty (level up/down, choices, etc.)
  const latestPayloadRef = useRef<AutosavePayload>({ character: ctxCharacter, rows, resolved });
  useEffect(() => {
    latestPayloadRef.current = { character: ctxCharacter, rows, resolved };
  });

  const doSave = useCallback(async () => {
    setSaveFailed(false);
    try {
      await saveDraft(latestPayloadRef.current);
      markSaved();
    } catch (err: unknown) {
      logger.error('Autosave failed:', err);
      setSaveFailed(true);
      toast.error(tc('characterBuilder.errors.failedToSaveDraft'));
    }
  }, [saveDraft, markSaved, tc]);

  const isDirtyRef = useRef(isDirty);
  const doSaveRef = useRef(doSave);
  useEffect(() => {
    isDirtyRef.current = isDirty;
    doSaveRef.current = doSave;
  });

  useEffect(() => {
    if (!isDirty) return;
    const timer = setTimeout(doSave, 500);
    return () => clearTimeout(timer);
  }, [isDirty, doSave]);

  const queryClient = useQueryClient();
  const effectiveAc = resolved?.armorClass.effective;
  const ctxCharacterId = ctxCharacter?.id;
  const ctxArmorClass = ctxCharacter?.armor_class;
  useEffect(() => {
    if (effectiveAc != null && ctxCharacterId && effectiveAc !== ctxArmorClass) {
      supabase
        .from('characters')
        .update({ armor_class: effectiveAc, updated_at: new Date().toISOString() })
        .eq('id', ctxCharacterId)
        .then(({ error }) => {
          if (error) {
            logger.error('Failed to sync stored armor_class:', error);
          } else {
            queryClient.invalidateQueries({ queryKey: ['character', ctxCharacterId] });
            queryClient.invalidateQueries({ queryKey: ['characters'] });
          }
        });
    }
  }, [effectiveAc, ctxArmorClass, ctxCharacterId, queryClient]);

  // Flush a pending autosave on unmount so the last level-up isn't lost when the user navigates away within the debounce window.
  useEffect(() => {
    return () => {
      if (isDirtyRef.current) {
        void doSaveRef.current();
      }
    };
  }, []);

  const handleUpdate = (updates: Partial<Character>) => {
    updateMutation.mutate(
      { id: characterId, ...updates },
      {
        onSuccess: () => setEditSection(null),
        onError: () => toast.error(tc('characterSheet.errors.updateFailed')),
      }
    );
  };

  const concentratingOn = getConcentration(character.active_effects);
  const spellLabel = (spellId: string) =>
    tg(`spells.${spellId}.name` as 'spells.bless.name', { defaultValue: spellId });

  const handleCast = (spellId: string, slotKey: string | null) => {
    const def = getSpellDef(spellId);
    const level = slotKey === 'pact' ? resolved?.spellcasting?.pactMagic?.slotLevel : slotKey ? Number(slotKey) : null;
    const replaced = def?.concentration && concentratingOn && concentratingOn !== spellId ? concentratingOn : null;
    handleUpdate({
      ...(slotKey ? { spell_slots_used: spendSlot(character.spell_slots_used ?? {}, slotKey) } : {}),
      active_effects: applyCast(character.active_effects, spellId, Boolean(def?.concentration)),
    });
    const spell = spellLabel(spellId);
    toast.success(
      level && level !== def?.level
        ? tc('spellCasting.castAtLevelToast', { spell, level })
        : tc('spellCasting.castToast', { spell })
    );
    if (replaced) toast(tc('spellCasting.replacedConcentration', { spell: spellLabel(replaced) }));
  };

  // Gaining an incapacitating condition ends concentration.
  const handleConditionsUpdate = (updates: Partial<Character>) => {
    const gained = (updates.conditions ?? []).some(
      (c) => CONCENTRATION_BREAKERS.has(c) && !(character.conditions ?? []).includes(c)
    );
    if (gained && concentratingOn) {
      toast(tc('spellCasting.replacedConcentration', { spell: spellLabel(concentratingOn) }));
      return handleUpdate({ ...updates, active_effects: endConcentration(character.active_effects) });
    }
    handleUpdate(updates);
  };

  // Damage while concentrating prompts a CON save; dropping to 0 HP ends concentration outright.
  const handleHpUpdate = (updates: Partial<Character>) => {
    if (concentratingOn && maxHP != null && 'current_hp' in updates) {
      const total = (hp: number | null | undefined, temp: number | null | undefined) =>
        resolveCurrentHp(hp, maxHP) + (temp ?? 0);
      const damage =
        total(character.current_hp, character.temp_hp) -
        total(updates.current_hp, updates.temp_hp ?? character.temp_hp);
      if (resolveCurrentHp(updates.current_hp, maxHP) === 0) {
        updates = { ...updates, active_effects: endConcentration(character.active_effects) };
        toast(tc('spellCasting.replacedConcentration', { spell: spellLabel(concentratingOn) }));
      } else if (damage > 0 && resolved) {
        const spell = spellLabel(concentratingOn);
        const dc = concentrationDC(damage);
        toast(tc('spellCasting.concentrationCheck', { spell, dc }), {
          duration: 20000,
          action: {
            label: tc('spellCasting.rollSave'),
            onClick: () =>
              roll({
                die: 20,
                count: 1,
                kind: 'd20',
                contextLabel: `Concentration: ${spell} (DC ${dc})`,
                ...saveRollMods(resolved.savingThrows.con, applied?.savingThrows.con),
              }),
          },
          cancel: {
            label: tc('spellCasting.drop'),
            onClick: () => handleUpdate({ active_effects: endConcentration(character.active_effects) }),
          },
        });
      }
    }
    handleUpdate(updates);
  };

  // Limited-use feature pools (rage, channel divinity, ...): uses spent, reset by rests.
  const poolMax = Object.fromEntries((resolved?.resourcePools ?? []).map((p) => [p.poolId, p.max]));
  const handleSetPoolUsed = (poolId: string, used: number) =>
    handleUpdate({
      resource_pools_used: {
        ...character.resource_pools_used,
        [poolId]: Math.max(0, Math.min(poolMax[poolId] ?? used, used)),
      },
    });

  // Switching on an effect that costs a feature use (Rage) spends it; with none left it stays off.
  const handleEffectsChange = (next: string[]) => {
    const current = character.active_effects ?? [];
    const costly = ACTIVE_EFFECTS.find((e) => e.poolId && next.includes(e.id) && !current.includes(e.id));
    if (costly?.poolId && poolMax[costly.poolId] !== undefined) {
      const used = character.resource_pools_used?.[costly.poolId] ?? 0;
      if (used >= poolMax[costly.poolId]) return void toast.error(tc('noFeatureUses'));
      handleUpdate({
        active_effects: next,
        resource_pools_used: { ...character.resource_pools_used, [costly.poolId]: used + 1 },
      });
      return;
    }
    handleUpdate({ active_effects: next });
  };

  const handleSpendSlot = (slotKey: string) =>
    handleUpdate({ spell_slots_used: spendSlot(character.spell_slots_used ?? {}, slotKey) });
  const levelOneSlots = resolved
    ? castOptions(
        getSpellSlotMax(resolved),
        character.spell_slots_used ?? {},
        resolved.spellcasting?.pactMagic?.slotLevel ?? null,
        1
      )
    : [];

  // Spending a hit die rolls it plus CON and heals that much (min 0).
  const handleHitDieRoll = (die: number) => {
    if (!resolved || maxHP == null) return;
    const con = resolved.abilities.con.modifier;
    const out = roll({
      die: die as DieSize,
      count: 1,
      kind: 'd20',
      modifier: con,
      contextLabel: `${tc('rollBreakdown.hitDie')} d${die}`,
      breakdown: rollParts([{ type: 'ability', label: 'con', value: con }]),
    });
    const healed = applyHeal(
      {
        current: resolveCurrentHp(character.current_hp, maxHP),
        temp: character.temp_hp ?? 0,
        deathSaves: character.death_saves ?? { successes: 0, failures: 0 },
      },
      Math.max(0, out.total),
      maxHP
    );
    handleUpdate({
      current_hp: healed.current >= maxHP ? null : healed.current,
      death_saves: healed.deathSaves,
    });
    toast.success(tc('characterSheet.hitDice.healed', { hp: Math.max(0, out.total) }));
  };

  const handleShortRest = () => {
    if (!resolved) return;
    handleUpdate(buildRestUpdate('short', character, resolved));
  };

  const handleLongRest = () => {
    if (!resolved) return;
    handleUpdate({
      ...buildRestUpdate('long', character, resolved),
      ...longRestHpUpdate(),
      active_effects: [],
      // 2024: a Long Rest removes one level of Exhaustion.
      exhaustion_level: Math.max(0, (character.exhaustion_level ?? 0) - 1) as ExhaustionLevel,
      // Human Resourceful: Heroic Inspiration after every Long Rest.
      ...(resolved.features.some((f) => f.feature.id === 'human-resourceful') ? { heroic_inspiration: true } : {}),
    });
  };

  const handleArchive = () => {
    updateMutation.mutate(
      { id: characterId, is_active: false },
      {
        onSuccess: () => {
          setConfirmAction(null);
          toast.success(tc('characterSheet.actions.archiveSuccess', { name: character.name }));
          navigate(`/campaign/${campaignSlug}/characters`);
        },
        onError: () => toast.error(tc('characterSheet.errors.archiveFailed')),
      }
    );
  };

  const handleDelete = () => {
    removeMutation.mutate(
      { id: characterId, campaignId: character.campaign_id },
      {
        onSuccess: () => {
          setConfirmAction(null);
          toast.success(tc('characterSheet.actions.deleteSuccess', { name: character.name }));
          navigate(`/campaign/${campaignSlug}/characters`);
        },
        onError: () => toast.error(tc('characterSheet.errors.deleteFailed')),
      }
    );
  };

  const handleClone = () => {
    const name = cloneName.trim() || tc('characterSheet.actions.copyOfName', { name: character.name });
    cloneMutation.mutate(
      { sourceCharacterId: characterId, newName: name },
      {
        onSuccess: (cloned) => {
          setConfirmAction(null);
          toast.success(tc('characterSheet.actions.cloneSuccess', { name: cloned.name }));
          navigate(`/campaign/${campaignSlug}/character/${cloned.slug}`);
        },
        onError: () => toast.error(tc('characterSheet.errors.cloneFailed')),
      }
    );
  };

  const handleExportPdf = async () => {
    if (!resolved) {
      toast.error(tc('characterSheet.export.notReady'));
      return;
    }
    setExportingPdf(true);
    try {
      const featSources = collectFeatSources(bundles, build?.choices ?? {});
      const { missingFields } = await exportCharacterPdf(resolved, character, tg, featSources);
      if (missingFields.length > 0) {
        toast.warning(tc('characterSheet.export.successWithMissing', { count: missingFields.length }));
        logger.warn('PDF template missing mapped fields:', missingFields);
      } else {
        toast.success(tc('characterSheet.export.success'));
      }
    } catch (err: unknown) {
      if (err instanceof PdfTemplateError) {
        toast.error(tc('characterSheet.export.noTemplate'));
      } else {
        logger.error('PDF export failed:', err);
        toast.error(tc('characterSheet.export.failed'));
      }
    } finally {
      setExportingPdf(false);
    }
  };

  const profBonus = resolved?.proficiencyBonus ?? getProficiencyBonus(character.level);

  // Combat stats — prefer resolved pipeline values, fall back to pre-calculated DB columns.
  // When buildError is set and resolved is null, these are stale values from the database.
  const isStale = buildError !== null && resolved === null;
  const armorClass = applied?.armorClass ?? character.armor_class;
  const speedValue = applied?.speed.walk?.value ?? character.speed;
  const maxHP = resolved?.hitPoints.max ?? character.hit_points_max;

  // Ability scores — use resolved if available, else undefined (skip section)
  const abilities = resolved?.abilities;
  const skills = resolved?.skills;
  const savingThrows = resolved?.savingThrows;

  const hasPersonality = character.personality_traits || character.ideals || character.bonds || character.flaws;
  const hasSpells =
    (resolved?.spellcasting &&
      (resolved.spellcasting.cantrips.length > 0 ||
        resolved.spellcasting.alwaysPreparedSpells.length > 0 ||
        resolved.spellcasting.knownSpells.length > 0 ||
        resolved.spellcasting.preparedCount > 0 ||
        resolved.spellcasting.ability != null ||
        resolved.spellcasting.spellSaveDC != null)) ||
    (resolved?.features && resolved.features.length > 0);

  const combatFeatureList = resolved ? combatFeatures(resolved.features) : [];

  return (
    <div
      className="min-h-screen bg-muted/30"
      onClickCapture={(e) => {
        rollKeys.current = { shift: e.shiftKey, alt: e.altKey || e.ctrlKey || e.metaKey };
      }}
    >
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        {buildError && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/50 rounded-lg text-destructive text-sm">
            {tc('characterSheet.errors.buildFailed', { message: buildError })}
          </div>
        )}
        {buildWarnings.length > 0 && (
          <div className="mb-6 p-4 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-500/40 rounded-lg text-amber-700 dark:text-amber-400 text-sm">
            {tc('characterSheet.warnings.buildIncomplete', { message: buildWarnings.join('; ') })}
          </div>
        )}
        {saveFailed && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/50 rounded-lg text-destructive text-sm flex items-center justify-between">
            <span>{tc('errors.saveFailed')}</span>
            <Button variant="outline" size="sm" onClick={doSave}>
              {tc('buttons.retrySave')}
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <CharacterSheetHeader
            character={character}
            onEdit={() => setEditSection('header')}
            onClone={() => {
              setCloneName(tc('characterSheet.actions.copyOfName', { name: character.name }));
              setConfirmAction('clone');
            }}
            onArchive={() => setConfirmAction('archive')}
            onDelete={() => setConfirmAction('delete')}
            onExportPdf={handleExportPdf}
            exportingPdf={exportingPdf}
          />
          <PlayerSceneViewer campaignId={character.campaign_id} />
        </div>

        {/* Pending Choices Panel */}
        <div className="mb-6">
          <PendingChoicesPanel />
        </div>

        {/* Tab bar: sticks below the mobile top bar (h-14) / to the top on desktop */}
        <div className="sticky top-14 md:top-0 z-20 flex gap-1 mb-4 md:mb-6 p-1 bg-muted/95 backdrop-blur rounded-xl border border-border w-fit max-w-full overflow-x-auto">
          {SHEET_TABS.filter((tab) => tab !== 'spells' || hasSpells).map((tab) => (
            <button
              key={tab}
              type="button"
              aria-pressed={activeTab === tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 md:px-5 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
                activeTab === tab
                  ? 'bg-card text-foreground shadow-sm border border-border'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tc(`characterSheet.combatView.tabs.${tab}`)}
            </button>
          ))}
        </div>

        {activeTab === 'inventory' ? (
          <>
            <CurrencyPanel currency={character.currency} onChange={(currency) => handleUpdate({ currency })} />
            <CustomModifiersPanel
              modifiers={character.custom_modifiers}
              onChange={(custom_modifiers) => handleUpdate({ custom_modifiers })}
            />
            <InventoryTab
              characterId={character.id}
              campaignId={character.campaign_id}
              itemsData={itemsData}
              armorProficiencies={resolved?.armorProficiencies}
            />
          </>
        ) : activeTab === 'combat' ? (
          <div className="mb-6">
            <p className="text-xs text-muted-foreground mb-2">{tc('diceLog.hint')}</p>
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] gap-4 md:gap-6 items-start">
              <div className="space-y-4 md:space-y-6">
                <CombatPanel
                  resolved={resolved}
                  abilities={abilities}
                  armorClass={armorClass}
                  speedValue={speedValue}
                  speed={applied?.speed}
                  maxHP={maxHP}
                  profBonus={profBonus}
                  passivePerception={resolved ? 10 + resolved.skills.perception.bonus : null}
                  isStale={isStale}
                  buildError={buildError}
                />

                {resolved && <HitPointsPanel character={character} maxHp={maxHP ?? null} onUpdate={handleHpUpdate} />}
                <ConditionsPanel character={character} onUpdate={handleConditionsUpdate} />
                {resolved && applied && (
                  <ActiveEffectsPanel
                    resolved={resolved}
                    active={character.active_effects ?? []}
                    applied={applied}
                    onChange={handleEffectsChange}
                  />
                )}
                {resolved && (
                  <ResourcePoolsPanel
                    resolved={resolved}
                    used={character.resource_pools_used}
                    onSetUsed={handleSetPoolUsed}
                  />
                )}
                {resolved && (
                  <ManeuversPanel
                    resolved={resolved}
                    character={character}
                    fighterLevel={classLevels.fighter ?? 0}
                    onUpdate={handleUpdate}
                    onSelectRollPreset={handleSelectRollPreset}
                  />
                )}
              </div>
              <div className="space-y-4 md:space-y-6">
                {resolvedActions && resolved && (
                  <ActionsPanel
                    actions={applied?.actions ?? resolvedActions.actions}
                    homebrew={homebrew}
                    onChangeHomebrew={(next) => handleUpdate({ homebrew: next })}
                    attacksPerAction={resolvedActions.attacksPerAction}
                    resolved={resolved}
                    onSelectRollPreset={handleSelectRollPreset}
                    poolsUsed={character.resource_pools_used}
                    onSetPoolUsed={handleSetPoolUsed}
                    slotOptions={levelOneSlots}
                    onSpendSlot={handleSpendSlot}
                  />
                )}
                {combatFeatureList.length > 0 && (
                  <FeaturesPanel
                    features={combatFeatureList}
                    title={tc('characterSheet.combatView.sections.combatFeatures')}
                  />
                )}
              </div>
            </div>
          </div>
        ) : activeTab === 'spells' ? (
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-4 md:gap-6 mb-6 items-start">
            {resolved && (
              <div className="space-y-4 md:space-y-6 lg:sticky lg:top-20">
                <SpellSlotsPanel resolved={resolved} character={character} onUpdate={handleUpdate} />
                <MetamagicPanel resolved={resolved} character={character} onUpdate={handleUpdate} />
                {(classLevels.wizard ?? 0) > 0 &&
                  resolved.features.some((f) => f.feature.id === 'wizard-arcane-recovery') && (
                    <ArcaneRecoveryPanel
                      wizardLevel={classLevels.wizard ?? 0}
                      character={character}
                      onUpdate={handleUpdate}
                    />
                  )}
              </div>
            )}
            {hasSpells && (
              <SpellcastingPanel
                spellcasting={resolved?.spellcasting}
                resolved={resolved}
                onSelectRollPreset={handleSelectRollPreset}
                classId={character.class}
                preparedSpells={character.prepared_spells}
                onChangePrepared={(prepared_spells) => handleUpdate({ prepared_spells })}
                actions={applied?.actions ?? resolvedActions?.actions}
                spellSlotsUsed={character.spell_slots_used}
                onCast={handleCast}
                concentratingOn={concentratingOn}
                onEndConcentration={() => handleUpdate({ active_effects: endConcentration(character.active_effects) })}
              />
            )}
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground mb-2">{tc('diceLog.hint')}</p>
            {/* Three-column layout: stats (left) / combat (center) / roleplay & gear (right) */}
            <div className="sheet-grid mb-6">
              {/* Left Column: Abilities, Saving Throws, Skills */}
              <div className="sheet-area-left">
                <AbilityScoresPanel
                  abilities={abilities}
                  buildError={buildError}
                  onSelectRollPreset={handleSelectRollPreset}
                  checkMods={checkMods}
                />
                <SavingThrowsPanel
                  savingThrows={savingThrows}
                  buildError={buildError}
                  onSelectRollPreset={handleSelectRollPreset}
                  effects={applied?.savingThrows}
                />
                {skills ? (
                  <SkillsPanel skills={skills} onSelectRollPreset={handleSelectRollPreset} checkMods={checkMods} />
                ) : (
                  <div className="sheet-panel text-center text-muted-foreground">
                    <h2 className="text-lg font-bold text-foreground mb-4">{tc('characterSheet.sections.skills')}</h2>
                    <p>
                      {buildError
                        ? tc('characterSheet.buildError.skills', { message: buildError })
                        : tc('characterSheet.emptyState.skills')}
                    </p>
                  </div>
                )}
              </div>

              {/* Center Column: Combat & Features */}
              <div className="sheet-area-center">
                <CombatPanel
                  resolved={resolved}
                  abilities={abilities}
                  armorClass={armorClass}
                  speedValue={speedValue}
                  speed={applied?.speed}
                  maxHP={maxHP}
                  profBonus={profBonus}
                  passivePerception={resolved ? 10 + resolved.skills.perception.bonus : null}
                  isStale={isStale}
                  buildError={buildError}
                />

                <ConditionsPanel character={character} onUpdate={handleConditionsUpdate} />

                {resolved && applied && (
                  <ActiveEffectsPanel
                    resolved={resolved}
                    active={character.active_effects ?? []}
                    applied={applied}
                    onChange={handleEffectsChange}
                  />
                )}

                {resolved && (
                  <>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1" onClick={handleShortRest}>
                        {tc('characterSheet.actions.shortRest')}
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1" onClick={handleLongRest}>
                        {tc('characterSheet.actions.longRest')}
                      </Button>
                      <Button
                        variant={character.heroic_inspiration ? 'default' : 'outline'}
                        size="sm"
                        aria-pressed={character.heroic_inspiration}
                        title={tc('inspiration.hint')}
                        onClick={() => handleUpdate({ heroic_inspiration: !character.heroic_inspiration })}
                      >
                        <Star className="size-3.5" />
                        {tc('inspiration.label')}
                      </Button>
                    </div>
                    <HitPointsPanel character={character} maxHp={maxHP ?? null} onUpdate={handleHpUpdate} />
                    <HitDicePanel
                      resolved={resolved}
                      character={character}
                      onUpdate={handleUpdate}
                      onRoll={handleHitDieRoll}
                    />
                    <ChosenOptionsPanel
                      title={tc('invocations.title')}
                      help={tc('invocations.help')}
                      features={resolved.features.filter(
                        (f) =>
                          f.feature.id.startsWith('warlock-invocation-') || f.feature.id.startsWith('warlock-pact-of-')
                      )}
                    />
                  </>
                )}

                {resolved && <ProficienciesPanel resolved={resolved} />}
                {resolved && (
                  <ResourcePoolsPanel
                    resolved={resolved}
                    used={character.resource_pools_used}
                    onSetUsed={handleSetPoolUsed}
                  />
                )}
                {resolved?.features && resolved.features.length > 0 && <FeaturesPanel features={resolved.features} />}
              </div>

              {/* Right Column: Equipment, Spells & Personality */}
              <div className="sheet-area-right">
                {itemsData.length > 0 && <EquipmentPanel itemsData={itemsData} />}
                {hasPersonality && (
                  <PersonalityPanel character={character} onEdit={() => setEditSection('personality')} />
                )}
              </div>
            </div>

            {/* Full Width Backstory & Appearance */}
            <BackstoryPanel
              character={character}
              onEditBackstory={() => setEditSection('backstory')}
              onEditAppearance={() => setEditSection('appearance')}
            />
          </>
        )}
      </div>

      {/* Edit Dialogs */}
      {editSection === 'header' && (
        <EditHeaderDialog
          character={character}
          onSave={handleUpdate}
          onClose={() => setEditSection(null)}
          saving={updateMutation.isPending}
        />
      )}
      {editSection === 'personality' && (
        <EditPersonalityDialog
          personality_traits={character.personality_traits ?? ''}
          ideals={character.ideals ?? ''}
          bonds={character.bonds ?? ''}
          flaws={character.flaws ?? ''}
          onSave={handleUpdate}
          onClose={() => setEditSection(null)}
          saving={updateMutation.isPending}
        />
      )}
      {editSection === 'backstory' && (
        <EditTextDialog
          title={tc('characterSheet.dialogs.editBackstory')}
          field="backstory"
          value={character.backstory ?? ''}
          onSave={handleUpdate}
          onClose={() => setEditSection(null)}
          saving={updateMutation.isPending}
        />
      )}
      {editSection === 'appearance' && (
        <EditTextDialog
          title={tc('characterSheet.dialogs.editAppearance')}
          field="appearance"
          value={character.appearance ?? ''}
          onSave={handleUpdate}
          onClose={() => setEditSection(null)}
          saving={updateMutation.isPending}
        />
      )}

      {/* Floating Side Tab Dice Roller (Fixed Bottom-Left, opposite of party roll overlay on bottom-right) */}
      <div className="fixed bottom-6 left-2 z-40 pointer-events-auto">
        {isDiceRollerOpen ? (
          <div className="bg-card/95 border border-indigo-500/40 rounded-2xl p-4 shadow-2xl backdrop-blur-xl w-80 max-w-[calc(100vw-3rem)] animate-in slide-in-from-bottom-5 fade-in duration-200">
            <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-border/60">
              <div className="flex items-center gap-2">
                <Dices className="size-5 text-indigo-500 animate-pulse" />
                <h3 className="text-sm font-bold text-foreground">{tc('rollButtons.diceRoller')}</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsDiceRollerOpen(false)}
                className="size-7 p-0 text-muted-foreground hover:text-foreground rounded-full"
                aria-label={tc('buttons.close') || 'Close'}
              >
                <X className="size-4" />
              </Button>
            </div>
            <DiceRoller characterId={character.id} campaignId={character.campaign_id} />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsDiceRollerOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 border border-indigo-400/40"
            title={tc('rollButtons.diceRoller')}
          >
            <Dices className="size-5" />
            <span>{tc('rollButtons.diceRoller')}</span>
          </button>
        )}
      </div>

      {/* Archive / Delete / Clone Confirmation */}
      {confirmAction && (
        <ConfirmActionDialog
          action={confirmAction}
          characterName={character.name}
          cloneName={cloneName}
          onCloneNameChange={setCloneName}
          onConfirm={
            confirmAction === 'archive' ? handleArchive : confirmAction === 'clone' ? handleClone : handleDelete
          }
          onClose={() => setConfirmAction(null)}
          pending={updateMutation.isPending || removeMutation.isPending || cloneMutation.isPending}
        />
      )}
    </div>
  );
}

export default function CharacterSheet() {
  const { t: tc } = useTranslation('common');
  const { characterSlug } = useParams<{ campaignSlug: string; characterSlug: string }>();

  const { data: character, isLoading: characterLoading, error } = useCharacter(characterSlug);
  const { data: buildRows = [], isLoading: rowsLoading, error: rowsError } = useCharacterBuildLevels(character?.id);
  const { data: itemsData = [], isLoading: itemsLoading, error: itemsError } = useCharacterItems(character?.id);

  const equippedItems = useMemo(
    () => itemsData.filter((item) => item.equipped).map((item) => item.item_id),
    [itemsData]
  );

  const isFinalized = character?.status === 'ready';

  const persistedItems = useMemo<readonly PersistedItem[]>(() => {
    if (!isFinalized) return [];
    return itemsData.map((item) => ({
      itemId: item.item_id,
      quantity: item.quantity,
      equipped: item.equipped,
      source: (item.source as SourceTag | null) ?? { origin: 'item' as const, id: item.item_id },
    }));
  }, [isFinalized, itemsData]);

  const isLoading = characterLoading || rowsLoading || itemsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-40 w-full rounded-lg" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="h-96 w-full rounded-lg" />
            <Skeleton className="h-96 w-full rounded-lg" />
            <Skeleton className="h-96 w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (error || rowsError || itemsError || !character || !characterSlug) {
    return (
      <div className="min-h-screen p-8">
        <div className="rounded-lg bg-destructive/10 border border-destructive/50 p-4 text-destructive">
          {tc('characterSheet.errors.loadingCharacter', { error: String(error ?? rowsError ?? itemsError) })}
        </div>
      </div>
    );
  }

  return (
    <CharacterProvider
      key={character.id}
      initialCharacter={character}
      initialRows={buildRows}
      initialEquippedItems={equippedItems}
      initialPersistedItems={isFinalized ? persistedItems : undefined}
      useDBInventory={isFinalized}
    >
      <CharacterSheetInner character={character} itemsData={itemsData} characterId={character.id} />
    </CharacterProvider>
  );
}
