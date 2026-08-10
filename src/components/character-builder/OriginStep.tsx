import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useCharacterContext } from '@/hooks/useCharacterContext';
import { useGameData } from '@/hooks/useGameData';
import { type FeatId, type SpeciesId } from '@/lib/dnd-helpers';
import { FEAT_SOURCES } from '@/lib/sources';
import { collectGrantsByType } from '@/lib/resolver/helpers';
import { getChoiceSourceName } from '@/lib/character-builder/choice-source-name';
import { deriveOriginFeatInfo } from '@/lib/character-builder/origin-feat-info';
import type { Grant } from '@/types/grants';
import type { PendingChoice } from '@/types/resolved';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { ChoicePicker } from './ChoicePicker';
import { LineagePicker } from './LineagePicker';
import { SPECIES_SOURCES } from '@/lib/sources/species';

export function OriginStep() {
  const { t } = useTranslation('gamedata');
  const { t: tc } = useTranslation('common');
  const { campaignSlug } = useParams<{ campaignSlug: string }>();
  const gameData = useGameData(campaignSlug);
  const context = useCharacterContext();
  const { character, bundles, build, resolved } = context;

  const background = character.background ?? '';
  const species = character.species as SpeciesId | undefined;
  const hasResolvedSpecies = !!species && SPECIES_SOURCES.some((s) => s.id === species);

  // Extract background grants (shared filter — avoids repeating the chain)
  const backgroundGrants = bundles.filter((b) => b.source.origin === 'background').flatMap((b) => b.grants);

  // Extract background origin grant info for the badge.
  // deriveOriginFeatInfo handles both shapes (feat grant and direct feat-magic-initiate-* feature),
  // returning { id, namespace } where namespace drives the i18n key prefix.
  const originFeatInfo = deriveOriginFeatInfo(backgroundGrants);

  // Pending feat-origin feature-choices (e.g. magic-initiate class picker, elemental-adept, resilient).
  // NOTE: the general-feat ENTRY POINT (a UI to select feats at ASI level) is OUT OF SCOPE for #178.
  // This only renders a picker when such a choice is already pending in the resolved state — e.g.
  // when magic-initiate is in build.feats and the user must still pick a spellcasting class.
  const featFeatureChoices = useMemo<readonly Extract<PendingChoice, { type: 'feature-choice' }>[]>(() => {
    return (resolved?.pendingChoices ?? []).filter(
      (c): c is Extract<PendingChoice, { type: 'feature-choice' }> =>
        c.type === 'feature-choice' && c.source.origin === 'feat'
    );
  }, [resolved]);

  // Species-origin feat-choices (e.g. Human Versatile origin feat picker). Collected from the
  // grant bundles rather than resolved.pendingChoices so the picker STAYS rendered after a feat
  // is chosen — otherwise the selection vanishes and the user can't change a misclick. The
  // ChoicePicker shows the current selection and a Clear button for re-selection.
  const speciesFeatChoices = useMemo<readonly Extract<PendingChoice, { type: 'feat-choice' }>[]>(() => {
    return collectGrantsByType(bundles, 'feat-choice')
      .filter(({ source }) => source.origin === 'species')
      .map(({ grant, source }) => ({
        type: 'feat-choice' as const,
        choiceKey: grant.key,
        source,
        from: grant.from,
        category: grant.category,
      }));
  }, [bundles]);

  // Feats the character already has from any source AND that can't be taken again, so the
  // species origin-feat picker can lock them out (e.g. Soldier grants Savage Attacker, which
  // a Human must not also pick). Repeatable feats (magic-initiate, etc.) stay selectable.
  const unavailableFeats = useMemo<ReadonlySet<FeatId>>(() => {
    const repeatable = new Set(FEAT_SOURCES.filter((f) => f.repeatable).map((f) => f.id));
    const granted = new Set<FeatId>();
    for (const bundle of bundles) {
      for (const grant of bundle.grants) {
        if (grant.type === 'feat' && !repeatable.has(grant.featId)) granted.add(grant.featId);
      }
    }
    for (const featId of build?.feats ?? []) {
      if (!repeatable.has(featId)) granted.add(featId);
    }
    for (const decision of Object.values(build?.choices ?? {})) {
      if (decision?.type === 'feat-choice' && !repeatable.has(decision.featId)) granted.add(decision.featId);
    }
    return granted;
  }, [bundles, build]);

  const backgroundName = background
    ? t(`backgrounds.${background}` as `backgrounds.${string}`, { defaultValue: background })
    : null;

  // Derive bonus summary rows from background grants for the inline overview panel.
  const bonusSummary = useMemo(() => {
    if (!background || backgroundGrants.length === 0) return null;

    const asiGrant = backgroundGrants.find((g): g is Extract<Grant, { type: 'asi' }> => g.type === 'asi');
    const fixedSkills = backgroundGrants
      .filter((g): g is Extract<Grant, { type: 'proficiency'; category: 'skill' }> =>
        g.type === 'proficiency' && g.category === 'skill'
      )
      .map((g) => t(`skills.${g.id}` as `skills.${string}`, { defaultValue: g.id }));
    const fixedTools = backgroundGrants
      .filter((g): g is Extract<Grant, { type: 'proficiency'; category: 'tool' }> =>
        g.type === 'proficiency' && g.category === 'tool'
      )
      .map((g) => t(`tools.${g.id}` as `tools.${string}`, { defaultValue: g.id }));
    const langChoiceGrant = backgroundGrants.find(
      (g): g is Extract<Grant, { type: 'proficiency-choice'; category: 'language' }> =>
        g.type === 'proficiency-choice' && g.category === 'language'
    );

    return { asiGrant, fixedSkills, fixedTools, langChoiceCount: langChoiceGrant?.count ?? 0 };
  }, [background, backgroundGrants, t]);

  const speciesGrants = bundles.filter((b) => b.source.origin === 'species').flatMap((b) => b.grants);

  const speciesBonusSummary = useMemo(() => {
    if (!species || speciesGrants.length === 0) return null;

    const speedGrant = speciesGrants.find((g): g is Extract<Grant, { type: 'speed'; mode: 'walk' }> => g.type === 'speed' && g.mode === 'walk');
    const fixedSkills = speciesGrants
      .filter((g): g is Extract<Grant, { type: 'proficiency'; category: 'skill' }> =>
        g.type === 'proficiency' && g.category === 'skill'
      )
      .map((g) => t(`skills.${g.id}` as `skills.${string}`, { defaultValue: g.id }));
    const fixedTools = speciesGrants
      .filter((g): g is Extract<Grant, { type: 'proficiency'; category: 'tool' }> =>
        g.type === 'proficiency' && g.category === 'tool'
      )
      .map((g) => t(`tools.${g.id}` as `tools.${string}`, { defaultValue: g.id }));
    const fixedLanguages = speciesGrants
      .filter((g): g is Extract<Grant, { type: 'proficiency'; category: 'language' }> =>
        g.type === 'proficiency' && g.category === 'language'
      )
      .map((g) => t(`languages.${g.id}` as `languages.${string}`, { defaultValue: g.id }));
    const langChoiceGrants = speciesGrants.filter(
      (g): g is Extract<Grant, { type: 'proficiency-choice'; category: 'language' }> =>
        g.type === 'proficiency-choice' && g.category === 'language'
    );
    const langChoiceCount = langChoiceGrants.reduce((sum, g) => sum + g.count, 0);

    const resistances = speciesGrants
      .filter((g): g is Extract<Grant, { type: 'resistance' }> => g.type === 'resistance')
      .map((g) => t(`damageTypes.${g.damageType}` as `damageTypes.${string}`, { defaultValue: g.damageType }));

    const features = speciesGrants
      .filter((g): g is Extract<Grant, { type: 'feature' }> => g.type === 'feature')
      .map((g) => t(`features.${g.feature.id}.name` as `features.${string}.name`, { defaultValue: g.feature.id }));

    return {
      speed: speedGrant?.value,
      fixedSkills,
      fixedTools,
      fixedLanguages,
      langChoiceCount,
      resistances,
      features
    };
  }, [species, speciesGrants, t]);

  return (
    <div className="space-y-6">
      {/* Species lineage sub-choice (LineagePicker renders null for species without lineages) */}
      {hasResolvedSpecies && (
        <LineagePicker
          race={species}
          bundles={context.bundles}
          build={context.build}
          makeChoice={context.makeChoice}
          clearChoice={context.clearChoice}
        />
      )}

      {/* Species bonus summary — shows speed, proficiencies, languages, resistances, features */}
      {speciesBonusSummary && (
        <div className="space-y-3">
          <Label className="text-base font-semibold">{tc('characterBuilder.backgroundStep.speciesBonusSummaryTitle')}</Label>
          <div className="rounded-md border border-border bg-muted/30 p-3 space-y-2">

            {/* Speed */}
            {speciesBonusSummary.speed && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground w-28 shrink-0">
                  {tc('characterBuilder.backgroundStep.speedTitle')}
                </span>
                <Badge variant="outline" className="text-xs">
                  {tc('characterBuilder.backgroundStep.speedFt', { speed: speciesBonusSummary.speed })}
                </Badge>
              </div>
            )}

            {/* Fixed skill proficiencies */}
            {speciesBonusSummary.fixedSkills.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground w-28 shrink-0">
                  {tc('characterBuilder.backgroundStep.skillsTitle')}
                </span>
                <div className="flex flex-wrap gap-1">
                  {speciesBonusSummary.fixedSkills.map((name) => (
                    <Badge key={name} variant="outline" className="text-xs">
                      {name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Fixed tool proficiencies */}
            {speciesBonusSummary.fixedTools.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground w-28 shrink-0">
                  {tc('characterBuilder.backgroundStep.toolProficiencyTitle')}
                </span>
                <div className="flex flex-wrap gap-1">
                  {speciesBonusSummary.fixedTools.map((name) => (
                    <Badge key={name} variant="outline" className="text-xs">
                      {name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Languages */}
            {(speciesBonusSummary.fixedLanguages.length > 0 || speciesBonusSummary.langChoiceCount > 0) && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground w-28 shrink-0">
                  {tc('characterBuilder.backgroundStep.languagesTitle')}
                </span>
                <div className="flex flex-wrap gap-1">
                  {speciesBonusSummary.fixedLanguages.map((name) => (
                    <Badge key={name} variant="outline" className="text-xs">
                      {name}
                    </Badge>
                  ))}
                  {speciesBonusSummary.langChoiceCount > 0 && (
                    <Badge variant="outline" className="text-xs border-dashed">
                      +{tc('characterBuilder.backgroundStep.languageChoiceCount', { count: speciesBonusSummary.langChoiceCount })}
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Resistances */}
            {speciesBonusSummary.resistances.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground w-28 shrink-0">
                  {tc('characterBuilder.backgroundStep.resistancesTitle')}
                </span>
                <div className="flex flex-wrap gap-1">
                  {speciesBonusSummary.resistances.map((name) => (
                    <Badge key={name} variant="secondary" className="text-xs bg-destructive/10 text-destructive hover:bg-destructive/20 border-transparent">
                      {name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Features */}
            {speciesBonusSummary.features.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground w-28 shrink-0">
                  {tc('characterBuilder.backgroundStep.featuresTitle')}
                </span>
                <div className="flex flex-wrap gap-1">
                  {speciesBonusSummary.features.map((name) => (
                    <Badge key={name} variant="secondary" className="text-xs">
                      {name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Species-origin feat-choice picker (e.g. Human Versatile origin feat) */}
      {speciesFeatChoices.length > 0 && (
        <div className="space-y-4">
          {speciesFeatChoices.map((choice) => (
            <div key={choice.choiceKey}>
              <p className="text-xs text-muted-foreground mb-1">
                {tc('characterBuilder.pendingChoices.fromSource', {
                  source: getChoiceSourceName(choice.choiceKey, t),
                })}
              </p>
              <ChoicePicker
                choice={choice}
                currentDecision={build?.choices[choice.choiceKey]}
                onDecide={(choiceKey, decision) => context.makeChoice(choiceKey, decision)}
                onClear={(choiceKey) => context.clearChoice(choiceKey)}
                allowedFeats={gameData.feats}
                unavailableFeats={unavailableFeats}
              />
            </div>
          ))}
        </div>
      )}

      {!background && (
        <p className="text-sm text-muted-foreground">
          {tc('characterBuilder.backgroundStep.selectBackgroundInBasics')}
        </p>
      )}

      {/* Background bonus summary — shows ASI options, skill/tool proficiencies, and language count */}
      {bonusSummary && (
        <div className="space-y-3">
          <Label className="text-base font-semibold">{tc('characterBuilder.backgroundStep.bonusSummaryTitle')}</Label>
          <div className="rounded-md border border-border bg-muted/30 p-3 space-y-2">

            {/* ASI eligible abilities */}
            {bonusSummary.asiGrant && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground w-28 shrink-0">
                  {tc('characterBuilder.backgroundStep.asiModeTitle')}
                </span>
                <div className="flex flex-wrap gap-1">
                  {(bonusSummary.asiGrant.from ?? ['str', 'dex', 'con', 'int', 'wis', 'cha']).map((ability) => (
                    <Badge key={ability} variant="secondary" className="text-xs">
                      {t(`abilities.${ability}` as `abilities.${string}`, { defaultValue: ability.toUpperCase() })}
                    </Badge>
                  ))}
                  <span className="text-xs text-muted-foreground self-center">
                    {tc('characterBuilder.backgroundStep.asiPointsTotal', { count: bonusSummary.asiGrant.points })}
                  </span>
                </div>
              </div>
            )}

            {/* Fixed skill proficiencies */}
            {bonusSummary.fixedSkills.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground w-28 shrink-0">
                  {tc('characterBuilder.backgroundStep.skillsTitle')}
                </span>
                <div className="flex flex-wrap gap-1">
                  {bonusSummary.fixedSkills.map((name) => (
                    <Badge key={name} variant="outline" className="text-xs">
                      {name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Fixed tool proficiencies */}
            {bonusSummary.fixedTools.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground w-28 shrink-0">
                  {tc('characterBuilder.backgroundStep.toolProficiencyTitle')}
                </span>
                <div className="flex flex-wrap gap-1">
                  {bonusSummary.fixedTools.map((name) => (
                    <Badge key={name} variant="outline" className="text-xs">
                      {name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Language choice count */}
            {bonusSummary.langChoiceCount > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground w-28 shrink-0">
                  {tc('characterBuilder.backgroundStep.languageLabel')}
                </span>
                <Badge variant="outline" className="text-xs">
                  {tc('characterBuilder.backgroundStep.languageChoiceCount', { count: bonusSummary.langChoiceCount })}
                </Badge>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Origin Feat */}
      {background && originFeatInfo && (
        <div className="space-y-2">
          <Label className="text-base font-semibold">{tc('characterBuilder.backgroundStep.originFeatTitle')}</Label>
          <div className="space-y-2 p-3 rounded-md border border-border bg-muted/30">
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="text-sm">
                {originFeatInfo.namespace === 'features'
                  ? t(`features.${originFeatInfo.id}.name` as `features.${string}.name`, {
                    defaultValue: originFeatInfo.id,
                  })
                  : t(`feats.${originFeatInfo.id}.name` as `feats.${string}.name`, {
                    defaultValue: originFeatInfo.id,
                  })}
              </Badge>
              {backgroundName && (
                <span className="text-xs text-muted-foreground">
                  {tc('characterBuilder.backgroundStep.originFeatGranted', { background: backgroundName })}
                </span>
              )}
            </div>
            <p className="text-sm text-foreground">
              {originFeatInfo.namespace === 'features'
                ? t(`features.${originFeatInfo.id}.description` as `features.${string}.description`, {
                  defaultValue: '',
                })
                : t(`feats.${originFeatInfo.id}.description` as `feats.${string}.description`, {
                  defaultValue: '',
                })}
            </p>
          </div>
        </div>
      )}

      {/* Tool proficiency choices are owned by the Proficiencies (Details) step to avoid
          duplicating the picker in two places — see ProficienciesStep. */}

      {/* Feat-origin feature-choices (e.g. magic-initiate spellcasting class, elemental-adept element).
          Renders only when such a choice is pending — i.e. the feat is in build.feats but the user
          has not yet picked an option. The general-feat ENTRY POINT (selecting feats at ASI level)
          is OUT OF SCOPE for #178 and is not rendered here. */}
      {featFeatureChoices.length > 0 && (
        <div className="space-y-4">
          {featFeatureChoices.map((choice) => (
            <div key={choice.choiceKey}>
              <p className="text-xs text-muted-foreground mb-1">
                {tc('characterBuilder.pendingChoices.fromSource', {
                  source: getChoiceSourceName(choice.choiceKey, t),
                })}
              </p>
              <ChoicePicker
                choice={choice}
                currentDecision={build?.choices[choice.choiceKey]}
                onDecide={(choiceKey, decision) => context.makeChoice(choiceKey, decision)}
                onClear={(choiceKey) => context.clearChoice(choiceKey)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
