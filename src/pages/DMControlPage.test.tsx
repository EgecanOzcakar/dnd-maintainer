import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import DMControlPage from '@/pages/DMControlPage';

const mockMutateHP = vi.fn();
const mockMutateRoll = vi.fn();
const mockMutateInit = vi.fn();

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { current?: number; max?: number; percent?: number }) =>
      key === 'dmControl.hpLine' ? `${opts?.current} / ${opts?.max} HP (${opts?.percent}%)` : key,
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

vi.mock('@/hooks/usePartyNpcs', () => ({
  usePartyNpcs: () => ({ data: [] }),
  useUpdatePartyNpcs: () => ({ mutateAsync: vi.fn(), isPending: false }),
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
        initiativeBonus: 3,
      },
    },
  }),
}));

// The confirm button inside an open dialog shares its label with the trigger; it renders last.
const lastByText = (text: string) => {
  const all = screen.getAllByText(text);
  return all[all.length - 1];
};

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

    expect(screen.getByText('dmControl.title')).toBeInTheDocument();
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

    fireEvent.click(screen.getByText('dmControl.healAll'));
    // Heal All is destructive for any tracked damage, so it asks first.
    expect(mockMutateHP).not.toHaveBeenCalled();
    fireEvent.click(lastByText('dmControl.healAll'));

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

    expect(screen.getByText('dmControl.checksTitle')).toBeInTheDocument();

    const rollPartyPerception = screen.getByRole('button', { name: /dmControl.rollPerception/i });
    fireEvent.click(rollPartyPerception);

    expect(mockMutateRoll).toHaveBeenCalledWith({
      campaignId: 'camp-1',
      characterId: 'pc-1',
      roll: expect.objectContaining({
        modifier: 4,
        label: 'dmControl.checkLabel',
      }),
    });
  });

  const renderPage = () =>
    render(
      <MemoryRouter initialEntries={['/campaign/test-campaign/dm']}>
        <Routes>
          <Route path="/campaign/:campaignSlug/dm" element={<DMControlPage />} />
        </Routes>
      </MemoryRouter>
    );

  it('commits a typed HP value on blur, not on every keystroke', async () => {
    const user = userEvent.setup();
    renderPage();

    const input = screen.getByLabelText('dmControl.setHpFor');
    await user.clear(input);
    await user.type(input, '12');
    expect(mockMutateHP).not.toHaveBeenCalled();

    await user.tab();
    expect(mockMutateHP).toHaveBeenCalledTimes(1);
    expect(mockMutateHP).toHaveBeenCalledWith({ campaignId: 'camp-1', hpMap: { 'pc-1': 12 } });
  });

  it('clamps a typed HP value to max HP', async () => {
    const user = userEvent.setup();
    renderPage();

    const input = screen.getByLabelText('dmControl.setHpFor');
    await user.clear(input);
    await user.type(input, '999{Enter}');

    expect(mockMutateHP).toHaveBeenCalledWith({ campaignId: 'camp-1', hpMap: { 'pc-1': 44 } });
  });

  it('adds the initiative modifier to the party initiative roll', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5); // d20 -> 11
    renderPage();

    fireEvent.click(screen.getByText('dmControl.rollInitiative'));

    expect(mockMutateInit).toHaveBeenCalledWith({ campaignId: 'camp-1', initiatives: { 'pc-1': 14 } });
  });

  it('asks before resetting initiatives', () => {
    renderPage();

    fireEvent.click(screen.getByText('dmControl.resetInitiatives'));
    expect(mockMutateInit).not.toHaveBeenCalled();
    fireEvent.click(lastByText('dmControl.resetInitiatives'));

    expect(mockMutateInit).toHaveBeenCalledWith({ campaignId: 'camp-1', initiatives: {} });
  });
});
