-- Migration: stop anonymous callers from overwriting an existing campaign passphrase.
-- The app only calls set_campaign_passphrase right after creating a campaign, so the
-- function now refuses to touch a campaign that already has a passphrase. Changing or
-- clearing one needs a real auth model (see CLAUDE.md: no auth yet).

CREATE OR REPLACE FUNCTION public.set_campaign_passphrase(p_campaign_id uuid, p_passphrase text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_passphrase IS NULL OR trim(p_passphrase) = '' THEN
    RETURN false;
  END IF;

  UPDATE public.campaigns
  SET passphrase_hash = extensions.crypt(p_passphrase, extensions.gen_salt('bf', 8))
  WHERE id = p_campaign_id
    AND (passphrase_hash IS NULL OR passphrase_hash = '');

  RETURN FOUND;
END;
$$;

-- Rows created before is_demo existed came back null despite NOT NULL DEFAULT false.
UPDATE public.campaigns SET is_demo = false WHERE is_demo IS NULL;
