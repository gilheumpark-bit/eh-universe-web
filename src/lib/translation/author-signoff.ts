// ============================================================
// PART 1 — Module Header
// ============================================================
//
// author-signoff.ts — 작가 sign-off (Faithful archive + Market publish 분리 승인).
//
// 시장 분석 4차 §8 §10 §11 핵심 요구:
//   "작가 승인 → 출판 패키지"
//   "Faithful track (저작권 archive) + Market track (출판) 분리"
//
// ChapterEntry 의 faithfulApproved + marketApproved + approvedAt 필드 위에서
// 작동. UI 는 작가가 두 결과를 검토하고 각각 승인.
//
// [C] 결정론적 — LLM 호출 0
// [K] 데이터 변환 헬퍼만, UI 는 별도
// ============================================================

import type { ChapterEntry } from '@/types/translator';

// ============================================================
// PART 2 — Types
// ============================================================

export type SignoffStatus = 'unapproved' | 'partial' | 'fully-approved';

export interface SignoffSummary {
  total: number;
  faithfulApproved: number;
  marketApproved: number;
  fullyApproved: number;
  unapproved: number;
  status: SignoffStatus;
  /** 마지막 승인 시각 (가장 최근 chapter.approvedAt). */
  lastApprovedAt: number | null;
}

// ============================================================
// PART 3 — 헬퍼
// ============================================================

/** 한 챕터 sign-off 상태. */
export function chapterSignoffStatus(ch: ChapterEntry): SignoffStatus {
  const f = !!ch.faithfulApproved;
  const m = !!ch.marketApproved;
  if (f && m) return 'fully-approved';
  if (f || m) return 'partial';
  return 'unapproved';
}

/** 챕터 list 통계. */
export function summarizeSignoff(chapters: ChapterEntry[]): SignoffSummary {
  const total = chapters.length;
  let faithfulApproved = 0;
  let marketApproved = 0;
  let fullyApproved = 0;
  let lastApprovedAt: number | null = null;
  for (const ch of chapters) {
    if (ch.faithfulApproved) faithfulApproved++;
    if (ch.marketApproved) marketApproved++;
    if (ch.faithfulApproved && ch.marketApproved) fullyApproved++;
    if (typeof ch.approvedAt === 'number') {
      if (lastApprovedAt === null || ch.approvedAt > lastApprovedAt) {
        lastApprovedAt = ch.approvedAt;
      }
    }
  }
  const unapproved = total - Math.max(faithfulApproved, marketApproved);
  let status: SignoffStatus;
  if (fullyApproved === total && total > 0) status = 'fully-approved';
  else if (faithfulApproved + marketApproved > 0) status = 'partial';
  else status = 'unapproved';
  return {
    total,
    faithfulApproved,
    marketApproved,
    fullyApproved,
    unapproved,
    status,
    lastApprovedAt,
  };
}

/** 챕터 sign-off 토글 — track 별. */
export function toggleSignoff(
  ch: ChapterEntry,
  track: 'faithful' | 'market',
  approved: boolean,
): ChapterEntry {
  const now = Date.now();
  if (track === 'faithful') {
    return {
      ...ch,
      faithfulApproved: approved,
      approvedAt: approved ? now : ch.approvedAt,
    };
  }
  return {
    ...ch,
    marketApproved: approved,
    approvedAt: approved ? now : ch.approvedAt,
  };
}

// ============================================================
// PART 4 — [Z1a-4 2026-06-11] Sign-off readiness (기계 검증 조건 분리)
// ============================================================
//
// 기계 검증 가능한 조건만 conditions 로 판정하고, 기계로 검증 불가한 조건
// (작가 의도 보존·시장 수용성)과 '측정값 미제공' 조건은 manualChecklist 로
// 정직하게 분리한다 — "검증했다" 거짓 보고를 구조적으로 차단.
//
// 측정값 입력 출처 (호출 측):
//   integrityStatus    — source-integrity runIntegrityCheck().status
//   band               — bands.ts scoreToBand().band (17+ = B 이상 = bandPassed 동일 임계)
//   catastrophicBlocks — ncg-nct runCatastrophicCheck() blocked 건수
//   voiceViolations    — voice/tone guard 위반 건수 (예: tone-guard)
// ============================================================

export type SignoffConditionId =
  | 'all-approved'
  | 'dual-complete'
  | 'integrity-pass'
  | 'band-17plus'
  | 'catastrophic-zero'
  | 'voice-zero';

export interface SignoffCondition {
  id: SignoffConditionId;
  /** 조건 충족 여부 (verified=false 시 ok=false 는 '미판정' 표기 — ready 계산에서 제외됨). */
  ok: boolean;
  /** true = 기계 검증 수행됨 / false = 측정값 미제공 → manualChecklist 로 이관 (ready 에 영향 X) */
  verified: boolean;
  detail: string;
}

export interface SignoffReadinessInput {
  chapters: ChapterEntry[];
  track: 'faithful' | 'market';
  /** source-integrity 결과 status — 'pass' 만 충족 (warn 도 미충족·엄격). */
  integrityStatus?: 'pass' | 'warn' | 'fail';
  /** 41-band 품질 밴드 — 17+ (B 이상) 요구. */
  band?: number;
  /** catastrophic 차단 건수 — 0 요구. */
  catastrophicBlocks?: number;
  /** voice/tone 위반 건수 — 0 요구. */
  voiceViolations?: number;
}

