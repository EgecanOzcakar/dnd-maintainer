import { supabase } from '@/lib/supabase';
import { getLogger } from '@/lib/logger';

const logger = getLogger('campaign-auth');

export const CAMPAIGN_AUTH_STORAGE_KEY = 'dnd_unlocked_campaigns';

export const DEMO_CAMPAIGN_ID = 'aaaaaaaa-0000-4000-8000-000000000001';

/**
 * Checks if a campaign is the open demo campaign that requires no passphrase.
 */
export function isDemoCampaign(
  campaign?: {
    is_demo?: boolean;
    id?: string;
    name?: string;
    slug?: string;
  } | null
): boolean {
  if (!campaign) return false;
  if (campaign.is_demo === true) return true;
  if (campaign.id === DEMO_CAMPAIGN_ID) return true;
  if (campaign.name?.trim().toLowerCase() === 'demo campaign') return true;
  if (campaign.slug === 'demo-campaign' || campaign.slug?.startsWith('demo-campaign-')) return true;
  return false;
}

/**
 * Retrieves the set of currently unlocked campaign identifiers from localStorage.
 */
export function getUnlockedCampaigns(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(CAMPAIGN_AUTH_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return new Set(parsed.map(String));
    }
  } catch (err) {
    logger.warn('Failed to parse unlocked campaigns from storage:', err);
  }
  return new Set();
}

/**
 * Checks whether a given campaign (by ID or slug) has already been unlocked in this browser.
 */
export function isCampaignUnlocked(identifier?: string | null): boolean {
  if (!identifier) return false;
  const unlocked = getUnlockedCampaigns();
  return unlocked.has(identifier);
}

/**
 * Marks a campaign as unlocked in localStorage.
 * Accepts multiple identifiers (e.g. ID and slug) so either will match.
 */
export function setCampaignUnlocked(...identifiers: (string | undefined | null)[]): void {
  if (typeof window === 'undefined') return;
  const valid = identifiers.filter((id): id is string => Boolean(id && id.trim()));
  if (valid.length === 0) return;

  try {
    const set = getUnlockedCampaigns();
    for (const id of valid) {
      set.add(id);
    }
    window.localStorage.setItem(CAMPAIGN_AUTH_STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch (err) {
    logger.warn('Failed to save unlocked campaign to storage:', err);
  }
}

/**
 * Removes a campaign's unlocked status from localStorage.
 */
export function lockCampaign(...identifiers: (string | undefined | null)[]): void {
  if (typeof window === 'undefined') return;
  const valid = identifiers.filter((id): id is string => Boolean(id && id.trim()));
  if (valid.length === 0) return;

  try {
    const set = getUnlockedCampaigns();
    for (const id of valid) {
      set.delete(id);
    }
    window.localStorage.setItem(CAMPAIGN_AUTH_STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch (err) {
    logger.warn('Failed to remove unlocked campaign from storage:', err);
  }
}

/**
 * Clears all unlocked campaigns from localStorage.
 */
export function clearAllUnlockedCampaigns(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(CAMPAIGN_AUTH_STORAGE_KEY);
  } catch (err) {
    logger.warn('Failed to clear unlocked campaigns from storage:', err);
  }
}

/**
 * Calls the Supabase RPC function to verify a passphrase against the campaign's crypt hash.
 */
export async function verifyCampaignPassphrase(
  campaignSlug: string,
  candidatePassphrase: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc('verify_campaign_passphrase', {
    campaign_slug: campaignSlug,
    candidate_passphrase: candidatePassphrase,
  });

  if (error) {
    logger.error('Failed to verify campaign passphrase:', error);
    throw error;
  }

  return Boolean(data);
}

/**
 * Calls the Supabase RPC function to set/update a campaign's passphrase.
 */
export async function setCampaignPassphrase(
  campaignId: string,
  newPassphrase: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc('set_campaign_passphrase', {
    p_campaign_id: campaignId,
    p_passphrase: newPassphrase,
  });

  if (error) {
    logger.error('Failed to set campaign passphrase:', error);
    throw error;
  }

  return Boolean(data);
}
