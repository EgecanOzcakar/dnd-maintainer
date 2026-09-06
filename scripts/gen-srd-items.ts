/**
 * Generate SRD-derived item data from vendored `5e-bits/5e-database` snapshots.
 *
 * The upstream data (2024 SRD) is Creative Commons Attribution 4.0 (SRD 5.2.1).
 * Mundane equipment *stats* are uncopyrightable facts and ship without attribution;
 * magic-item *descriptions* are CC-BY expression and carry the SRD notice inside
 * the generated `src/lib/sources/magic-items.ts` header.
 *
 * Snapshots + provenance: `scripts/data/` (see its README).
 *
 * Outputs (re-run is deterministic — sorted, stable):
 *   - src/lib/sources/magic-items.ts   (fully generated)
 *   - src/lib/sources/srd-gear.ts      (fully generated; spread into items.ts catalogs)
 *   - src/locales/en/gamedata.json     (merges items.gear.* / items.packs.* names)
 *   - console: a weapon/armor coverage diff vs the hand-tuned catalogs
 *
 * Usage: npm run gen:items
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const p = (rel: string) => new URL(rel, new URL('..', import.meta.url)).pathname;

// ---------------------------------------------------------------------------
// Upstream shapes (only the fields we read)
// ---------------------------------------------------------------------------
interface Cost {
  quantity: number;
  unit: 'cp' | 'sp' | 'gp' | 'pp';
}
interface EqCategoryRef {
  index: string;
  name: string;
}
interface Equipment {
  index: string;
  name: string;
  equipment_categories?: EqCategoryRef[];
  equipment_category?: EqCategoryRef;
  cost?: Cost;
  weight?: number;
  contents?: { item: { index: string; name: string }; quantity: number }[];
  damage?: unknown;
  armor_class?: unknown;
}
interface MagicItem {
  index: string;
  name: string;
  equipment_category?: EqCategoryRef;
  variant?: boolean;
  variants?: { index: string }[];
  attunement?: boolean;
  rarity: { name: string };
  desc: string | string[];
}

// ---------------------------------------------------------------------------
// Reconciliation with the existing hand-tuned catalog in items.ts
// ---------------------------------------------------------------------------

/** SRD equipment indexes NOT emitted as new gear — an equivalent already exists. */
const SKIP_GEAR = new Set<string>([
  // identical id, already in GEAR_CATALOG
  'backpack',
  'bedroll',
  'bell',
  'crowbar',
  'pouch',
  'thieves-tools',
  'tinderbox',
  'waterskin',
  // bundled-quantity equivalents already in GEAR_CATALOG
  'arrows', // arrows-20
  'bolts', // bolts-20
  'bullets-sling', // sling-bullets-20
  'needles', // blowgun-needles-50
  'rope', // hemp-rope-50ft
  'torch', // torches-10
  'rations', // rations-10
  'candle', // candles-5
  'spikes-iron', // pitons-10
  'ball-bearings', // ball-bearings-1000
  'oil', // oil-flasks-2
  'string', // string-10ft
  'lantern-hooded', // hooded-lantern
  'clothes-travelers', // common-clothes
  'net', // kept as the martial weapon in WEAPON_CATALOG
]);

/** SRD content-item index -> our catalog id, for pack `contents`. */
const CONTENT_ALIAS: Record<string, string> = {
  arrows: 'arrows-20',
  bolts: 'bolts-20',
  'bullets-sling': 'sling-bullets-20',
  needles: 'blowgun-needles-50',
  rope: 'hemp-rope-50ft',
  torch: 'torches-10',
  rations: 'rations-10',
  candle: 'candles-5',
  'spikes-iron': 'pitons-10',
  'ball-bearings': 'ball-bearings-1000',
  oil: 'oil-flasks-2',
  string: 'string-10ft',
  'lantern-hooded': 'hooded-lantern',
  'clothes-travelers': 'common-clothes',
};

/** Packs already hand-authored in PACK_CATALOG (SRD uses slightly different indexes). */
const SKIP_PACKS = new Set<string>(['burglars-pack', 'explorers-pack', 'dungeoneer-pack']);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const COIN_TO_GP: Record<Cost['unit'], number> = { cp: 0.01, sp: 0.1, gp: 1, pp: 10 };

function costToGp(cost?: Cost): number {
  if (!cost) return 0;
  return Math.round(cost.quantity * COIN_TO_GP[cost.unit] * 100) / 100;
}

function cats(x: Equipment): string[] {
  return (x.equipment_categories ?? (x.equipment_category ? [x.equipment_category] : [])).map((c) => c.name);
}

function descToString(desc: string | string[]): string {
  return (Array.isArray(desc) ? desc.join('\n') : desc).replace(/[ \t]+\n/g, '\n').trim();
}

const RARITY = ['common', 'uncommon', 'rare', 'very-rare', 'legendary', 'artifact', 'varies'] as const;
type Rarity = (typeof RARITY)[number];

