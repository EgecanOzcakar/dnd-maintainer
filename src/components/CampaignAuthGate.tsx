import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, KeyRound, Lock, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ValidationError } from '@/components/ui/validation-error';
import {
  isCampaignUnlocked,
  isDemoCampaign,
  setCampaignUnlocked,
  verifyCampaignPassphrase,
} from '@/lib/campaign-auth';
import type { Campaign, CampaignSummary } from '@/types/database';

interface CampaignAuthGateProps {
  campaign?: Campaign | CampaignSummary | null;
  campaignSlug?: string;
  children: React.ReactNode;
}

export function CampaignAuthGate({ campaign, campaignSlug, children }: CampaignAuthGateProps) {
  const { t } = useTranslation('common');
  const navigate = useNavigate();

  const slug = campaign?.slug || campaignSlug;
  const campaignId = campaign?.id;

  const isDemo = isDemoCampaign(campaign);
  const isStorageUnlocked =
    isDemo ||
    (Boolean(campaignId) && isCampaignUnlocked(campaignId)) ||
    (Boolean(slug) && isCampaignUnlocked(slug));

  const [sessionUnlocked, setSessionUnlocked] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const unlocked = isStorageUnlocked || sessionUnlocked;

  if (unlocked) {
    return <>{children}</>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passphrase.trim()) {
      setErrorMessage(t('validation.passphraseRequired'));
      return;
    }

    if (!slug) {
      setErrorMessage(t('errors.missingSlug'));
      return;
    }

    setIsVerifying(true);
    setErrorMessage('');

    try {
      const isValid = await verifyCampaignPassphrase(slug, passphrase.trim());
      if (isValid) {
        setCampaignUnlocked(campaignId, slug);
        setSessionUnlocked(true);
        toast.success(t('auth.campaignUnlocked'));
      } else {
        setErrorMessage(t('auth.incorrectPassphrase'));
      }
    } catch {
      setErrorMessage(t('auth.incorrectPassphrase'));
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-4">
      <Card className="w-full max-w-md border-border shadow-xl bg-card">
        <CardHeader className="text-center space-y-3 pb-4">
          <div className="mx-auto size-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-inner">
            <Lock className="size-7" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-center gap-2">
              <CardTitle className="text-2xl font-bold tracking-tight">
                {campaign?.name || t('campaign.title')}
              </CardTitle>
            </div>
            <div className="flex justify-center pt-1">
              <Badge variant="outline" className="gap-1.5 py-0.5 text-xs font-semibold text-amber-500 border-amber-500/30 bg-amber-500/10">
                <ShieldAlert className="size-3.5" />
                {t('auth.protectedBadge')}
              </Badge>
            </div>
          </div>

          <CardDescription className="text-sm text-muted-foreground pt-1">
            {t('auth.passphraseDescription')}
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4 pt-2">
            <div className="space-y-2">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                  <KeyRound className="size-4" />
                </div>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={passphrase}
                  onChange={(e) => {
                    setPassphrase(e.target.value);
                    setErrorMessage('');
                  }}
                  placeholder={t('auth.passphrasePlaceholder')}
                  className="pl-9 pr-10"
                  autoFocus
                  disabled={isVerifying}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? 'Hide passphrase' : 'Show passphrase'}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              <ValidationError message={errorMessage} />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-2 pt-2">
            <Button
              type="submit"
              className="w-full font-semibold"
              disabled={isVerifying || !passphrase.trim()}
              pending={isVerifying}
            >
              {isVerifying ? t('buttons.unlocking') : t('buttons.unlock')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full text-muted-foreground hover:text-foreground"
              onClick={() => navigate('/')}
            >
              {t('buttons.backToCampaigns')}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
