-- Hit point tracking: single source of truth for current HP, temp HP and death saves.
-- current_hp NULL means "at max".
ALTER TABLE characters
  ADD COLUMN IF NOT EXISTS current_hp integer NULL,
  ADD COLUMN IF NOT EXISTS temp_hp integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS death_saves jsonb NOT NULL DEFAULT '{"successes":0,"failures":0}'::jsonb;
