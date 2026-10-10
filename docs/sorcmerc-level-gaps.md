# The level-table gaps sorcmerc found, and what it filled them with

Written by hand from `sorcmerc/tools/fill_levels.py`, which is the applied version
of this list.

## Status (2026-10-10): applied

Every row below is now in `src/lib/sources/`, using the ids listed here:

- **Class features and ASIs**: all applied. The fighter and rogue ASIs use the next
  free choice-key index per class, the same way sorcmerc did it.
- **Subclass tiers**: all applied, with one exception. `zealot-divine-fury` is not
  added as a separate feature, because Divine Fury was already modeled at level 3 as
  the `damage-choice` grant with `featureIdPrefix: 'zealot-divine-fury'`.
- **Wild Heart**: `wildheart-animal-speaker` and `wildheart-nature-speaker` join the
  existing level-3 and level-10 entries rather than adding new entries at those
  levels. `level-grants.ts` looks entries up with `.find(classLevel)`, so a second
  entry at the same level would be ignored.
- **Berserker**: tiers moved to Frenzy 3, Mindless Rage 6, Retaliation 10 and
  Intimidating Presence 14.

`docs/coverage-matrix.md` now reports classes 12/12 and subclasses 48/48 as
structurally complete. The caveat at the end of this file still holds: nothing here
has been checked against the book (`GOLDEN_VERIFIED` is still empty).

`docs/coverage-matrix.md` already reports the same shape from the other side:
classes 10/12 structurally complete, subclasses 20/48. The two partial classes
are the two below, and the 28 partial subclasses are the paths missing a late tier.

## Why sorcmerc could not simply take a re-export

`scripts/export-sorcmerc.mjs` (untracked here, as of this writing) writes into
`~/sorcmerc/data`. Measured 2026-09-22, a clean run of it **deletes** five spells
from the downstream catalog — `magic-missile`, `healing-word`, `shield`,
`eldritch-blast`, `vicious-mockery` — and two magic items,
`scroll-of-resurrection` and `scroll-of-identification`. Those were added
downstream and exist nowhere in this repo's sources. Until that is reconciled the
export is one-way, and sorcmerc's copy is authored by hand.

## Class features missing

| class   | level | feature id                        |
| ------- | ----- | --------------------------------- |
| cleric  | 14    | `cleric-improved-blessed-strikes` |
| fighter | 11    | `fighter-extra-attack-2`          |
| fighter | 13    | `fighter-indomitable-2`           |
| fighter | 13    | `fighter-studied-attacks`         |
| fighter | 17    | `fighter-action-surge-2`          |
| fighter | 17    | `fighter-indomitable-3`           |
| fighter | 20    | `fighter-extra-attack-3`          |
| rogue   | 11    | `rogue-reliable-talent`           |
| rogue   | 14    | `rogue-devious-strikes`           |
| rogue   | 15    | `rogue-slippery-mind`             |
| rogue   | 18    | `rogue-elusive`                   |
| rogue   | 20    | `rogue-stroke-of-luck`            |

## Ability Score Improvements missing

Every 2024 class takes an ASI at 4/8/12/16 and again at 19; the fighter and rogue
take extras at 6 and 10 respectively, which this repo already has. These are the
ones absent. Downstream they were given the next free choice-key index per class
rather than renumbering existing slots.

| class   | levels         |
| ------- | -------------- |
| fighter | 12, 14, 16, 19 |
| rogue   | 12, 16, 19     |

## Subclass tiers missing

