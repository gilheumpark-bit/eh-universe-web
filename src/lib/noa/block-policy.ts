/**
 * block-policy.ts (2026-06-11 신설 — N4 차등 차단 + 고지 의무)
 *
 * NOA 판정 등급 × 작품(PRISM) 등급 매트릭스 — 차등 차단 정책의 단일 소스.
 *
 * 원칙 (인터뷰 확정 ④):
 *   - 작품 등급 내 콘텐츠      → PASS (표준 audit 체인 기록만, 사용자 방해 0)
 *   - 등급 경계 콘텐츠         → AUDIT_ONLY (통과 + 주의 audit 기록, 사용자 방해 0)
 *   - 작품 등급 초과 콘텐츠     → BLOCK (생성 중단 + 사용자 고지 필수 — 사일런트 차단 금지)
 *
 * 차단 응답 계약 (N2 server-gate 와 공유):
 *   HTTP 200 + { blocked: true, reason: string, gradeRequired: PrismLevel | null }
 *   - reason 은 사용자 언어 문장 (내부 판정 상세·시크릿 노출 금지)
 *   - gradeRequired 는 같은 내용이 통과 가능한 최소 작품 등급 (null = 어떤 등급에서도 불가)
 *
 * 사용처:
 *   - 서버: NOA 게이트(runNoa) 판정 후 작품 등급과 대조해 차등 결정
 *   - 클라이언트: 차단 payload 식별(isBlockedPayload) + 고지 메시지 생성
 *
 * [C] 안전성: NOA 하드 차단(allowed=false)은 정책으로 완화 불가 (보안 우선)
 * [G] 성능: O(1) 매트릭스 lookup
 * [K] 간결성: 매트릭스 1 + 판정 2 + 계약 3 + 메시지 1 + audit 1
 */

import type { PrismLevel } from '@/lib/ai/safety-registry';
import { isPrismLevel, PRISM_LABELS } from '@/lib/ai/safety-registry';
import type { NoaGradeLevel, NoaResult } from './types';
import { recordAuditEntry } from './audit-report';

// ============================================================
// PART 1 — 판정 타입
// ============================================================

/** 차등 차단 결정 3종. */
export type BlockDecision = 'PASS' | 'AUDIT_ONLY' | 'BLOCK';

export interface PolicyDecision {
  readonly decision: BlockDecision;
  /** BLOCK 시: 같은 내용이 통과 가능한 최소 작품 등급. null = 어느 등급에서도 불가. */
  readonly gradeRequired: PrismLevel | null;
}

// ============================================================
// PART 2 — 판정 × 작품등급 매트릭스 (보수적 기본값)
// ============================================================

/** 등급 완화 탐색 순서 (낮은 등급 → 높은 등급). */
const PRISM_ORDER: readonly PrismLevel[] = ['all-ages', 'teen-15', 'mature-18'];

/**
 * NOA 9 리스크 등급(Platinum=최저 위험 → Black=최고 위험) × PRISM 3 작품 등급.
 *
 * 근거 (보수적 기본값):
 *   - Platinum~LightGold (risk ≤15): 전 등급 통과 — 일상 창작 범위.
 *   - Silver (15~25): 전체이용가에서만 경계(AUDIT_ONLY) — 가장 어린 독자층 보호 우선.
 *   - Lime (25~35): 전체이용가 초과(BLOCK)·청소년 경계·성인 통과.
 *   - Orange (35~45): 청소년 초과(BLOCK)·성인 경계 — safety-registry teen-15 가드의
 *     "graphic gore·extreme cruelty 금지" 한계선과 정렬.
 *   - Red (45~60): 성인 등급에서도 경계(AUDIT_ONLY) — 통과시키되 주의 기록.
 *   - DeepRed/Black (60+): 전 등급 BLOCK — tactical layer(selectTacticalPath)가
 *     이미 무조건 BLOCK 하는 구간과 정합 (실제 위해·불법 수준, mature-18 가드도
 *     "core API illegal content" 는 허용하지 않음).
 *
 * 행이 위험할수록 / 열이 어릴수록 보수적으로 — 대각 상향만 존재 (역전 셀 없음).
 */
export const BLOCK_POLICY_MATRIX: Record<NoaGradeLevel, Record<PrismLevel, BlockDecision>> = {
  Platinum:  { 'all-ages': 'PASS',       'teen-15': 'PASS',       'mature-18': 'PASS' },
  Gold:      { 'all-ages': 'PASS',       'teen-15': 'PASS',       'mature-18': 'PASS' },
  LightGold: { 'all-ages': 'PASS',       'teen-15': 'PASS',       'mature-18': 'PASS' },
  Silver:    { 'all-ages': 'AUDIT_ONLY', 'teen-15': 'PASS',       'mature-18': 'PASS' },
  Lime:      { 'all-ages': 'BLOCK',      'teen-15': 'AUDIT_ONLY', 'mature-18': 'PASS' },
  Orange:    { 'all-ages': 'BLOCK',      'teen-15': 'BLOCK',      'mature-18': 'AUDIT_ONLY' },
  Red:       { 'all-ages': 'BLOCK',      'teen-15': 'BLOCK',      'mature-18': 'AUDIT_ONLY' },
  DeepRed:   { 'all-ages': 'BLOCK',      'teen-15': 'BLOCK',      'mature-18': 'BLOCK' },
  Black:     { 'all-ages': 'BLOCK',      'teen-15': 'BLOCK',      'mature-18': 'BLOCK' },
};

