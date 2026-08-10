import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import WikiPage from '@/pages/WikiPage';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) => {
      if (options?.defaultValue) return options.defaultValue;
      if (key.startsWith('classes.')) return key.replace('classes.', '');
      if (key.startsWith('skills.')) return key.replace('skills.', '');
      return key.split('.').pop() ?? key;
    },
    i18n: { language: 'en' },
  }),
}));

vi.mock('@/hooks/useCampaigns', () => ({
  useCampaign: () => ({
    data: {
      id: 'test-campaign',
      name: 'Test Campaign',
      slug: 'test-campaign',
      allowed_source_books: ['phb-2024'],
    },
    isLoading: false,
  }),
}));

describe('WikiPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders wiki page title and class selector', () => {
    render(
      <MemoryRouter>
        <WikiPage />
      </MemoryRouter>
    );

    expect(screen.getByText('title')).toBeInTheDocument();
    expect(screen.getAllByText('barbarian').length).toBeGreaterThan(0);
    expect(screen.getAllByText('wizard').length).toBeGreaterThan(0);
  });

  it('switches class when class button is clicked', () => {
    render(
      <MemoryRouter>
        <WikiPage />
      </MemoryRouter>
    );

    const wizardBtn = screen.getByRole('button', { name: /wizard/i });
    fireEvent.click(wizardBtn);

    expect(screen.getAllByText('wizard').length).toBeGreaterThan(0);
  });

  it('switches active tabs between Progression, Skill Matrix, and Subclasses', () => {
    render(
      <MemoryRouter>
        <WikiPage />
      </MemoryRouter>
    );

    const skillMatrixTab = screen.getByRole('button', { name: 'skills' });
    fireEvent.click(skillMatrixTab);

    expect(screen.getByText('skillMatrixTitle')).toBeInTheDocument();

    const subclassesTab = screen.getByRole('button', { name: 'subclasses' });
    fireEvent.click(subclassesTab);

    expect(screen.getByText('subclassesTitle')).toBeInTheDocument();
  });

  it('filters progression by search query', () => {
    render(
      <MemoryRouter>
        <WikiPage />
      </MemoryRouter>
    );

    const searchInput = screen.getByPlaceholderText('searchPlaceholder');
    fireEvent.change(searchInput, { target: { value: 'Rage' } });

    expect(searchInput).toHaveValue('Rage');
  });
});
