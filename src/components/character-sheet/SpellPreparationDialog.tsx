import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getSpellDef, isSpellId } from '@/lib/sources/spells';
import { togglePrepared } from '@/lib/spell-preparation';
import { useTranslation } from 'react-i18next';

export function SpellPreparationDialog({
  open,
  onOpenChange,
  pool,
  prepared,
  cap,
  onChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pool: readonly string[];
  prepared: readonly string[];
  cap: number;
  onChange: (prepared: string[]) => void;
}) {
  const { t } = useTranslation('gamedata');
  const { t: tc } = useTranslation('common');

  const byLevel = new Map<number, string[]>();
  for (const id of pool) {
    const level = getSpellDef(id)?.level ?? 1;
    byLevel.set(level, [...(byLevel.get(level) ?? []), id]);
  }
  const levels = [...byLevel.keys()].sort((a, b) => a - b);
  const full = prepared.length >= cap;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{tc('spellPrep.title')}</DialogTitle>
          <DialogDescription>{tc('spellPrep.description')}</DialogDescription>
        </DialogHeader>
        <div className="text-sm font-semibold">{tc('spellPrep.prepared', { count: prepared.length, max: cap })}</div>
        {full && <p className="text-xs text-muted-foreground">{tc('spellPrep.capReached')}</p>}
        {levels.length === 0 && <p className="text-sm text-muted-foreground">{tc('spellPrep.empty')}</p>}
        {levels.map((level) => (
          <div key={level}>
            <div className="text-xs font-bold text-muted-foreground mb-1">
              {tc('spellPrep.levelHeading', { level })}
            </div>
            <div className="space-y-1">
              {byLevel.get(level)?.map((id) => {
                const isPrepared = prepared.includes(id);
                return (
                  <label key={id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={isPrepared}
                      disabled={!isPrepared && full}
                      onChange={() => onChange(togglePrepared(prepared, id, cap, pool))}
                    />
                    {isSpellId(id) ? t(`spells.${id}.name`) : id}
                  </label>
                );
              })}
            </div>
          </div>
        ))}
        <p className="text-xs text-muted-foreground">{tc('spellPrep.alwaysPreparedNote')}</p>
        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>
            {tc('spellPrep.done')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
