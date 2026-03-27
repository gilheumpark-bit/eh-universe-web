// ============================================================
// PART 1 — Imports & Types
// ============================================================

import { useState, useRef, useCallback } from 'react';
import { streamChat, getApiKey, getActiveProvider } from '@/lib/ai-providers';
import type { EpisodeManuscript } from '@/lib/studio-types';
import {
  type TranslationConfig,
  type TranslationChunk,
  type TranslationProgress,
  type TranslatedEpisode,
  type ChunkScoreDetail,
  getDefaultConfig,
  chunkBySentences,
  buildTranslationSystemPrompt,
  buildScoringPrompt,
  buildRecreatePrompt,
  parseScoreResponse,
} from '@/engine/translation';

interface UseTranslationParams {
  onProgress?: (progress: TranslationProgress) => void;
  onChunkComplete?: (chunk: TranslationChunk) => void;
  onError?: (error: string) => void;
}

interface UseTranslationReturn {
  /** 단일 에피소드 번역 */
  translateEpisode: (
    manuscript: EpisodeManuscript,
    config?: Partial<TranslationConfig>,
    signal?: AbortSignal
  ) => Promise<TranslatedEpisode | null>;

  /** 일괄 번역 (여러 에피소드) */
  translateBatch: (
    manuscripts: EpisodeManuscript[],
    config?: Partial<TranslationConfig>,
    signal?: AbortSignal
  ) => Promise<TranslatedEpisode[]>;

  /** 현재 진행 상태 */
  progress: TranslationProgress;

  /** 번역 중 여부 */
  isTranslating: boolean;

  /** 중단 */
  abort: () => void;
}

// ============================================================
// PART 2 — AI 호출 헬퍼
// ============================================================

/** 스트리밍으로 AI 응답 받기 (번역/채점 공용) */
async function callAI(
  systemPrompt: string,
  userPrompt: string,
  signal?: AbortSignal,
  temperature: number = 0.3
): Promise<string> {
  const provider = getActiveProvider();
  const apiKey = getApiKey(provider);
  if (!apiKey) throw new Error('API key not configured');

  let result = '';
  await streamChat({
    systemInstruction: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
    temperature,
    signal,
    onChunk: (text: string) => { result += text; },
  });
  return result.trim();
}

/** 채점 전용 AI 호출 — 낮은 temperature로 일관성 확보 */
async function scoreTranslation(
  sourceText: string,
  translatedText: string,
  config: TranslationConfig,
  signal?: AbortSignal
): Promise<ChunkScoreDetail> {
  const prompt = buildScoringPrompt(sourceText, translatedText, config);
  const raw = await callAI(
    'You are a translation quality scoring system. Respond ONLY with the JSON object requested.',
    prompt,
    signal,
    0.1
  );
  return parseScoreResponse(raw);
}

// ============================================================
// PART 3 — Hook 구현
// ============================================================

