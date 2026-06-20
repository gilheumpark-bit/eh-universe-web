// ============================================================
// Story Debugger Types — Breakpoint / Watch / Variables / Frame
//
// 코드 IDE 디버거 모델 → 소설 도메인.
//   - Breakpoint: 화·문단 단위 중단점
//   - StoryFrame: 그 시점 캐릭터·떡밥 상태 스냅샷
//   - WatchEntry: 사용자 추적 변수 (캐릭터 이름·떡밥 ID·임의 표현)
//
// [C] 모든 옵셔널 / [G] 단일 책임 / [K] 인터페이스만
// ============================================================

/** 한 화 안의 paragraph 인덱스 + 0-based char offset */
export interface BreakpointLocation {
  episodeId: number;
  paragraphIdx: number;
  charOffset?: number;
}

export interface Breakpoint {
  id: string;
  location: BreakpointLocation;
  /** 활성 여부 (사용자 toggle) */
  enabled: boolean;
  /** 조건식 (선택) — 향후 advanced 모드 */
  condition?: string;
  /** 사용자 메모 */
  label?: string;
}

/** 캐릭터 변수 — emotion / relationship / inventory / knowledge 4 차원 */
export interface CharacterVariableState {
  characterId: string;
  characterName: string;
  emotion?: string;        // 현재 감정 (one-line)
  relationships?: Record<string, string>; // otherCharId → 관계 요약
  inventory?: string[];    // 소지 아이템 list
  knowledge?: string[];    // 알고 있는 정보 list
}

/** Watch 변수 1건 */
export interface WatchEntry {
  id: string;
  /** Watch 종류 — character|foreshadow|expression */
  kind: 'character' | 'foreshadow' | 'expression';
  /** 추적 대상 (캐릭터 이름, 떡밥 ID, 임의 정규식 표현) */
  target: string;
  /** 표시 라벨 */
  label?: string;
}

/** 한 시점의 Story Frame — Step 진행 시 스냅샷 */
export interface StoryFrame {
  episodeId: number;
  paragraphIdx: number;
  /** 해당 시점까지의 누적 캐릭터 상태 */
  characters: CharacterVariableState[];
  /** 해당 시점까지 풀린 떡밥 ID list */
  foreshadowSeen: string[];
  /** Watch 결과 — watchId → 매치 텍스트(없으면 미발견) */
  watchValues: Record<string, string | null>;
  /** 본문 paragraph 텍스트 (preview) */
  paragraphText?: string;
}

/** Step 종류 */
export type StepKind = 'over' | 'into' | 'out';

/** Inspector 결과 */
export interface InspectionResult {
  episodeId: number;
  paragraphIdx: number;
  variableName: string;
  found: boolean;
  value?: string | string[] | Record<string, string>;
}

/** Call Hierarchy — 사건 인과 그래프 */
export interface StoryEventNode {
  id: string;
  episodeId: number;
  /** 이벤트 한 줄 요약 (휴리스틱 추출 — 첫 문단 first sentence) */
  label: string;
}

export interface StoryEventEdge {
  fromId: string;
  toId: string;
  /** 인과 종류 (선택) — 'cause' | 'effect' | 'sequence' */
  kind?: 'cause' | 'effect' | 'sequence';
}

export interface CallHierarchy {
  nodes: StoryEventNode[];
  edges: StoryEventEdge[];
}
