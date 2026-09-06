import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CampaignAuthGate } from '@/components/CampaignAuthGate';
import { CAMPAIGN_AUTH_STORAGE_KEY, setCampaignUnlocked } from '@/lib/campaign-auth';
import type { Campaign } from '@/types/database';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const mockVerify = vi.fn();
vi.mock('@/lib/campaign-auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/campaign-auth')>();
  return {
    ...actual,
    verifyCampaignPassphrase: (...args: unknown[]) => mockVerify(...args),
  };
});

const mockDemoCampaign: Campaign = {
  id: 'aaaaaaaa-0000-4000-8000-000000000001',
  slug: 'demo-campaign',
  previous_slugs: [],
  name: 'Demo Campaign',
  description: 'Public demo campaign',
  setting: 'Faerun',
  status: 'active',
  theme: null,
  allowed_source_books: [],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  is_demo: true,
};

const mockProtectedCampaign: Campaign = {
  id: 'bbbbbbbb-1111-4000-8000-000000000002',
  slug: 'curse-of-strahd',
  previous_slugs: [],
  name: 'Curse of Strahd',
  description: 'Gothic horror',
  setting: 'Barovia',
  status: 'active',
  theme: null,
  allowed_source_books: [],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  is_demo: false,
};

describe('CampaignAuthGate', () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockVerify.mockReset();
    vi.clearAllMocks();
  });

  it('renders children immediately for the Demo Campaign without asking for passphrase', () => {
    render(
      <MemoryRouter>
        <CampaignAuthGate campaign={mockDemoCampaign} campaignSlug={mockDemoCampaign.slug}>
          <div data-testid="campaign-content">Welcome to the adventure!</div>
        </CampaignAuthGate>
      </MemoryRouter>
    );

    expect(screen.getByTestId('campaign-content')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('auth.passphrasePlaceholder')).not.toBeInTheDocument();
  });

  it('renders children immediately if the campaign was previously unlocked in storage', () => {
    setCampaignUnlocked(mockProtectedCampaign.id);

    render(
      <MemoryRouter>
        <CampaignAuthGate campaign={mockProtectedCampaign} campaignSlug={mockProtectedCampaign.slug}>
          <div data-testid="campaign-content">Unlocked Content</div>
        </CampaignAuthGate>
      </MemoryRouter>
    );

    expect(screen.getByTestId('campaign-content')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('auth.passphrasePlaceholder')).not.toBeInTheDocument();
  });

  it('renders passphrase prompt for a locked non-demo campaign', () => {
    render(
      <MemoryRouter>
        <CampaignAuthGate campaign={mockProtectedCampaign} campaignSlug={mockProtectedCampaign.slug}>
          <div data-testid="campaign-content">Secret Content</div>
        </CampaignAuthGate>
      </MemoryRouter>
    );

    expect(screen.queryByTestId('campaign-content')).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText('auth.passphrasePlaceholder')).toBeInTheDocument();
    expect(screen.getByText('Curse of Strahd')).toBeInTheDocument();
  });

  it('displays error if wrong passphrase is submitted', async () => {
    mockVerify.mockResolvedValueOnce(false);

    render(
      <MemoryRouter>
        <CampaignAuthGate campaign={mockProtectedCampaign} campaignSlug={mockProtectedCampaign.slug}>
          <div data-testid="campaign-content">Secret Content</div>
        </CampaignAuthGate>
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText('auth.passphrasePlaceholder');
    fireEvent.change(input, { target: { value: 'wrong-password' } });

    const submitBtn = screen.getByText('buttons.unlock');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('auth.incorrectPassphrase')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('campaign-content')).not.toBeInTheDocument();
  });

  it('unlocks and displays children when correct passphrase is submitted', async () => {
    mockVerify.mockResolvedValueOnce(true);

    render(
      <MemoryRouter>
        <CampaignAuthGate campaign={mockProtectedCampaign} campaignSlug={mockProtectedCampaign.slug}>
          <div data-testid="campaign-content">Secret Content</div>
        </CampaignAuthGate>
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText('auth.passphrasePlaceholder');
    fireEvent.change(input, { target: { value: 'correct-secret' } });

    const submitBtn = screen.getByText('buttons.unlock');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByTestId('campaign-content')).toBeInTheDocument();
    });

    // Check that it's now stored in localStorage
    const saved = JSON.parse(window.localStorage.getItem(CAMPAIGN_AUTH_STORAGE_KEY) || '[]');
    expect(saved).toContain(mockProtectedCampaign.id);
  });
});
