-- Daily spell preparation: the spell ids a character has prepared (empty = fall back to known spells).
alter table public.characters
  add column prepared_spells text[] not null default '{}';
