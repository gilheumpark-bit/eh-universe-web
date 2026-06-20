"use client";

import { useEffect, useState } from 'react';
import {
  getActiveProvider,
  getApiKey,
  hasDgxService as hasDgxServiceFn,
  hasStoredApiKey,
  setServerDgxCache,
  type ProviderId,
} from '@/lib/ai-providers';
import { logger } from '@/lib/logger';

type HostedAiAvailability = Partial<Record<ProviderId, boolean>>;

const PROVIDER_IDS: ProviderId[] = ['gemini', 'openai', 'claude', 'deepseek', 'qwen', 'minimax', 'kimi', 'groq', 'mistral'];

interface UseStudioShellAiAccessOptions {
  hydrated: boolean;
  user: { uid?: string } | null | undefined;
  apiKeyVersion: number;
}

export function useStudioShellAiAccess({
  hydrated,
  user,
  apiKeyVersion,
}: UseStudioShellAiAccessOptions) {
  const [hostedProviders, setHostedProviders] = useState<HostedAiAvailability>({});
  const [aiCapabilitiesLoaded, setAiCapabilitiesLoaded] = useState(false);
  const [dgxReady, setDgxReady] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    const loadCapabilities = async () => {
      try {
        const response = await fetch('/api/ai-capabilities', { cache: 'no-store' });
        if (!response.ok) throw new Error(`Capability check failed: ${response.status}`);
        const data = await response.json() as { hosted?: Record<string, unknown>; hasDgx?: boolean };
        if (cancelled) return;

        const nextHosted: HostedAiAvailability = {};
        for (const providerId of PROVIDER_IDS) {
          nextHosted[providerId] = Boolean(data.hosted?.[providerId]);
        }
        setHostedProviders(nextHosted);

        if (data.hasDgx) {
          setDgxReady(true);
          setServerDgxCache(true);
        }
      } catch (error) {
        logger.warn('AI', 'Capability check failed', error);
        if (!cancelled) setHostedProviders({});
      } finally {
        if (!cancelled) setAiCapabilitiesLoaded(true);
      }
    };

    void loadCapabilities();
    return () => { cancelled = true; };
  }, [hydrated]);

  const activeProviderId = getActiveProvider();
  const hasLocalApiKey = hydrated
    && (apiKeyVersion >= 0)
    && (
      Boolean(getApiKey(activeProviderId))
      || hasStoredApiKey('lmstudio')
      || hasStoredApiKey('ollama')
    );
  const hasHostedAiAccess = hydrated && Boolean(user) && Boolean(hostedProviders[activeProviderId]);
  const dgxAvailable = dgxReady || hasDgxServiceFn();
  const hasAiAccess = hydrated && (hasLocalApiKey || hasHostedAiAccess || dgxAvailable);
  const hasQuickStartAccess = hydrated && (Boolean(getApiKey('gemini')) || dgxAvailable);

  return {
    activeProviderId,
    hostedProviders,
    aiCapabilitiesLoaded,
    hasHostedAiAccess,
    hasAiAccess,
    hasQuickStartAccess,
    showAiLock: aiCapabilitiesLoaded && !hasAiAccess,
    showQuickStartLock: aiCapabilitiesLoaded && !hasQuickStartAccess,
  };
}
