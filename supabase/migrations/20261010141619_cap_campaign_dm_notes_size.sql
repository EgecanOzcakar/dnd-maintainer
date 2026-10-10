-- Migration: cap campaigns.dm_notes size.
-- dm_notes doubles as shared party state and is polled every 2s by every client. A 4.6 MB
-- inline scene image there once pushed every anon query past its statement timeout, so
-- character saves failed app-wide. Images belong in storage; dm_notes holds only URLs.
ALTER TABLE public.campaigns
  ADD CONSTRAINT campaigns_dm_notes_size CHECK (octet_length(dm_notes) <= 262144) NOT VALID;
