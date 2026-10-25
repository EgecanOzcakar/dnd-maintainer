-- Player-approved or hand-written roll/AC/resistance modifiers (from magic items or keyword suggestions).
alter table public.characters
  add column custom_modifiers jsonb not null default '[]';
