import { useTranslation } from 'react-i18next';
import { SpellDetail } from '@/components/SpellDetail';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SPELL_MECHANICS } from '@/lib/sources/spell-mechanics';
import { getSpellDef } from '@/lib/sources/spells';

/** Side drawer with a spell's full text and details (opened from the spell list). */
export function SpellDrawer({
  spellId,
  open,
  onOpenChange,
  saveDC,
  attackBonus,
}: {
  readonly spellId: string;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  /** The character's own numbers for this spell. */
  readonly saveDC?: number | null;
  readonly attackBonus?: number | null;
}) {
  const { t } = useTranslation('gamedata');
  const { t: tc } = useTranslation('common');
  const spell = getSpellDef(spellId);
  if (!spell) return null;
  const subtitle =
    spell.level === 0
      ? tc('rules.spell.cantripSchool', { school: tc(`rules.schools.${spell.school}`) })
      : tc('rules.spell.levelSchool', { level: spell.level, school: tc(`rules.schools.${spell.school}`) });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="spell-drawer"
        className="top-0 right-0 left-auto h-dvh w-full max-w-md translate-x-0 translate-y-0 content-start overflow-y-auto rounded-none sm:max-w-md"
      >
        <DialogHeader>
          <DialogTitle>{t(`spells.${spellId}.name` as 'spells.bless.name')}</DialogTitle>
          <DialogDescription>{subtitle}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-1">
          {spell.concentration && <Badge variant="outline">{tc('rules.spell.concentration')}</Badge>}
          {spell.ritual && <Badge variant="outline">{tc('rules.spell.ritual')}</Badge>}
          {saveDC != null && <Badge variant="secondary">{tc('spellDrawer.saveDC', { dc: saveDC })}</Badge>}
          {attackBonus != null && (
            <Badge variant="secondary">
              {tc('spellDrawer.attack', { bonus: attackBonus >= 0 ? `+${attackBonus}` : attackBonus })}
            </Badge>
          )}
        </div>
        <p className="whitespace-pre-line text-sm leading-relaxed">
          {t(`spells.${spellId}.description` as 'spells.bless.description', { defaultValue: '' })}
        </p>
        <SpellDetail spell={spell} mechanics={SPELL_MECHANICS[spellId]} />
      </DialogContent>
    </Dialog>
  );
}
