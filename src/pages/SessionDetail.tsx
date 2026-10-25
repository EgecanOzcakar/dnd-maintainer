import { parseIntOrDefault, todayLocal } from '@/lib/utils';
import { getLogger } from '@/lib/logger';
import { supabase } from '@/lib/supabase';
import { Session } from '@/types/database';
import type { Json } from '@/types/supabase';
import { useSession, useUpdateSession } from '@/hooks/useSessions';
import { useDebouncedSave } from '@/hooks/useDebouncedSave';
import { useSessionEncounters } from '@/hooks/useEncounters';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { AlertCircle, ArrowLeft, BookOpen, Calendar, Link as LinkIcon, Lock, Plus, Trash2, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ValidationError } from '@/components/ui/validation-error';

const logger = getLogger('SessionDetail');

type SessionEdits = Partial<Pick<Session, 'name' | 'session_number' | 'date' | 'summary' | 'experience_awarded'>>;

interface LootEntry {
  id: string;
  item_name: string;
  quantity: number;
  gold_value: number;
  awarded_to: string;
}

export default function SessionDetail() {
  const { t } = useTranslation('common');
  const { sessionSlug } = useParams<{ sessionSlug: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formInitialized, setFormInitialized] = useState(false);
  const [formData, setFormData] = useState<Partial<Session>>({
    name: '',
    session_number: 1,
    date: todayLocal(),
    summary: '',
    experience_awarded: 0,
  });

  const [dmNotes, setDmNotes] = useState('');
  const [loot, setLoot] = useState<LootEntry[]>([]);
  const [showNewLootForm, setShowNewLootForm] = useState(false);
  const [deletingLootId, setDeletingLootId] = useState<string | null>(null);
  const [lootNameError, setLootNameError] = useState<string>('');
  const [newLoot, setNewLoot] = useState<LootEntry>({
    id: crypto.randomUUID(),
    item_name: '',
    quantity: 1,
    gold_value: 0,
    awarded_to: '',
  });

  // Fetch session
  const { data: session, isLoading, error } = useSession(sessionSlug);

  // DM notes and loot are stored on the session itself
  const sessionNotes = ((session as unknown as Record<string, unknown>)?.notes as string) ?? '';
  const lootItems = ((session as unknown as Record<string, unknown>)?.loot as LootEntry[] | null) ?? [];

  const { data: encounters = [] } = useSessionEncounters(session?.id);

  usePageTitle(session?.name ?? t('nav.sessions'));

  useEffect(() => {
    if (error) {
      logger.error('Failed to load session:', error);
    }
  }, [error]);

  // Autosave only the editable fields: never write the whole row back (it would clobber loot and notes).
  const updateSession = useUpdateSession();
  const saveSession = (updates: SessionEdits | { notes: string | null }) => {
    if (!session?.id) return;
    updateSession.mutateAsync({ id: session.id, ...updates }).then(
      () => toast.success(t('status.saved'), { id: 'session-save', duration: 2000 }),
      (err) => {
        logger.error('Failed to save session:', err);
      }
    );
  };
  const fieldsSave = useDebouncedSave<SessionEdits>(saveSession);
  const notesSave = useDebouncedSave<{ notes: string | null }>(saveSession);

  // Upsert loot mutation (stored on sessions.loot JSONB column)
  const upsertLootMutation = useMutation({
    mutationFn: async (lootEntry: LootEntry) => {
      if (!session?.id) throw new Error('Session ID is required');

      const updatedLoot = [...loot.filter((l) => l.id !== lootEntry.id), lootEntry];
      const { error } = await supabase
        .from('sessions')
        .update({ loot: updatedLoot as unknown as Json })
        .eq('id', session.id);

      if (error) throw error;
    },
    onSuccess: (_data, lootEntry) => {
      setLoot((prev) => [...prev.filter((l) => l.id !== lootEntry.id), lootEntry]);
      queryClient.invalidateQueries({ queryKey: ['session', sessionSlug] });
    },
  });

  // Delete loot mutation
  const deleteLootMutation = useMutation({
    mutationFn: async (lootId: string) => {
      if (!session?.id) throw new Error('Session ID is required');

      const updatedLoot = loot.filter((l) => l.id !== lootId);
      const { error } = await supabase
        .from('sessions')
        .update({ loot: updatedLoot as unknown as Json })
        .eq('id', session.id);

      if (error) throw error;
    },
    onSuccess: (_data, lootId) => {
      setLoot((prev) => prev.filter((l) => l.id !== lootId));
      queryClient.invalidateQueries({ queryKey: ['session', sessionSlug] });
    },
  });

  // Sync form state from query data on first load
  if (session && !formInitialized) {
    setFormInitialized(true);
    setFormData(session);
    setDmNotes(sessionNotes);
    setLoot(lootItems);
  }

  const handleFieldChange = (field: keyof SessionEdits, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    fieldsSave.schedule({ [field]: value });
  };

  const handleAddLoot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLoot.item_name.trim()) {
      setLootNameError(t('validation.itemNameRequired'));
      return;
    }
    upsertLootMutation.mutate(newLoot, {
      onSuccess: () => {
        setNewLoot({
          id: crypto.randomUUID(),
          item_name: '',
          quantity: 1,
          gold_value: 0,
          awarded_to: '',
        });
        setLootNameError('');
        setShowNewLootForm(false);
      },
    });
  };

  const handleDeleteLoot = (lootId: string) => {
    setDeletingLootId(lootId);
  };

  const handleConfirmDeleteLoot = () => {
    if (!deletingLootId) return;
    deleteLootMutation.mutate(deletingLootId, {
      onSettled: () => setDeletingLootId(null),
    });
  };

  function encounterStatusClass(status: string): string {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-600';
      case 'active':
        return 'bg-red-100 text-destructive';
      default:
        return 'bg-muted text-muted-foreground';
    }
  }

  function encounterStatusLabel(status: string): string {
    switch (status) {
      case 'completed':
        return t('sessionDetail.encounterCompleted');
      case 'active':
        return t('sessionDetail.encounterActive');
      default:
        return t('sessionDetail.encounterPlanning');
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString(undefined, {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (error) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-primary hover:text-foreground mb-8"
          >
            <ArrowLeft className="size-5" />
            {t('buttons.back')}
          </button>
          <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-4 text-destructive flex items-start gap-3">
            <AlertCircle className="size-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">{t('sessionDetail.errorLoadingSession')}</p>
              <p className="text-sm">{t('errors.unexpectedError')}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-4xl mx-auto text-center py-12">
          <div className="inline-block animate-spin">
            <Calendar className="size-8 text-primary" />
          </div>
          <p className="text-muted-foreground mt-4">{t('sessionDetail.loadingSession')}</p>
        </div>
      </div>
    );
  }

  const totalLootValue = loot.reduce((sum, item) => sum + item.gold_value, 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-muted/50 border-b border-border">
        <div className="max-w-4xl mx-auto px-8 py-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-primary hover:text-foreground mb-4 transition-colors"
          >
            <ArrowLeft className="size-5" />
            {t('buttons.backToSessions')}
          </button>
          <h1 className="hidden md:block text-4xl font-bold text-foreground">
            {t('sessionDetail.sessionHeading', { number: formData.session_number, title: formData.name })}
          </h1>
          <p className="text-muted-foreground mt-2">{formatDate(formData.date || '')}</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-8 py-8">
        {/* Session Info Section */}
        <div className="bg-card border border-border rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <BookOpen className="size-5 text-primary" />
            {t('sessionDetail.sessionDetails')}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label htmlFor="session-title" className="block text-muted-foreground text-sm font-semibold mb-2">
                {t('sessionDetail.title')}
              </label>
              <input
                id="session-title"
                type="text"
                value={formData.name || ''}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                className="w-full bg-muted border border-border rounded-lg px-4 py-2 text-foreground placeholder:text-muted-foreground outline-none focus:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                placeholder={t('sessionDetail.placeholderTitle')}
              />
            </div>

            <div>
              <label htmlFor="session-number" className="block text-muted-foreground text-sm font-semibold mb-2">
                {t('sessions.sessionNumber')}
              </label>
              <input
                id="session-number"
                type="number"
                value={formData.session_number || 1}
                onChange={(e) => handleFieldChange('session_number', parseIntOrDefault(e.target.value, 1))}
                className="w-full bg-muted border border-border rounded-lg px-4 py-2 text-foreground outline-none focus:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                min="1"
              />
            </div>

            <div>
              <label htmlFor="session-date" className="block text-muted-foreground text-sm font-semibold mb-2">
                {t('sessionDetail.date')}
              </label>
              <input
                id="session-date"
                type="date"
                value={formData.date || ''}
                onChange={(e) => handleFieldChange('date', e.target.value)}
                className="w-full bg-muted border border-border rounded-lg px-4 py-2 text-foreground outline-none focus:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </div>
          </div>

          <div>
            <label htmlFor="session-summary" className="block text-muted-foreground text-sm font-semibold mb-2">
              {t('sessionDetail.summary')}
            </label>
            <textarea
              id="session-summary"
              value={formData.summary || ''}
              onChange={(e) => handleFieldChange('summary', e.target.value)}
              placeholder={t('sessionDetail.placeholderSummary')}
              rows={4}
              className="w-full bg-muted border border-border rounded-lg px-4 py-2 text-foreground placeholder:text-muted-foreground outline-none focus:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 resize-none"
            />
          </div>

          <div className="mt-6 pt-6 border-t border-border">
            <label htmlFor="session-xp" className="block text-muted-foreground text-sm font-semibold mb-2">
              {t('sessionDetail.xpAwarded')}
            </label>
            <input
              id="session-xp"
              type="number"
              value={formData.experience_awarded || 0}
              onChange={(e) => handleFieldChange('experience_awarded', parseIntOrDefault(e.target.value, 0))}
              className="w-full md:w-48 bg-muted border border-border rounded-lg px-4 py-2 text-foreground outline-none focus:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              min="0"
            />
          </div>
        </div>

        {/* DM Notes Section */}
        <div className="bg-card border border-border rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <Lock className="size-5 text-primary" />
            {t('sessionDetail.dmNotes')}
          </h2>

          <textarea
            value={dmNotes}
            onChange={(e) => {
              const newValue = e.target.value;
              setDmNotes(newValue);
              notesSave.schedule({ notes: newValue.trim() || null });
            }}
            aria-label={t('sessionDetail.dmNotes')}
            placeholder={t('sessionDetail.placeholderDmNotes')}
            rows={6}
            className="w-full bg-muted border border-border rounded-lg px-4 py-2 text-foreground placeholder:text-muted-foreground outline-none focus:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 resize-none"
          />
          <p className="text-xs text-muted-foreground mt-2">{t('sessionDetail.dmNotesHint')}</p>
        </div>

        {/* Loot Section */}
        <div className="bg-card border border-border rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Zap className="size-5 text-primary" />
              {t('sessionDetail.lootTable')}
            </h2>
            <button
              onClick={() => {
                setLootNameError('');
                setShowNewLootForm(true);
              }}
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-2 px-4 rounded-lg transition-colors text-sm"
            >
              <Plus className="size-4" />
              {t('buttons.addItem')}
            </button>
          </div>

          {showNewLootForm && (
            <form onSubmit={handleAddLoot} className="bg-muted rounded-lg p-4 mb-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <input
                    type="text"
                    value={newLoot.item_name}
                    onChange={(e) => {
                      setLootNameError('');
                      setNewLoot({ ...newLoot, item_name: e.target.value });
                    }}
                    aria-label={t('sessionDetail.placeholderItemName')}
                    placeholder={t('sessionDetail.placeholderItemName')}
                    className="bg-muted border border-input rounded px-3 py-2 text-foreground placeholder:text-muted-foreground outline-none focus:border-ring"
                    autoFocus
                  />
                  <ValidationError message={lootNameError} />
                </div>
                <input
                  type="number"
                  value={newLoot.quantity}
                  onChange={(e) =>
                    setNewLoot({
                      ...newLoot,
                      quantity: parseIntOrDefault(e.target.value, 1),
                    })
                  }
                  aria-label={t('sessionDetail.placeholderQuantity')}
                  placeholder={t('sessionDetail.placeholderQuantity')}
                  className="bg-muted border border-input rounded px-3 py-2 text-foreground outline-none focus:border-ring"
                  min="1"
                />
                <input
                  type="number"
                  value={newLoot.gold_value}
                  onChange={(e) =>
                    setNewLoot({
                      ...newLoot,
                      gold_value: parseIntOrDefault(e.target.value, 0),
                    })
                  }
                  aria-label={t('sessionDetail.placeholderGoldValue')}
                  placeholder={t('sessionDetail.placeholderGoldValue')}
                  className="bg-muted border border-input rounded px-3 py-2 text-foreground outline-none focus:border-ring"
                  min="0"
                />
                <input
                  type="text"
                  value={newLoot.awarded_to}
                  onChange={(e) => setNewLoot({ ...newLoot, awarded_to: e.target.value })}
                  aria-label={t('sessionDetail.placeholderAwardedTo')}
                  placeholder={t('sessionDetail.placeholderAwardedTo')}
                  className="bg-muted border border-input rounded px-3 py-2 text-foreground placeholder:text-muted-foreground outline-none focus:border-ring"
                />
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewLootForm(false);
                    setLootNameError('');
                  }}
                  className="px-4 py-2 bg-muted hover:bg-accent text-foreground rounded transition-colors text-sm"
                >
                  {t('buttons.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={upsertLootMutation.isPending}
                  className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded transition-colors text-sm disabled:opacity-50"
                >
                  {upsertLootMutation.isPending ? t('buttons.adding') : t('buttons.addItem')}
                </button>
              </div>
            </form>
          )}

          {loot.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">{t('sessionDetail.noItemsYet')}</p>
          ) : (
            <div className="space-y-3">
              {loot.map((item) => (
                <div key={item.id} className="bg-muted rounded-lg p-4 flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-foreground font-semibold">{item.item_name}</p>
                    <p className="text-muted-foreground text-sm mt-1">
                      {t('sessionDetail.lootQtyValue', { qty: item.quantity, value: item.gold_value })}
                    </p>
                    {item.awarded_to && <p className="text-muted-foreground text-sm mt-2">→ {item.awarded_to}</p>}
                  </div>
                  <button
                    onClick={() => handleDeleteLoot(item.id)}
                    aria-label={t('sessionDetail.removeLootItem', { name: item.item_name })}
                    className="text-muted-foreground hover:text-destructive transition-colors ml-4 p-2 -m-2"
                  >
                    <Trash2 className="size-5" />
                  </button>
                </div>
              ))}

              {totalLootValue > 0 && (
                <div className="border-t border-border pt-3 mt-4 flex justify-end items-center gap-2">
                  <span className="text-muted-foreground text-sm">{t('sessionDetail.totalValue')}</span>
                  <span className="text-primary font-bold">
                    {t('sessionDetail.lootValueGp', { value: totalLootValue })}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Encounters Section */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <LinkIcon className="size-5 text-primary" />
              {t('sessionDetail.linkedEncounters')}
            </h2>
          </div>

          {encounters.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">{t('sessionDetail.noEncounters')}</p>
          ) : (
            <div className="space-y-3">
              {encounters.map((encounter) => (
                <div key={encounter.id} className="bg-muted rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-foreground font-semibold">{encounter.name}</p>
                      {encounter.description && (
                        <p className="text-muted-foreground text-sm mt-1">{encounter.description}</p>
                      )}
                    </div>
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded ${encounterStatusClass(encounter.status)}`}
                    >
                      {encounterStatusLabel(encounter.status)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Remove Loot Confirmation Dialog */}
      <Dialog
        open={deletingLootId !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingLootId(null);
        }}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{t('sessionDetail.confirmRemoveLootTitle')}</DialogTitle>
            <DialogDescription>{t('sessionDetail.confirmRemoveLoot')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingLootId(null)}>
              {t('buttons.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleConfirmDeleteLoot} pending={deleteLootMutation.isPending}>
              {t('buttons.remove')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
