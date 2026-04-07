// ============================================================
// PART 1 — Imports & Types
// ============================================================

import { useState, useRef, useCallback } from 'react';
import { logger } from '@/lib/logger';
import { streamChat, getApiKey, getActiveProvider } from '@/lib/ai-providers';
import { streamWithMultiKey, isMultiKeyActive } from '@/lib/multi-key-bridge';
import { getTierLimits, type UserTier } from '@/lib/tier-gate';
import type { EpisodeManuscript, TranslatedManuscriptEntry } from '@/lib/studio-types';
import {
  type TranslationConfig,
  type TranslationMode,
  type TranslationChunk,
  type TranslationProgress,
  type TranslatedEpisode,
  type ChunkScoreDetail,
  type TranslatorProfile,
  getDefaultConfig,
  chunkBySentences,
  adaptiveChunkSize,
  buildTranslationSystemPrompt,
  buildScoringPrompt,
  buildRecreatePrompt,
  parseScoreResponse,
  buildAutoBridge,
  updateTranslatorProfile,
  verifyGlossary,
  verifyLength,
  hasCriticalAxisFailure,
  createConsistencyTracker,
  updateConsistencyTracker,
} from '@/engine/translation';

/** 일괄 번역 에피소드 레벨 진행률 */
export interface BatchProgress {
  totalEpisodes: number;
  completedEpisodes: number;
  currentEpisode: number;
  chunkProgress: TranslationProgress;
}

interface UseTranslationParams {
  onProgress?: (progress: TranslationProgress) => void;
  onBatchProgress?: (progress: BatchProgress) => void;
  onChunkComplete?: (chunk: TranslationChunk) => void;
  onError?: (error: string) => void;
  /** 번역 완료 시 호출 — TranslatedManuscriptEntry를 StoryConfig에 저장하는 용도 */
  onSave?: (entry: TranslatedManuscriptEntry) => void;
  /** 번역 프로필 업데이트 콜백 — 오류 패턴 학습 */
  onProfileUpdate?: (profile: TranslatorProfile) => void;
  /**
   * Real-time glossary provider. When supplied, translateBatch reads fresh glossary
   * before each episode instead of using the stale config snapshot.
   * Return format: GlossaryEntry[] from the current GlossaryManager state.
   */
  getLatestGlossary?: () => import('@/engine/translation').GlossaryEntry[];
}

interface UseTranslationReturn {
  translateEpisode: (
    manuscript: EpisodeManuscript,
    config?: Partial<TranslationConfig>,
    signal?: AbortSignal
  ) => Promise<TranslatedEpisode | null>;

  translateBatch: (
    manuscripts: EpisodeManuscript[],
    config?: Partial<TranslationConfig>,
    signal?: AbortSignal
  ) => Promise<TranslatedEpisode[]>;

  progress: TranslationProgress;
  batchProgress: BatchProgress;
  isTranslating: boolean;
  abort: () => void;
}

// ============================================================
// PART 2 — AI 호출 헬퍼
// ============================================================

async function callAI(
  systemPrompt: string,
  userPrompt: string,
  signal?: AbortSignal,
  temperature: number = 0.3
): Promise<string> {
  let result = '';

  // TM 캐시 조회 — 동일 문장이면 API 호출 스킵
  try {
    const { searchTM } = await import('@/lib/translation');
    const matches = searchTM(userPrompt.slice(0, 500), 'EN', 0.95);
    if (matches.length > 0 && matches[0].type === 'exact') {
      return matches[0].entry.target;
    }
  } catch { /* TM lookup is best-effort */ }

  const opts = {
    systemInstruction: systemPrompt,
    messages: [{ role: 'user' as const, content: userPrompt }],
    temperature,
    signal,
    onChunk: (text: string) => { result += text; },
  };

  // 멀티키 활성 시 translator 역할 슬롯 사용, 아니면 기존 단일키
  if (isMultiKeyActive()) {
    await streamWithMultiKey({ ...opts, role: 'translator' });
  } else {
    const apiKey = getApiKey(getActiveProvider());
    if (!apiKey) throw new Error('API key not configured');
    await streamChat(opts);
  }
  return result.trim();
}

