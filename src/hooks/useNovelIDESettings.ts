"use client";
// ============================================================
// useNovelIDESettings — Novel IDE 마스터 토글 React hook.
//
// 'noa:novel-ide-settings-changed' event listen → 모든 구독자 동기화.
// 사용:
//   const { settings, toggle } = useNovelIDESettings();
//   if (settings.symbolDecorationVisible) { ... }
//   <button onClick={() => toggle('symbolDecorationVisible')}>...</button>
// ============================================================

import { useCallback, useEffect, useState } from 'react';
import {
  loadSettings,
  updateSetting,
  type NovelIDESettings,
} from '@/lib/novel-ide-settings/store';

export interface UseNovelIDESettingsResult {
  settings: NovelIDESettings;
  toggle: (key: keyof NovelIDESettings) => void;
  set: <K extends keyof NovelIDESettings>(key: K, value: NovelIDESettings[K]) => void;
}

export function useNovelIDESettings(): UseNovelIDESettingsResult {
  const [settings, setSettings] = useState<NovelIDESettings>(() => loadSettings());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<NovelIDESettings>).detail;
      if (detail) setSettings(detail);
    };
    window.addEventListener('noa:novel-ide-settings-changed', handler as EventListener);
    return () => window.removeEventListener('noa:novel-ide-settings-changed', handler as EventListener);
  }, []);

  const toggle = useCallback((key: keyof NovelIDESettings) => {
    const next = updateSetting(key, !settings[key]);
    setSettings(next);
  }, [settings]);

  const set = useCallback(
    <K extends keyof NovelIDESettings>(key: K, value: NovelIDESettings[K]) => {
      const next = updateSetting(key, value);
      setSettings(next);
    },
    [],
  );

  return { settings, toggle, set };
}
