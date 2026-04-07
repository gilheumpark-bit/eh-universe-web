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

  useEffect(() => {
    if (!currentSession || !config) return;
    // Only re-run when episode changes
    if (config.episode === lastSuggestionEp.current) return;
    lastSuggestionEp.current = config.episode;

    try {
      const sgConfig = getDefaultSuggestionConfig('intermediate');
      const msgs = currentSession.messages;
      const recentMetrics = msgs
        .filter((m: Message) => m.role === 'assistant' && m.meta?.metrics)
        .slice(-5)
        .map((m: Message) => ({
          tension: m.meta!.metrics!.tension,
          pacing: m.meta!.metrics!.pacing,
          immersion: m.meta!.metrics!.immersion,
          eos: m.meta?.eosScore ?? 0,
          grade: m.meta?.grade ?? 'C',
        }));
      const charNames = config.characters.map(c => c.name);
      const charLastAppearance: Record<string, number> = {};
      charNames.forEach(name => { charLastAppearance[name] = config.episode; });

      const newSuggestions = generateSuggestions({
        config, currentEpisode: config.episode,
        recentMetrics, characterNames: charNames,
        characterLastAppearance: charLastAppearance, language,
      }, sgConfig, suggestions);
      setSuggestions(newSuggestions);
    } catch {
      // Proactive suggestions are non-critical
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSession, config, language]);

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
