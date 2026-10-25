import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { createEmptyMap } from '@/lib/battle-map';
import type { BattleMap } from '@/types/battle-map';
import { BattleMapEditor } from './BattleMapEditor';

const mockSave = vi.fn();
const baseMap = createEmptyMap('Test');

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/hooks/useBattleMap', () => ({
  useBattleMap: () => ({ data: { map: baseMap, displayMode: 'image' } }),
  useUpdateBattleMap: () => ({ mutate: mockSave, isPending: false }),
}));

// Only the editor's own state handling is under test; stub the children that need other hooks.
vi.mock('./TokenPalette', () => ({
  TokenPalette: ({
    tokens,
    onAddToken,
  }: {
    tokens: BattleMap['tokens'];
    onAddToken: (t: { kind: 'enemy'; name: string }) => void;
  }) => (
    <div>
      <button
        onClick={() => {
          // Three adds in the same tick, like "Add 3 goblins".
          onAddToken({ kind: 'enemy', name: 'Goblin 1' });
          onAddToken({ kind: 'enemy', name: 'Goblin 2' });
          onAddToken({ kind: 'enemy', name: 'Goblin 3' });
        }}
      >
        {'add-goblins'}
      </button>
      <ul>
        {tokens.map((tk) => (
          <li key={tk.id} data-testid="token">{`${tk.name}@${tk.x},${tk.y}`}</li>
        ))}
      </ul>
    </div>
  ),
}));
vi.mock('./BattleMapGrid', () => ({ BattleMapGrid: () => <div /> }));
vi.mock('./MapToolbar', () => ({
  MapToolbar: ({ onClear }: { onClear: () => void }) => <button onClick={onClear}>{'clear-map'}</button>,
}));
vi.mock('./MapFileControls', () => ({
  MapFileControls: ({ onImport }: { onImport: (m: BattleMap) => void }) => (
    <button onClick={() => onImport({ ...createEmptyMap('Imported') })}>{'import-map'}</button>
  ),
}));

describe('BattleMapEditor', () => {
  beforeEach(() => {
    mockSave.mockClear();
  });

  it('places several tokens added at once on different cells', async () => {
    render(<BattleMapEditor campaignId="c1" />);

    fireEvent.click(await screen.findByText('add-goblins'));

    await waitFor(() => expect(screen.getAllByTestId('token')).toHaveLength(3));
    expect(screen.getAllByTestId('token').map((el) => el.textContent)).toEqual([
      'Goblin 1@0,0',
      'Goblin 2@1,0',
      'Goblin 3@2,0',
    ]);
  });

  it('asks before clearing and keeps the map until confirmed', async () => {
    render(<BattleMapEditor campaignId="c1" />);
    fireEvent.click(await screen.findByText('add-goblins'));
    await waitFor(() => expect(screen.getAllByTestId('token')).toHaveLength(3));

    fireEvent.click(screen.getByText('clear-map'));
    expect(screen.getAllByTestId('token')).toHaveLength(3);

    await act(async () => {
      fireEvent.click(await screen.findByRole('button', { name: 'battleMap.clearMap' }));
    });
    expect(screen.queryAllByTestId('token')).toHaveLength(0);
  });

  it('saves the latest map once after a burst of edits', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<BattleMapEditor campaignId="c1" />);
    fireEvent.click(await screen.findByText('add-goblins'));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(mockSave).toHaveBeenCalledTimes(1);
    expect(mockSave.mock.calls[0][0].map.tokens).toHaveLength(3);
    vi.useRealTimers();
  });
});
