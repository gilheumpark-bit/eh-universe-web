// ============================================================
// Origin Adapter — EntryOrigin → CreativeOriginType 단방향 매핑
// ============================================================
//
// 격리 전략 §1.1 (Track-D):
//   - 기존 EntryOrigin (4종) 은 absolute 미수정.
//   - 본 모듈만이 EntryOrigin 을 읽고 CreativeOriginType (9종) 으로 변환.
//   - **양방향 매핑 금지**. CreativeOriginType → EntryOrigin 함수 작성 X.
//     (확인서 모듈이 EntryOrigin 을 쓰지 않게 강제)
//
// 컨텍스트 힌트:
//   - 기본 매핑: USER → HUMAN_DRAFT
//   - 그러나 컨텍스트가 "재작성" 신호를 주면 HUMAN_REVISION 으로 라우팅
//   - 마찬가지로 ENGINE_DRAFT 는 컨텍스트에 따라 AI_DRAFT / AI_REWRITE 분기
// ============================================================

import type { EntryOrigin } from '../studio-types';
import type { CreativeOriginType } from './types';

// ============================================================
// PART 1 — 컨텍스트 힌트
// ============================================================

/**
 * 매핑 시 사용 가능한 옵션 컨텍스트.
 *
 * 호출자가 추가 정보를 제공하면 더 정확한 origin 으로 매핑.
 * 미제공 시 보수적 기본값 (가장 안전한 분류) 으로 매핑.
 */
export interface OriginAdapterContext {
  /**
   * 기존 텍스트가 존재했는지 (있으면 USER → HUMAN_REVISION,
   * 없으면 USER → HUMAN_DRAFT).
   */
  hasPriorContent?: boolean;
  /**
   * AI 출력을 작가 원문에 덮어 씌우는 흐름인지 (true 면
   * ENGINE_DRAFT → AI_REWRITE, false 면 AI_DRAFT).
   */
  isRewriteOnHumanText?: boolean;
}

// ============================================================
// PART 2 — 단방향 매핑 함수 (read-only)
// ============================================================

/**
 * 기존 4종 EntryOrigin → 9종 CreativeOriginType 단방향 매핑.
 *
 * @param entryOrigin 기존 origin (studio-types.ts 정의 4종)
 * @param context     선택적 컨텍스트 힌트
 * @returns 9종 중 1
 *
 * 매핑 표 (Track-D §1.1):
 *   - USER           → HUMAN_DRAFT (기본) / HUMAN_REVISION (hasPriorContent)
 *   - TEMPLATE       → TEMPLATE_SEED
 *   - ENGINE_SUGGEST → AI_SUGGESTION
 *   - ENGINE_DRAFT   → AI_DRAFT (기본) / AI_REWRITE (isRewriteOnHumanText)
 */
export function mapEntryOriginToCreativeOrigin(
  entryOrigin: EntryOrigin,
  context?: OriginAdapterContext,
): CreativeOriginType {
  switch (entryOrigin) {
    case 'USER':
      return context?.hasPriorContent ? 'HUMAN_REVISION' : 'HUMAN_DRAFT';
    case 'TEMPLATE':
      return 'TEMPLATE_SEED';
    case 'ENGINE_SUGGEST':
      return 'AI_SUGGESTION';
    case 'ENGINE_DRAFT':
      return context?.isRewriteOnHumanText ? 'AI_REWRITE' : 'AI_DRAFT';
    default: {
      // [C] 안전성: 미래에 EntryOrigin 이 확장되더라도 컴파일 에러 + 안전 기본값
      const _exhaustive: never = entryOrigin;
      void _exhaustive;
      return 'SYSTEM_GENERATED';
    }
  }
}

// ============================================================
// PART 3 — 4종 EntryOrigin 전수 검증 헬퍼 (테스트용)
// ============================================================

/**
 * 모든 EntryOrigin 케이스가 매핑 결과를 가지는지 컴파일 타임 보장.
 * 단위 테스트에서 사용.
 */
export const ENTRY_ORIGIN_CASES: readonly EntryOrigin[] = [
  'USER',
  'TEMPLATE',
  'ENGINE_SUGGEST',
  'ENGINE_DRAFT',
] as const;