| subclass          | class level | feature id                                  |
| ----------------- | ----------- | ------------------------------------------- |
| arcanetrickster   | 13          | `arcanetrickster-versatile-trickster`       |
| arcanetrickster   | 17          | `arcanetrickster-spell-thief`               |
| assassin          | 13          | `assassin-envenom-weapons`                  |
| assassin          | 17          | `assassin-death-strike`                     |
| beastmaster       | 11          | `beastmaster-bestial-fury`                  |
| beastmaster       | 15          | `beastmaster-share-spells`                  |
| circleland        | 14          | `circleland-natures-sanctuary`              |
| circlemoon        | 14          | `circlemoon-lunar-form`                     |
| circlesea         | 14          | `circlesea-oceanic-gift`                    |
| circlestars       | 14          | `circlestars-full-of-stars`                 |
| collegedance      | 14          | `collegedance-tandem-footwork`              |
| collegeglamour    | 14          | `collegeglamour-unbreakable-majesty`        |
| collegelore       | 14          | `collegelore-peerless-skill`                |
| collegevalor      | 14          | `collegevalor-battle-magic`                 |
| feywanderer       | 11          | `feywanderer-fey-reinforcements`            |
| feywanderer       | 15          | `feywanderer-misty-wanderer`                |
| gloomstalker      | 11          | `gloomstalker-stalkers-flurry`              |
| gloomstalker      | 15          | `gloomstalker-shadowy-dodge`                |
| hunter            | 11          | `hunter-superior-hunters-prey`              |
| hunter            | 15          | `hunter-superior-hunters-defense`           |
| lifedomain        | 17          | `lifedomain-supreme-healing`                |
| lightdomain       | 17          | `lightdomain-corona-of-light`               |
| soulknife         | 13          | `soulknife-psychic-veil`                    |
| soulknife         | 17          | `soulknife-rend-mind`                       |
| thief             | 13          | `thief-use-magic-device`                    |
| thief             | 17          | `thief-thiefs-reflexes`                     |
| trickerydomain    | 17          | `trickerydomain-improved-duplicity`         |
| wardomain         | 17          | `wardomain-avatar-of-battle`                |
| warriorofelements | 11          | `warriorofelements-stride-of-the-elements`  |
| warriorofelements | 17          | `warriorofelements-elemental-epitome`       |
| warriorofmercy    | 11          | `warriorofmercy-flurry-of-healing-and-harm` |
| warriorofmercy    | 17          | `warriorofmercy-hand-of-ultimate-mercy`     |
| warriorofshadow   | 11          | `warriorofshadow-improved-shadow-step`      |
| warriorofshadow   | 17          | `warriorofshadow-cloak-of-shadows`          |
| warrioropenhand   | 11          | `warrioropenhand-fleet-step`                |
| warrioropenhand   | 17          | `warrioropenhand-quivering-palm`            |
| wildheart         | 3           | `wildheart-animal-speaker`                  |
| wildheart         | 10          | `wildheart-nature-speaker`                  |
| wildheart         | 14          | `wildheart-power-of-the-wilds`              |
| worldtree         | 14          | `worldtree-travel-along-the-tree`           |
| zealot            | 3           | `zealot-divine-fury`                        |
| zealot            | 14          | `zealot-rage-of-the-gods`                   |

## One misplacement, not a gap

Path of the Berserker's tiers sit one rung early. The 2024 book puts Mindless Rage
at 6, Retaliation at 10 and Intimidating Presence at 14; `subclasses.ts` has
Mindless Rage sharing level 3 with Frenzy, Retaliation at 6 and Intimidating
Presence at 10. `coverage-matrix.ts` cannot see this — it checks that a tier
exists, never what the tier holds, which is the distinction its own header is
careful about.

| feature                           | here | should be |
| --------------------------------- | ---- | --------- |
| `berserker-mindless-rage`         | 3    | 6         |
| `berserker-retaliation`           | 6    | 10        |
| `berserker-intimidating-presence` | 10   | 14        |

## What this list is worth

The levels and names are the 2024 Player's Handbook progressions written from
knowledge of the book, not transcribed from a machine-readable source — there is
not one in either repo, which is why `GOLDEN_VERIFIED` here is empty. Treat every
row as a good lead that still wants a book check before it earns a golden mark.

Downstream these ids carry no mechanics: 307 of sorcmerc's 340 catalog features
have no effect entry, so a new id is listed on the sheet and read by nothing.
Applying them here costs the same authoring either way.
