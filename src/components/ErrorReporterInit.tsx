'use client';

import { useEffect } from 'react';
import { initErrorReporter } from '@/lib/error-reporter';

export default function ErrorReporterInit() {
  useEffect(() => {
    initErrorReporter();

    // Service Worker registration (offline caching)
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* SW registration failure is non-critical */
      });
    }
  }, []);
  return null;
}
