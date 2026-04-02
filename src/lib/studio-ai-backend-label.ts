'use client';

import { useCallback, useEffect, useState } from 'react';
import type { AppLanguage } from '@/lib/studio-types';
import { getActiveModel, getActiveProvider, getApiKey, PROVIDERS } from '@/lib/ai-providers';

const AUTO: Record<AppLanguage, string> = {
  KO: '자동',
  EN: 'Auto',
  JP: '自動',
  CN: '自动',
};

const NO_KEY: Record<AppLanguage, string> = {
  KO: 'API 미설정',
  EN: 'No API key',
  JP: 'APIキー未設定',
  CN: '未配置 API',
};

function computeLabel(
  language: AppLanguage,
  hostedProviders: Partial<Record<string, boolean>>,
): string {
  if (typeof window === 'undefined') return '';
  const pid = getActiveProvider();
  const hasKey = Boolean(getApiKey(pid));
  const hosted = Boolean(hostedProviders[pid]);

  if (!hasKey && !hosted) return NO_KEY[language] ?? NO_KEY.KO;
  if (!hasKey && hosted) return AUTO[language] ?? AUTO.EN;

  const def = PROVIDERS[pid];
  const model = getActiveModel();
  if (!def) return model;
  return `${def.name} · ${model}`;
}

export function getStudioBackendDisplayLabel(
  language: AppLanguage,
  hostedProviders: Partial<Record<string, boolean>>,
): string {
  return computeLabel(language, hostedProviders);
}

export function useStudioBackendLabel(
  language: AppLanguage,
  hostedProviders: Partial<Record<string, boolean>>,
): string {
  const [label, setLabel] = useState('');
  const refresh = useCallback(() => {
    setLabel(computeLabel(language, hostedProviders));
  }, [language, hostedProviders]);

  useEffect(() => {
    refresh();
    const onKeys = () => refresh();
    window.addEventListener('noa-keys-changed', onKeys);
    window.addEventListener('storage', onKeys);
    return () => {
      window.removeEventListener('noa-keys-changed', onKeys);
      window.removeEventListener('storage', onKeys);
    };
  }, [refresh]);

  return label;
}
