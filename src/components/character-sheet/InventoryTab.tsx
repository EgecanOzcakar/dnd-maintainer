import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Package,
  Shield,
  Sword,
  Plus,
  ArrowRightLeft,
  Trash2,
  CheckCircle2,
  Circle,
  Sparkles,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getItemDef, getItemNameKey, ITEM_CATALOG } from '@/lib/sources/items';
import type { ItemDef } from '@/types/items';
import type { SourceTag } from '@/types/sources';
import type { CharacterSummary } from '@/types/database';
import { useInventoryMutations } from '@/hooks/useInventoryMutations';
import { useCharacters } from '@/hooks/useCharacters';
import { toast } from 'sonner';

interface InventoryTabProps {
  readonly characterId: string;
  readonly campaignId: string;
  readonly itemsData: readonly {
    id: string;
    item_id: string;
    equipped?: boolean;
    attuned?: boolean;
    quantity: number;
    source?: unknown;
  }[];
}

export function InventoryTab({ characterId, campaignId, itemsData }: InventoryTabProps) {
  const { t } = useTranslation('gamedata');
  const { t: tc } = useTranslation('common');

  const { addItem, updateItem, removeItem, transferItem } = useInventoryMutations();
  const { data: campaignCharacters = [] } = useCharacters(campaignId);

  // Other party members available for transfer
  const partyMembers = campaignCharacters.filter((c: CharacterSummary) => c.id !== characterId);

  // Filter & Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'weapon' | 'armor' | 'gear' | 'pack'>('all');

  // Dialog States
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogFilterType, setCatalogFilterType] = useState<'all' | 'weapon' | 'armor' | 'gear' | 'pack'>('all');
  const [selectedCatalogItem, setSelectedCatalogItem] = useState<ItemDef | null>(null);
  const [addQty, setAddQty] = useState(1);

  // Custom Item state
  const [isCustom, setIsCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customType, setCustomType] = useState<'weapon' | 'armor' | 'gear'>('gear');
  const [customWeight, setCustomWeight] = useState(0);

  // Transfer Dialog State
  const [transferingItem, setTransferingItem] = useState<{
    id: string;
    item_id: string;
    maxQty: number;
  } | null>(null);
  const [targetCharId, setTargetCharId] = useState<string>('');
  const [transferQty, setTransferQty] = useState(1);

  // Stats calculations
  let totalWeight = 0;
  const safeItemsData = itemsData ?? [];
  const itemRows = safeItemsData
    .filter((row) => row && row.item_id)
    .map((row) => {
      const def = getItemDef(row.item_id);
      const qty = row.quantity ?? 1;
      const itemWeight = def && def.type !== 'pack' ? (def.weight ?? 0) * qty : 0;
      totalWeight += itemWeight;

      const itemIdStr = String(row.item_id);
      const itemName = def
        ? t(getItemNameKey(def.type, def.id), {
          defaultValue: def.id.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        })
        : itemIdStr.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

      return {
        ...row,
        quantity: qty,
        def,
        itemName,
        weight: itemWeight,
      };
    });

  const filteredItems = itemRows.filter((item) => {
    if (filterType !== 'all' && item.def?.type !== filterType) return false;
    if (searchQuery.trim()) {
      return item.itemName.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  const catalogFiltered = ITEM_CATALOG.filter((item) => {
    if (catalogFilterType !== 'all' && item.type !== catalogFilterType) return false;
    const name = t(getItemNameKey(item.type, item.id), {
      defaultValue: item.id.replace(/-/g, ' '),
    });
    return name.toLowerCase().includes(catalogSearch.toLowerCase());
  });

  const handleCreateOrAddItem = () => {
    if (isCustom) {
      if (!customName.trim()) return;
      const customId = `custom-${customName.toLowerCase().replace(/\s+/g, '-')}`;
      addItem.mutate(
        {
          characterId,
          itemId: customId,
          quantity: addQty,
          equipped: false,
          source: { origin: 'loot', description: `Custom Item (${customType}, ${customWeight} lbs)` },
        },
        {
          onSuccess: () => {
            toast.success(`Added ${customName}`);
            setIsAddItemOpen(false);
            setCustomName('');
            setAddQty(1);
          },
        }
      );
    } else {
      if (!selectedCatalogItem) return;
      addItem.mutate(
        {
          characterId,
          itemId: selectedCatalogItem.id,
          quantity: addQty,
          equipped: false,
        },
        {
          onSuccess: () => {
            toast.success(`Added ${selectedCatalogItem.id}`);
            setIsAddItemOpen(false);
            setSelectedCatalogItem(null);
            setAddQty(1);
          },
        }
      );
    }
  };

  const handleConfirmTransfer = () => {
    if (!transferingItem || !targetCharId) return;
    transferItem.mutate(
      {
        sourceCharacterId: characterId,
        targetCharacterId: targetCharId,
        itemId: transferingItem.item_id,
        quantity: transferQty,
        sourceRowId: transferingItem.id,
      },
      {
        onSuccess: () => {
          const targetName = partyMembers.find((c: CharacterSummary) => c.id === targetCharId)?.name ?? 'Party Member';
          toast.success(`Transferred item to ${targetName}`);
          setTransferingItem(null);
        },
        onError: () => {
          toast.error('Transfer failed');
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      {/* ── Inventory Bar / Actions Header ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card border rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-lg text-primary">
            <Package className="size-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">{tc('characterSheet.sections.equipment')} & Inventory</h2>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
              <span>Total Items: <strong className="text-foreground">{itemsData.reduce((acc, i) => acc + i.quantity, 0)}</strong></span>
              <span>•</span>
              <span>Carried Weight: <strong className="text-foreground">{totalWeight.toFixed(1)} lbs</strong></span>
            </div>
          </div>
        </div>

        <Button onClick={() => setIsAddItemOpen(true)} className="gap-1.5 shrink-0">
          <Plus className="size-4" /> Add or Create Item
        </Button>
      </div>

      {/* ── Filters & Search ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search inventory items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex gap-1 bg-muted p-1 rounded-lg">
          {(['all', 'weapon', 'armor', 'gear', 'pack'] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setFilterType(type)}
              className={`px-3 py-1 text-xs font-semibold rounded-md capitalize transition-colors ${filterType === type ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* ── Items List ──────────────────────────────────────────────────────── */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-xl text-muted-foreground">
          <Package className="size-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm font-medium">No items found in inventory.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={`flex items-center justify-between p-3 rounded-lg border transition-shadow ${item.equipped
                ? 'bg-green-50/50 border-green-200 dark:bg-green-950/20 dark:border-green-900/50'
                : 'bg-card border-border hover:border-primary/40'
                }`}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
                <button
                  type="button"
                  title={item.equipped ? 'Unequip' : 'Equip'}
                  onClick={() =>
                    updateItem.mutate({
                      characterId,
                      id: item.id,
                      equipped: !item.equipped,
                    })
                  }
                  className="text-muted-foreground hover:text-primary transition-colors shrink-0"
                >
                  {item.equipped ? (
                    <CheckCircle2 className="size-5 text-green-600 dark:text-green-500" />
                  ) : (
                    <Circle className="size-5" />
                  )}
                </button>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-foreground truncate">{item.itemName}</span>
                    {item.equipped && (
                      <Badge variant="secondary" className="text-[10px] py-0 bg-green-500/10 text-green-700 dark:text-green-400">
                        Equipped
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5 font-mono">
                    <span>Qty: {item.quantity}</span>
                    {item.weight > 0 && <span>• {item.weight.toFixed(1)} lbs</span>}
                    {item.def?.type === 'weapon' && <span>• {item.def.damageDice} {t(`damageTypes.${item.def.damageType}`)}</span>}
                    {item.def?.type === 'armor' && <span>• AC {item.def.baseAc}</span>}
                  </div>
                </div>
              </div>

              {/* Action Controls */}
              <div className="flex items-center gap-1 shrink-0">
                {/* Quantity Controls */}
                <div className="flex items-center border rounded bg-muted/30">
                  <button
                    type="button"
                    onClick={() => {
                      if (item.quantity > 1) {
                        updateItem.mutate({ characterId, id: item.id, quantity: item.quantity - 1 });
                      } else {
                        removeItem.mutate({ characterId, id: item.id });
                      }
                    }}
                    className="px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground font-bold"
                  >
                    -
                  </button>
                  <span className="px-1.5 text-xs font-mono font-bold text-foreground">{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => updateItem.mutate({ characterId, id: item.id, quantity: item.quantity + 1 })}
                    className="px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground font-bold"
                  >
                    +
                  </button>
                </div>

                {/* Transfer Button */}
                {partyMembers.length > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-primary"
                    title="Transfer to party member"
                    onClick={() => {
                      setTransferingItem({ id: item.id, item_id: item.item_id, maxQty: item.quantity });
                      setTargetCharId(partyMembers[0]?.id ?? '');
                      setTransferQty(1);
                    }}
                  >
                    <ArrowRightLeft className="size-4" />
                  </Button>
                )}

                {/* Delete Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:text-destructive"
                  title="Remove item"
                  onClick={() => removeItem.mutate({ characterId, id: item.id })}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Add / Create Item Dialog ────────────────────────────────────────── */}
      <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Item to Inventory</DialogTitle>
            <DialogDescription>Select an item from the D&D catalog or create a custom item.</DialogDescription>
          </DialogHeader>

          {/* Toggle Catalog / Custom */}
          <div className="flex border-b pb-2 gap-4 text-sm font-semibold">
            <button
              type="button"
              onClick={() => setIsCustom(false)}
              className={`pb-1 transition-colors ${!isCustom ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
            >
              From Catalog
            </button>
            <button
              type="button"
              onClick={() => setIsCustom(true)}
              className={`pb-1 transition-colors ${isCustom ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
            >
              Custom Item
            </button>
          </div>

          {!isCustom ? (
            <div className="space-y-3">
              <Input
                placeholder="Search catalog items (weapons, armor, gear)..."
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
              />
              <div className="flex gap-1 bg-muted/60 p-1 rounded-md text-[11px]">
                {(['all', 'weapon', 'armor', 'gear', 'pack'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setCatalogFilterType(type)}
                    className={`flex-1 py-0.5 font-semibold rounded capitalize transition-colors ${
                      catalogFilterType === type ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
              <div className="max-h-48 overflow-y-auto border rounded-lg p-2 space-y-1">
                {catalogFiltered.length === 0 ? (
                  <div className="text-center py-4 text-xs text-muted-foreground">No matching items found.</div>
                ) : (
                  catalogFiltered.slice(0, 40).map((item) => {
                    const name = t(getItemNameKey(item.type, item.id), {
                      defaultValue: item.id.replace(/-/g, ' '),
                    });
                    const isSelected = selectedCatalogItem?.id === item.id;
                    const detail = item.type === 'armor' ? ` (AC ${item.baseAc})` : item.type === 'weapon' ? ` (${item.damageDice} ${item.damageType})` : '';
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedCatalogItem(item)}
                        className={`w-full text-left px-3 py-1.5 rounded text-xs flex justify-between items-center transition-colors ${
                          isSelected ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-muted/50'
                        }`}
                      >
                        <span>
                          {name}
                          <span className="text-[10px] text-muted-foreground font-normal">{detail}</span>
                        </span>
                        <Badge variant="outline" className="capitalize text-[10px] shrink-0 ml-2">{item.type}</Badge>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Item Name</label>
                <Input placeholder="e.g. Ring of Protection" value={customName} onChange={(e) => setCustomName(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Category</label>
                  <select
                    value={customType}
                    onChange={(e) => setCustomType(e.target.value as 'weapon' | 'armor' | 'gear')}
                    className="w-full bg-background border rounded px-3 py-2 text-xs"
                  >
                    <option value="gear">Gear / Item</option>
                    <option value="weapon">Weapon</option>
                    <option value="armor">Armor</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Weight (lbs)</label>
                  <Input
                    type="number"
                    value={customWeight}
                    onChange={(e) => setCustomWeight(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <label className="text-xs font-semibold text-muted-foreground">Quantity:</label>
            <Input
              type="number"
              min="1"
              value={addQty}
              onChange={(e) => setAddQty(parseInt(e.target.value, 10) || 1)}
              className="w-20 text-center"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddItemOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateOrAddItem}>Add Item</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Transfer Item Dialog ────────────────────────────────────────────── */}
      <Dialog open={!!transferingItem} onOpenChange={(open) => !open && setTransferingItem(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Transfer Item</DialogTitle>
            <DialogDescription>Give an item from your inventory to another party member in this campaign.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Target Party Member</label>
              <select
                value={targetCharId}
                onChange={(e) => setTargetCharId(e.target.value)}
                className="w-full bg-background border rounded px-3 py-2 text-sm"
              >
                {partyMembers.map((member: CharacterSummary) => (
                  <option key={member.id} value={member.id}>
                    {member.name} ({member.class ?? 'Character'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">
                Quantity to Transfer (Max {transferingItem?.maxQty})
              </label>
              <Input
                type="number"
                min="1"
                max={transferingItem?.maxQty ?? 1}
                value={transferQty}
                onChange={(e) => setTransferQty(Math.min(transferingItem?.maxQty ?? 1, parseInt(e.target.value, 10) || 1))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferingItem(null)}>Cancel</Button>
            <Button onClick={handleConfirmTransfer}>Confirm Transfer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
