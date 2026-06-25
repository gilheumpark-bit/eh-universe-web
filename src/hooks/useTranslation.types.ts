import type {
  TranslationChunk,
  TranslationConfig,
  TranslationProgress,
  TranslatedEpisode,
  TranslatorProfile,
} from '@/engine/translation';
import type { VoiceViolation } from '@/engine/translation';
import type { EpisodeManuscript, TranslatedManuscriptEntry } from '@/lib/studio-types';
import type { TranslationProjectContext } from '@/lib/translation/project-bridge';
import type { TermDriftWarning } from '@/lib/translation/episode-memory';

/** 일괄 번역 에피소드 레벨 진행률 */
export interface BatchProgress {
  totalEpisodes: number;
  completedEpisodes: number;
  currentEpisode: number;
  chunkProgress: TranslationProgress;
}

export interface UseTranslationParams {
  onProgress?: (progress: TranslationProgress) => void;
  onBatchProgress?: (progress: BatchProgress) => void;
  onChunkComplete?: (chunk: TranslationChunk) => void;
  onError?: (error: string) => void;
  /** 번역 완료 시 호출 - TranslatedManuscriptEntry를 StoryConfig에 저장하는 용도 */
  onSave?: (entry: TranslatedManuscriptEntry) => void;
  /** 번역 프로필 업데이트 콜백 - 오류 패턴 학습 */
  onProfileUpdate?: (profile: TranslatorProfile) => void;
  /**
   * Real-time glossary provider. When supplied, translateBatch reads fresh glossary
   * before each episode instead of using the stale config snapshot.
   * Return format: GlossaryEntry[] from the current GlossaryManager state.
   */
  getLatestGlossary?: () => import('@/engine/translation').GlossaryEntry[];
  /**
   * Project bridge context - automatically injects characters/worldBible/genre/glossary
   * from StudioContext or external Project source. When supplied, characters are added
   * to glossary as locked entries and project glossary takes precedence.
   * Optional: hook works without it.
   */
  projectContext?: TranslationProjectContext | null;
}

/**
 * RAG 컨텍스트 상태 - 마지막 번역 시도의 ragService 호출 결과.
 * UI 배지 (`TranslationPanel`) 가 "RAG 활성/대기" 를 정확히 표시하기 위함.
 * - fetched=true: ragService 가 실제 응답을 반환 (worldBible/pastTerms 중 일부 채워짐).
 * - fetched=false: 초기 상태 또는 RAG 실패 (silent fallback 으로 번역은 진행되나 RAG 미반영).
 */
export interface RagStatus {
  fetched: boolean;
  worldBibleLoaded: boolean;
  pastTermsCount: number;
  pastEpisodesCount: number;
  lastFetchedAt?: number;
}

export const INITIAL_RAG_STATUS: RagStatus = {
  fetched: false,
  worldBibleLoaded: false,
  pastTermsCount: 0,
  pastEpisodesCount: 0,
};

export interface UseTranslationReturn {
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
  /**
   * Episode Memory drift warnings - 마지막 번역에서 기존 canonical 과 다른
   * 용어가 발견됐을 때 채워짐. UI가 사용자에게 표시할 수 있다.
   */
  driftWarnings: TermDriftWarning[];
  /**
   * Voice Guard violations - 마지막 번역에서 캐릭터 말투 규칙 위반.
   * applyVoiceGuard 호출 결과. projectContext.characters 가 비어있거나
   * speaker 매핑이 없는 결과 형식이면 빈 배열.
   */
  voiceViolations: VoiceViolation[];
  /**
   * Voice Guard 재번역 필요 여부 - error 등급 위반 1건+ 시 true.
   * UI 가 "재번역 권장" 토스트/버튼을 노출할 수 있다.
   * 자동 재번역 루프는 비활성 (chunk 단위 재호출 비용 관리).
   */
  voiceRetryNeeded: boolean;
  /**
   * Voice Guard 재번역 지시문 - buildRetryHintFromViolations 결과.
   * 비어있으면 표시 skip. 사용자가 수동 재번역 시 systemPrompt 에 주입 가능.
   */
  voiceRetryHint: string;
  /**
   * RAG 컨텍스트 활성 상태 - UI 배지가 실제 RAG 성공 여부를 정확히 표시하기 위함.
   * projectContext 존재만으로는 RAG 성공이 보장되지 않음 (silent fallback 가능).
   */
  ragStatus: RagStatus;
  /**
   * Voice 힌트로 수동 재번역 트리거 - 사용자가 버튼으로 1회 재시도.
   * - 마지막 translateEpisode 입력 (manuscript + config) 를 재사용
   * - voiceRetryHint 를 config.contextBridge 에 append 해서 systemPrompt 에 주입
   * - 재번역 중에는 isRetryingRef 락으로 중복 호출 차단
   * - 실패 시 기존 상태 유지 (퇴행 방지)
   * - 자동 루프는 복잡도/비용 문제로 비활성 - 1회 수동 재시도만 허용
   */
  retryWithVoiceHint: () => Promise<void>;
}
