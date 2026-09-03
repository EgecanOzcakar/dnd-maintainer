-- Migration: campaign passphrase authentication and demo campaign flag
-- Description: Adds `is_demo` and `passphrase_hash` to campaigns table,
-- along with secure verification and hashing RPC functions.

-- Enable pgcrypto for crypt() and gen_salt()
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Add is_demo and passphrase_hash columns to campaigns table
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS passphrase_hash text;

COMMENT ON COLUMN public.campaigns.is_demo IS
  'True if this is the open demo campaign accessible without a passphrase.';

COMMENT ON COLUMN public.campaigns.passphrase_hash IS
  'Blowfish/bcrypt crypt hash of the campaign passphrase. Never exposed via public columns.';

-- Mark demo campaign as is_demo = true
UPDATE public.campaigns
SET is_demo = true
WHERE id = 'aaaaaaaa-0000-4000-8000-000000000001' OR lower(name) = 'demo campaign';

-- Computed column to check if a campaign has a passphrase set without leaking the hash
CREATE OR REPLACE FUNCTION public.has_passphrase(c public.campaigns)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT c.passphrase_hash IS NOT NULL AND c.passphrase_hash <> '';
$$;

GRANT EXECUTE ON FUNCTION public.has_passphrase(public.campaigns) TO anon, authenticated;

-- Function to set/update a campaign's passphrase
CREATE OR REPLACE FUNCTION public.set_campaign_passphrase(p_campaign_id uuid, p_passphrase text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_passphrase IS NULL OR trim(p_passphrase) = '' THEN
    UPDATE public.campaigns
    SET passphrase_hash = NULL
    WHERE id = p_campaign_id;
  ELSE
    UPDATE public.campaigns
    SET passphrase_hash = extensions.crypt(p_passphrase, extensions.gen_salt('bf', 8))
    WHERE id = p_campaign_id;
  END IF;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_campaign_passphrase(uuid, text) TO anon, authenticated;

-- Function to verify candidate passphrase for a campaign
CREATE OR REPLACE FUNCTION public.verify_campaign_passphrase(campaign_slug text, candidate_passphrase text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  c_is_demo boolean;
  c_hash text;
BEGIN
  SELECT is_demo, passphrase_hash INTO c_is_demo, c_hash
  FROM public.campaigns
  WHERE slug = campaign_slug OR campaign_slug = ANY(previous_slugs)
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Demo campaigns are always accessible without passphrase
  IF c_is_demo THEN
    RETURN true;
  END IF;

  -- If non-demo and no passphrase has been set yet, deny access
  IF c_hash IS NULL OR c_hash = '' THEN
    RETURN false;
  END IF;

  -- Verify candidate passphrase against stored crypt hash
  RETURN c_hash = extensions.crypt(candidate_passphrase, c_hash);
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_campaign_passphrase(text, text) TO anon, authenticated;
