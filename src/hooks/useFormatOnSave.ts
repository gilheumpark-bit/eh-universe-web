"use client";
// ============================================================
// useFormatOnSave — 저장 시 자동 포맷팅 hook.
//
// 사용 패턴:
//   const { applyFormat, settings, setEnabled } = useFormatOnSave();
//   const beforeSave = (text: string) => applyFormat(text);
// ============================================================

import { useCallback, useState, useEffect } from 'react';
import { formatText, getAllFormatRules, type FormatOptions } from '@/lib/format-on-save/rules';

const STORAGE_KEY = 'loreguard_format_on_save';

interface FormatSettings {
  enabled: boolean;
  enabledRules: string[];
  quoteStyle?: 'curly' | 'straight';
  ellipsisStyle?: 'ellipsis' | 'dots';
}

function loadSettings(): FormatSettings {
  if (typeof window === 'undefined') {
    return defaultSettings();
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultSettings();
    const parsed = JSON.parse(raw) as FormatSettings;
    return {
      enabled: parsed.enabled ?? true,
      enabledRules: Array.isArray(parsed.enabledRules) ? parsed.enabledRules : defaultEnabledRules(),
      quoteStyle: parsed.quoteStyle,
      ellipsisStyle: parsed.ellipsisStyle,
    };
  } catch {
    return defaultSettings();
  }
}

function saveSettings(s: FormatSettings): boolean {
  if (typeof window === 'undefined') return false;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    return true;
  } catch {
    return false;
  }
}

function defaultEnabledRules(): string[] {
  return getAllFormatRules().filter((r) => r.enabledByDefault).map((r) => r.id);
}

function defaultSettings(): FormatSettings {
  return {
    // [정합 재조정 — 2026-05-07] "우리는 선생이 아니다."
    // 작가 의도 영역 (따옴표 / 빈 줄 등) — 자동 변경 침해 회피 → 기본 OFF.
    // 작가가 명시 ON 시만 작동.
    enabled: false,
    enabledRules: defaultEnabledRules(),
  };
}

export interface UseFormatOnSaveResult {
  settings: FormatSettings;
  setEnabled: (enabled: boolean) => void;
  toggleRule: (ruleId: string) => void;
  setQuoteStyle: (style: 'curly' | 'straight' | undefined) => void;
  applyFormat: (text: string) => string;
}

export function useFormatOnSave(): UseFormatOnSaveResult {
  const [settings, setSettings] = useState<FormatSettings>(() => loadSettings());

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const setEnabled = useCallback((enabled: boolean) => {
    setSettings((s) => ({ ...s, enabled }));
  }, []);

  const toggleRule = useCallback((ruleId: string) => {
    setSettings((s) => {
      const set = new Set(s.enabledRules);
      if (set.has(ruleId)) set.delete(ruleId);
      else set.add(ruleId);
      return { ...s, enabledRules: Array.from(set) };
    });
  }, []);

  const setQuoteStyle = useCallback((style: 'curly' | 'straight' | undefined) => {
    setSettings((s) => ({ ...s, quoteStyle: style }));
  }, []);

  const applyFormat = useCallback(
    (text: string): string => {
      if (!settings.enabled) return text;
      const opts: FormatOptions = {
        enabledRules: new Set(settings.enabledRules),
        quoteStyle: settings.quoteStyle,
        ellipsisStyle: settings.ellipsisStyle,
      };
      return formatText(text, opts);
    },
    [settings],
  );

  return {
    settings,
    setEnabled,
    toggleRule,
    setQuoteStyle,
    applyFormat,
  };
}
