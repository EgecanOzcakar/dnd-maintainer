import { useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ABILITY_KEYS } from '@/lib/dnd-helpers';
import { HOMEBREW_DAMAGE_TYPES, homebrewSchema } from '@/lib/homebrew';
import type { HomebrewAction } from '@/lib/homebrew';
import type { AbilityKey } from '@/types/database';

type Mode = 'none' | 'ability' | 'flat';

interface FormState {
  name: string;
  description: string;
  kind: HomebrewAction['kind'];
  activation: HomebrewAction['activation'];
  spellLevel: string;
  attackMode: Mode;
  attackAbility: AbilityKey;
  attackProficient: boolean;
  attackFlat: string;
  saveMode: Mode;
  saveAbility: AbilityKey;
  saveDcAbility: AbilityKey;
  saveDc: string;
  hasDamage: boolean;
  damageDice: string;
  damageType: string;
  damageBonus: string;
  damageAbility: AbilityKey | '';
  hasHeal: boolean;
  healDice: string;
  healBonus: string;
  healAbility: AbilityKey | '';
  usesMax: string;
  usesRest: 'short' | 'long';
}

const ACTIVATIONS = ['action', 'bonus-action', 'reaction', 'free', 'special'] as const;
const KINDS = ['attack', 'spell', 'feature'] as const;

const EMPTY: FormState = {
  name: '',
  description: '',
  kind: 'attack',
  activation: 'action',
  spellLevel: '0',
  attackMode: 'ability',
  attackAbility: 'str',
  attackProficient: true,
  attackFlat: '0',
  saveMode: 'none',
  saveAbility: 'dex',
  saveDcAbility: 'int',
  saveDc: '10',
  hasDamage: true,
  damageDice: '1d8',
  damageType: 'slashing',
  damageBonus: '0',
  damageAbility: 'str',
  hasHeal: false,
  healDice: '1d4',
  healBonus: '0',
  healAbility: '',
  usesMax: '',
  usesRest: 'long',
};

function toForm(e: HomebrewAction): FormState {
  return {
    ...EMPTY,
    name: e.name,
    description: e.description ?? '',
    kind: e.kind,
    activation: e.activation,
    spellLevel: String(e.spellLevel ?? 0),
    attackMode: !e.attack ? 'none' : e.attack.bonus !== undefined ? 'flat' : 'ability',
    attackAbility: e.attack?.ability ?? 'str',
    attackProficient: e.attack?.proficient ?? false,
    attackFlat: String(e.attack?.bonus ?? 0),
    saveMode: !e.save ? 'none' : e.save.dc !== undefined ? 'flat' : 'ability',
    saveAbility: e.save?.ability ?? 'dex',
    saveDcAbility: e.save?.dcAbility ?? 'int',
    saveDc: String(e.save?.dc ?? 10),
    hasDamage: Boolean(e.damage),
    damageDice: e.damage?.dice ?? '1d8',
    damageType: e.damage?.type ?? 'slashing',
    damageBonus: String(e.damage?.bonus ?? 0),
    damageAbility: e.damage?.ability ?? '',
    hasHeal: Boolean(e.heal),
    healDice: e.heal?.dice ?? '',
    healBonus: String(e.heal?.bonus ?? 0),
    healAbility: e.heal?.ability ?? '',
    usesMax: e.uses ? String(e.uses.max) : '',
    usesRest: e.uses?.rest ?? 'long',
  };
}

const num = (s: string) => (s.trim() === '' ? undefined : Number(s));
const DICE = /^\d+d\d+$/;