export interface SignoffReadiness {
  /** 모든 '기계 검증된' 조건 충족 시 true. 미제공 조건은 ready 를 막지 않는다 (기존 boolean 흐름 호환). */
  ready: boolean;
  conditions: SignoffCondition[];
  /** 기계 검증 불가/미측정 — 작가 수동 확인 항목 (정직 분리). */
  manualChecklist: string[];
}

/** bands.ts bandPassed 와 동일 임계 (B 이상 = band 17+). */
const SIGNOFF_BAND_MIN = 17;

/**
 * Sign-off readiness — 기계 검증 가능한 조건만 판정.
 *
 * [C] 결정론적 — LLM 호출 0
 * [C] 호환 — 측정값 전부 미제공 시 = 기존 isReadyForPublish 의 승인 검사 + 결과물 존재 검사
 */
export function validateSignoffReadiness(input: SignoffReadinessInput): SignoffReadiness {
  const { chapters, track } = input;
  const conditions: SignoffCondition[] = [];
  const manualChecklist: string[] = [];

  // 1) 전 챕터 track 승인 (항상 기계 검증 가능)
  const allApproved =
    chapters.length > 0 &&
    chapters.every((ch) => (track === 'faithful' ? !!ch.faithfulApproved : !!ch.marketApproved));
  conditions.push({
    id: 'all-approved',
    ok: allApproved,
    verified: true,
    detail: `전 챕터 ${track} 승인 (${chapters.length}개 중 ${chapters.filter((c) => (track === 'faithful' ? c.faithfulApproved : c.marketApproved)).length}개 승인)`,
  });

  // 2) 듀얼 완료 — track 결과물 존재 (legacy 단일 result 폴백 — 기존 흐름 호환)
  const dualComplete =
    chapters.length > 0 &&
    chapters.every((ch) => {
      const content = track === 'faithful' ? (ch.resultFaithful || ch.result) : (ch.resultMarket || ch.result);
      return typeof content === 'string' && content.trim().length > 0;
    });
  conditions.push({
    id: 'dual-complete',
    ok: dualComplete,
    verified: true,
    detail: `${track} 결과물 존재 (legacy result 폴백 허용)`,
  });

  // 3~6) 측정값 제공 시만 기계 검증 — 미제공은 manualChecklist 로 정직 이관
  const optional: Array<{ id: SignoffConditionId; provided: boolean; ok: boolean; detail: string; manual: string }> = [
    {
      id: 'integrity-pass',
      provided: input.integrityStatus !== undefined,
      ok: input.integrityStatus === 'pass',
      detail: `무결성 status=${input.integrityStatus ?? '미측정'} ('pass' 만 충족)`,
      manual: '원문 보존 무결성 (runIntegrityCheck 미실행 — 측정 후 재검증)',
    },
    {
      id: 'band-17plus',
      provided: input.band !== undefined,
      ok: typeof input.band === 'number' && input.band >= SIGNOFF_BAND_MIN,
      detail: `밴드 ${input.band ?? '미측정'} (요구 ${SIGNOFF_BAND_MIN}+ = B 이상)`,
      manual: `품질 밴드 ${SIGNOFF_BAND_MIN}+ (채점 미실행 — 측정 후 재검증)`,
    },
    {
      id: 'catastrophic-zero',
      provided: input.catastrophicBlocks !== undefined,
      ok: input.catastrophicBlocks === 0,
      detail: `Catastrophic 차단 ${input.catastrophicBlocks ?? '미측정'}건 (0 요구)`,
      manual: 'Catastrophic 게이트 (runCatastrophicCheck 미실행 — 측정 후 재검증)',
    },
    {
      id: 'voice-zero',
      provided: input.voiceViolations !== undefined,
      ok: input.voiceViolations === 0,
      detail: `voice 위반 ${input.voiceViolations ?? '미측정'}건 (0 요구)`,
      manual: 'voice/tone 위반 0 (가드 미실행 — 측정 후 재검증)',
    },
  ];
  for (const c of optional) {
    conditions.push({ id: c.id, ok: c.provided ? c.ok : false, verified: c.provided, detail: c.detail });
    if (!c.provided) manualChecklist.push(c.manual);
  }

  // 기계 검증 불가 — 본질적 수동 항목 (항상 노출, 정직)
  manualChecklist.push(
    '작가 의도·뉘앙스 보존 확인 (기계 검증 불가 — 작가 최종 판단)',
    '시장/문화권 수용성 검토 (기계 검증 불가 — 작가 최종 판단)',
  );

  // ready = 검증된(verified) 조건 전부 충족. 미제공 조건은 막지 않음 (기존 호환).
  const ready = conditions.every((c) => !c.verified || c.ok);
  return { ready, conditions, manualChecklist };
}

/**
 * 출판 가능 여부 — 시장 분석 4차 §8 "작가 승인 → 출판 패키지".
 *
 * [Z1a-4] validateSignoffReadiness() 경유 — boolean 시그니처 유지 (기존 흐름 호환).
 * 측정값 미제공 호출 (기존 패턴) 은 승인 + 결과물 존재 검사와 동등하게 동작.
 */
export function isReadyForPublish(
  chapters: ChapterEntry[],
  track: 'faithful' | 'market',
): boolean {
  return validateSignoffReadiness({ chapters, track }).ready;
}
