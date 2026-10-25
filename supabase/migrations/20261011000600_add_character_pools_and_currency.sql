-- Uses spent from limited-use feature pools (rage, channel-divinity, ...), keyed by pool id; reset by rests.
alter table public.characters
  add column resource_pools_used jsonb not null default '{}';

-- Coin purse.
alter table public.characters
  add column currency jsonb not null default '{"cp":0,"sp":0,"ep":0,"gp":0,"pp":0}';
