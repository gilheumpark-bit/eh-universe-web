// ============================================================
// PART 1 — Imports & Types
// ============================================================

import { useState, useRef, useCallback } from 'react';
import { logger } from '@/lib/logger';
import { getActiveProvider } from '@/lib/ai-providers';
import { recordAIUsage } from '@/lib/ai-usage-tracker';
import type { EpisodeManuscript } from '@/lib/studio-types';
import type { TranslationProjectContext } from '@/lib/translation/project-bridge';
import {
  type TranslationConfig,
  type TranslationMode,
  type TranslationChunk,
  type TranslationProgress,
  type TranslatedEpisode,
  type TranslatedSegment,
  type ChunkScoreDetail,
  getDefaultConfig,
  chunkBySentences,
  adaptiveChunkSize,
  buildTranslationSystemPrompt,
  buildTranslationSystemPromptWithRAG,
  buildRecreatePrompt,
  buildAutoBridge,
  updateTranslatorProfile,
  verifyGlossary,
  verifyLength,
  hasCriticalAxisFailure,
  createConsistencyTracker,
  updateConsistencyTracker,
  buildSegmentsFromChunk,
} from '@/engine/translation';
import {
  type EpisodeMemoryGraph,
  type TermDriftWarning,
  getOrCreateGraph,
  buildMemoryPromptHint,
  detectTermDrift,
  updateMemoryFromTranslation,
  saveGraphLocal,
} from '@/lib/translation/episode-memory';
// applyVoiceGuard 는 translation.ts 의 PART 20 (re-export 포함)
// buildVoiceRulesFromProject + VoiceViolation 도 동일 모듈에서 re-export 되어
// 단일 import 경로로 통일
import {
  applyVoiceGuard,
  buildVoiceRulesFromProject,
  type VoiceViolation,
} from '@/engine/translation';
// filterDialogueLines — 나레이션 false positive 방지용 사전 필터.
// applyVoiceGuard 호출 직전에 segments 를 대사만으로 추려 넘긴다.
import { filterDialogueLines } from '@/engine/translation-voice-guard';
import {
  INITIAL_RAG_STATUS,
  type BatchProgress,
  type RagStatus,
  type UseTranslationParams,
  type UseTranslationReturn,
} from './useTranslation.types';
import { callAI, scoreTranslation } from './useTranslation.scoring';
import { findGlossaryUsage, toManuscriptEntry } from './useTranslation.glossary';

