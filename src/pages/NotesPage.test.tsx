import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { createWrapper } from '@/test/wrapper';
import { supabase, mockQueryResult } from '@/test/mocks/supabase';
import NotesPage from '@/pages/NotesPage';

vi.mock('@/lib/supabase', () => import('@/test/mocks/supabase'));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/hooks/useCampaignContext', () => ({
  useCampaignContext: () => ({ campaignId: 'camp-1', campaignSlug: 'camp', setPageTitle: vi.fn() }),
}));

const note = {
  id: 'n1',
  campaign_id: 'camp-1',
  title: 'Old ruins',
  content: 'Dusty',
  category: 'lore',
  tags: ['map'],
  is_pinned: false,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

function renderPage() {
  const Wrapper = createWrapper();
  return render(
    <Wrapper>
      <MemoryRouter>
        <NotesPage />
      </MemoryRouter>
    </Wrapper>
  );
}

describe('NotesPage', () => {
  beforeEach(() => {
    mockQueryResult.data = [note];
    mockQueryResult.error = null;
    vi.mocked(supabase.update).mockClear();
    vi.mocked(supabase.eq).mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('pins a note by id without opening the editor', async () => {
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'notes.togglePin' }));

    await waitFor(() => expect(supabase.update).toHaveBeenCalledWith({ is_pinned: true }));
    expect(supabase.eq).toHaveBeenCalledWith('id', 'n1');
  });

  it('autosaves only the changed field, with tags as an array and the pin mapped to is_pinned', async () => {
    renderPage();
    fireEvent.click(await screen.findByText('buttons.edit'));

    vi.useFakeTimers({ shouldAdvanceTime: true });
    fireEvent.change(screen.getByLabelText('notes.fields.tagsCommaSeparated'), { target: { value: 'map, secret,' } });
    fireEvent.click(screen.getByLabelText('notes.fields.pinNote'));
    expect(supabase.update).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1100);
    });

    // One merged patch: nothing is sent for the untouched title / content / category.
    expect(supabase.update).toHaveBeenCalledTimes(1);
    expect(supabase.update).toHaveBeenCalledWith({ tags: ['map', 'secret'], is_pinned: true });
    expect(supabase.eq).toHaveBeenCalledWith('id', 'n1');
  });

  it('flushes a pending edit when the editor is closed', async () => {
    renderPage();
    fireEvent.click(await screen.findByText('buttons.edit'));

    fireEvent.change(screen.getByLabelText('notes.fields.content'), { target: { value: 'Freshly dug up' } });
    expect(supabase.update).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('buttons.cancel'));

    await waitFor(() => expect(supabase.update).toHaveBeenCalledWith({ content: 'Freshly dug up' }));
  });

  it('never autosaves an empty title', async () => {
    renderPage();
    fireEvent.click(await screen.findByText('buttons.edit'));

    vi.useFakeTimers({ shouldAdvanceTime: true });
    fireEvent.change(screen.getByLabelText('notes.fields.titleRequired'), { target: { value: '   ' } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1100);
    });

    expect(supabase.update).not.toHaveBeenCalled();
  });
});