/** BLOCK 시 같은 NOA 등급이 통과(PASS/AUDIT_ONLY) 가능한 최소 작품 등급 탐색. */
function findGradeRequired(level: NoaGradeLevel): PrismLevel | null {
  for (const prism of PRISM_ORDER) {
    if (BLOCK_POLICY_MATRIX[level][prism] !== 'BLOCK') return prism;
  }
  return null; // DeepRed/Black — 어느 등급에서도 불가 (표현 자체 수정 필요)
}

// ============================================================
// PART 3 — 판정 함수
// ============================================================

/** NOA 리스크 등급 × 작품 등급 → 차등 결정. */
export function decideBlockPolicy(level: NoaGradeLevel, workGrade: PrismLevel): PolicyDecision {
  const decision = BLOCK_POLICY_MATRIX[level][workGrade];
  return {
    decision,
    gradeRequired: decision === 'BLOCK' ? findGradeRequired(level) : null,
  };
}

/**
 * runNoa 결과 + 작품 등급 → 차등 결정.
 *
 * [C] 보안 우선: NOA 가 하드 차단(allowed=false — fast-track BLOCK·tactical BLOCK·
 *     예산 소진)한 입력은 작품 등급과 무관하게 BLOCK 유지 (정책이 보안을 완화 불가).
 *     fast PASS (judgment=null·allowed=true) 는 PASS.
 */
export function decideFromNoaResult(result: NoaResult, workGrade: PrismLevel): PolicyDecision {
  if (!result.allowed) {
    const level = result.judgment?.grade.level;
    return {
      decision: 'BLOCK',
      // 판정 등급이 있으면 완화 가능 등급 안내, fast-track 즉결 차단이면 null (등급 무관 차단)
      gradeRequired: level ? findGradeRequired(level) : null,
    };
  }
  if (!result.judgment) return { decision: 'PASS', gradeRequired: null };
  return decideBlockPolicy(result.judgment.grade.level, workGrade);
}

// ============================================================
// PART 4 — 차단 응답 계약 (N2 server-gate 와 공유)
// ============================================================

/**
 * chat route prismMode namespace ('ALL'|'T15'|'M18') — server-gate(NoaGateBlocked)가
 * gradeRequired 에 이 키를 사용한다. PrismLevel 과 양쪽 모두 계약상 유효.
 */
export type PrismModeKey = 'ALL' | 'T15' | 'M18';

const PRISM_MODE_TO_LEVEL: Record<PrismModeKey, PrismLevel> = {
  ALL: 'all-ages',
  T15: 'teen-15',
  M18: 'mature-18',
};

function isPrismModeKey(value: unknown): value is PrismModeKey {
  return value === 'ALL' || value === 'T15' || value === 'M18';
}

/** 양 namespace ('all-ages'… / 'ALL'…) → PrismLevel 정규화. 미지값 null. */
export function normalizePrismGrade(value: unknown): PrismLevel | null {
  if (isPrismLevel(value)) return value;
  if (isPrismModeKey(value)) return PRISM_MODE_TO_LEVEL[value];
  return null;
}

/** HTTP 200 차단 응답 본문 계약. */
export interface BlockedResponsePayload {
  readonly blocked: true;
  /** 사용자 언어 사유 문장 (내부 판정 상세·시크릿 노출 금지). */
  readonly reason: string;
  /** 통과 가능한 최소 작품 등급 (PrismLevel 또는 'ALL'|'T15'|'M18'). null = 어느 등급에서도 불가. */
  readonly gradeRequired: PrismLevel | PrismModeKey | null;
}

/** 클라이언트용 type guard — 임의 JSON 이 차단 계약인지 식별 (양 namespace 수용). */
export function isBlockedPayload(value: unknown): value is BlockedResponsePayload {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  if (v.blocked !== true) return false;
  if (typeof v.reason !== 'string') return false;
  return v.gradeRequired === null || v.gradeRequired === undefined
    || isPrismLevel(v.gradeRequired) || isPrismModeKey(v.gradeRequired);
}

