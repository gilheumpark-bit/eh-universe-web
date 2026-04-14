'use client';

import { useState, useCallback, useRef } from 'react';
import { evaluateQuality, buildRetryHint, getDefaultGateConfig } from '@/engine/quality-gate';
import type { StoryConfig, SkillLevel, AppLanguage } from '@/lib/studio-types';

// ============================================================
// PART 1 — Types
// ============================================================

export interface UseQualityGateRetryResult {
  passed: boolean | null;
  grade: string | null;
  attempts: number;
  maxRetries: number;
  lastHint: string | null;
  retrying: boolean;
  evaluate: (content: string) => Promise<void>;
  reset: () => void;
}

// ============================================================
// PART 2 — Hook
// ============================================================

export function useQualityGateRetry(
  config: StoryConfig,
  options?: { skillLevel?: SkillLevel; language?: AppLanguage },
): UseQualityGateRetryResult {
  const skillLevel = options?.skillLevel ?? 'intermediate';
  const language = options?.language ?? 'KO';
  // Store config as state (not ref) so maxRetries can be read during render
  const [gateConfigState] = useState(() => getDefaultGateConfig(skillLevel));
  const gateConfig = useRef(gateConfigState);

  const [passed, setPassed] = useState<boolean | null>(null);
  const [grade, setGrade] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [lastHint, setLastHint] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  const evaluate = useCallback(async (content: string) => {
    setRetrying(true);
    const attempt = attempts + 1;
    setAttempts(attempt);

    const result = evaluateQuality(
      content,
      config,
      gateConfig.current.thresholds,
      language,
      attempt,
    );

    setPassed(result.passed);
    setGrade(result.grade);

    if (!result.passed && attempt < gateConfig.current.maxRetries) {
      const hint = buildRetryHint(result, attempt, language === 'KO');
      setLastHint(hint);
    } else {
      setLastHint(null);
    }

    setRetrying(false);
  }, [attempts, config, language]);

  const reset = useCallback(() => {
    setPassed(null);
    setGrade(null);
    setAttempts(0);
    setLastHint(null);
    setRetrying(false);
  }, []);

  return {
    passed,
    grade,
    attempts,
    maxRetries: gateConfigState.maxRetries,
    lastHint,
    retrying,
    evaluate,
    reset,
  };
}
