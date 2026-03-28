// ============================================================
// PART 1 — Imports & Types
// ============================================================

import { useState, useRef, useCallback } from 'react';
import { streamChat, getApiKey, getActiveProvider } from '@/lib/ai-providers';
import type { EpisodeManuscript, TranslatedManuscriptEntry } from '@/lib/studio-types';
import {
  type TranslationConfig,
  type TranslationMode,
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

/**
 * 채점: structured output 우선 시도 → 실패 시 스트리밍 폴백.
 * structured output은 JSON 파싱 안정성이 높음.
 */
async function scoreTranslation(
  sourceText: string,
  translatedText: string,
  config: TranslationConfig,
  signal?: AbortSignal
): Promise<ChunkScoreDetail> {
  const prompt = buildScoringPrompt(sourceText, translatedText, config);

  // 1차: structured output (서버 라우트 경유)
  try {
    const resp = await fetch('/api/gemini-structured', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: signal ?? AbortSignal.timeout(30_000),
      body: JSON.stringify({
        task: 'translationScore',
        prompt,
        provider: 'gemini',
        apiKey: getApiKey('gemini') || undefined,
      }),
    });
    if (resp.ok) {
      const data = await resp.json();
      const raw = typeof data === 'string' ? data : JSON.stringify(data);
      return parseScoreResponse(raw, config.mode);
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

// ============================================================
// PART 3 — Hook 구현
// ============================================================

export function useTranslation({
  onProgress,
  onChunkComplete,
  onError,
}: UseTranslationParams = {}): UseTranslationReturn {

  const [progress, setProgress] = useState<TranslationProgress>({
    totalChunks: 0, completedChunks: 0, currentChunk: 0,
    recreateCount: 0, status: 'idle',
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

    // 채점
    updateProgress({ status: 'scoring' });
    lastScore = await scoreTranslation(chunkText, translatedText, config, signal);
    score = lastScore.overall;
    passed = score >= config.scoreThreshold;

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
      passed = score >= config.scoreThreshold;
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
    externalSignal?: AbortSignal
  ): Promise<TranslatedEpisode | null> => {

    const mode: TranslationMode = configOverride?.mode ?? 'fidelity';
    const config: TranslationConfig = { ...getDefaultConfig(mode), ...configOverride };
    const controller = new AbortController();
    abortRef.current = controller;

    if (externalSignal) {
      externalSignal.addEventListener('abort', () => controller.abort());
    }
    const signal = controller.signal;

    try {
      setIsTranslating(true);

      const sourceChunks = chunkBySentences(manuscript.content);
      updateProgress({
        totalChunks: sourceChunks.length, completedChunks: 0,
        currentChunk: 0, recreateCount: 0, status: 'translating',
      });

      const systemPrompt = buildTranslationSystemPrompt(config);

      const chunks: TranslationChunk[] = [];
      for (let i = 0; i < sourceChunks.length; i++) {
        if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
        const chunk = await translateChunk(sourceChunks[i], i, config, systemPrompt, signal);
        chunks.push(chunk);
        updateProgress({ completedChunks: i + 1 });
      }

      const translatedText = chunks.map(c => c.translatedText).join('\n\n');
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

  // 일괄 번역
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

  const abort = useCallback(() => { abortRef.current?.abort(); }, []);

  return { translateEpisode, translateBatch, progress, isTranslating, abort };
}

// IDENTITY_SEAL: PART-1 | role=ImportsTypes | inputs=none | outputs=UseTranslationReturn
// IDENTITY_SEAL: PART-2 | role=AIHelper | inputs=prompt,signal | outputs=string,ChunkScoreDetail
// IDENTITY_SEAL: PART-3 | role=HookImpl | inputs=manuscript,config | outputs=TranslatedEpisode,progress