/** MODE1/MODE2별 채점 JSON schema */
const FIDELITY_SCORE_SCHEMA = {
  type: 'object' as const,
  properties: {
    translationese: { type: 'number' as const },
    fidelity: { type: 'number' as const },
    naturalness: { type: 'number' as const },
    consistency: { type: 'number' as const },
  },
  required: ['translationese', 'fidelity', 'naturalness', 'consistency'],
};

const EXPERIENCE_SCORE_SCHEMA = {
  type: 'object' as const,
  properties: {
    immersion: { type: 'number' as const },
    emotionResonance: { type: 'number' as const },
    culturalFit: { type: 'number' as const },
    consistency: { type: 'number' as const },
    groundedness: { type: 'number' as const },
    voiceInvisibility: { type: 'number' as const },
  },
  required: ['immersion', 'emotionResonance', 'culturalFit', 'consistency', 'groundedness', 'voiceInvisibility'],
};

/**
 * 채점: /api/structured-generate (범용 JSON 생성) 우선 → 실패 시 스트리밍 폴백.
 * gemini-structured는 task 화이트리스트에 translationScore가 없어 사용 불가.
 */
async function scoreTranslation(
  sourceText: string,
  translatedText: string,
  config: TranslationConfig,
  signal?: AbortSignal,
  userTier: UserTier = 'free',
): Promise<ChunkScoreDetail> {
  const prompt = buildScoringPrompt(sourceText, translatedText, config);
  const schema = config.mode === 'fidelity' ? FIDELITY_SCORE_SCHEMA : EXPERIENCE_SCORE_SCHEMA;

  // 1차: structured-generate (범용 JSON 라우트 — provider 무관)
  try {
    const provider = getActiveProvider();
    const apiKey = getApiKey(provider);
    const resp = await fetch('/api/structured-generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: signal ?? AbortSignal.timeout(30_000),
      body: JSON.stringify({
        provider,
        prompt,
        schema,
        apiKey: apiKey || undefined,
      }),
    });
    if (resp.ok) {
      const data = await resp.json();
      const raw = typeof data === 'string' ? data : JSON.stringify(data);
      const primaryScore = parseScoreResponse(raw, config.mode);

      // 멀티키 활성 + 티어 허용 시 2차 교차 검증 (analyst 역할 슬롯 사용)
      const tierLimits = getTierLimits(userTier);
      if (isMultiKeyActive() && tierLimits.translation.crossValidation) {
        try {
          let secondaryRaw = '';
          await streamWithMultiKey({
            role: 'analyst',
            systemInstruction: 'You are a translation quality scoring system. Respond ONLY with the JSON object requested.',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1,
            signal: signal ?? AbortSignal.timeout(30_000),
            onChunk: (c) => { secondaryRaw += c; },
          });
          if (secondaryRaw.trim()) {
            const secondaryScore = parseScoreResponse(secondaryRaw, config.mode);
            // 두 점수의 평균으로 교차 검증 (편차가 크면 보수적 점수 채택)
            return mergeScores(primaryScore, secondaryScore);
          }
        } catch {
          // 교차 검증 실패 시 1차 점수 그대로 사용
        }
      }

      return primaryScore;
    }
  } catch {
    // structured output 실패 → 스트리밍 폴백
  }

  // 2차: 스트리밍 폴백
  const raw = await callAI(
    'You are a translation quality scoring system. Respond ONLY with the JSON object requested.',
    prompt,
    signal,
    0.1
  );
  return parseScoreResponse(raw, config.mode);
}

/** 두 점수를 병합: 평균 + 편차가 클 때 보수적 점수 선택 */
function mergeScores(a: ChunkScoreDetail, b: ChunkScoreDetail): ChunkScoreDetail {
  const merged = { ...a } as unknown as Record<string, number>;
  const bRec = b as unknown as Record<string, number>;
  // 'overall' 제외한 숫자 축들을 평균
  const aRec = a as unknown as Record<string, unknown>;
  const axisKeys = Object.keys(a).filter(k => k !== 'overall' && typeof aRec[k] === 'number');
  for (const key of axisKeys) {
    const va = merged[key] ?? 0;
    const vb = bRec[key] ?? 0;
    const diff = Math.abs(va - vb);
    // 편차 > 20이면 보수적(낮은) 쪽, 아니면 평균
    merged[key] = diff > 20 ? Math.min(va, vb) : Math.round((va + vb) / 2);
  }
  // 전체 점수도 재계산
  const axisValues = axisKeys.map(k => merged[k]).filter((v): v is number => typeof v === 'number');
  merged.overall = axisValues.length > 0 ? Math.round(axisValues.reduce((s, v) => s + v, 0) / axisValues.length) : a.overall;
  return merged as unknown as ChunkScoreDetail;
}

