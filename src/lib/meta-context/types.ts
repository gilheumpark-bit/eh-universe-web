// ============================================================
// meta-context/types.ts
//
// 사용자가 채팅 중 명시한 위계·범위·노출 수위·카테고리 누적.
// 다음 turn AI prompt 자동 prepend. 충돌 시 정보 only 알림 (선생 X).
// ============================================================

export type MetaScope = 'internal' | 'external' | 'public' | 'restricted';
export type MetaKind =
  | 'company'         // EH = 회사
  | 'product'         // Loreguard = 1번 제품
  | 'tech'            // ARCS = 내부 기술
  | 'category'        // AI 과정확인 솔루션
  | 'numeric'         // 뤼튼 400억 = 매출
  | 'date'            // PCT 마감 = 2027-03-03
  | 'hierarchy'       // 위계 정의
  | 'rejection';      // "X 폐기" / "X 안 됨"

/** 1 정의 record */
export interface MetaDefinition {
  /** 추출된 정의 — `key = value` */
  key: string;
  value: string;
  kind: MetaKind;
  scope?: MetaScope;
  /** 추출된 turn 인덱스 (가장 최근 = 0) */
  turnIdx: number;
  timestamp: number;
  /** 원본 표면형 */
  surface: string;
}

/** 누적 store snapshot */
export interface MetaSnapshot {
  /** 모든 정의 (시간순) */
  definitions: MetaDefinition[];
  /** key → 최신 value (override 가능) */
  current: Record<string, MetaDefinition>;
  /** 충돌 list (같은 key 다른 value) */
  conflicts: MetaConflict[];
}

export interface MetaConflict {
  key: string;
  oldValue: string;
  newValue: string;
  oldTurnIdx: number;
  newTurnIdx: number;
}
