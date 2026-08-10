import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { PlayerDiceRollOverlay } from './PlayerDiceRollOverlay';
import * as usePartyStateModule from '@/hooks/usePartyState';
import * as useCharactersModule from '@/hooks/useCharacters';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/hooks/usePartyState', () => ({
  usePartyState: vi.fn(),
}));

vi.mock('@/hooks/useCharacters', () => ({
  useCharacters: vi.fn(),
}));

describe('PlayerDiceRollOverlay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders player character roll with dice in action animation and final result', () => {
    vi.spyOn(useCharactersModule, 'useCharacters').mockReturnValue({
      data: [
        {
          id: 'pc-1',
          name: 'Thorin',
          character_type: 'pc',
          class: 'Fighter',
          level: 5,
          hit_points_max: 40,
          armor_class: 18,
        },
      ],
    } as any);

    vi.spyOn(usePartyStateModule, 'usePartyState').mockReturnValue({
      data: {
        campaignId: 'camp-1',
        initiatives: {},
        hp: {},
        lastRolls: {
          'pc-1': {
            formula: '1d20+3',
            total: 18,
            rolls: [15],
            modifier: 3,
            label: 'Attack: Unarmed Strike (+5)',
            timestamp: new Date().toISOString(),
          },
        },
        updatedAt: new Date().toISOString(),
      },
    } as any);

    render(<PlayerDiceRollOverlay campaignId="camp-1" />);

    // Check overlay element
    expect(screen.getByRole('region', { name: 'Player Dice Roll Notification' })).toBeInTheDocument();
    expect(screen.getByText('Thorin')).toBeInTheDocument();
    expect(screen.getByText('d20')).toBeInTheDocument();
    expect(screen.getByText('Attack: Unarmed Strike (+5)')).toBeInTheDocument();
    expect(screen.getByText('1d20+3')).toBeInTheDocument();

    // Advance timer past initial 600ms tumbling animation
    act(() => {
      vi.advanceTimersByTime(650);
    });

    expect(screen.getByText('18')).toBeInTheDocument();
    expect(screen.getByText('[15] + 3')).toBeInTheDocument();
  });

  it('highlights Nat 20 critical rolls', () => {
    vi.spyOn(useCharactersModule, 'useCharacters').mockReturnValue({
      data: [
        {
          id: 'pc-1',
          name: 'Gimli',
          character_type: 'pc',
        },
      ],
    } as any);

    vi.spyOn(usePartyStateModule, 'usePartyState').mockReturnValue({
      data: {
        campaignId: 'camp-1',
        initiatives: {},
        hp: {},
        lastRolls: {
          'pc-1': {
            formula: '1d20+5',
            total: 25,
            rolls: [20],
            modifier: 5,
            timestamp: new Date().toISOString(),
          },
        },
        updatedAt: new Date().toISOString(),
      },
    } as any);

    render(<PlayerDiceRollOverlay campaignId="camp-1" />);

    act(() => {
      vi.advanceTimersByTime(650);
    });

    expect(screen.getByText('Nat 20!')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
  });

  it('highlights Nat 1 critical failures', () => {
    vi.spyOn(useCharactersModule, 'useCharacters').mockReturnValue({
      data: [
        {
          id: 'pc-1',
          name: 'Legolas',
          character_type: 'pc',
        },
      ],
    } as any);

    vi.spyOn(usePartyStateModule, 'usePartyState').mockReturnValue({
      data: {
        campaignId: 'camp-1',
        initiatives: {},
        hp: {},
        lastRolls: {
          'pc-1': {
            formula: '1d20+7',
            total: 8,
            rolls: [1],
            modifier: 7,
            timestamp: new Date().toISOString(),
          },
        },
        updatedAt: new Date().toISOString(),
      },
    } as any);

    render(<PlayerDiceRollOverlay campaignId="camp-1" />);

    act(() => {
      vi.advanceTimersByTime(650);
    });

    expect(screen.getByText('Nat 1!')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
  });

  it('ignores non-PC / Dungeon Master rolls', () => {
    vi.spyOn(useCharactersModule, 'useCharacters').mockReturnValue({
      data: [
        {
          id: 'npc-1',
          name: 'Goblin Chief',
          character_type: 'npc',
        },
      ],
    } as any);

    vi.spyOn(usePartyStateModule, 'usePartyState').mockReturnValue({
      data: {
        campaignId: 'camp-1',
        initiatives: {},
        hp: {},
        lastRolls: {
          'npc-1': {
            formula: '1d20+2',
            total: 14,
            rolls: [12],
            modifier: 2,
            timestamp: new Date().toISOString(),
          },
        },
        updatedAt: new Date().toISOString(),
      },
    } as any);

    render(<PlayerDiceRollOverlay campaignId="camp-1" />);

    // Since the character is an NPC (DM roll), no overlay region should be rendered
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });

  it('dismisses manually when close button is clicked', () => {
    vi.spyOn(useCharactersModule, 'useCharacters').mockReturnValue({
      data: [
        {
          id: 'pc-1',
          name: 'Bilbo',
          character_type: 'pc',
        },
      ],
    } as any);

    vi.spyOn(usePartyStateModule, 'usePartyState').mockReturnValue({
      data: {
        campaignId: 'camp-1',
        initiatives: {},
        hp: {},
        lastRolls: {
          'pc-1': {
            formula: '1d20',
            total: 12,
            rolls: [12],
            modifier: 0,
            timestamp: new Date().toISOString(),
          },
        },
        updatedAt: new Date().toISOString(),
      },
    } as any);

    render(<PlayerDiceRollOverlay campaignId="camp-1" />);

    expect(screen.getByRole('region')).toBeInTheDocument();

    const closeBtn = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeBtn);

    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });
});
