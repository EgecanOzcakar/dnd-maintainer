import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MagicItemsPage from '@/pages/MagicItemsPage';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts && 'count' in opts ? `${opts.count} items` : (key.split('.').pop() ?? key),
    i18n: { language: 'en' },
  }),
}));

vi.mock('@/hooks/usePageTitle', () => ({ usePageTitle: () => {} }));

const renderPage = () =>
  render(
    <MemoryRouter>
      <MagicItemsPage />
    </MemoryRouter>
  );

describe('MagicItemsPage', () => {
  it('renders the catalog', () => {
    renderPage();
    expect(screen.getByText('Bag of Holding')).toBeInTheDocument();
  });

  it('filters by search term', () => {
    renderPage();
    fireEvent.change(screen.getByPlaceholderText('searchPlaceholder'), { target: { value: 'bag of holding' } });
    expect(screen.getByText('Bag of Holding')).toBeInTheDocument();
    expect(screen.queryByText('Deck of Many Things')).not.toBeInTheDocument();
  });

  it('filters by rarity', () => {
    renderPage();
    // "Common" rarity chip — the t() mock renders the last key segment
    fireEvent.click(screen.getByRole('button', { name: 'common' }));
    // Every visible card should carry the Common badge; a known Legendary item should be gone
    expect(screen.queryByText('Deck of Many Things')).not.toBeInTheDocument();
  });

  it('shows the SRD attribution when toggled', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'attributionToggle' }));
    expect(screen.getByText(/System Reference Document 5\.2\.1/)).toBeInTheDocument();
  });
});
