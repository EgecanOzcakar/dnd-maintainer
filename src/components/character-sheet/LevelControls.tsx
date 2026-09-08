import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LevelUpDialog } from '@/components/character-sheet/LevelUpDialog';
import { useCharacterContext } from '@/hooks/useCharacterContext';
import { DND_CLASSES } from '@/lib/dnd-helpers';
import type { ClassId, FightingStyleId } from '@/lib/dnd-helpers';
import type { ChoiceKey } from '@/types/choices';
import type { ChoiceDecision } from '@/types/choices';
import type { SubclassId } from '@/types/sources';
import { useTranslation } from 'react-i18next';

interface LevelControlsProps {
  /** The class to level up into. Determines hit die and class-level progression. */
  readonly classId: ClassId;
}

export function LevelControls({ classId }: LevelControlsProps) {
  const { t } = useTranslation('common');
  const { t: tg } = useTranslation('gamedata');
  const { level, rows, resolved, hasDeletedRows, nextRestoreLevel, levelUp, levelUpTo, levelDown, undoLevelDown } =
    useCharacterContext();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bulkTarget, setBulkTarget] = useState('');

  const canLevelUp = level < 20;
  const canLevelDown = level > 1;

  const classData = DND_CLASSES.find((c) => c.id === classId);
  if (!classData) {
    throw new Error(`LevelControls: classId "${classId}" not found in DND_CLASSES — this is a data integrity error`);
  }
  const hitDie = classData.hitDie;
  const className = tg(`classes.${classId}`);
  const targetLevel = level + 1;

  // Find the current subclass for this class (if any)
  const currentSubclassId = (rows.find((r) => r.class_id === classId && r.subclass_id != null && r.deleted_at == null)
    ?.subclass_id ?? null) as SubclassId | null;

  // Collect already-chosen fighting styles from existing build choices
  const alreadyChosenStyles = useMemo((): readonly FightingStyleId[] => {
    const styles: FightingStyleId[] = [];
    for (const row of rows) {
      if (row.choices) {
        for (const decision of Object.values(row.choices)) {
          if (decision.type === 'fighting-style-choice') {
            styles.push(...(decision.styles as FightingStyleId[]));
          }
        }
      }
    }
    return styles;
  }, [rows]);

  // Merge all decisions from all existing level rows for cross-row dedup (e.g. expertise)
  const allDecisions = useMemo((): Readonly<Record<ChoiceKey, ChoiceDecision>> => {
    const merged: Record<ChoiceKey, ChoiceDecision> = {};
    for (const row of rows) {
      if (row.choices) {
        Object.assign(merged, row.choices);
      }
    }
    return merged;
  }, [rows]);

  const handleConfirmLevelUp = (hpRoll: number, decisions: ReadonlyMap<ChoiceKey, ChoiceDecision>) => {
    levelUp(classId, hpRoll, decisions);
  };

  const bulkTargetNum = Number(bulkTarget);
  const canBulkAdvance =
    Number.isInteger(bulkTargetNum) && bulkTargetNum > level && bulkTargetNum <= 20 && !hasDeletedRows;

  const handleBulkAdvance = () => {
    if (!canBulkAdvance) return;
    levelUpTo(classId, bulkTargetNum);
    toast.success(t('characterSheet.levelManagement.bulkAdvanceSuccess', { className, level: bulkTargetNum }));
    setBulkTarget('');
  };

  // Button label changes based on whether we're replacing a soft-deleted level
  const levelUpLabel =
    hasDeletedRows && nextRestoreLevel != null
      ? t('characterSheet.levelManagement.replaceLevelUp', { className, level: targetLevel })
      : t('characterSheet.levelManagement.levelUpTo', { className, level: targetLevel });

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => setDialogOpen(true)} disabled={!canLevelUp}>
          {levelUpLabel}
        </Button>

        {canLevelDown && (
          <Button variant="outline" size="sm" onClick={levelDown}>
            {t('characterSheet.levelManagement.levelDown')}
          </Button>
        )}

        {hasDeletedRows && nextRestoreLevel != null && (
          <Button variant="ghost" size="sm" onClick={undoLevelDown}>
            {t('characterSheet.levelManagement.restoreLevel', { level: nextRestoreLevel })}
          </Button>
        )}
      </div>

      {canLevelUp && !hasDeletedRows && (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <label htmlFor="bulk-level-target" className="text-sm text-muted-foreground">
              {t('characterSheet.levelManagement.bulkAdvance')}
            </label>
            <Input
              id="bulk-level-target"
              type="number"
              min={level + 1}
              max={20}
              value={bulkTarget}
              onChange={(e) => setBulkTarget(e.target.value)}
              className="h-8 w-16"
            />
            <Button size="sm" variant="outline" onClick={handleBulkAdvance} disabled={!canBulkAdvance}>
              {t('characterSheet.levelManagement.bulkAdvanceButton')}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">{t('characterSheet.levelManagement.bulkAdvanceHint')}</p>
        </div>
      )}

      <LevelUpDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onConfirm={handleConfirmLevelUp}
        hitDie={hitDie}
        className={className}
        targetLevel={targetLevel}
        classId={classId}
        currentSubclassId={currentSubclassId}
        currentAbilities={resolved?.abilities ?? null}
        alreadyChosenStyles={alreadyChosenStyles}
        resolvedWeaponProficiencies={resolved?.weaponProficiencies ?? []}
        resolvedSkills={resolved?.skills ?? null}
        allDecisions={allDecisions}
      />
    </>
  );
}
