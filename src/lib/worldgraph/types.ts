// ============================================================
// WorldGraph 타입 — 세계관 탭 chat→form 파일럿 (Phase 0)
// 격리: studio-types.ts(절대금지8) import 0. M4 provenance는 구조적 복제로 호환.
// 지침 근거: claude/세계관/_template_world-fact.md · _DESIGN_STANDARD.md · _VALIDATION_RULES.md
// ============================================================

// ============================================================
// PART 1 — M4-호환 provenance (구조적 복제 — _연계성 §3 격리 규약)
// ============================================================
// studio-types.ts:104-129 의 M4 Origin Tag 와 동일 shape. worldgraph 는 studio-types 를
// import 하지 않고, 저장 경계에서 어댑터가 Config 슬라이스로 변환해 usePrimaryWriter(실 M4) 로 저장.
// 신규 lockHistory 금지(_공통 원칙2): canon 확정 = origin 'USER', 커밋 이력 = editedBy[].

export type EntryOrigin = 'USER' | 'TEMPLATE' | 'ENGINE_SUGGEST' | 'ENGINE_DRAFT';

export interface OriginEditEvent {
  origin: EntryOrigin;
  at: number;
}

export interface OriginMeta {
  origin: EntryOrigin;
  createdAt: number;
  editedBy?: OriginEditEvent[];
  sourceReferenceId?: string;
}

export type Tagged<T> = T | { value: T; meta: OriginMeta };

// ============================================================
// PART 2 — WorldFact front-matter (지침 _template_world-fact.md 정합)
// ============================================================

export type WorldFactTier = 1 | 2 | 3;
export type Classification = 'Public' | 'Internal' | 'Restricted' | 'Confidential';
export type ArcsStatus = 'PASS' | 'HOLD' | 'FAIL' | 'BLOCK';
export type SpoilerImpact = 'low' | 'medium' | 'high' | 'critical';

export interface SandersonCheck {
  applicable: boolean;
  magicSystemType?: 'hard' | 'soft' | 'hybrid';
  limitations?: Array<Record<string, string>>;
  introduced_at_episode?: number | null;
  used_for_resolution_episodes?: number[];
  depth_facts_count?: number;
}

export interface WorldImpact {
  applicable: boolean;
  economy?: string;
  culture?: string;
  politics?: string;
}

export interface EmotionTone {
  primary?: string;
  secondary?: string;
  shadow?: string;
  intensity?: number;
  forbidden?: boolean;
  triadicColor?: string;
  soundscape?: string;
  bodyResponse?: string;
}

export interface VersionHistoryEntry {
  version?: string | number;
  updatedAt?: string;
  note?: string;
}

/** 알려진 WorldFact front-matter 필드. 미지 키는 index signature 로 passthrough(무손실). */
export interface WorldFactFrontMatter {
  id: string;
  workId: string;
  category: string;            // 35+ enum + 장르별 특수 (개방형 — VALIDATION_RULES 룰3 으로 검사)
  tier: WorldFactTier;
  tierRationale?: string;
  themeLink?: string | null;
  fact: string;                // statement (룰2 — 1문장 단언)
  exceptions?: string[];
  sandersonCheck?: SandersonCheck;
  worldImpact?: WorldImpact;
  classification?: Classification;
  classificationRationale?: string;
  publicAtEpisode?: number;
  spoilerImpact?: SpoilerImpact;
  confidence?: number;
  reviewer?: string | null;
  sourceCode?: string;
  conflictsWith?: string[];
  parallelVersionId?: string | null;
  versionHistory?: VersionHistoryEntry[];
  sourceSentenceIds?: string[];
  sourceDocumentId?: string;
  arcsStatus?: ArcsStatus;
  emotionTone?: EmotionTone;
  worldbookVersion?: number;
  createdAt?: string;
  updatedAt?: string;
  /** 미지 front-matter 키 passthrough — round-trip 무손실 (스키마 확장돼도 안 잃음). */
  [key: string]: unknown;
}

// ============================================================
// PART 3 — WorldFact entry (app-layer: front-matter + body + M4 provenance)
// ============================================================

export interface WorldFactEntry {
  /** 파싱된 front-matter 전체 (알려진 필드 + 미지 키 passthrough). */
  frontMatter: WorldFactFrontMatter;
  /** front-matter 이후 본문 verbatim (## 본문 · 관련 fact · §확장 · [셀프 검증]). 무손실 보존. */
  bodyRaw: string;
  /**
   * app-layer provenance (M4-호환). .md 에는 없음 — chat→form 채움 시 부여.
   * origin 'ENGINE_DRAFT'(AI 채움) → 'ENGINE_SUGGEST'(작가 수락) → 'USER'(작가 확정=canon).
   */
  provenance?: OriginMeta;
}
