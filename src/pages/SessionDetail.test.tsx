import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { createWrapper } from '@/test/wrapper';
import SessionDetail from '@/pages/SessionDetail';

const mockUpdate = vi.fn().mockResolvedValue({});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

// The loaded row carries columns the form must never write back (loot, notes, ids, timestamps).
const session = {
  id: 's1',
  slug: 'the-goblin-ambush',
  campaign_id: 'c1',
  name: 'The Goblin Ambush',
  session_number: 3,
  date: '2026-02-01',
  summary: 'They fought.',
  experience_awarded: 100,
  notes: 'secret plan',
  loot: [{ id: 'l1', item_name: 'Sword', quantity: 1, gold_value: 10, awarded_to: '' }],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

vi.mock('@/hooks/useSessions', () => ({
  useSession: () => ({ data: session, isLoading: false, error: null }),
  useUpdateSession: () => ({ mutateAsync: mockUpdate }),
}));

vi.mock('@/hooks/usePageTitle', () => ({ usePageTitle: vi.fn() }));

vi.mock('@/hooks/useEncounters', () => ({
  useSessionEncounters: () => ({ data: [] }),
}));

vi.mock('@/lib/supabase', () => import('@/test/mocks/supabase'));

function renderPage() {
  const Wrapper = createWrapper();
  return render(
    <Wrapper>
      <MemoryRouter initialEntries={['/campaign/c/session/the-goblin-ambush']}>
        <Routes>
          <Route path="/campaign/:campaignSlug/session/:sessionSlug" element={<SessionDetail />} />
        </Routes>
      </MemoryRouter>
    </Wrapper>
  );
}

describe('SessionDetail autosave', () => {
  beforeEach(() => {
    mockUpdate.mockClear();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('saves only the edited field, never the whole row (loot, notes, ids)', async () => {
    renderPage();

    fireEvent.change(screen.getByLabelText('sessionDetail.title'), { target: { value: 'Ambush at Dawn' } });
    fireEvent.change(screen.getByLabelText('sessionDetail.xpAwarded'), { target: { value: '250' } });
    expect(mockUpdate).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3100);
    });

    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockUpdate).toHaveBeenCalledWith({ id: 's1', name: 'Ambush at Dawn', experience_awarded: 250 });
  });

  it('saves DM notes on their own', async () => {
    renderPage();

    fireEvent.change(screen.getByLabelText('sessionDetail.dmNotes'), { target: { value: 'new plan ' } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3100);
    });

    expect(mockUpdate).toHaveBeenCalledWith({ id: 's1', notes: 'new plan' });
  });

  it('flushes a pending edit when leaving the page', () => {
    const { unmount } = renderPage();

    fireEvent.change(screen.getByLabelText('sessionDetail.summary'), { target: { value: 'Rewritten' } });
    expect(mockUpdate).not.toHaveBeenCalled();

    unmount();

    expect(mockUpdate).toHaveBeenCalledWith({ id: 's1', summary: 'Rewritten' });
  });
});
