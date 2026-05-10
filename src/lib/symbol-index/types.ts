// ============================================================
// PART 1 — Module Header & Imports
// ============================================================
//
// Symbol Index — Loreguard Novel IDE 의 "Symbol Table" 추상.
//
// 코드 IDE 의 Go to Definition / Find All References 와 동일 사상.
// 작품 내 고유명사(캐릭터·지명·소품·개념·사건)를 통합 색인하여:
//   - F12 누르면 정의로 점프
//   - Shift+F12 누르면 모든 등장 위치
//   - 본문에서 hover 시 즉시 quick info
//
// 절대 금지 파일 0byte: studio-types / save-engine / ManuscriptView / OriginBadge
// 자체 types 모듈로 도메인 충돌 회피.
//
// [C] 모든 옵셔널 필드 명시, 빈 array 가드 호출 측 책임
// [G] 단일 패스 빌드, Map<string, ...> 조회 O(1)
// [K] 5종 SymbolKind 만 — 과도 추상화 금지 (event 는 Phase 2 검토)
// ============================================================

// ============================================================
// PART 2 — Core Symbol Types
// ============================================================

/** 5 종 Symbol 카테고리 — 작품 도메인의 모든 고유명사 분류 */
export type SymbolKind = 'character' | 'place' | 'item' | 'concept' | 'event';

/** Symbol 정의 — Symbol Index 의 행(row) */
export interface SymbolDefinition {
  /** Symbol 고유 ID — kind:source-id 패턴 (예: `character:char-abc123`) */
  id: string;
  /** 카테고리 */
  kind: SymbolKind;
  /** 표시 이름 (1차 명칭) */
  name: string;
  /** 동의어 / 별칭 / 약칭 (예: "김준" → ["준", "김 작가", "the writer"]) */
  aliases: string[];
  /** Symbol 정의 본문 — 캐릭터 traits, 룰북 내용, 소품 description 등 요약 */
  definition: string;
  /** 처음 등장한 에피소드 (선택) — concept/event 는 미설정 가능 */
  episodeId?: number;
  /** UI 점프 대상 — `character` → CharacterTab + 해당 카드 / `place` → WorldTab 등 */
  jumpTarget: SymbolJumpTarget;
}

/** Go to Definition 점프 좌표 */
export interface SymbolJumpTarget {
  /** 진입 탭 키 — 'characters' / 'world' / 'items' / 'skills' / 'rulebook' */
  tab: 'characters' | 'world' | 'items' | 'skills' | 'rulebook';
  /** 탭 내 sub-id (선택) — 없으면 탭 첫 화면 */
  subId?: string;
}

/** Symbol 등장 위치 — Find All References 결과의 행 */
export interface SymbolReference {
  /** 등장한 Symbol id */
  symbolId: string;
  /** 등장 화수 */
  episodeId: number;
  /** 화 내 씬 ID (선택) — 씬시트 매핑 시 채움 */
  sceneId?: string;
  /** 본문 char offset (해당 episode content 기준 0-based) */
  charOffset: number;
  /** 매칭된 표면형 (alias 매칭 시 alias 그대로) */
  surfaceForm: string;
  /** 좌우 ±50자 컨텍스트 — 미리보기용 */
  context: string;
}

// ============================================================
// PART 3 — Symbol Index (집계 결과)
// ============================================================

/** 빌드 결과 — 작품 전체 Symbol 색인 */
export interface SymbolIndex {
  /** 모든 정의 — id 키 */
  definitions: Map<string, SymbolDefinition>;
  /** Aho-Corasick 매칭용 — 표면형 → symbolId */
  surfaceMap: Map<string, string>;
  /** kind 별 그룹 (Outline 패널용) */
  byKind: Record<SymbolKind, SymbolDefinition[]>;
  /** 빌드 시점 manuscript hash — invalidation key */
  manuscriptHash: string;
  /** 빌드 시점 (ISO) */
  builtAt: string;
}

// ============================================================
// PART 4 — Operation Result Types
// ============================================================

/** Find All References 결과 패널용 */
export interface FindReferencesResult {
  symbolId: string;
  symbolName: string;
  totalCount: number;
  byEpisode: Map<number, SymbolReference[]>;
  references: SymbolReference[];
}

/** Go to Definition 결과 — UI 가 jumpTarget 으로 점프 처리 */
export interface FindDefinitionResult {
  found: boolean;
  symbol?: SymbolDefinition;
}

/** Hover Quick Info 패널용 */
export interface HoverInfo {
  symbol: SymbolDefinition;
  /** 최근 N화 등장 — N 은 호출자 결정 (기본 5) */
  recentEpisodes: number[];
  /** 총 등장 횟수 */
  totalReferences: number;
  /** 캐릭터 한정 — 말투 시그니처 (speechStyle 첫 80자) */
  speechSignature?: string;
}