function normalizeRarity(raw: string): Rarity {
  const s = raw.toLowerCase();
  if (s.includes(',') || s.includes('varies') || s.includes('or ')) return 'varies';
  const base = s.replace(/\(.*?\)/g, '').trim();
  if (base === 'very rare') return 'very-rare';
  if ((RARITY as readonly string[]).includes(base)) return base as Rarity;
  return 'varies';
}

const CATEGORY_MAP: Record<string, string> = {
  Armor: 'armor',
  Weapons: 'weapon',
  Rings: 'ring',
  Staffs: 'staff',
  Wands: 'wand',
  Potions: 'potion',
  'Wondrous Items': 'wondrous-item',
};

function normalizeCategory(name?: string): string {
  return (name && CATEGORY_MAP[name]) ?? 'other';
}

function attunementNote(desc: string): string | undefined {
  const m = desc.match(/requires attunement([^)\n.]*)/i);
  if (!m) return undefined;
  const note = m[1].replace(/^\s*(by|,)\s*/i, '').trim();
  return note.length > 0 ? note : undefined;
}

function tsString(s: string): string {
  return JSON.stringify(s);
}

// ---------------------------------------------------------------------------
// Load snapshots
// ---------------------------------------------------------------------------

const handItemsSrc = readFileSync(p('src/lib/sources/items.ts'), 'utf8');
/** Every id hand-authored in items.ts (weapons + armor + original gear/packs). */
const HAND_IDS = new Set<string>(Array.from(handItemsSrc.matchAll(/id: '([^']+)'/g), (m) => m[1]));

const equipment: Equipment[] = JSON.parse(readFileSync(p('scripts/data/5e-SRD-Equipment-2024.json'), 'utf8'));
const magicItemsRaw: MagicItem[] = JSON.parse(readFileSync(p('scripts/data/5e-SRD-Magic-Items-2024.json'), 'utf8'));
const sourceCommit = readFileSync(p('scripts/data/.source-commit'), 'utf8').trim();

// ===========================================================================
// 1. Mundane gear + packs
// ===========================================================================

interface GearRow {
  id: string;
  weight: number;
  costGp: number;
  name: string;
}
interface PackRow {
  id: string;
  costGp: number;
  contents: { itemId: string; quantity: number }[];
  name: string;
}

const gearRows: GearRow[] = [];
const packRows: PackRow[] = [];

for (const x of equipment) {
  const c = cats(x);
  if (c.includes('Weapons') || c.includes('Armor')) continue;

  const isPack = Array.isArray(x.contents) && x.contents.length > 0;
  if (isPack) {
    if (SKIP_PACKS.has(x.index)) continue;
    packRows.push({
      id: x.index,
      costGp: costToGp(x.cost),
      contents: x.contents!.map((entry) => ({
        itemId: CONTENT_ALIAS[entry.item.index] ?? entry.item.index,
        quantity: entry.quantity,
      })),
      name: x.name,
    });
    continue;
  }

  if (SKIP_GEAR.has(x.index)) continue;
  if (HAND_IDS.has(x.index)) {
    throw new Error(
      `SRD gear "${x.index}" collides with a hand-authored items.ts id — add it to SKIP_GEAR or CONTENT_ALIAS`
    );
  }
  gearRows.push({ id: x.index, weight: x.weight ?? 0, costGp: costToGp(x.cost), name: x.name });
}

gearRows.sort((a, b) => a.id.localeCompare(b.id));
packRows.sort((a, b) => a.id.localeCompare(b.id));

const srcGearTs = `/**
 * SRD 2024 adventuring gear, tools, foci and equipment packs — GENERATED.
 *
 * Source: 5e-bits/5e-database @ ${sourceCommit} (2024 SRD). Mundane equipment stats
 * are uncopyrightable facts; no attribution required. Regenerate: \`npm run gen:items\`.
 * Hand-tuned weapons/armor and the original bundled-quantity gear live in items.ts.
 */
import type { GearDef, PackDef } from '@/types/items';

export const SRD_GEAR_CATALOG: readonly ({ readonly type: 'gear' } & GearDef)[] = [
${gearRows.map((g) => `  { type: 'gear', id: ${tsString(g.id)}, weight: ${g.weight}, costGp: ${g.costGp} },`).join('\n')}
];

export const SRD_PACK_CATALOG: readonly ({ readonly type: 'pack' } & PackDef)[] = [
${packRows
  .map(
    (pk) =>
      `  {\n    type: 'pack',\n    id: ${tsString(pk.id)},\n    costGp: ${pk.costGp},\n    contents: [\n${pk.contents
        .map((cn) => `      { itemId: ${tsString(cn.itemId)}, quantity: ${cn.quantity} },`)
        .join('\n')}\n    ],\n  },`
  )
  .join('\n')}
];
`;

writeFileSync(p('src/lib/sources/srd-gear.ts'), srcGearTs);

// ===========================================================================
// 2. Magic items
// ===========================================================================

// child variant index -> parent id
const variantParent = new Map<string, string>();
for (const mi of magicItemsRaw) {
  if (mi.variants && mi.variants.length > 0) {
    for (const v of mi.variants) variantParent.set(v.index, mi.index);
  }
}

interface MagicRow {
  id: string;
  name: string;
  category: string;
  rarity: Rarity;
  attunement: boolean;
  attunementNote?: string;
  variantOf?: string;
  description: string;
}

const magicRows: MagicRow[] = magicItemsRaw
  .map((mi): MagicRow => {
    const description = descToString(mi.desc);
    return {
      id: mi.index,
      name: mi.name,
      category: normalizeCategory(mi.equipment_category?.name),
      rarity: normalizeRarity(mi.rarity.name),
      attunement: Boolean(mi.attunement) || /requires attunement/i.test(description),
      attunementNote: attunementNote(description),
      variantOf: variantParent.get(mi.index),
      description,
    };
  })
  .sort((a, b) => a.id.localeCompare(b.id));

const magicItemsTs = `/**
 * D&D 2024 SRD magic items — GENERATED reference catalog. Do not edit by hand;
 * run \`npm run gen:items\`.
 *
 * This work includes material from the System Reference Document 5.2.1
 * ("SRD 5.2.1") by Wizards of the Coast LLC, available at
 * https://www.dndbeyond.com/srd.
 * The SRD 5.2.1 is licensed under the
 * "Creative Commons Attribution 4.0 International License", available at
 * https://creativecommons.org/licenses/by/4.0/legalcode.
 *
 * Item text sourced via 5e-bits/5e-database @ ${sourceCommit}.
 */
import type { MagicItemDef } from '@/types/magic-items';

export const MAGIC_ITEM_CATALOG: readonly MagicItemDef[] = [
${magicRows
  .map((m) => {
    const lines = [
      `    id: ${tsString(m.id)},`,
      `    name: ${tsString(m.name)},`,
      `    category: ${tsString(m.category)},`,
      `    rarity: ${tsString(m.rarity)},`,
      `    attunement: ${m.attunement},`,
    ];
    if (m.attunementNote) lines.push(`    attunementNote: ${tsString(m.attunementNote)},`);
    if (m.variantOf) lines.push(`    variantOf: ${tsString(m.variantOf)},`);
    lines.push(`    description: ${tsString(m.description)},`);
    return `  {\n${lines.join('\n')}\n  },`;
  })
  .join('\n')}
];

const MAGIC_ITEM_MAP: ReadonlyMap<string, MagicItemDef> = new Map(
  MAGIC_ITEM_CATALOG.map((item) => [item.id, item])
);

export function getMagicItemDef(id: string): MagicItemDef | undefined {
  return MAGIC_ITEM_MAP.get(id);
}

/** Fail-fast lookup for trusted source data. */
export function requireMagicItemDef(id: string): MagicItemDef {
  const def = MAGIC_ITEM_MAP.get(id);
  if (def === undefined) throw new Error(\`Unknown magic item id: "\${id}"\`);
  return def;
}
`;

writeFileSync(p('src/lib/sources/magic-items.ts'), magicItemsTs);

// ===========================================================================
// 3. Merge gear / pack display names into gamedata.json
// ===========================================================================

const gamedataPath = p('src/locales/en/gamedata.json');
const gamedata = JSON.parse(readFileSync(gamedataPath, 'utf8'));
gamedata.items ??= {};
gamedata.items.weapons ??= {};
gamedata.items.gear ??= {};
gamedata.items.packs ??= {};

// Firearms added to WEAPON_CATALOG by hand (2024 SRD) — keep their names in sync here.
for (const [id, name] of Object.entries({ musket: 'Musket', pistol: 'Pistol' })) {
  gamedata.items.weapons[id] ??= { name };
}
for (const g of gearRows) gamedata.items.gear[g.id] ??= { name: g.name };
for (const pk of packRows) gamedata.items.packs[pk.id] ??= { name: pk.name };

writeFileSync(gamedataPath, JSON.stringify(gamedata, null, 2) + '\n');

// ===========================================================================
// 4. Weapon / armor coverage diff (report only — those catalogs are hand-tuned)
// ===========================================================================

const srdWeapons = equipment.filter((x) => cats(x).includes('Weapons') && !x.contents).map((x) => x.index);
const srdArmor = equipment.filter((x) => cats(x).includes('Armor') && !x.contents).map((x) => x.index);

// SRD armor indexes carry an "-armor" suffix the hand catalog omits (e.g. `plate-armor` -> `plate`).
const has = (id: string) => HAND_IDS.has(id) || HAND_IDS.has(id.replace(/-armor$/, ''));

const missWeapons = srdWeapons.filter((id) => !has(id));
const missArmor = srdArmor.filter((id) => !has(id));

console.log(`\ngenerated:`);
console.log(`  src/lib/sources/srd-gear.ts      ${gearRows.length} gear, ${packRows.length} packs`);
console.log(`  src/lib/sources/magic-items.ts   ${magicRows.length} magic items`);
console.log(`  src/locales/en/gamedata.json     merged gear/pack names`);
console.log(`\nweapon/armor coverage vs SRD (hand-tuned — apply manually if real):`);
console.log(`  weapons missing: ${missWeapons.length ? missWeapons.join(', ') : 'none'}`);
console.log(`  armor missing:   ${missArmor.length ? missArmor.join(', ') : 'none'}`);
void ROOT;
