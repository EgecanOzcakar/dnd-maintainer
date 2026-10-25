import { useTranslation } from 'react-i18next';
import type { SpellMechanics } from '@/types/actions';
import type { SpellDef } from '@/types/spells';

/** Casting time, range, components, duration, classes and the roll data of a spell. */
export function SpellDetail({ spell, mechanics: m }: { spell: SpellDef; mechanics?: SpellMechanics }) {
  const { t: tc } = useTranslation('common');
  const { t: tg } = useTranslation('gamedata');
  const comps = [
    spell.components.verbal && tc('rules.spell.verbal'),
    spell.components.somatic && tc('rules.spell.somatic'),
    spell.components.material !== false && `${tc('rules.spell.material')} (${spell.components.material})`,
  ]
    .filter(Boolean)
    .join(', ');
  const rows: [string, string][] = [
    [tc('rules.spell.castingTime'), spell.castingTime],
    [tc('rules.spell.range'), spell.range],
    [tc('rules.spell.components'), comps || '-'],
    [tc('rules.spell.duration'), spell.duration],
    [tc('rules.spell.classes'), spell.nativeClasses.map((c) => tg(`classes.${c}`)).join(', ')],
  ];
  if (m?.attack) rows.push([tc('rules.spell.attackRoll'), tc(`rules.spell.${m.attack}`)]);
  if (m?.save) rows.push([tc('rules.spell.save'), tc('rules.spell.saveValue', { ability: tg(`abilities.${m.save}`) })]);
  if (m?.damage) {
    const flat = m.damage.flat ? ` + ${m.damage.flat}` : '';
    const scaling = m.damage.cantripScaling ? ` (${tc('rules.spell.cantripScaling')})` : '';
    rows.push([tc('rules.spell.damage'), `${m.damage.dice}${flat} ${tg(`damageTypes.${m.damage.type}`)}${scaling}`]);
    if (m.damage.perSlot) rows.push([tc('rules.spell.upcast'), `+${m.damage.perSlot}`]);
  }
  if (m?.heal) {
    const base = [m.heal.dice, m.heal.flat].filter(Boolean).join(' + ');
    rows.push([tc('rules.spell.healing'), base || '-']);
    const slot = m.heal.perSlot ? `+${m.heal.perSlot}` : m.heal.flatPerSlot ? `+${m.heal.flatPerSlot}` : '';
    if (slot) rows.push([tc('rules.spell.upcast'), slot]);
  }
  return (
    <dl className="mt-3 grid grid-cols-1 gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
      {rows.map(([label, value]) => (
        <div key={label} className="flex gap-2">
          <dt className="shrink-0 font-medium text-muted-foreground">{label}:</dt>
          <dd className="min-w-0 break-words">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
