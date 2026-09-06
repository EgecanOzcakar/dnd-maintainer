import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  isDemoCampaign,
  getUnlockedCampaigns,
  isCampaignUnlocked,
  setCampaignUnlocked,
  lockCampaign,
  clearAllUnlockedCampaigns,
  verifyCampaignPassphrase,
  setCampaignPassphrase,
  CAMPAIGN_AUTH_STORAGE_KEY,
  DEMO_CAMPAIGN_ID,
} from '@/lib/campaign-auth';
import { supabase, mockQueryResult } from '@/test/mocks/supabase';

vi.mock('@/lib/supabase', () => import('@/test/mocks/supabase'));

describe('campaign-auth', () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockQueryResult.data = null;
    mockQueryResult.error = null;
    vi.clearAllMocks();
  });

  describe('isDemoCampaign', () => {
    it('returns true for campaign with is_demo = true', () => {
      expect(isDemoCampaign({ is_demo: true, id: '123' })).toBe(true);
    });

    it('returns true for campaign with demo UUID', () => {
      expect(isDemoCampaign({ id: DEMO_CAMPAIGN_ID })).toBe(true);
    });

    it('returns true for campaign named "Demo Campaign" case-insensitively', () => {
      expect(isDemoCampaign({ name: 'Demo Campaign' })).toBe(true);
      expect(isDemoCampaign({ name: 'demo campaign' })).toBe(true);
      expect(isDemoCampaign({ name: '  DEMO CAMPAIGN  ' })).toBe(true);
    });

    it('returns true for campaign with slug demo-campaign', () => {
      expect(isDemoCampaign({ slug: 'demo-campaign' })).toBe(true);
      expect(isDemoCampaign({ slug: 'demo-campaign-aaaaaaaa' })).toBe(true);
    });

    it('returns false for null or normal campaigns', () => {
      expect(isDemoCampaign(null)).toBe(false);
      expect(isDemoCampaign(undefined)).toBe(false);
      expect(isDemoCampaign({ name: 'Curse of Strahd', slug: 'curse-of-strahd' })).toBe(false);
    });
  });

  describe('localStorage unlock state', () => {
    it('returns empty set if storage is empty or contains invalid JSON', () => {
      expect(getUnlockedCampaigns().size).toBe(0);
      window.localStorage.setItem(CAMPAIGN_AUTH_STORAGE_KEY, 'invalid-json');
      expect(getUnlockedCampaigns().size).toBe(0);
    });

    it('sets and checks unlocked campaigns', () => {
      expect(isCampaignUnlocked('campaign-1')).toBe(false);
      setCampaignUnlocked('campaign-1', 'slug-1');

      expect(isCampaignUnlocked('campaign-1')).toBe(true);
      expect(isCampaignUnlocked('slug-1')).toBe(true);
      expect(isCampaignUnlocked('campaign-2')).toBe(false);
    });

    it('locks a specific campaign', () => {
      setCampaignUnlocked('campaign-1', 'campaign-2');
      expect(isCampaignUnlocked('campaign-1')).toBe(true);
      expect(isCampaignUnlocked('campaign-2')).toBe(true);

      lockCampaign('campaign-1');
      expect(isCampaignUnlocked('campaign-1')).toBe(false);
      expect(isCampaignUnlocked('campaign-2')).toBe(true);
    });

    it('clears all unlocked campaigns', () => {
      setCampaignUnlocked('campaign-1', 'campaign-2');
      clearAllUnlockedCampaigns();

      expect(isCampaignUnlocked('campaign-1')).toBe(false);
      expect(isCampaignUnlocked('campaign-2')).toBe(false);
    });
  });

  describe('RPC functions', () => {
    it('verifyCampaignPassphrase calls supabase.rpc and returns boolean', async () => {
      mockQueryResult.data = true;
      const result = await verifyCampaignPassphrase('my-campaign', 'secret');
      expect(result).toBe(true);
      expect(supabase.rpc).toHaveBeenCalledWith('verify_campaign_passphrase', {
        campaign_slug: 'my-campaign',
        candidate_passphrase: 'secret',
      });
    });

    it('setCampaignPassphrase calls supabase.rpc and returns boolean', async () => {
      mockQueryResult.data = true;
      const result = await setCampaignPassphrase('1234-5678', 'new-secret');
      expect(result).toBe(true);
      expect(supabase.rpc).toHaveBeenCalledWith('set_campaign_passphrase', {
        p_campaign_id: '1234-5678',
        p_passphrase: 'new-secret',
      });
    });

    it('throws error when RPC returns an error', async () => {
      mockQueryResult.error = new Error('RPC error');
      await expect(verifyCampaignPassphrase('my-campaign', 'wrong')).rejects.toThrow('RPC error');
    });
  });
});
