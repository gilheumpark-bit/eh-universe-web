// ============================================================
// HCI Calculator — Human Control Index 산출 + 4언어 보충 문구
// ============================================================
//
// HCI = (Human-weighted events / total events) × 100
// 0~100% 단일 숫자 — 마케팅 무기지만 동시에 양날성.
//
// 보충 문구 byte-level 4언어 — HCI 옆 필수 노출.
// "HCI 는 작업 흔적의 자동 집계 / 작품 품질 평가 X / 장르·작업 방식별 정상 범위 다름"
//
// [C] 안전성: 미정의 origin 타입 0 weight, division by zero 방지
// [G] 성능: 단순 reduce, O(n)
// [K] 간결성: 단일 함수 + 가중치 표
// ============================================================

import type { CreativeEvent, CreativeOriginType } from './types';

// ============================================================
// PART 1 — Origin 별 HCI 가중치
// ============================================================
//
// 9 Origin 가중치 결정 (사상):
//   1.0 (작가 직접): HUMAN_DRAFT, HUMAN_REVISION
//   0.7 (작가 검토 후 채택): AI_SUGGESTION, COLLABORATOR_INPUT
//   0.5 (작가 선택·작가 원문 base): AI_REWRITE, EXTERNAL_IMPORT, TEMPLATE_SEED
//   0.0 (AI 단독·시스템 자동): AI_DRAFT, SYSTEM_GENERATED

const ORIGIN_HCI_WEIGHT: Record<CreativeOriginType, number> = {
  HUMAN_DRAFT: 1.0,
  HUMAN_REVISION: 1.0,
  AI_SUGGESTION: 0.7,
  AI_DRAFT: 0.0,
  AI_REWRITE: 0.5,
  EXTERNAL_IMPORT: 0.5,
  TEMPLATE_SEED: 0.5,
  COLLABORATOR_INPUT: 0.7,
  SYSTEM_GENERATED: 0.0,
};

// ============================================================
// PART 2 — HCI 산출 결과 + 3축 보조 분석
// ============================================================

export interface HCIResult {
  /** 0~100 (소수점 1자리) */
  hci: number;
  /** Author Intent — HUMAN_DRAFT 비율 기반 */
  intent: 'verified' | 'partial' | 'unverified';
  /** Manual Edit Density — HUMAN_REVISION + HUMAN_REWRITE 비율 */
  density: 'high' | 'medium' | 'low';
  /** Narrative Logic — events 누적 기반 (별도 검증 통합 가능) */
  logic: 'validated' | 'pending' | 'incomplete';
  /** 산출에 사용된 이벤트 수 */
  totalEvents: number;
  /** Origin 별 카운트 (도넛 차트용) */
  byOrigin: Record<CreativeOriginType, number>;
}

/**
 * HCI 산출 메인 함수.
 * @param events 누적된 CreativeEvent list
 * @returns HCIResult — 0~100 단일 숫자 + 3축 분석
 */
export function computeHCIDetail(events: CreativeEvent[]): HCIResult {
  const byOrigin: Record<CreativeOriginType, number> = {
    HUMAN_DRAFT: 0, HUMAN_REVISION: 0, AI_SUGGESTION: 0, AI_DRAFT: 0,
    AI_REWRITE: 0, EXTERNAL_IMPORT: 0, TEMPLATE_SEED: 0,
    COLLABORATOR_INPUT: 0, SYSTEM_GENERATED: 0,
  };

  if (events.length === 0) {
    return {
      hci: 0, intent: 'unverified', density: 'low', logic: 'incomplete',
      totalEvents: 0, byOrigin,
    };
  }

  // Origin 카운트 + 가중 합
  let weightedSum = 0;
  for (const e of events) {
    byOrigin[e.originType] = (byOrigin[e.originType] ?? 0) + 1;
    weightedSum += ORIGIN_HCI_WEIGHT[e.originType] ?? 0;
  }
  const hci = Math.round((weightedSum / events.length) * 1000) / 10;

  // Author Intent: HUMAN_DRAFT 비율
  const humanDraftRatio = byOrigin.HUMAN_DRAFT / events.length;
  const intent: HCIResult['intent'] =
    humanDraftRatio >= 0.30 ? 'verified' :
    humanDraftRatio >= 0.10 ? 'partial' : 'unverified';

  // Manual Edit Density: HUMAN_REVISION + HUMAN_REWRITE 비율
  const editRatio = (byOrigin.HUMAN_REVISION + byOrigin.AI_REWRITE) / events.length;
  const density: HCIResult['density'] =
    editRatio >= 0.40 ? 'high' :
    editRatio >= 0.15 ? 'medium' : 'low';

  // Narrative Logic: events 누적 기반 (외부 검증 통합 시 보강)
  const logic: HCIResult['logic'] =
    events.length >= 50 ? 'validated' :
    events.length >= 10 ? 'pending' : 'incomplete';

  return { hci, intent, density, logic, totalEvents: events.length, byOrigin };
}

// ============================================================
// PART 3 — Origin 9종 → 외부 3종 매핑 (도넛 차트용)
// ============================================================

