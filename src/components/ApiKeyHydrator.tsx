"use client";

import { useEffect } from 'react';
import { hydrateAllApiKeys } from '@/lib/ai-providers';

/**
 * #19: Pre-loads v4 AES-GCM keys into memory cache on app start.
 * Runs once on mount so that synchronous getApiKey() works for v4-encrypted keys.
 */
export default function ApiKeyHydrator() {
  useEffect(() => {
    hydrateAllApiKeys().catch(() => {
      // Silent failure — keys will be loaded lazily on first use
    });
  }, []);
  return null;
}