export function useTranslation({
  onProgress,
  onChunkComplete,
  onError,
}: UseTranslationParams = {}): UseTranslationReturn {

  const [progress, setProgress] = useState<TranslationProgress>({
    totalChunks: 0,
    completedChunks: 0,
    currentChunk: 0,
    recreateCount: 0,
    status: 'idle',
  });
  const [isTranslating, setIsTranslating] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const updateProgress = useCallback((patch: Partial<TranslationProgress>) => {
    setProgress((prev: TranslationProgress) => {
      const next = { ...prev, ...patch };
      onProgress?.(next);
      return next;
    });
  }, [onProgress]);

  // --------------------------------------------------------
  // 단일 청크 번역 + 채점 + 재창조 루프
  // --------------------------------------------------------
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

    // 채점
    updateProgress({ status: 'scoring' });
    lastScore = await scoreTranslation(chunkText, translatedText, config, signal);
    score = lastScore.overall;
    passed = score >= config.scoreThreshold;

    // 미달 시 재창조 루프
    let recreateAttempt = 0;
    while (!passed && recreateAttempt < config.maxRecreate) {
      recreateAttempt++;
      attempt++;
      updateProgress({
        status: 'recreating',
        recreateCount: recreateAttempt,
      });

      // 재창조 프롬프트 — 접근 자체를 바꿈
      const recreatePrompt = buildRecreatePrompt(
        chunkText,
        translatedText,
        lastScore,
        recreateAttempt
      );
      translatedText = await callAI(systemPrompt, recreatePrompt, signal, 0.5 + recreateAttempt * 0.1);

      // 재채점
      updateProgress({ status: 'scoring' });
      lastScore = await scoreTranslation(chunkText, translatedText, config, signal);
      score = lastScore.overall;
      passed = score >= config.scoreThreshold;
    }

    const chunk: TranslationChunk = {
      index: chunkIndex,
      sourceText: chunkText,
      translatedText,
      score,
      attempt,
      passed,
    };
    onChunkComplete?.(chunk);
    return chunk;
  }, [updateProgress, onChunkComplete]);

  // --------------------------------------------------------
  // 에피소드 전체 번역
  // --------------------------------------------------------
  const translateEpisode = useCallback(async (
    manuscript: EpisodeManuscript,
    configOverride?: Partial<TranslationConfig>,
    externalSignal?: AbortSignal
  ): Promise<TranslatedEpisode | null> => {

    const config: TranslationConfig = { ...getDefaultConfig(), ...configOverride };
    const controller = new AbortController();
    abortRef.current = controller;

    // 외부 signal 연결
    if (externalSignal) {
      externalSignal.addEventListener('abort', () => controller.abort());
    }
    const signal = controller.signal;

    try {
      setIsTranslating(true);

      // 3문장 단위 청킹
      const sourceChunks = chunkBySentences(manuscript.content);
      updateProgress({
        totalChunks: sourceChunks.length,
        completedChunks: 0,
        currentChunk: 0,
        recreateCount: 0,
        status: 'translating',
      });

      // 시스템 프롬프트 (한번만 생성)
      const systemPrompt = buildTranslationSystemPrompt(config);

      // 청크별 순차 번역
      const chunks: TranslationChunk[] = [];
      for (let i = 0; i < sourceChunks.length; i++) {
        if (signal.aborted) throw new DOMException('Aborted', 'AbortError');

        const chunk = await translateChunk(
          sourceChunks[i], i, config, systemPrompt, signal
        );
        chunks.push(chunk);
        updateProgress({ completedChunks: i + 1 });
      }

      // 결과 조합
      const translatedText = chunks.map(c => c.translatedText).join('\n\n');
      const avgScore = chunks.length > 0
        ? chunks.reduce((sum, c) => sum + c.score, 0) / chunks.length
        : 0;

      const result: TranslatedEpisode = {
        episode: manuscript.episode,
        sourceLang: 'KO',
        targetLang: config.targetLang,
        fidelity: config.fidelity,
        sourceText: manuscript.content,
        translatedText,
        chunks,
        avgScore: Math.round(avgScore * 1000) / 1000,
        glossarySnapshot: [...config.glossary],
        timestamp: Date.now(),
      };

      updateProgress({ status: 'done' });
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
    }
  }, [translateChunk, updateProgress, onError]);

  // --------------------------------------------------------
  // 일괄 번역
  // --------------------------------------------------------
  const translateBatch = useCallback(async (
    manuscripts: EpisodeManuscript[],
    configOverride?: Partial<TranslationConfig>,
    externalSignal?: AbortSignal
  ): Promise<TranslatedEpisode[]> => {

    const results: TranslatedEpisode[] = [];
    for (const ms of manuscripts) {
      if (externalSignal?.aborted) break;
      const result = await translateEpisode(ms, configOverride, externalSignal);
      if (result) results.push(result);
    }
    return results;
  }, [translateEpisode]);

  // --------------------------------------------------------
  // 중단
  // --------------------------------------------------------
  const abort = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return {
    translateEpisode,
    translateBatch,
    progress,
    isTranslating,
    abort,
  };
}

// IDENTITY_SEAL: PART-1 | role=ImportsTypes | inputs=none | outputs=UseTranslationReturn
// IDENTITY_SEAL: PART-2 | role=AIHelper | inputs=prompt,signal | outputs=string,ChunkScoreDetail
// IDENTITY_SEAL: PART-3 | role=HookImpl | inputs=manuscript,config | outputs=TranslatedEpisode,progress
