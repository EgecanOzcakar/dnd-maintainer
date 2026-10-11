-- Player-authored custom actions, attacks and spells (validated with Zod in the app).
alter table public.characters
  add column homebrew jsonb not null default '[]'::jsonb;