// ============================================================
// PART 3 — Hook 구현
// ============================================================

/**
 * Convert a TranslatedEpisode result into a TranslatedManuscriptEntry for persistent storage.
 * @param result - Completed translation result with chunks, scores, and glossary
 * @param title - Optional translated episode title
 */
export function toManuscriptEntry(
  result: TranslatedEpisode,
  title: string = ''
): TranslatedManuscriptEntry {
  return {
    episode: result.episode,
    sourceLang: result.sourceLang,
    targetLang: result.targetLang,
    mode: result.mode,
    translatedTitle: title,
    translatedContent: result.translatedText,
    charCount: result.translatedText.length,
    avgScore: result.avgScore,
    band: result.band,
    glossarySnapshot: result.glossarySnapshot.map(g => ({
      source: g.source, target: g.target, locked: g.locked,
    })),
    lastUpdate: result.timestamp,
  };
}

/**
 * AI-powered translation hook with chunk-level scoring, recreation loop, glossary enforcement,
 * batch mode with auto-context bridging, and translator profile learning.
 */
export function useTranslation({
  onProgress,
  onBatchProgress,
  onChunkComplete,
  onError,
  onSave,
  onProfileUpdate,
  getLatestGlossary,
}: UseTranslationParams = {}): UseTranslationReturn {

  const [progress, setProgress] = useState<TranslationProgress>({
    totalChunks: 0, completedChunks: 0, currentChunk: 0,
    recreateCount: 0, status: 'idle',
  });
  const [batchProgress, setBatchProgress] = useState<BatchProgress>({
    totalEpisodes: 0, completedEpisodes: 0, currentEpisode: 0,
    chunkProgress: { totalChunks: 0, completedChunks: 0, currentChunk: 0, recreateCount: 0, status: 'idle' },
  });
  const [isTranslating, setIsTranslating] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const inFlightRef = useRef(false);
  const progressRef = useRef(progress); // 클로저에서 최신 progress 접근용
  progressRef.current = progress;

  const updateProgress = useCallback((patch: Partial<TranslationProgress>) => {
    setProgress((prev: TranslationProgress) => {
      const next = { ...prev, ...patch };
      onProgress?.(next);
      return next;
    });
  }, [onProgress]);

  // 단일 청크: 번역 → 채점 → 재창조 루프
  const translateChunk = useCallback(async (
    chunkText: string,
    chunkIndex: number,
    config: TranslationConfig,
    systemPrompt: string,
    signal?: AbortSignal
  ): Promise<TranslationChunk> => {

    let translatedText = '';
    let score = 0;
    let attempt = 0;
    let passed = false;
    let lastScore: ChunkScoreDetail | null = null;

    // 1차 번역
    updateProgress({ status: 'translating', currentChunk: chunkIndex });
    translatedText = await callAI(systemPrompt, chunkText, signal);
    attempt = 1;

    // 채점 + 복합 pass 판정 (종합 점수 + 축별 임계값 + locked 용어 검증)
    const checkPassed = (s: ChunkScoreDetail, text: string): boolean => {
      // 종합 점수 미달 → 실패
      if (s.overall < config.scoreThreshold) return false;
      // 축별 critical failure → 실패
      if (hasCriticalAxisFailure(s, config.mode)) return false;
      // locked 용어 미존재 → 실패
      if (config.glossary.length > 0) {
        const gv = verifyGlossary(chunkText, text, config.glossary);
        if (!gv.passed) return false;
      }
      return true;
    };

    updateProgress({ status: 'scoring' });
    lastScore = await scoreTranslation(chunkText, translatedText, config, signal);
    score = lastScore.overall;
    passed = checkPassed(lastScore, translatedText);

    // 미달 → 재창조
    let recreateAttempt = 0;
    while (!passed && recreateAttempt < config.maxRecreate) {
      recreateAttempt++;
      attempt++;
      updateProgress({ status: 'recreating', recreateCount: recreateAttempt });

      const recreatePrompt = buildRecreatePrompt(
        chunkText, translatedText, lastScore, recreateAttempt, config.mode
      );
      translatedText = await callAI(systemPrompt, recreatePrompt, signal, 0.5 + recreateAttempt * 0.1);

      updateProgress({ status: 'scoring' });
      lastScore = await scoreTranslation(chunkText, translatedText, config, signal);
      score = lastScore.overall;
      passed = checkPassed(lastScore, translatedText);
    }

    const chunk: TranslationChunk = {
      index: chunkIndex, sourceText: chunkText, translatedText, score, attempt, passed,
    };
    onChunkComplete?.(chunk);
    return chunk;
  }, [updateProgress, onChunkComplete]);

  // 에피소드 번역
  const translateEpisode = useCallback(async (
    manuscript: EpisodeManuscript,
    configOverride?: Partial<TranslationConfig>,
    externalSignal?: AbortSignal,
    _isInternal?: boolean
  ): Promise<TranslatedEpisode | null> => {
    if (!_isInternal) {
      if (inFlightRef.current) return null;
      inFlightRef.current = true;
    }

    const mode: TranslationMode = configOverride?.mode ?? 'fidelity';
    const config: TranslationConfig = { ...getDefaultConfig(mode), ...configOverride };
    const controller = new AbortController();
    abortRef.current = controller;

    // externalSignal → controller 연결 (리스너 누수 방지: named handler + finally에서 제거)
    const onExternalAbort = () => controller.abort();
    if (externalSignal) {
      externalSignal.addEventListener('abort', onExternalAbort);
    }
    const signal = controller.signal;

    try {
      setIsTranslating(true);

      // 토큰 예산 기반 청크 크기 자동 조정 (CJK는 토큰 밀도가 높음)
      const chunkSize = adaptiveChunkSize(manuscript.content);
      const sourceChunks = chunkBySentences(manuscript.content, chunkSize);
      updateProgress({
        totalChunks: sourceChunks.length, completedChunks: 0,
        currentChunk: 0, recreateCount: 0, status: 'translating',
      });

      const systemPrompt = buildTranslationSystemPrompt(config);

      const chunks: TranslationChunk[] = new Array(sourceChunks.length);
      const tracker = createConsistencyTracker();
      const BATCH_SIZE = 3;

      let completedCount = 0;
      for (let i = 0; i < sourceChunks.length; i += BATCH_SIZE) {
        if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
        const batch = sourceChunks.slice(i, i + BATCH_SIZE);
        
        const batchResults = await Promise.all(
          batch.map((chunkText, batchIdx) => 
            translateChunk(chunkText, i + batchIdx, config, systemPrompt, signal)
          )
        );

        batchResults.forEach((chunk, batchIdx) => {
          chunks[i + batchIdx] = chunk;
          updateConsistencyTracker(tracker, i + batchIdx, chunk.translatedText, config.glossary);
        });

        completedCount += batchResults.length;
        updateProgress({ completedChunks: completedCount });
      }

      const translatedText = chunks.map(c => c.translatedText).join('\n\n');

      // 에피소드 레벨 길이 검증
      const lengthCheck = verifyLength(
        manuscript.content, translatedText, config.targetLang, config.mode,
      );
      if (!lengthCheck.passed) {
        logger.warn('Translation', 'Length verification issues:', lengthCheck.issues);
      }
      if (tracker.inconsistencies.length > 0) {
        logger.warn('Translation', 'Cross-chunk consistency issues:', tracker.inconsistencies);
      }
      const avgScore = chunks.length > 0
        ? chunks.reduce((sum, c) => sum + c.score, 0) / chunks.length : 0;

      const result: TranslatedEpisode = {
        episode: manuscript.episode,
        sourceLang: 'KO',
        targetLang: config.targetLang,
        mode: config.mode,
        band: config.band,
        sourceText: manuscript.content,
        translatedText,
        chunks,
        avgScore: Math.round(avgScore * 1000) / 1000,
        glossarySnapshot: [...config.glossary],
        timestamp: Date.now(),
      };

      updateProgress({ status: 'done' });

      // 번역 완료 → 저장 콜백 호출
      if (onSave) {
        onSave(toManuscriptEntry(result, manuscript.title));
      }

      // 번역 프로필 업데이트 — 오류 패턴 학습
      if (onProfileUpdate && config.translatorProfile) {
        const errors: string[] = [];
        // 청크별 실패 패턴 수집
        for (const c of chunks) {
          if (!c.passed) errors.push('score_below_threshold');
          if (c.attempt > 1) errors.push('required_recreation');
        }
        // 용어 일관성: 통과 비율
        const termConsistency = chunks.length > 0
          ? chunks.filter(c => c.passed).length / chunks.length : 1;
        const updated = updateTranslatorProfile(
          config.translatorProfile, result.avgScore, termConsistency, result.avgScore, errors,
        );
        onProfileUpdate(updated);
      }

      return result;

    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        updateProgress({ status: 'idle' });
        return null;
      }
      const msg = err instanceof Error ? err.message : String(err);
      updateProgress({ status: 'error', error: msg });
      onError?.(msg);
      return null;
    } finally {
      setIsTranslating(false);
      abortRef.current = null;
      if (!_isInternal) inFlightRef.current = false;
      if (externalSignal) externalSignal.removeEventListener('abort', onExternalAbort);
    }
  }, [translateChunk, updateProgress, onError, onSave, onProfileUpdate]);

  // 일괄 번역 — 에피소드 진행률 + 자동 컨텍스트 브릿지
  const translateBatch = useCallback(async (
    manuscripts: EpisodeManuscript[],
    configOverride?: Partial<TranslationConfig>,
    externalSignal?: AbortSignal
  ): Promise<TranslatedEpisode[]> => {
    if (inFlightRef.current) return [];
    inFlightRef.current = true;
    try {
      const results: TranslatedEpisode[] = [];
      const mode: TranslationMode = configOverride?.mode ?? 'fidelity';
      const baseConfig: TranslationConfig = { ...getDefaultConfig(mode), ...configOverride };

      const updateBatch = (patch: Partial<BatchProgress>) => {
        setBatchProgress(prev => {
          const next = { ...prev, ...patch };
          onBatchProgress?.(next);
          return next;
        });
      };

    updateBatch({ totalEpisodes: manuscripts.length, completedEpisodes: 0, currentEpisode: 0 });

    for (let i = 0; i < manuscripts.length; i++) {
      if (externalSignal?.aborted) break;

      updateBatch({ currentEpisode: i + 1, chunkProgress: progressRef.current });

      // 자동 컨텍스트 브릿지: 이전 화 번역 결과에서 생성
      const episodeConfig = { ...baseConfig };

      // Real-time glossary injection: read fresh glossary before each episode
      if (getLatestGlossary) {
        const freshGlossary = getLatestGlossary();
        if (freshGlossary.length > 0) {
          episodeConfig.glossary = freshGlossary;
        }
      }

      if (results.length > 0) {
        episodeConfig.contextBridge = buildAutoBridge(results[results.length - 1], episodeConfig.glossary);
      }

      const result = await translateEpisode(manuscripts[i], episodeConfig, externalSignal, true);
      if (result) {
        results.push(result);
        updateBatch({ completedEpisodes: i + 1 });
      }
    }
    return results;
    } finally {
      inFlightRef.current = false;
    }
  }, [translateEpisode, onBatchProgress]);

  const abort = useCallback(() => { abortRef.current?.abort(); }, []);

  return { translateEpisode, translateBatch, progress, batchProgress, isTranslating, abort };
}

// IDENTITY_SEAL: PART-1 | role=ImportsTypes | inputs=none | outputs=UseTranslationReturn
// IDENTITY_SEAL: PART-2 | role=AIHelper | inputs=prompt,signal | outputs=string,ChunkScoreDetail
// IDENTITY_SEAL: PART-3 | role=HookImpl | inputs=manuscript,config | outputs=TranslatedEpisode,progress