function toEntry(f: FormState, id: string): unknown {
  const usesMax = num(f.usesMax);
  return {
    id,
    name: f.name,
    ...(f.description.trim() ? { description: f.description.trim() } : {}),
    kind: f.kind,
    activation: f.activation,
    ...(f.kind === 'spell' ? { spellLevel: num(f.spellLevel) } : {}),
    ...(f.attackMode === 'flat' ? { attack: { bonus: num(f.attackFlat) } } : {}),
    ...(f.attackMode === 'ability' ? { attack: { ability: f.attackAbility, proficient: f.attackProficient } } : {}),
    ...(f.saveMode === 'flat' ? { save: { ability: f.saveAbility, dc: num(f.saveDc) } } : {}),
    ...(f.saveMode === 'ability' ? { save: { ability: f.saveAbility, dcAbility: f.saveDcAbility } } : {}),
    ...(f.hasDamage
      ? {
          damage: {
            dice: f.damageDice.trim(),
            type: f.damageType,
            bonus: num(f.damageBonus) ?? 0,
            ...(f.damageAbility ? { ability: f.damageAbility } : {}),
          },
        }
      : {}),
    ...(f.hasHeal
      ? {
          heal: {
            ...(f.healDice.trim() ? { dice: f.healDice.trim() } : {}),
            bonus: num(f.healBonus) ?? 0,
            ...(f.healAbility ? { ability: f.healAbility } : {}),
          },
        }
      : {}),
    ...(usesMax !== undefined ? { uses: { max: usesMax, rest: f.usesRest } } : {}),
  };
}

interface HomebrewDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  /** Entry being edited; omit to add a new one. */
  readonly entry?: HomebrewAction;
  readonly onSave: (entry: HomebrewAction) => void;
}

const FIELD = 'h-8 w-full rounded-md border border-input bg-background px-2 text-sm';