export { scoreTranslation } from './useTranslation.scoring';
export {
  findGlossaryUsage,
  findJPBoundaryMatch,
  findKOBoundaryMatch,
  JP_PARTICLES_AFTER,
  KO_PARTICLES_AFTER,
  toManuscriptEntry,
} from './useTranslation.glossary';
export type { BatchProgress, RagStatus } from './useTranslation.types';

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
  projectContext,
}: UseTranslationParams = {}): UseTranslationReturn {

  // ── Project Bridge: StudioContext → translation engine config 자동 주입 ──
  // characters → locked GlossaryEntry, genre/contextBridge 자동 채움
  const projectContextRef = useRef(projectContext);
  projectContextRef.current = projectContext;

  /**
   * 프로젝트 컨텍스트를 TranslationConfig에 병합.
   * - characters: locked GlossaryEntry로 추가
   * - genre: config.genre 미설정 시 자동 보강
   * - contextBridge: recentEpisodes 요약 합쳐 보강 (기존 bridge가 우선)
   * - glossary: 프로젝트 glossary 병합 (locked 우선)
   */
  const mergeProjectContext = useCallback((
    config: TranslationConfig,
    ctx: TranslationProjectContext | null | undefined
  ): TranslationConfig => {
    if (!ctx) return config;

    const merged: TranslationConfig = { ...config };

    // genre: 사용자 명시값 우선, 없으면 프로젝트 장르 보강
    if (!merged.genre && ctx.genre) {
      merged.genre = ctx.genre;
    }

    // contextBridge: 기존 bridge 우선, 없으면 recentEpisodes에서 자동 생성
    if ((!merged.contextBridge || !merged.contextBridge.trim()) && ctx.recentEpisodes.length > 0) {
      const lines: string[] = [];
      if (ctx.projectTitle) lines.push(`[작품: ${ctx.projectTitle}]`);
      for (const ep of ctx.recentEpisodes) {
        if (ep.summary) {
          lines.push(`[EP.${ep.no}${ep.title ? ` ${ep.title}` : ''}] ${ep.summary}`);
        }
      }
      const bridgeText = lines.join('\n').slice(0, 2000);
      if (bridgeText) merged.contextBridge = bridgeText;
    }

    // glossary: 캐릭터 이름 + 프로젝트 glossary 자동 추가 (source 키 dedup)
    const existing = new Map<string, import('@/engine/translation').GlossaryEntry>();
    for (const g of merged.glossary ?? []) {
      if (g?.source) existing.set(g.source, g);
    }
    for (const cg of ctx.glossary) {
      if (!cg.source || existing.has(cg.source)) continue;
      existing.set(cg.source, {
        source: cg.source,
        target: cg.target ?? '',
        context: cg.category,
        locked: cg.locked,
      });
    }
    // 캐릭터 별칭도 locked entry로 추가 (alias는 target 미정 → 보존만)
    for (const ch of ctx.characters) {
      for (const alias of ch.aliases) {
        if (!alias || existing.has(alias)) continue;
        existing.set(alias, {
          source: alias,
          target: '',
          context: `alias of ${ch.name}`,
          locked: true,
        });
      }
    }
    merged.glossary = Array.from(existing.values());

    // characterRegisters: 캐릭터 register → 번역용 레지스터로 변환
    if (!merged.characterRegisters && ctx.characters.length > 0) {
      merged.characterRegisters = ctx.characters
        .filter(c => c.register)
        .map(c => ({
          name: c.name,
          relation: 'colleague',
          age: c.register?.age ?? 'adult',
          profession: c.register?.role,
          profanity: c.register?.tone === 'rough' ? 'mild' : 'none',
        }));
    }

    return merged;
  }, []);

  const [progress, setProgress] = useState<TranslationProgress>({
    totalChunks: 0, completedChunks: 0, currentChunk: 0,
    recreateCount: 0, status: 'idle',
  });
  const [batchProgress, setBatchProgress] = useState<BatchProgress>({
    totalEpisodes: 0, completedEpisodes: 0, currentEpisode: 0,
    chunkProgress: { totalChunks: 0, completedChunks: 0, currentChunk: 0, recreateCount: 0, status: 'idle' },
  });
  const [isTranslating, setIsTranslating] = useState(false);
  const [driftWarnings, setDriftWarnings] = useState<TermDriftWarning[]>([]);
  const [voiceViolations, setVoiceViolations] = useState<VoiceViolation[]>([]);
  // [C] Voice Guard 재번역 상태 — 자동 루프 미구현, UI 노출용 플래그.
  const [voiceRetryNeeded, setVoiceRetryNeeded] = useState(false);
  const [voiceRetryHint, setVoiceRetryHint] = useState('');
  // [C] RAG 호출 결과 — 배지가 실제 fetched 여부를 반영하기 위함.
  //     projectContext 존재만으론 부족 (silent fallback 시 fetched=false 일 수 있음).
  const [ragStatus, setRagStatus] = useState<RagStatus>(INITIAL_RAG_STATUS);
  const abortRef = useRef<AbortController | null>(null);
  const inFlightRef = useRef(false);
  const progressRef = useRef(progress); // 클로저에서 최신 progress 접근용
  progressRef.current = progress;
  // [C] 마지막 translateEpisode 입력 스냅샷 — retryWithVoiceHint 가 재사용.
  //     신규 번역 시작 시마다 덮어써서 최신 번역만 재시도 대상으로 유지.
  const lastTranslationInputRef = useRef<{
    manuscript: EpisodeManuscript;
    config: Partial<TranslationConfig>;
  } | null>(null);
  // [C] 재시도 락 — 사용자 rapid click 방어 + 재시도 중 translateEpisode 재진입 차단.
  const isRetryingRef = useRef(false);

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
    signal?: AbortSignal,
    characterNames?: string[],
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

    // [C] characterNames 가 있을 때만 segments 생성 — Voice Guard 활성화 조건과 동일.
    //     없으면 빈 배열 안 만들어서 메모리/CPU 절약 (TranslationChunk.segments 는 optional).
    const segments =
      characterNames && characterNames.length > 0
        ? buildSegmentsFromChunk(
            chunkText,
            translatedText,
            characterNames,
            config.targetLang,
          )
        : undefined;

    const chunk: TranslationChunk = {
      index: chunkIndex,
      sourceText: chunkText,
      translatedText,
      score,
      attempt,
      passed,
      segments,
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
      // [C] 재시도용 입력 스냅샷 저장 — 재시도 경로(_isInternal=true 대체 호출) 가 아니라
      //     사용자 진입 경로일 때만 덮어쓴다. 내부 batch 재호출이 덮어쓰지 않도록 분기.
      lastTranslationInputRef.current = {
        manuscript,
        config: configOverride ?? {},
      };
    }

    const mode: TranslationMode = configOverride?.mode ?? 'fidelity';
    const baseConfig: TranslationConfig = { ...getDefaultConfig(mode), ...configOverride };
    // ProjectContext가 있으면 캐릭터/세계관/장르를 자동 주입
    const config: TranslationConfig = mergeProjectContext(baseConfig, projectContextRef.current);
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

      // ── Episode Memory Graph 로드 (프로젝트 컨텍스트 있을 때만) ──
      // [C] projectContext null/undefined 가드 — 단독 실행도 안전
      const projectCtx = projectContextRef.current;
      const memoryGraph: EpisodeMemoryGraph | null = projectCtx?.projectId
        ? getOrCreateGraph(projectCtx.projectId)
        : null;
      const memoryHint = memoryGraph ? buildMemoryPromptHint(memoryGraph) : '';

      // ── Phase 1 async wrapper 실제 연결 (RAG 컨텍스트 자동 주입) ──
      // projectContext 가 있으면 ragService 를 호출하여 worldBible/pastTerms/genreRules 를 가져온다.
      // 실패는 내부에서 silent fallback (fetched=false → 빈 블록) — 번역은 항상 진행.
      // memoryHint 가 있으면 RAG block 앞단에 합쳐 system prompt 에 함께 들어가도록 한다.
      let systemPrompt: string;
      if (projectCtx?.projectId) {
        const charNames = projectCtx.characters.map(c => c.name).filter(Boolean);
        const wrapped = await buildTranslationSystemPromptWithRAG(config, {
          projectId: projectCtx.projectId,
          sourceText: manuscript.content,
          characterNames: charNames,
          targetGenre: projectCtx.genre,
          targetLang: config.targetLang,
          episodeNo: manuscript.episode,
        });
        // [C] ragCtx 실제 fetched 여부를 상태에 반영 — UI 배지는 이 값을 보고 활성/대기 분기.
        //     wrapped.ragCtx 는 silent fallback 시 fetched=false (빈 컨텍스트).
        setRagStatus({
          fetched: wrapped.ragCtx.fetched,
          worldBibleLoaded: !!wrapped.ragCtx.worldBible?.trim(),
          pastTermsCount: wrapped.ragCtx.pastTerms?.length ?? 0,
          pastEpisodesCount: wrapped.ragCtx.pastEpisodeSummary?.length ?? 0,
          lastFetchedAt: Date.now(),
        });
        // memoryHint 를 wrapper 결과에 합쳐 1회 시스템 프롬프트로 합성
        // wrapper.systemPrompt 는 이미 ragBlock 을 선두에 포함 → memoryHint 도 선두에 합치면 우선순위 보존
        systemPrompt = memoryHint
          ? `${memoryHint}\n\n${wrapped.systemPrompt}`
          : wrapped.systemPrompt;
      } else if (memoryHint) {
        // projectContext 없지만 memory 만 있을 때 — sync builder 의 ragBlock 자리에 memoryHint 주입
        // [C] RAG 미사용 경로 → 상태 초기화 (이전 번역의 잔여 상태 누적 방지).
        setRagStatus(INITIAL_RAG_STATUS);
        systemPrompt = buildTranslationSystemPrompt(config, memoryHint);
      } else {
        // [C] RAG 미사용 경로 → 상태 초기화.
        setRagStatus(INITIAL_RAG_STATUS);
        systemPrompt = buildTranslationSystemPrompt(config);
      }

      // ── 번역 시작 전 드리프트 감지: locked glossary 항목 중 target 지정된 것만 검사 ──
      // 새 번역 시도가 기존 canonical 과 다르면 경고 노출.
      if (memoryGraph) {
        const newPairs = (config.glossary ?? [])
          .filter(g => g && g.source && g.target)
          .map(g => ({
            source: g.source,
            target: g.target,
            isCharacter: typeof g.context === 'string' && /character|alias of/i.test(g.context),
          }));
        const warnings = detectTermDrift(memoryGraph, newPairs);
        if (warnings.length > 0) {
          setDriftWarnings(warnings);
          logger.warn('Translation', 'Term drift warnings:', warnings);
        }
      }

      const chunks: TranslationChunk[] = new Array(sourceChunks.length);
      const tracker = createConsistencyTracker();
      const BATCH_SIZE = 3;

      // [C] projectCtx 가 있으면 캐릭터 이름 목록 추출 — translateChunk 가 segments 빌드에 사용.
      //     없거나 비어있으면 undefined → translateChunk 가 segments 생성 skip (메모리 절약).
      const characterNamesForSegments: string[] | undefined =
        projectCtx?.characters && projectCtx.characters.length > 0
          ? projectCtx.characters.map(c => c.name).filter(Boolean)
          : undefined;

      let completedCount = 0;
      for (let i = 0; i < sourceChunks.length; i += BATCH_SIZE) {
        if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
        const batch = sourceChunks.slice(i, i + BATCH_SIZE);

        const batchResults = await Promise.all(
          batch.map((chunkText, batchIdx) =>
            translateChunk(
              chunkText,
              i + batchIdx,
              config,
              systemPrompt,
              signal,
              characterNamesForSegments,
            )
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

      // [C] 모든 청크의 segments 를 평탄화 — Voice Guard 가 result.segments 로 화자별 검증.
      //     characterNames 없을 때는 chunk.segments 가 모두 undefined 이므로 결과도 undefined.
      const flattenedSegments: TranslatedSegment[] | undefined =
        characterNamesForSegments
          ? chunks.flatMap(c => c.segments ?? [])
          : undefined;

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
        segments: flattenedSegments,
      };

      updateProgress({ status: 'done' });

      // ── Voice Guard 검증 (Phase 4 연결) ──
      // [C] projectCtx?.characters 존재 + 비어있지 않을 때만 호출 — 단독 실행 호환
      // [C] applyVoiceGuard 실패해도 번역 결과 자체는 그대로 반환 (try-catch 격리)
      // [C] result.segments 는 PART 21 buildSegmentsFromChunk 에서 자동 빌드됨
      //     (translateChunk 가 characterNames 받았을 때만 채워짐).
      //     speaker 추론 실패 세그먼트는 applyVoiceGuard 내부에서 skip.
      // [K] 재번역 루프(needsRetry=true 자동 재시도)는 이번 Phase 미구현 — 경고만 노출
      if (projectCtx?.characters && projectCtx.characters.length > 0) {
        try {
          const rules = buildVoiceRulesFromProject(
            projectCtx.characters,
            config.targetLang,
          );
          if (rules.length > 0) {
            // [C] filterDialogueLines 로 나레이션 제외 — 대사만 Voice Guard 검사 대상.
            //     isDialogue=true 우선 + 따옴표 휴리스틱 폴백 (voice-guard.ts PART 7).
            //     빈 배열일 경우 applyVoiceGuard 가 lines.length === 0 가드로 즉시 통과.
            const dialogueLines = filterDialogueLines(result.segments ?? []);
            // [K] applyVoiceGuard 시그니처 미변경 — segments 만 대사로 교체해서 주입.
            //     translation/speaker 형태로 매핑 (applyVoiceGuard 가 기대하는 모양).
            const filteredResult = {
              ...result,
              segments: dialogueLines.map(d => ({
                translation: d.text,
                speaker: d.speaker,
              })),
            };
            const guarded = applyVoiceGuard(filteredResult, {
              rules,
              targetLang: config.targetLang,
            });
            setVoiceViolations(guarded.voiceViolations);
            // [C] retryHint 빈 문자열 가드 — needsRetry=true 여도 hint 가 비면 UI 노출 skip.
            // [K] 자동 재번역 루프는 chunk 구조와 결합도가 높아 이번 Phase 미구현.
            //     UI 노출용 needsRetry/retryHint 만 상태로 제공 → 사용자 수동 재번역 트리거.
            setVoiceRetryNeeded(guarded.needsRetry);
            setVoiceRetryHint(guarded.retryHint ?? '');
            if (guarded.needsRetry) {
              logger.warn(
                'Translation',
                `[VoiceGuard] ${guarded.voiceViolations.length} violations, retry hint available`,
              );
            }
          } else {
            setVoiceViolations([]);
            setVoiceRetryNeeded(false);
            setVoiceRetryHint('');
          }
        } catch (e) {
          // Voice Guard 실패는 번역 자체를 깨뜨리지 않음
          logger.warn('Translation', 'Voice Guard failed:', e);
          setVoiceViolations([]);
          setVoiceRetryNeeded(false);
          setVoiceRetryHint('');
        }
      } else {
        setVoiceViolations([]);
        setVoiceRetryNeeded(false);
        setVoiceRetryHint('');
      }

      // ── Episode Memory Graph 업데이트 ──
      // glossary 의 source/target 쌍 중 실제로 출력문에 등장한 것만 기록 → drift 추적
      // [C] memoryGraph null 가드 — projectContext 없으면 skip
      if (memoryGraph && config.glossary && config.glossary.length > 0) {
        const epNo = Number.isFinite(manuscript.episode) ? manuscript.episode : 0;
        // [G] 단순 substring 매칭 → false positive 다발 (예: "그림자" 검색 시 "큰그림자" 매칭).
        //     영문은 word boundary, CJK 는 길이 기반 휴리스틱으로 정밀도 개선.
        const usedGlossary = findGlossaryUsage(
          config.glossary.filter(g => g && g.source && g.target),
          translatedText,
        );
        const pairs = usedGlossary.map(g => ({
          source: g.source,
          target: g.target,
          episodeNo: epNo,
          isCharacter: typeof g.context === 'string' && /character|alias of/i.test(g.context),
        }));
        if (pairs.length > 0) {
          const updatedGraph = updateMemoryFromTranslation(memoryGraph, pairs);
          // [C] saveGraphLocal 은 quota exceed 시 false 반환 — 무시 가능
          saveGraphLocal(updatedGraph);
        }
      }

      // 번역 완료 → 저장 콜백 호출
      if (onSave) {
        onSave(toManuscriptEntry(result, manuscript.title));
      }

      // AI 번역 사용 메타데이터 기록 — Export 고지문에 AI 번역 표기용
      try {
        const projId = projectCtx?.projectId;
        if (projId) {
          const prov = getActiveProvider();
          const translatedLen = (result.translatedText ?? '').length;
          recordAIUsage(projId, { type: 'translation', provider: prov, charsGenerated: translatedLen });
        }
      } catch (err) { logger.warn('useTranslation', 'recordAIUsage failed', err); }

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
  }, [translateChunk, updateProgress, onError, onSave, onProfileUpdate, mergeProjectContext]);

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
      // ProjectContext 병합: 모든 에피소드에 동일한 프로젝트 컨텍스트 적용
      const baseConfig: TranslationConfig = mergeProjectContext(
        { ...getDefaultConfig(mode), ...configOverride },
        projectContextRef.current
      );

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
  }, [translateEpisode, onBatchProgress, getLatestGlossary, mergeProjectContext]);

  const abort = useCallback(() => { abortRef.current?.abort(); }, []);

  /**
   * Voice Guard 힌트로 마지막 번역을 재시도.
   * - 마지막 translateEpisode 입력 (manuscript + config) 을 재사용
   * - voiceRetryHint 를 config.contextBridge 에 append → systemPrompt 에 주입
   * - 재시도 1회 한도 (isRetryingRef 락 + voiceRetryNeeded 초기화 없이 중복 클릭 방어)
   * - translateEpisode 내부가 voiceViolations 를 재계산 → UI 가 자동 갱신
   * - 실패 시 기존 상태 유지 (setVoiceViolations 건드리지 않음)
   * [C] voiceRetryHint 빈 문자열 / lastInput null → no-op
   * [C] isRetryingRef 로 동시 재시도 차단
   */
  const retryWithVoiceHint = useCallback(async () => {
    // [C] no-op 가드: 힌트 없음, 재시도 필요 없음, 락 잡힘, 번역 중
    if (!voiceRetryNeeded) return;
    if (!voiceRetryHint || !voiceRetryHint.trim()) return;
    if (!lastTranslationInputRef.current) return;
    if (isRetryingRef.current) return;
    if (inFlightRef.current) return;

    isRetryingRef.current = true;
    try {
      const { manuscript, config: originalConfig } = lastTranslationInputRef.current;
      // Voice 힌트를 contextBridge 에 append — 기존 bridge 를 보존.
      // contextBridge 는 buildTranslationSystemPrompt PART 5 에서 [Context from previous chapter]
      // 블록으로 주입되며, Voice 힌트를 같은 블록에 덧붙여 재번역 시 말투 규칙을 상기시킴.
      const existingBridge = (originalConfig.contextBridge ?? '').trim();
      const enhancedBridge = existingBridge
        ? `${existingBridge}\n\n[Voice Retry Hint]\n${voiceRetryHint}`
        : `[Voice Retry Hint]\n${voiceRetryHint}`;

      const enhancedConfig: Partial<TranslationConfig> = {
        ...originalConfig,
        contextBridge: enhancedBridge,
      };

      // translateEpisode 는 내부에서 voiceViolations / voiceRetryNeeded / voiceRetryHint 를 재갱신.
      // _isInternal=true 를 주지 않아 inFlightRef 가 정상 관리됨.
      await translateEpisode(manuscript, enhancedConfig);
    } catch (err) {
      logger.warn('Translation', 'voice retry failed', err);
      // [C] 실패 시 상태 건드리지 않음 → 기존 번역 그대로 유지
    } finally {
      isRetryingRef.current = false;
    }
  }, [voiceRetryNeeded, voiceRetryHint, translateEpisode]);

  return {
    translateEpisode,
    translateBatch,
    progress,
    batchProgress,
    isTranslating,
    abort,
    driftWarnings,
    voiceViolations,
    voiceRetryNeeded,
    voiceRetryHint,
    ragStatus,
    retryWithVoiceHint,
  };
}

// IDENTITY_SEAL: PART-1 | role=ImportsTypes | inputs=none | outputs=UseTranslationReturn,RagStatus
// IDENTITY_SEAL: PART-2 | role=AIHelper | inputs=prompt,signal | outputs=string,ChunkScoreDetail
// IDENTITY_SEAL: PART-2B | role=GlossaryUsageTokenizer | inputs=glossary,translatedText | outputs=usedGlossary[],findKOBoundaryMatch,findJPBoundaryMatch
// IDENTITY_SEAL: PART-3 | role=HookImpl | inputs=manuscript,config | outputs=TranslatedEpisode,progress,ragStatus,retryWithVoiceHint
