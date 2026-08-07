import React, { useState, useEffect } from 'react';
import { Image as ImageIcon, Maximize2, Upload, Trash2, Link as LinkIcon, Sparkles, X, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { usePartyState, useUpdateSharedImage } from '@/hooks/usePartyState';
import { toast } from 'sonner';

export interface DisplayImagePayload {
  url: string;
  title?: string;
  caption?: string;
}

export const PRESET_SCENE_IMAGES: { name: string; url: string; category: string }[] = [
  {
    name: 'World Map & Geography',
    url: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=1200&q=80',
    category: 'Map',
  },
  {
    name: 'Yawning Portal Tavern',
    url: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1200&q=80',
    category: 'Location',
  },
  {
    name: 'Enchanted Wilderness',
    url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1200&q=80',
    category: 'Wilderness',
  },
  {
    name: 'High Spire Castle',
    url: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=1200&q=80',
    category: 'Structure',
  },
  {
    name: 'Underground Catacombs',
    url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1200&q=80',
    category: 'Dungeon',
  },
];

interface CommonImageDisplayerProps {
  campaignId?: string;
  className?: string;
}

export function CommonImageDisplayer({ campaignId, className = '' }: CommonImageDisplayerProps) {
  const { data: partyState } = usePartyState(campaignId);
  const updateSharedImage = useUpdateSharedImage();

  // Local state as fallback or client draft
  const [localImage, setLocalImage] = useState<DisplayImagePayload | null>(() => {
    if (!campaignId) return null;
    const stored = localStorage.getItem(`dnd_shared_image_${campaignId}`);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }
    return null;
  });

  const activeImage = partyState?.displayImage ?? localImage;

  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  const [customTitle, setCustomTitle] = useState('');

  // Keep localStorage synced
  useEffect(() => {
    if (campaignId && activeImage) {
      localStorage.setItem(`dnd_shared_image_${campaignId}`, JSON.stringify(activeImage));
    } else if (campaignId && !activeImage) {
      localStorage.removeItem(`dnd_shared_image_${campaignId}`);
    }
  }, [campaignId, activeImage]);

  const handleApplyImage = async (img: DisplayImagePayload | null) => {
    setLocalImage(img);
    if (campaignId) {
      try {
        await updateSharedImage.mutateAsync({ campaignId, image: img });
      } catch {
        // Local state already updated as fallback
      }
    }
    setIsPickerOpen(false);
    if (img) {
      toast.success(`Display image updated: ${img.title || 'Scene Artwork'}`);
    } else {
      toast.info('Display image cleared');
    }
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrl.trim()) return;
    handleApplyImage({
      url: customUrl.trim(),
      title: customTitle.trim() || 'Custom Artwork',
    });
    setCustomUrl('');
    setCustomTitle('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload a valid image file (JPEG, PNG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      const dataUrl = evt.target?.result as string;
      if (dataUrl) {
        handleApplyImage({
          url: dataUrl,
          title: file.name.replace(/\.[^/.]+$/, ''),
        });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className={`bg-card border rounded-lg p-5 flex flex-col justify-between h-full shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3 border-b pb-3">
        <div className="flex items-center gap-2">
          <ImageIcon className="size-5 text-primary" />
          <h2 className="text-base font-bold text-foreground">Common Image Displayer</h2>
        </div>
        <div className="flex items-center gap-2">
          {activeImage && (
            <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30 flex items-center gap-1">
              <Eye className="size-3" /> Live Display
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPickerOpen(!isPickerOpen)}
            className="text-xs gap-1.5 h-8"
          >
            <Sparkles className="size-3.5 text-amber-500" />
            {isPickerOpen ? 'Close Menu' : activeImage ? 'Change Image' : 'Select Image'}
          </Button>
        </div>
      </div>

      {/* Image Picker Dropdown / Modal */}
      {isPickerOpen && (
        <div className="mb-4 p-4 rounded-lg bg-muted/40 border space-y-4 text-xs animate-in fade-in duration-200">
          <div>
            <span className="font-semibold text-muted-foreground block mb-2">Preset Campaign Scenes</span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PRESET_SCENE_IMAGES.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => handleApplyImage({ url: preset.url, title: preset.name, caption: preset.category })}
                  className="group relative rounded-md overflow-hidden border bg-black/60 text-left aspect-video hover:ring-2 hover:ring-primary transition-all focus:outline-none"
                >
                  <img src={preset.url} alt={preset.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-80 group-hover:opacity-100" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent p-1.5 flex flex-col justify-end">
                    <span className="font-bold text-white text-[11px] leading-tight truncate">{preset.name}</span>
                    <span className="text-[9px] text-white/70">{preset.category}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="border-t pt-3 space-y-2">
            <span className="font-semibold text-muted-foreground block">Or Custom Image URL</span>
            <form onSubmit={handleCustomSubmit} className="flex gap-2">
              <Input
                placeholder="Title (optional)"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                className="h-8 text-xs max-w-[120px]"
              />
              <Input
                placeholder="https://example.com/image.png"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                className="h-8 text-xs flex-1"
              />
              <Button type="submit" size="sm" className="h-8 text-xs gap-1">
                <LinkIcon className="size-3" /> Load
              </Button>
            </form>
          </div>

          <div className="border-t pt-3 flex items-center justify-between">
            <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded border bg-card hover:bg-accent text-xs font-semibold">
              <Upload className="size-3.5 text-primary" /> Upload Image File
              <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
            </label>

            {activeImage && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleApplyImage(null)}
                className="h-8 text-xs text-destructive hover:bg-destructive/10 gap-1"
              >
                <Trash2 className="size-3.5" /> Clear Display
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Main Image Viewer Container */}
      <div className="flex-1 flex flex-col items-center justify-center min-h-[160px]">
        {activeImage ? (
          <div className="relative w-full rounded-lg overflow-hidden border bg-black/40 group flex flex-col items-center justify-center">
            <img
              src={activeImage.url}
              alt={activeImage.title || 'Shared Display Image'}
              className="max-h-48 w-full object-cover rounded-lg group-hover:scale-102 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2 p-3">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setIsLightboxOpen(true)}
                className="h-8 text-xs gap-1 shadow-md bg-white/90 text-black hover:bg-white"
              >
                <Maximize2 className="size-3.5" /> Zoom
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleApplyImage(null)}
                className="h-8 text-xs gap-1 shadow-md"
              >
                <Trash2 className="size-3.5" /> Remove
              </Button>
            </div>
            {activeImage.title && (
              <div className="w-full bg-muted/80 backdrop-blur-xs border-t px-3 py-1.5 text-center text-xs font-semibold text-foreground truncate">
                {activeImage.title}
                {activeImage.caption && <span className="text-muted-foreground ml-2 text-[11px] font-normal">({activeImage.caption})</span>}
              </div>
            )}
          </div>
        ) : (
          <div className="w-full h-full min-h-[140px] border-2 border-dashed border-muted rounded-lg flex flex-col items-center justify-center p-4 text-center text-muted-foreground">
            <ImageIcon className="size-8 text-muted-foreground/50 mb-2" />
            <span className="text-xs font-semibold text-foreground">No Image Currently Displayed</span>
            <p className="text-[11px] text-muted-foreground mt-0.5 max-w-xs">
              Select a preset scene, paste a URL, or upload artwork from the DM console to display it here.
            </p>
          </div>
        )}
      </div>

      {/* Lightbox / Zoom Modal */}
      {isLightboxOpen && activeImage && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <button
              type="button"
              onClick={() => setIsLightboxOpen(false)}
              className="absolute -top-10 right-0 text-white hover:text-primary transition-colors p-1"
              aria-label="Close Lightbox"
            >
              <X className="size-7" />
            </button>
            <img
              src={activeImage.url}
              alt={activeImage.title || 'Full Display Image'}
              className="max-h-[80vh] max-w-full rounded-lg shadow-2xl object-contain border border-white/10"
            />
            {activeImage.title && (
              <div className="mt-3 text-center text-white text-sm font-bold bg-black/60 px-4 py-1.5 rounded-full border border-white/20">
                {activeImage.title}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
