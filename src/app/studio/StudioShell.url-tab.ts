"use client";

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AppTab } from '@/lib/studio-types';

const VALID_TABS: AppTab[] = [
  'world',
  'writing',
  'history',
  'settings',
  'characters',
  'direction',
  'style',
  'manuscript',
  'docs',
  'visual',
];

export function useStudioUrlTab(pathname: string | null) {
  const studioRouter = useRouter();
  const [activeTab, setActiveTabRaw] = useState<AppTab>(() => {
    if (typeof window === 'undefined') return 'world';
    const urlTab = new URLSearchParams(window.location.search).get('tab');
    if (urlTab && VALID_TABS.includes(urlTab as AppTab)) return urlTab as AppTab;
    return 'world';
  });

  const setActiveTab = useCallback((tab: AppTab) => {
    setActiveTabRaw(tab);
    const params = new URLSearchParams(window.location.search);
    params.set('tab', tab);
    params.delete('worldImport');
    params.delete('postImport');
    params.delete('setup');
    studioRouter.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, studioRouter]);

  return { activeTab, setActiveTab };
}
