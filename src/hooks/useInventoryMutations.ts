import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { SourceTag } from '@/types/sources';

interface AddItemParams {
  characterId: string;
  itemId: string;
  quantity?: number;
  equipped?: boolean;
  attuned?: boolean;
  source?: SourceTag;
}

interface UpdateItemParams {
  characterId: string;
  id: string;
  quantity?: number;
  equipped?: boolean;
  attuned?: boolean;
}

interface RemoveItemParams {
  characterId: string;
  id: string;
}

interface TransferItemParams {
  sourceCharacterId: string;
  targetCharacterId: string;
  itemId: string;
  quantity: number;
  equipped?: boolean;
  attuned?: boolean;
  sourceRowId?: string; // Optional: specific character_items row ID to move/decrement
}

export function useInventoryMutations() {
  const queryClient = useQueryClient();

  const addItem = useMutation({
    mutationFn: async ({
      characterId,
      itemId,
      quantity = 1,
      equipped = false,
      attuned = false,
      source = { origin: 'loot', description: 'Added via Inventory' },
    }: AddItemParams) => {
      // Check if item already exists for character
      const { data: existing, error: fetchErr } = await supabase
        .from('character_items')
        .select('*')
        .eq('character_id', characterId)
        .eq('item_id', itemId)
        .maybeSingle();

      if (fetchErr) throw fetchErr;

      if (existing) {
        const { data, error } = await supabase
          .from('character_items')
          .update({ quantity: existing.quantity + quantity, updated_at: new Date().toISOString() })
          .eq('id', existing.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('character_items')
          .insert({
            character_id: characterId,
            item_id: itemId,
            quantity,
            equipped,
            attuned,
            source: (source ?? null) as any,
          })
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: (_, { characterId }) => {
      queryClient.invalidateQueries({ queryKey: ['character-items', characterId] });
      queryClient.invalidateQueries({ queryKey: ['character'] });
    },
  });

  const updateItem = useMutation({
    mutationFn: async ({ characterId, id, ...updates }: UpdateItemParams) => {
      const { data, error } = await supabase
        .from('character_items')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, { characterId }) => {
      queryClient.invalidateQueries({ queryKey: ['character-items', characterId] });
      queryClient.invalidateQueries({ queryKey: ['character'] });
    },
  });

  const removeItem = useMutation({
    mutationFn: async ({ id }: RemoveItemParams) => {
      const { error } = await supabase.from('character_items').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, { characterId }) => {
      queryClient.invalidateQueries({ queryKey: ['character-items', characterId] });
      queryClient.invalidateQueries({ queryKey: ['character'] });
    },
  });

  const transferItem = useMutation({
    mutationFn: async ({
      sourceCharacterId,
      targetCharacterId,
      itemId,
      quantity,
      sourceRowId,
    }: TransferItemParams) => {
      // 1. Decrement or delete from source character
      let rowToModify = sourceRowId;
      if (!rowToModify) {
        const { data: sourceItem, error: findErr } = await supabase
          .from('character_items')
          .select('*')
          .eq('character_id', sourceCharacterId)
          .eq('item_id', itemId)
          .limit(1)
          .single();
        if (findErr) throw findErr;
        rowToModify = sourceItem.id;
      }

      const { data: sourceRow, error: fetchErr } = await supabase
        .from('character_items')
        .select('*')
        .eq('id', rowToModify)
        .single();
      if (fetchErr) throw fetchErr;

      const newSourceQty = sourceRow.quantity - quantity;
      if (newSourceQty <= 0) {
        const { error: delErr } = await supabase.from('character_items').delete().eq('id', sourceRow.id);
        if (delErr) throw delErr;
      } else {
        const { error: upErr } = await supabase
          .from('character_items')
          .update({ quantity: newSourceQty, updated_at: new Date().toISOString() })
          .eq('id', sourceRow.id);
        if (upErr) throw upErr;
      }

      // 2. Add or increment on target character
      const { data: targetItem, error: targetFindErr } = await supabase
        .from('character_items')
        .select('*')
        .eq('character_id', targetCharacterId)
        .eq('item_id', itemId)
        .maybeSingle();

      if (targetFindErr) throw targetFindErr;

      if (targetItem) {
        const { error: targetUpErr } = await supabase
          .from('character_items')
          .update({ quantity: targetItem.quantity + quantity, updated_at: new Date().toISOString() })
          .eq('id', targetItem.id);
        if (targetUpErr) throw targetUpErr;
      } else {
        const { error: targetInsErr } = await supabase.from('character_items').insert({
          character_id: targetCharacterId,
          item_id: itemId,
          quantity,
          equipped: false,
          attuned: false,
          source: { origin: 'loot', description: 'Transferred from party member' },
        });
        if (targetInsErr) throw targetInsErr;
      }
    },
    onSuccess: (_, { sourceCharacterId, targetCharacterId }) => {
      queryClient.invalidateQueries({ queryKey: ['character-items', sourceCharacterId] });
      queryClient.invalidateQueries({ queryKey: ['character-items', targetCharacterId] });
      queryClient.invalidateQueries({ queryKey: ['character'] });
    },
  });

  return { addItem, updateItem, removeItem, transferItem };
}
