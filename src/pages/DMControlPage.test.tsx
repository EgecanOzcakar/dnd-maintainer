import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import DMControlPage from '@/pages/DMControlPage';

const mockMutateHP = vi.fn();
const mockMutateRoll = vi.fn();
const mockMutateInit = vi.fn();

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/hooks/useCampaignContext', () => ({
  useCampaignContext: () => ({
    campaignId: 'camp-1',
    campaign: { id: 'camp-1', name: 'Test Campaign' },
  }),
}));

vi.mock('@/hooks/useCharacters', () => ({
  useCharacters: () => ({
    data: [
      {
        id: 'pc-1',
        name: 'Thorin Oakenshield',
        character_type: 'pc',
        class: 'fighter',
        level: 5,
        hit_points_max: 44,
        armor_class: 18,
      },
    ],
  }),
}));

vi.mock('@/hooks/usePartyState', () => ({
  usePartyState: () => ({
    data: {
      campaignId: 'camp-1',
      initiatives: { 'pc-1': 15 },
      hp: { 'pc-1': 35 },
      lastRolls: {
        'pc-1': { formula: '1d20', total: 17, rolls: [17], modifier: 0, timestamp: '2026-08-06T12:00:00Z' },
      },
    },
  }),
  useUpdatePartyHP: () => ({
    mutateAsync: mockMutateHP,
  }),
  useRecordCharacterRoll: () => ({
    mutateAsync: mockMutateRoll,
  }),
  useUpdateSharedImage: () => ({
    mutateAsync: vi.fn(),
  }),
}));

vi.mock('@/hooks/useBattleMap', () => ({
  useBattleMap: () => ({ data: { map: null, displayMode: 'image' } }),
  useSetDisplayMode: () => ({ mutate: vi.fn() }),
  useUpdateBattleMap: () => ({ mutate: vi.fn() }),
}));

vi.mock('@/hooks/usePartyInitiatives', () => ({
  usePartyInitiatives: () => ({
    data: { campaignId: 'camp-1', initiatives: { 'pc-1': 15 } },
  }),
  useUpdatePartyInitiatives: () => ({
    mutateAsync: mockMutateInit,
  }),
}));

vi.mock('@/hooks/usePartyCharacterStats', () => ({
  usePartyCharacterStats: () => ({
    data: {
      'pc-1': {
        characterId: 'pc-1',
        wisScore: 14,
        wisMod: 2,
        intScore: 12,
        intMod: 1,
        perceptionBonus: 4,
        passivePerception: 14,
        passiveWisdom: 12,
        passiveIntelligence: 11,
        perceptionProficient: true,
        perceptionExpertise: false,
      },
    },
  }),
}));

describe('DMControlPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders DM Control Console header and PC details', () => {
    render(
      <MemoryRouter initialEntries={['/campaign/test-campaign/dm']}>
        <Routes>
          <Route path="/campaign/:campaignSlug/dm" element={<DMControlPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('DM Control & Initiative Console')).toBeInTheDocument();
    expect(screen.getAllByText('Thorin Oakenshield').length).toBeGreaterThan(0);
    expect(screen.getByText('35 / 44 HP (80%)')).toBeInTheDocument();
    expect(screen.getByText('1d20 =')).toBeInTheDocument();
  });

  it('triggers HP adjustment when buttons are clicked', async () => {
    render(
      <MemoryRouter initialEntries={['/campaign/test-campaign/dm']}>
        <Routes>
          <Route path="/campaign/:campaignSlug/dm" element={<DMControlPage />} />
        </Routes>
      </MemoryRouter>
    );

    const minusFiveBtn = screen.getByText('-5');
    fireEvent.click(minusFiveBtn);

    expect(mockMutateHP).toHaveBeenCalledWith({
      campaignId: 'camp-1',
      hpMap: { 'pc-1': 30 },
    });
  });

  it('triggers full party heal when Heal All Party is clicked', async () => {
    render(
      <MemoryRouter initialEntries={['/campaign/test-campaign/dm']}>
        <Routes>
          <Route path="/campaign/:campaignSlug/dm" element={<DMControlPage />} />
        </Routes>
      </MemoryRouter>
    );

    const healAllBtn = screen.getByText('Heal All Party');
    fireEvent.click(healAllBtn);

    expect(mockMutateHP).toHaveBeenCalledWith({
      campaignId: 'camp-1',
      hpMap: { 'pc-1': 44 },
    });
  });

  it('renders perception, wisdom, and intelligence stats and triggers rolls', async () => {
    render(
      <MemoryRouter initialEntries={['/campaign/test-campaign/dm']}>
        <Routes>
          <Route path="/campaign/:campaignSlug/dm" element={<DMControlPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Party Perception, Wisdom & Intelligence Checks')).toBeInTheDocument();

    const rollPartyPerception = screen.getByRole('button', { name: /Roll Party Perception/i });
    fireEvent.click(rollPartyPerception);

    expect(mockMutateRoll).toHaveBeenCalledWith({
      campaignId: 'camp-1',
      characterId: 'pc-1',
      roll: expect.objectContaining({
        modifier: 4,
        label: 'Thorin Oakenshield - Perception Check',
      }),
    });
  });
});