export type ExternalOriginCategory = 'human_input' | 'refinement' | 'ai_suggestion';

const ORIGIN_EXTERNAL_MAP: Record<CreativeOriginType, ExternalOriginCategory> = {
  HUMAN_DRAFT: 'human_input',
  HUMAN_REVISION: 'refinement',
  AI_SUGGESTION: 'ai_suggestion',
  AI_DRAFT: 'ai_suggestion',
  AI_REWRITE: 'refinement',
  EXTERNAL_IMPORT: 'human_input',
  TEMPLATE_SEED: 'human_input',
  COLLABORATOR_INPUT: 'human_input',
  SYSTEM_GENERATED: 'ai_suggestion',
};

export interface OriginSummary {
  human_input: number; // %
  refinement: number;
  ai_suggestion: number;
}

/** 9 Origin 카운트 → 3 카테고리 % (합계 100). */
export function categorizeOriginSummary(byOrigin: Record<CreativeOriginType, number>): OriginSummary {
  const totals: OriginSummary = { human_input: 0, refinement: 0, ai_suggestion: 0 };
  let total = 0;
  for (const [origin, count] of Object.entries(byOrigin) as [CreativeOriginType, number][]) {
    totals[ORIGIN_EXTERNAL_MAP[origin]] += count;
    total += count;
  }
  if (total === 0) return totals;
  return {
    human_input: Math.round((totals.human_input / total) * 100),
    refinement: Math.round((totals.refinement / total) * 100),
    ai_suggestion: Math.round((totals.ai_suggestion / total) * 100),
  };
}

// ============================================================
// PART 4 — 4언어 보충 문구 (byte-level)
// ============================================================

/** HCI 옆 필수 노출 — 작품 품질 평가 X 명시 */
export const HCI_DISCLAIMER_4LANG = {
  ko: 'HCI는 작업 흔적의 자동 집계이며, 작품 품질·완성도·창작자 능력의 평가가 아닙니다. 장르·작업 방식에 따라 정상 범위가 다릅니다.',
  en: 'HCI is an automated tally of work events. It is not an evaluation of quality, completeness, or authorial skill. Normal ranges vary by genre and workflow.',
  ja: 'HCIは作業履歴の自動集計であり、作品の品質・完成度・創作者の能力評価ではありません。ジャンルや作業方式により正常範囲は異なります。',
  zh: 'HCI是工作记录的自动汇总,不构成对作品质量、完整度或创作者能力的评估。正常范围因体裁与工作方式而异。',
} as const;

// ============================================================
// PART 5 — HCI 3축 4언어 라벨
// ============================================================

export const HCI_AXIS_LABELS = {
  intent: {
    ko: { label: '작가 의도', verified: '검증됨', partial: '부분 검증', unverified: '미검증' },
    // [P1 fix — 2026-05-10] 'Verified'/'Unverified' 는 FORBIDDEN_WORDS_4LANG.en 매칭 ('verified' case-insensitive).
    // HCI 라벨 컨텍스트는 메트릭 강도 표현이지 authority claim 이 아니므로 'Strong'/'Limited' 로 교체.
    // (ko 검증됨 / ja 検証済 / zh 已验证 은 각 언어 forbidden 리스트와 다른 한자 → 유지)
    en: { label: 'Author Intent', verified: 'Strong', partial: 'Partial', unverified: 'Limited' },
    ja: { label: '作者意図', verified: '検証済', partial: '部分検証', unverified: '未検証' },
    zh: { label: '作者意图', verified: '已验证', partial: '部分验证', unverified: '未验证' },
  },
  density: {
    ko: { label: '수정 밀도', high: '높음', medium: '중간', low: '낮음' },
    en: { label: 'Manual Edit Density', high: 'High', medium: 'Medium', low: 'Low' },
    ja: { label: '修正密度', high: '高', medium: '中', low: '低' },
    zh: { label: '修改密度', high: '高', medium: '中', low: '低' },
  },
  logic: {
    ko: { label: '서사 일관성', validated: '검증됨', pending: '검토 중', incomplete: '미완' },
    en: { label: 'Narrative Logic', validated: 'Validated', pending: 'Pending', incomplete: 'Incomplete' },
    ja: { label: '叙述一貫性', validated: '検証済', pending: '確認中', incomplete: '未完' },
    zh: { label: '叙事一致性', validated: '已验证', pending: '审核中', incomplete: '未完' },
  },
} as const;

// ============================================================
// PART 6 — Origin 3 카테고리 라벨 (도넛 차트용)
// ============================================================

export const ORIGIN_CATEGORY_LABELS = {
  ko: { human_input: '인간 입력', refinement: '정제 작업', ai_suggestion: 'AI 제안' },
  en: { human_input: 'Human Input', refinement: 'Refinement', ai_suggestion: 'AI Suggestion' },
  ja: { human_input: '人間の入力', refinement: '推敲・修正', ai_suggestion: 'AIの提案' },
  zh: { human_input: '人类输入', refinement: '精修', ai_suggestion: 'AI建议' },
} as const;
