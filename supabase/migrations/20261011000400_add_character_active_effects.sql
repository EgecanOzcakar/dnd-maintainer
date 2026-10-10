-- Toggled active effects (rage, bless, haste, ...) that adjust AC, speed and rolls; cleared on a long rest.
alter table public.characters
  add column active_effects text[] not null default '{}';