export function HomebrewDialog({ open, onOpenChange, entry, onSave }: HomebrewDialogProps) {
  const { t } = useTranslation('common');
  const { t: tg } = useTranslation('gamedata');
  const [form, setForm] = useState<FormState>(() => (entry ? toForm(entry) : EMPTY));
  const [errors, setErrors] = useState<string[]>([]);
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  const submit = () => {
    const errs: string[] = [];
    if (!form.name.trim()) errs.push(t('homebrew.errors.name'));
    if (form.hasDamage && !DICE.test(form.damageDice.trim())) errs.push(t('homebrew.errors.damageDice'));
    if (form.hasHeal && form.healDice.trim() && !DICE.test(form.healDice.trim()))
      errs.push(t('homebrew.errors.healDice'));
    if (form.attackMode === 'flat' && num(form.attackFlat) === undefined) errs.push(t('homebrew.errors.attackFlat'));
    if (form.saveMode === 'flat' && !(Number(form.saveDc) >= 1)) errs.push(t('homebrew.errors.saveDc'));
    const parsed = homebrewSchema.safeParse(toEntry(form, entry?.id ?? crypto.randomUUID()));
    if (!parsed.success && errs.length === 0) errs.push(t('homebrew.errors.invalid'));
    setErrors(errs);
    if (errs.length === 0 && parsed.success) {
      onSave(parsed.data);
      onOpenChange(false);
    }
  };

  const abilityOptions = (blank?: boolean) => (
    <>
      {blank && <option value="">{t('homebrew.none')}</option>}
      {ABILITY_KEYS.map((a) => (
        <option key={a} value={a}>
          {tg(`abilities.${a}`)}
        </option>
      ))}
    </>
  );
  const field = (id: string, label: string, control: ReactNode) => (
    <div className="grid gap-1">
      <label htmlFor={id} className="text-xs font-medium">
        {label}
      </label>
      {control}
    </div>
  );
  const modeSelect = (id: string, value: Mode, onChange: (m: Mode) => void) => (
    <select id={id} className={FIELD} value={value} onChange={(e) => onChange(e.target.value as Mode)}>
      <option value="none">{t('homebrew.none')}</option>
      <option value="ability">{t('homebrew.fromAbility')}</option>
      <option value="flat">{t('homebrew.flat')}</option>
    </select>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{entry ? t('homebrew.editTitle') : t('homebrew.addTitle')}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          {field(
            'hb-name',
            t('homebrew.name'),
            <Input id="hb-name" value={form.name} onChange={(e) => set('name', e.target.value)} />
          )}
          {field(
            'hb-description',
            t('homebrew.description'),
            <textarea
              id="hb-description"
              className={`${FIELD} h-16 py-1`}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
            />
          )}
          <div className="grid grid-cols-2 gap-3">
            {field(
              'hb-kind',
              t('homebrew.kind'),
              <select
                id="hb-kind"
                className={FIELD}
                value={form.kind}
                onChange={(e) => set('kind', e.target.value as FormState['kind'])}
              >
                {KINDS.map((k) => (
                  <option key={k} value={k}>
                    {t(`homebrew.kinds.${k}`)}
                  </option>
                ))}
              </select>
            )}
            {field(
              'hb-activation',
              t('homebrew.activation'),
              <select
                id="hb-activation"
                className={FIELD}
                value={form.activation}
                onChange={(e) => set('activation', e.target.value as FormState['activation'])}
              >
                {ACTIVATIONS.map((a) => (
                  <option key={a} value={a}>
                    {t(`characterSheet.combatView.actions.activation.${a}`)}
                  </option>
                ))}
              </select>
            )}
          </div>
          {form.kind === 'spell' &&
            field(
              'hb-spell-level',
              t('homebrew.spellLevel'),
              <select
                id="hb-spell-level"
                className={FIELD}
                value={form.spellLevel}
                onChange={(e) => set('spellLevel', e.target.value)}
              >
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((l) => (
                  <option key={l} value={l}>
                    {l === 0 ? t('characterSheet.combatView.actions.cantrip') : l}
                  </option>
                ))}
              </select>
            )}

          <fieldset className="grid gap-2 border-t pt-2">
            {field(
              'hb-attack-mode',
              t('homebrew.attackBonus'),
              modeSelect('hb-attack-mode', form.attackMode, (m) => set('attackMode', m))
            )}
            {form.attackMode === 'ability' && (
              <div className="grid grid-cols-2 gap-3">
                {field(
                  'hb-attack-ability',
                  t('homebrew.ability'),
                  <select
                    id="hb-attack-ability"
                    className={FIELD}
                    value={form.attackAbility}
                    onChange={(e) => set('attackAbility', e.target.value as AbilityKey)}
                  >
                    {abilityOptions()}
                  </select>
                )}
                <label className="flex items-center gap-2 text-xs self-end h-8">
                  <input
                    type="checkbox"
                    checked={form.attackProficient}
                    onChange={(e) => set('attackProficient', e.target.checked)}
                  />
                  {t('homebrew.proficient')}
                </label>
              </div>
            )}
            {form.attackMode === 'flat' &&
              field(
                'hb-attack-flat',
                t('homebrew.bonus'),
                <Input
                  id="hb-attack-flat"
                  type="number"
                  value={form.attackFlat}
                  onChange={(e) => set('attackFlat', e.target.value)}
                />
              )}
          </fieldset>

          <fieldset className="grid gap-2 border-t pt-2">
            {field(
              'hb-save-mode',
              t('homebrew.saveDc'),
              modeSelect('hb-save-mode', form.saveMode, (m) => set('saveMode', m))
            )}
            {form.saveMode !== 'none' && (
              <div className="grid grid-cols-2 gap-3">
                {field(
                  'hb-save-ability',
                  t('homebrew.saveAbility'),
                  <select
                    id="hb-save-ability"
                    className={FIELD}
                    value={form.saveAbility}
                    onChange={(e) => set('saveAbility', e.target.value as AbilityKey)}
                  >
                    {abilityOptions()}
                  </select>
                )}
                {form.saveMode === 'flat'
                  ? field(
                      'hb-save-dc',
                      t('homebrew.dc'),
                      <Input
                        id="hb-save-dc"
                        type="number"
                        value={form.saveDc}
                        onChange={(e) => set('saveDc', e.target.value)}
                      />
                    )
                  : field(
                      'hb-save-dc-ability',
                      t('homebrew.dcAbility'),
                      <select
                        id="hb-save-dc-ability"
                        className={FIELD}
                        value={form.saveDcAbility}
                        onChange={(e) => set('saveDcAbility', e.target.value as AbilityKey)}
                      >
                        {abilityOptions()}
                      </select>
                    )}
              </div>
            )}
          </fieldset>

          <fieldset className="grid gap-2 border-t pt-2">
            <label className="flex items-center gap-2 text-xs font-medium">
              <input type="checkbox" checked={form.hasDamage} onChange={(e) => set('hasDamage', e.target.checked)} />
              {t('homebrew.damage')}
            </label>
            {form.hasDamage && (
              <div className="grid grid-cols-2 gap-3">
                {field(
                  'hb-damage-dice',
                  t('homebrew.dice'),
                  <Input
                    id="hb-damage-dice"
                    value={form.damageDice}
                    onChange={(e) => set('damageDice', e.target.value)}
                  />
                )}
                {field(
                  'hb-damage-type',
                  t('homebrew.damageType'),
                  <select
                    id="hb-damage-type"
                    className={FIELD}
                    value={form.damageType}
                    onChange={(e) => set('damageType', e.target.value)}
                  >
                    {HOMEBREW_DAMAGE_TYPES.map((d) => (
                      <option key={d} value={d}>
                        {tg(`damageTypes.${d}` as `damageTypes.${string}`, { defaultValue: d })}
                      </option>
                    ))}
                  </select>
                )}
                {field(
                  'hb-damage-bonus',
                  t('homebrew.flatBonus'),
                  <Input
                    id="hb-damage-bonus"
                    type="number"
                    value={form.damageBonus}
                    onChange={(e) => set('damageBonus', e.target.value)}
                  />
                )}
                {field(
                  'hb-damage-ability',
                  t('homebrew.addAbility'),
                  <select
                    id="hb-damage-ability"
                    className={FIELD}
                    value={form.damageAbility}
                    onChange={(e) => set('damageAbility', e.target.value as AbilityKey | '')}
                  >
                    {abilityOptions(true)}
                  </select>
                )}
              </div>
            )}
          </fieldset>

          <fieldset className="grid gap-2 border-t pt-2">
            <label className="flex items-center gap-2 text-xs font-medium">
              <input type="checkbox" checked={form.hasHeal} onChange={(e) => set('hasHeal', e.target.checked)} />
              {t('homebrew.heal')}
            </label>
            {form.hasHeal && (
              <div className="grid grid-cols-3 gap-3">
                {field(
                  'hb-heal-dice',
                  t('homebrew.dice'),
                  <Input id="hb-heal-dice" value={form.healDice} onChange={(e) => set('healDice', e.target.value)} />
                )}
                {field(
                  'hb-heal-bonus',
                  t('homebrew.flatBonus'),
                  <Input
                    id="hb-heal-bonus"
                    type="number"
                    value={form.healBonus}
                    onChange={(e) => set('healBonus', e.target.value)}
                  />
                )}
                {field(
                  'hb-heal-ability',
                  t('homebrew.addAbility'),
                  <select
                    id="hb-heal-ability"
                    className={FIELD}
                    value={form.healAbility}
                    onChange={(e) => set('healAbility', e.target.value as AbilityKey | '')}
                  >
                    {abilityOptions(true)}
                  </select>
                )}
              </div>
            )}
          </fieldset>

          <div className="grid grid-cols-2 gap-3 border-t pt-2">
            {field(
              'hb-uses-max',
              t('homebrew.usesMax'),
              <Input
                id="hb-uses-max"
                type="number"
                min={1}
                value={form.usesMax}
                onChange={(e) => set('usesMax', e.target.value)}
              />
            )}
            {field(
              'hb-uses-rest',
              t('homebrew.usesRest'),
              <select
                id="hb-uses-rest"
                className={FIELD}
                value={form.usesRest}
                onChange={(e) => set('usesRest', e.target.value as 'short' | 'long')}
              >
                <option value="short">{t('homebrew.rest.short')}</option>
                <option value="long">{t('homebrew.rest.long')}</option>
              </select>
            )}
          </div>

          {errors.length > 0 && (
            <ul role="alert" className="text-xs text-destructive list-disc pl-4">
              {errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('buttons.cancel')}
          </Button>
          <Button onClick={submit}>{t('buttons.save')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
