/**
 * ChapterEntry — 챕터 단위 번역 데이터.
 *
 * [2026-05-08 — 시장 분석 4차 반영] Dual output 모델.
 * Translation Studio 는 두 결과를 동시 제공한다:
 *   - resultFaithful: Source-faithful Translation (작가 의도·고유명사·복선·문체 보존)
 *   - resultMarket:   Market-ready Localization (대사 리듬·호칭·장르 문법·시장 감각)
 * 기존 `result` 필드는 legacy single-track 호환 위해 유지 (default mode 사용).
 *
 * [C] 호환성 — 모든 신규 필드 optional. 기존 코드 ChapterEntry.result 사용 0byte 변경.
 * [C] 작가 승인 — Faithful track (저작권 archive) + Market track (출판) 분리 sign-off.
 */
export type ChapterEntry = {
  name: string;
  content: string;
  /** Legacy single-track 결과 — outputMode='default' 시 사용. 호환 유지. */
  result: string;
  /** [Dual 모델] Source-faithful Translation — 작가 의도 보존 기준 번역본. */
  resultFaithful?: string;
  /** [Dual 모델] Market-ready Localization — 시장 친화 현지화 번역본. */
  resultMarket?: string;
  isDone: boolean;
  /** Legacy 단일 진행도 — dual 시 max(faithful, market) 매핑. */
  stageProgress: number;
  /** [Dual 모델] Faithful track 진행도 0~5. */
  stageProgressFaithful?: number;
  /** [Dual 모델] Market track 진행도 0~5. */
  stageProgressMarket?: number;
  /** [Dual 모델] 작가 sign-off — Faithful track (저작권 archive). */
  faithfulApproved?: boolean;
  /** [Dual 모델] 작가 sign-off — Market track (출판본). */
  marketApproved?: boolean;
  /** sign-off 시각 (Unix ms). 두 track 중 마지막 승인 시점. */
  approvedAt?: number;
  storyNote?: string;
  error?: string;
};

export type ProjectSnapshot = {
  id: string;
  project_name: string;
  updated_at: number;
  chapters: ChapterEntry[];
  worldContext: string;
  characterProfiles: string;
  storySummary: string;
  from: string;
  to: string;
};

export type ExportProjectMeta = {
  id: string;
  project_name: string;
  updated_at: number;
};

export type HistoryEntry = {
  source: string;
  result: string;
  time: number;
  from: string;
  to: string;
};

export type StyleHeuristicAnalysis = {
  genre: string;
  tone: string;
  metric: { fluency: string; immersion: string };
};

export type TranslationMode = 'novel' | 'general';

export type DomainPreset = 'general' | 'legal' | 'it' | 'medical';
