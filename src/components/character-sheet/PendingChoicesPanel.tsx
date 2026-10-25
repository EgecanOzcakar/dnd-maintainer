import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AsiAllocator } from '@/components/character-sheet/AsiAllocator';
import { ExpertiseChoicePicker } from '@/components/character-sheet/ExpertiseChoicePicker';
import { FightingStylePicker } from '@/components/character-sheet/FightingStylePicker';
import { DamageTypePicker } from '@/components/character-sheet/DamageTypePicker';
import { SubclassPicker } from '@/components/character-sheet/SubclassPicker';
import { ChoicePicker } from '@/components/character-builder/ChoicePicker';
import { useCharacterContext } from '@/hooks/useCharacterContext';
import { collectGrantsByType } from '@/lib/resolver/helpers';
import { useAllChoiceGrants } from '@/lib/use-all-choice-grants';
import type { PendingChoice, ResolvedCharacter } from '@/types/resolved';
import type { ChoiceDecision, ChoiceKey } from '@/types/choices';
import { AlertTriangle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

function PendingChoiceRow({
  choice,
  currentDecision,
  onDecide,
  onClear,
}: {
  choice: PendingChoice;
  currentDecision: ChoiceDecision | undefined;
  onDecide: (key: ChoiceKey, decision: ChoiceDecision) => void;
  onClear: (key: ChoiceKey) => void;
}) {
  const { resolved, build, bundles } = useCharacterContext();
  const { t: tc } = useTranslation('common');

  if (choice.type === 'subclass') {
    return (
      <SubclassPicker
        choice={choice}
        currentDecision={currentDecision}
        onDecide={(choiceKey, subclassId) => onDecide(choiceKey, { type: 'subclass', subclassId })}
        onClear={onClear}
      />
    );
  }

  if (choice.type === 'fighting-style-choice') {
    return (
      <FightingStylePicker choice={choice} currentDecision={currentDecision} onDecide={onDecide} onClear={onClear} />
    );
  }

  if (choice.type === 'damage-choice') {
    return <DamageTypePicker choice={choice} currentDecision={currentDecision} onDecide={onDecide} onClear={onClear} />;
  }

  if (choice.type === 'asi') {
    if (!resolved) {
      return (
        <Card className="opacity-60">
          <CardContent className="p-4 space-y-1">
            <p className="text-sm text-muted-foreground">{tc('characterSheet.asi.asiTitle')}</p>
            <p className="text-xs text-destructive">{tc('characterSheet.levelUp.abilitiesUnavailable')}</p>
          </CardContent>
        </Card>
      );
    }
    return (
      <AsiAllocator
        choice={choice}
        abilities={resolved.abilities}
        currentDecision={currentDecision}
        onDecide={(choiceKey, allocation) => onDecide(choiceKey, { type: 'asi', allocation })}
        onClear={onClear}
      />
    );
  }

  if (choice.type === 'expertise-choice') {
    // Collect all expertise-choice keys so the picker can dedupe across grants
    // (e.g. rogue L1 + L6 both active simultaneously after a schema migration)
    const allExpertiseChoiceKeys = collectGrantsByType(bundles, 'expertise-choice').map(({ grant }) => grant.key);
    return (
      <ExpertiseChoicePicker
        choice={choice}
        currentDecision={currentDecision}
        allDecisions={build?.choices ?? {}}
        allExpertiseChoiceKeys={allExpertiseChoiceKeys}
        resolvedSkills={resolved?.skills ?? ({} as ResolvedCharacter['skills'])}
        onDecide={onDecide}
        onClear={onClear}
      />
    );
  }

  return <ChoicePicker choice={choice} currentDecision={currentDecision} onDecide={onDecide} onClear={onClear} />;
}

export function PendingChoicesPanel() {
  const { t } = useTranslation('common');
  const { resolved, build, makeChoice, clearChoice } = useCharacterContext();
  const [open, setOpen] = useState(false);

  // Drive the picker list from grants so resolved pickers stay mounted
  const allChoiceGrants = useAllChoiceGrants();

  const pendingChoices = resolved?.pendingChoices ?? [];
  const choices = build?.choices ?? {};
  const pendingCount = pendingChoices.length;

  // Celebrate finishing the last choice (only for a real resolve, not a transient null `resolved`).
  const previousCount = useRef(pendingCount);
  const hasResolved = resolved !== null;
  useEffect(() => {
    if (hasResolved && previousCount.current > 0 && pendingCount === 0) {
      toast.success(t('characterSheet.pendingChoices.allDone'));
      setOpen(false);
    }
    previousCount.current = pendingCount;
  }, [pendingCount, hasResolved, t]);

  // Panel is only visible when there are unresolved choices
  if (pendingCount === 0) return null;

  const handleDecide = (key: ChoiceKey, decision: ChoiceDecision) => {
    makeChoice(key, decision);
  };

  const handleClear = (key: ChoiceKey) => {
    clearChoice(key);
  };

  return (
    <>
      <Card className="border-amber-500/40 bg-amber-50/30 dark:bg-amber-950/10">
        <CardContent className="flex flex-wrap items-center gap-3 p-3">
          <AlertTriangle aria-hidden className="size-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
              {t('characterBuilder.pendingChoices.title')}
            </p>
            <p className="text-xs text-muted-foreground">
              {t('characterSheet.pendingChoices.description', { count: pendingCount })}
            </p>
          </div>
          <Button size="sm" onClick={() => setOpen(true)}>
            {t('characterSheet.pendingChoices.resolve')}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('characterBuilder.pendingChoices.title')}</DialogTitle>
            <DialogDescription>
              {t('characterSheet.pendingChoices.description', { count: pendingCount })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {allChoiceGrants.map((choice) => {
              const currentDecision = choices[choice.choiceKey];
              // Include a hash of the decision in the key so pickers with local state
              // (AsiAllocator, FightingStylePicker, SubclassPicker) remount when the
              // decision is cleared or changed externally.
              const decisionHash = currentDecision ? JSON.stringify(currentDecision) : 'none';
              return (
                <PendingChoiceRow
                  key={`${choice.choiceKey}::${decisionHash}`}
                  choice={choice}
                  currentDecision={currentDecision}
                  onDecide={handleDecide}
                  onClear={handleClear}
                />
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