/** 서버용 — 차단 응답 본문 생성 (사유는 사용자 언어). */
export function buildBlockedPayload(
  workGrade: PrismLevel | undefined,
  gradeRequired: PrismLevel | null,
  language: NoticeLanguage = 'ko',
): BlockedResponsePayload {
  return {
    blocked: true,
    reason: getBlockNoticeMessage(workGrade, gradeRequired, language),
    gradeRequired,
  };
}

// ============================================================
// PART 5 — 고지 메시지 (정직·비난조 금지·해결 경로 제시)
// ============================================================

export type NoticeLanguage = 'ko' | 'en' | 'ja' | 'zh';

const NOTICE_TEXT: Record<NoticeLanguage, {
  exceeds: (work: string) => string;
  exceedsGeneric: string;
  pathChange: (req: string) => string;
  pathAdjustOnly: string;
}> = {
  ko: {
    exceeds: (work) => `작품 등급(${work})을 넘는 묘사가 감지되어 생성을 중단했습니다.`,
    exceedsGeneric: '작품 등급을 넘는 묘사가 감지되어 생성을 중단했습니다.',
    pathChange: (req) => ` 표현을 조정하거나, 작품 설정에서 등급을 ${req}(으)로 변경하면 이어서 진행할 수 있습니다.`,
    pathAdjustOnly: ' 실제 위해·불법 콘텐츠 등은 모든 등급에서 제한됩니다. 표현을 조정한 뒤 다시 시도해 주세요.',
  },
  en: {
    exceeds: (work) => `Generation was stopped because the content exceeds this work's rating (${work}).`,
    exceedsGeneric: "Generation was stopped because the content exceeds this work's rating.",
    pathChange: (req) => ` Adjust the expression, or change the rating to ${req} in work settings to continue.`,
    pathAdjustOnly: ' Content involving real harm or illegal material is restricted at every rating. Please adjust the expression and try again.',
  },
  ja: {
    exceeds: (work) => `作品の等級(${work})を超える描写が検出されたため、生成を中断しました。`,
    exceedsGeneric: '作品の等級を超える描写が検出されたため、生成を中断しました。',
    pathChange: (req) => ` 表現を調整するか、作品設定で等級を${req}に変更すると続行できます。`,
    pathAdjustOnly: ' 実害・違法コンテンツ等はすべての等級で制限されます。表現を調整して再試行してください。',
  },
  zh: {
    exceeds: (work) => `检测到超出作品等级(${work})的描写，已中止生成。`,
    exceedsGeneric: '检测到超出作品等级的描写，已中止生成。',
    pathChange: (req) => ` 请调整表达，或在作品设置中将等级更改为${req}后继续。`,
    pathAdjustOnly: ' 实际危害/违法内容在所有等级均受限制。请调整表达后重试。',
  },
};

/**
 * 차단 고지 문장 — 정직하게 무엇이/왜 중단됐는지 + 해결 경로(등급 변경 또는 표현 조정).
 * 비난조 표현 금지 — 사실 서술 + 다음 행동 안내만.
 */
export function getBlockNoticeMessage(
  workGrade: PrismLevel | undefined,
  gradeRequired: PrismLevel | null,
  language: NoticeLanguage = 'ko',
): string {
  const t = NOTICE_TEXT[language];
  const head = workGrade ? t.exceeds(PRISM_LABELS[language][workGrade]) : t.exceedsGeneric;
  const tail = gradeRequired
    ? t.pathChange(PRISM_LABELS[language][gradeRequired])
    : t.pathAdjustOnly;
  return head + tail;
}

// ============================================================
// PART 6 — audit-only 기록 (기존 NOA Audit 체인 — 사용자 방해 0)
// ============================================================

/**
 * 정책 결정을 기존 audit-report 체인(csl_noa_audit_log)에 기록.
 *
 * - AUDIT_ONLY/PASS: result='allowed' — 사용자에게 아무 표시 없음 (방해 0).
 * - BLOCK: result='blocked' — 고지는 호출 측(block-notice) 책임.
 * - 서버 환경(window 부재)에서는 audit-report 가 no-op — 서버 평가 자체는
 *   runNoa 내부의 recordAuditEntry + auditManager 해시 체인이 이미 기록한다.
 */
export function recordPolicyAudit(
  decision: BlockDecision,
  meta: { workGrade?: PrismLevel; noaGrade?: string; surface?: string; inputPreview?: string },
): void {
  recordAuditEntry({
    timestamp: Date.now(),
    input: (meta.inputPreview ?? '').slice(0, 200),
    result: decision === 'BLOCK' ? 'blocked' : 'allowed',
    layer: 'block-policy',
    reason: `NOA_POLICY_${decision}(${meta.noaGrade ?? 'n/a'}×${meta.workGrade ?? 'n/a'})${meta.surface ? ` @${meta.surface}` : ''}`,
    severity: decision === 'BLOCK' ? 'high' : decision === 'AUDIT_ONLY' ? 'medium' : 'low',
  });
}
