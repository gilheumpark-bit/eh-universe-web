"use client";

// ============================================================
// PART 1 — Imports and Types
// ============================================================

import React, { useCallback, useEffect, useState } from 'react';
import { AppLanguage } from '@/lib/studio-types';
import { createT, L4 } from '@/lib/i18n';
import { Key } from 'lucide-react';
import { getActiveProvider, isKeyExpiringSoon, getKeyAge, hasStoredApiKey } from '@/lib/ai-providers';

interface ApiKeysSectionProps {
  language: AppLanguage;
  hostedProviders?: Partial<Record<string, boolean>>;
  onManageApiKey: () => void;
}

// ============================================================
// PART 2 — Section Component
// ============================================================

const ApiKeysSection: React.FC<ApiKeysSectionProps> = ({ language, hostedProviders = {}, onManageApiKey }) => {
  const t = createT(language);
  const [apiKeyRefresh, setApiKeyRefresh] = useState(0);

  const checkApiKeys = useCallback(() => {
    setApiKeyRefresh((n) => n + 1);
  }, []);

  useEffect(() => {
    window.addEventListener('storage', checkApiKeys);
    window.addEventListener('noa-keys-changed', checkApiKeys);
    return () => {
      window.removeEventListener('storage', checkApiKeys);
      window.removeEventListener('noa-keys-changed', checkApiKeys);
    };
  }, [checkApiKeys]);

  // apiKeyRefresh used as dependency to force re-read below
  void apiKeyRefresh;
  const apiProvider = typeof window !== 'undefined' ? getActiveProvider() : 'gemini';
  const hasPersonalApiKey = typeof window !== 'undefined' && hasStoredApiKey(apiProvider);
  const hasHostedApi = Boolean(hostedProviders[apiProvider]);
  const keyExpiring = hasPersonalApiKey && isKeyExpiringSoon(apiProvider);

  return (
    <div
      data-testid="settings-api-key-row"
      onClick={onManageApiKey}
      className="flex items-center justify-between gap-3 p-4 md:p-6 hover:bg-bg-secondary/40 rounded-3xl transition-[transform,background-color,border-color,color] cursor-pointer border border-transparent hover:border-border active:scale-[0.98]"
    >
      <div className="flex items-center gap-3 md:gap-4 min-w-0">
        <div className="p-2 md:p-3 bg-bg-secondary rounded-2xl shrink-0"><Key className="w-4 h-4 md:w-5 md:h-5 text-text-tertiary" /></div>
        <div className="min-w-0">
          <div className="text-xs md:text-sm font-bold truncate">{t('settings.apiKeyManagement')}</div>
          <div className="text-[13px] text-text-tertiary hidden sm:block">
            {t('settings.apiKeyDesc')}
            <span className="ml-1 opacity-60">(API {L4(language, { ko: '키', en: 'Key', ja: 'Key', zh: 'Key' })})</span>
          </div>
        </div>
      </div>
      <div className="flex flex-col items-end gap-0.5 shrink-0">
        <div data-testid="settings-api-key-status" className="text-[9px] md:text-[10px] font-black text-accent-blue uppercase">
          {hasPersonalApiKey
            ? t('settings.apiKeySet')
            : hasHostedApi
              ? t('settings.apiKeyPlatformOnly')
              : t('settings.apiKeyNotSet')}
        </div>
        {keyExpiring && (
          <div className="text-[8px] md:text-[9px] text-accent-amber">
            {L4(language, { ko: `키 갱신 권장 (${getKeyAge(apiProvider)}일)`, en: `Rotate key (${getKeyAge(apiProvider)}d old)`, ja: `Rotate key (${getKeyAge(apiProvider)}d old)`, zh: `Rotate key (${getKeyAge(apiProvider)}d old)` })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ApiKeysSection;
