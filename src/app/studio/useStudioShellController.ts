/**
 * useStudioShellController.ts
 * 
 * Central controller hook that orchestrates studio-level concerns:
 * - WorldSimData → AI prompt injection readiness check
 * - Proactive suggestion aggregation
 * - Session-level quality gate coordination
 * 
 * This hook consolidates cross-cutting concerns that don't belong
 * in any single feature hook but are needed by the StudioShell.
 */

import { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import { logger } from '@/lib/logger';
import type {
  StoryConfig, ChatSession, AppLanguage,
  ProactiveSuggestion, Message,
} from '@/lib/studio-types';
import { generateSuggestions, getDefaultSuggestionConfig } from '@/engine/proactive-suggestions';

// ============================================================
// Types
// ============================================================

export interface StudioControllerState {
  /** Whether worldSimData is populated and will be injected into AI prompts */
  worldSimConnected: boolean;
  /** Count of civilization entries in simulator */
  worldSimCivCount: number;
  /** Count of relations in simulator */
  worldSimRelationCount: number;
  /** Current proactive suggestions for the session */
  suggestions: ProactiveSuggestion[];
  /** Dismiss a suggestion by id */
  dismissSuggestion: (id: string) => void;
  /** Whether the 3-tier world framework has any content filled */
  worldFrameworkFilled: boolean;
  /** Percentage of world framework fields that are populated (0-100) */
  worldFrameworkCompleteness: number;
  /** Set proactive suggestions manually if needed */
  setSuggestions: React.Dispatch<React.SetStateAction<ProactiveSuggestion[]>>;
}

// ============================================================
// World Framework completeness calculation
// ============================================================

const WORLD_FRAMEWORK_FIELDS: (keyof StoryConfig)[] = [
  'corePremise', 'powerStructure', 'currentConflict',
  'worldHistory', 'socialSystem', 'economy', 'magicTechSystem',
  'factionRelations', 'survivalEnvironment',
  'culture', 'religion', 'education', 'lawOrder', 'taboo',
  'dailyLife', 'travelComm', 'truthVsBeliefs',
];

function calcWorldCompleteness(config: StoryConfig): number {
  let filled = 0;
  for (const key of WORLD_FRAMEWORK_FIELDS) {
    const val = config[key];
    if (typeof val === 'string' && val.trim().length > 0) filled++;
  }
  return Math.round((filled / WORLD_FRAMEWORK_FIELDS.length) * 100);
}

// ============================================================
// Hook
// ============================================================

export function useStudioShellController(
  currentSession: ChatSession | null,
  language: AppLanguage,
): StudioControllerState {
  const config = currentSession?.config;

  const worldSimConnected = useMemo(() => {
    if (!config?.worldSimData) return false;
    const ws = config.worldSimData;
    return !!((ws.civs && ws.civs.length > 0) || (ws.genreSelections && ws.genreSelections.length > 0));
  }, [config?.worldSimData]);

  const worldSimCivCount = config?.worldSimData?.civs?.length ?? 0;
  const worldSimRelationCount = config?.worldSimData?.relations?.length ?? 0;

  // -- World Framework completeness --
  const worldFrameworkCompleteness = useMemo(() => {
    if (!config) return 0;
    return calcWorldCompleteness(config);
  }, [config]);

  const worldFrameworkFilled = worldFrameworkCompleteness > 0;

  // -- Proactive suggestions --
  const [suggestions, setSuggestions] = useState<ProactiveSuggestion[]>([]);
  const lastSuggestionEp = useRef<number>(-1);

  // [루프 4 P9 — 2026-06-08] INP ≤ 200ms 목표 보호 — 메시지 1k+/세션 동기 순회 비용 절감.
  // assistant + metrics 가진 메시지만 추출 → slice(-5) 만. 메시지 길이 의존성 분리.
  // 메시지 변경 빈도 << episode 변경 빈도 — 두 dep 분리로 불필요 재계산 차단.
  const recentMetricsSignature = useMemo(() => {
    if (!currentSession) return null;
    const msgs = currentSession.messages;
    // 역방향 단방향 순회 — 마지막 5개만 수집 후 즉시 break.
    // 1k+ 메시지에서 O(n) → O(5) 로 격하 (1차원적 reduce).
    const collected: ProactiveSuggestion[] | unknown = [];
    void collected;
    const out: Array<{ tension: number; pacing: number; immersion: number; eos: number; grade: string }> = [];
    for (let i = msgs.length - 1; i >= 0 && out.length < 5; i--) {
      const m = msgs[i] as Message;
      if (m.role !== 'assistant') continue;
      if (!m.meta?.metrics) continue;
      out.unshift({
        tension: m.meta.metrics.tension ?? 50,
        pacing: m.meta.metrics.pacing ?? 50,
        immersion: m.meta.metrics.immersion ?? 50,
        eos: m.meta?.eosScore ?? 0,
        grade: m.meta?.grade ?? 'C',
      });
    }
    return out;
  }, [currentSession]);

  useEffect(() => {
    if (!currentSession || !config) return;
    // Only re-run when episode changes
    if (config.episode === lastSuggestionEp.current) return;
    lastSuggestionEp.current = config.episode;

    try {
      // Pull/Push 브랜드 철학 Part 2.3 — 사용자 opt-out 확인
      // localStorage.noa_suggestions_disabled === '1' 이면 선제 제안 생성 skip (Pull 전용)
      const pullOnly = typeof window !== 'undefined' && localStorage.getItem('noa_suggestions_disabled') === '1';
      if (pullOnly) {
        setSuggestions([]);
        return;
      }
      const sgConfig = getDefaultSuggestionConfig('intermediate');
      const recentMetrics = recentMetricsSignature ?? [];
      const charNames = (config.characters ?? []).map(c => c.name);
      const charLastAppearance: Record<string, number> = {};
      charNames.forEach(name => { charLastAppearance[name] = config.episode; });

      const newSuggestions = generateSuggestions({
        config, currentEpisode: config.episode,
        recentMetrics, characterNames: charNames,
        characterLastAppearance: charLastAppearance, language,
      }, sgConfig, suggestions);
      setSuggestions(newSuggestions);
    } catch (err) {
      logger.warn('StudioShell', 'suggestion update failed', err);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSession, config, language, recentMetricsSignature]);

  const dismissSuggestion = useCallback((id: string) => {
    setSuggestions((prev: ProactiveSuggestion[]) => prev.map((s: ProactiveSuggestion) =>
      s.id === id ? { ...s, dismissed: true, dismissCount: s.dismissCount + 1 } : s
    ));
  }, []);

  return {
    worldSimConnected,
    worldSimCivCount,
    worldSimRelationCount,
    suggestions,
    setSuggestions,
    dismissSuggestion,
    worldFrameworkFilled,
    worldFrameworkCompleteness,
  };
}
