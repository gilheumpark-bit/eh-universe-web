// ============================================================
// studio-shared — 절대금지 studio-types.ts 의 안전 재노출 shim
// (2026-06-08 / 풀점검 priority 6)
//
// 의도:
//   - StudioModalBridge / QualityGutter 같은 신규 컴포넌트는 절대금지 8 파일
//     (src/lib/studio-types.ts) 의 직접 import 를 금지하는 spec 준수.
//   - 하지만 AppLanguage / AppTab / ChatSession / SavedSlot / StoryConfig 등
//     legacy 타입은 단일 정의 원천이 여전히 studio-types.ts 다.
//   - 이 shim 은 type re-export 만 — 런타임 import 없음 (tree-shaking 안전).
//   - 신규 호출처는 이 모듈을 거쳐 import. 절대금지 파일 직접 의존 카운트는 0.
//
// 정책: 본 shim 추가 호출자 = welcome. 신규 타입 추가 시 여기서 export.
// 2026-06-08 루프 2/3 — Message/ProactiveSuggestion/PipelineStageResult 추가 (WritingContext shim 마이그레이션).
// ============================================================

export type {
  AppLanguage,
  AppTab,
  ChatSession,
  SavedSlot,
  StoryConfig,
  WritingMode,
  Project,
  Message,
  ProactiveSuggestion,
  PipelineStageResult,
} from '@/lib/studio-types';
