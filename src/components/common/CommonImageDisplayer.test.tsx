import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CommonImageDisplayer, PRESET_SCENE_IMAGES } from './CommonImageDisplayer';

const mockMutateSharedImage = vi.fn();

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/hooks/usePartyState', () => ({
  usePartyState: () => ({
    data: {
      campaignId: 'camp-1',
      displayImage: null,
    },
  }),
  useUpdateSharedImage: () => ({
    mutateAsync: mockMutateSharedImage,
  }),
}));

describe('CommonImageDisplayer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders header title and placeholder state when no image active', () => {
    render(<CommonImageDisplayer campaignId="camp-1" />);

    expect(screen.getByText('Common Image Displayer')).toBeInTheDocument();
    expect(screen.getByText('No Image Currently Displayed')).toBeInTheDocument();
    expect(screen.getByText('Select Image')).toBeInTheDocument();
  });

  it('opens image picker and allows selecting a preset image', async () => {
    render(<CommonImageDisplayer campaignId="camp-1" />);

    const selectBtn = screen.getByText('Select Image');
    fireEvent.click(selectBtn);

    expect(screen.getByText('Preset Campaign Scenes')).toBeInTheDocument();
    expect(screen.getByText(PRESET_SCENE_IMAGES[0].name)).toBeInTheDocument();

    const presetBtn = screen.getByText(PRESET_SCENE_IMAGES[0].name);
    fireEvent.click(presetBtn);

    expect(mockMutateSharedImage).toHaveBeenCalledWith({
      campaignId: 'camp-1',
      image: {
        url: PRESET_SCENE_IMAGES[0].url,
        title: PRESET_SCENE_IMAGES[0].name,
        caption: PRESET_SCENE_IMAGES[0].category,
      },
    });
  });

  it('allows loading a custom image URL', async () => {
    render(<CommonImageDisplayer campaignId="camp-1" />);

    fireEvent.click(screen.getByText('Select Image'));

    const urlInput = screen.getByPlaceholderText('https://example.com/image.png');
    const titleInput = screen.getByPlaceholderText('Title (optional)');

    fireEvent.change(urlInput, { target: { value: 'https://example.com/map.jpg' } });
    fireEvent.change(titleInput, { target: { value: 'Dungeon Map' } });

    fireEvent.click(screen.getByText('Load'));

    expect(mockMutateSharedImage).toHaveBeenCalledWith({
      campaignId: 'camp-1',
      image: {
        url: 'https://example.com/map.jpg',
        title: 'Dungeon Map',
      },
    });
  });
});
