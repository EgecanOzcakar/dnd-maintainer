import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { UserPlus, Skull, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCharacters } from '@/hooks/useCharacters';
import type { CharacterSummary } from '@/types/database';
import type { MapToken } from '@/types/battle-map';

interface TokenPaletteProps {
  campaignId: string;
  tokens: MapToken[];
  onAddToken: (token: Omit<MapToken, 'id' | 'x' | 'y'>) => void;
}

const ENEMY_COLORS = ['#e11d48', '#c026d3', '#ea580c', '#65a30d', '#0891b2', '#7c3aed'];

export function TokenPalette({ campaignId, tokens, onAddToken }: TokenPaletteProps) {
  const { t } = useTranslation('common');
  const { data: characters = [] } = useCharacters(campaignId);
  const pcs = characters.filter((c: CharacterSummary) => c.character_type === 'pc');

  const [enemyName, setEnemyName] = useState('');
  const [enemyCount, setEnemyCount] = useState(1);
  const [enemyColor, setEnemyColor] = useState(ENEMY_COLORS[0]);

  const placedCharacterIds = new Set(tokens.map((tk) => tk.characterId).filter(Boolean));

  const handleAddEnemies = () => {
    const name = enemyName.trim();
    if (!name) return;
    const count = Math.max(1, Math.min(20, enemyCount));
    for (let i = 0; i < count; i++) {
      onAddToken({
        kind: 'enemy',
        name: count > 1 ? `${name} ${i + 1}` : name,
        color: enemyColor,
      });
    }
    setEnemyName('');
    setEnemyCount(1);
  };

  return (
    <div className="bg-card border rounded-xl p-4 space-y-4">
      <h3 className="text-sm font-bold text-foreground">{t('battleMap.palette.title')}</h3>

      <div className="space-y-1.5">
        <span className="text-xs font-semibold text-muted-foreground">{t('battleMap.palette.party')}</span>
        {pcs.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">{t('battleMap.palette.noParty')}</p>
        ) : (
          pcs.map((pc) => (
            <Button
              key={pc.id}
              variant="outline"
              size="sm"
              disabled={placedCharacterIds.has(pc.id)}
              onClick={() =>
                onAddToken({
                  kind: 'pc',
                  name: pc.name,
                  characterId: pc.id,
                  portraitUrl: pc.portrait_url,
                  color: '#10b981',
                })
              }
              className="w-full justify-start gap-2 text-xs"
            >
              <UserPlus className="size-3.5" />
              <span className="truncate">{pc.name}</span>
            </Button>
          ))
        )}
      </div>

      <div className="space-y-2 border-t pt-3">
        <span className="text-xs font-semibold text-muted-foreground">{t('battleMap.palette.enemies')}</span>
        <Input
          value={enemyName}
          onChange={(e) => setEnemyName(e.target.value)}
          placeholder={t('battleMap.palette.enemyNamePlaceholder')}
          className="h-8 text-xs"
        />
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={1}
            max={20}
            value={enemyCount}
            onChange={(e) => setEnemyCount(parseInt(e.target.value, 10) || 1)}
            className="h-8 w-16 text-xs"
          />
          <div className="flex gap-1">
            {ENEMY_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={c}
                onClick={() => setEnemyColor(c)}
                className={`size-5 rounded-full border-2 ${enemyColor === c ? 'border-foreground' : 'border-transparent'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
        <Button onClick={handleAddEnemies} size="sm" disabled={!enemyName.trim()} className="w-full gap-2 text-xs">
          <Skull className="size-3.5" />
          <Plus className="size-3" /> {t('battleMap.palette.addEnemies')}
        </Button>
      </div>
    </div>
  );
}
