// ============================================================
// External Status Mapper — 내부 6단계 → 외부 5표현 단방향 매핑
// ============================================================
//
// 격리 전략 §2.5 외부용 낮춤 표현.
// 사용자(작가·출판사·플랫폼)가 보는 화면에는 내부 코드명
// (READY, EXPORT_BLOCKED 등) 절대 노출 X.
//
// 사상 정합:
//   - 13차 §5.2 "외부 = 확인서, 내부 = 영수증" 이중 명칭 체계
//   - 6차 §10 "법적 효력? 보증 X, 분쟁 대응 자료 O"
// ============================================================

import type { CertificateLanguage } from './types';

// ============================================================
// PART 1 — 내부 6단계 status (코드 내부에서만 사용)
// ============================================================

/** 내부 점검 상태 (외부 노출 절대 금지) */
export type InternalStatus =
  /** 모든 점검 통과 */
  | 'READY'
  /** 일부 항목 추가 확인 필요 */
  | 'REVIEW_NEEDED'
  /** 외부 편입 출처 누락 */
  | 'SOURCE_MISSING'
  /** 작가 개입 비율 낮음 */
  | 'HUMAN_REVIEW_LOW'
  /** 로그 누락 */
  | 'LOG_GAP'
  /** 발급 차단 (치명적 누락) */
  | 'EXPORT_BLOCKED';

// ============================================================
// PART 2 — 외부 5표현 매트릭스 (5단계 × 4언어 = 20 라벨)
// ============================================================
//
// 6 → 5 매핑 (HUMAN_REVIEW_LOW 와 LOG_GAP 은 같은 외부 표현으로 합침).

const EXTERNAL_LABELS: Record<
  'available' | 'reviewNeeded' | 'externalRecorded' | 'partialMissing' | 'cannotGenerate',
  Record<CertificateLanguage, string>
> = {
  available: {
    ko: '확인 가능',
    en: 'Available',
    ja: '確認可能',
    zh: '可确认',
  },
  reviewNeeded: {
    ko: '추가 확인 필요',
    en: 'Additional Review Needed',
    ja: '追加確認が必要',
    zh: '需进一步确认',
  },
  externalRecorded: {
    ko: '외부 편입 기록 있음',
    en: 'External Source Recorded',
    ja: '外部取り込み記録あり',
    zh: '存在外部导入记录',
  },
  partialMissing: {
    ko: '일부 기록 없음',
    en: 'Partial Records Missing',
    ja: '一部記録なし',
    zh: '部分记录缺失',
  },
  cannotGenerate: {
    ko: '확인서 생성 불가',
    en: 'Cannot Generate Certificate',
    ja: '確認書生成不可',
    zh: '无法生成确认书',
  },
};

// ============================================================
// PART 3 — 단방향 매핑 함수
// ============================================================

/**
 * 내부 6단계 → 외부 5표현 단방향 매핑.
 *
 * @param internal 내부 status (READY / REVIEW_NEEDED / ...)
 * @param language 출력 언어
 * @returns 외부 노출용 라벨 (한국어/영어/일본어/중국어)
 *
 * **양방향 매핑 금지**. 외부 표현 → 내부 status 함수 작성 X.
 */
export function mapInternalToExternalStatus(
  internal: InternalStatus,
  language: CertificateLanguage,
): string {
  switch (internal) {
    case 'READY':
      return EXTERNAL_LABELS.available[language];
    case 'REVIEW_NEEDED':
      return EXTERNAL_LABELS.reviewNeeded[language];
    case 'SOURCE_MISSING':
      return EXTERNAL_LABELS.externalRecorded[language];
    case 'HUMAN_REVIEW_LOW':
    case 'LOG_GAP':
      return EXTERNAL_LABELS.partialMissing[language];
    case 'EXPORT_BLOCKED':
      return EXTERNAL_LABELS.cannotGenerate[language];
    default: {
      // [C] 미래 InternalStatus 확장 시 컴파일 에러 + 안전 기본값
      const _exhaustive: never = internal;
      void _exhaustive;
      return EXTERNAL_LABELS.partialMissing[language];
    }
  }
}

// ============================================================
// PART 4 — 모든 내부 status 배열 (테스트용)
// ============================================================

/** 6 케이스 전수 테스트용 */
export const ALL_INTERNAL_STATUSES: readonly InternalStatus[] = [
  'READY',
  'REVIEW_NEEDED',
  'SOURCE_MISSING',
  'HUMAN_REVIEW_LOW',
  'LOG_GAP',
  'EXPORT_BLOCKED',
] as const;
