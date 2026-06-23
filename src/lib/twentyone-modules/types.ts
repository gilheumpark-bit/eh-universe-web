// ============================================================
// PART 1 — Module Header & Common Types
// ============================================================
//
// twentyone-modules/types.ts
// — 21-Module Authoring System for Long-Form Webnovels (Loreguard).
//
// 21-module standard (Loreguard internal normalization of WGA Series Bible /
// Save the Cat / Truby 22 Steps / Sanderson's Three Laws / Pixar Story Spine /
// Amazon KDP standards / MFA writing conventions / Korean 6-tier speech
// register reference) — Loreguard implements all 21 modules with verification.
//
// Coverage in Loreguard (2026-05-11):
//   ✓ Already covered:  M1 / M3 / M7 / M10 / M13 / M14 / M15 / M16 / M17 / M19 / M20 / M21
//   ✗ Gaps (this file): M2 / M4 / M5 / M6 / M11 / M18
//   △ Enhancements:     M8 / M9 / M12 (existing partial coverage)
//
// Isolation §1:
//   - studio-types.ts: 0byte change (single-direction import only — this file
//     ONLY imports from studio-types.ts; never the reverse).
//   - save-engine/*: untouched (this lib uses its own IDB stores).
//   - ManuscriptView / OriginBadge / origin-migration: untouched.
//
// Trade-secret separation:
//   - This file: TypeScript interfaces (schema only) — proprietary software.
//   - 21-Module rule pack data (M18 18-platform rules, M11 beat seeds, etc.):
//     separate external data. NOT included in this software repository.
//
// [C] All ID fields ULID strings, all timestamps ISO 8601.
// [G] Discriminated unions where possible (status enums) — narrow types at runtime.
// [K] No abstraction layers; flat interfaces only. JSON Schema 2020-12 compatible.
// ============================================================

import type { AppLanguage } from '@/lib/studio-types';

/** 21-module identifier — M1 through M21. */
export type ModuleId =
  | 'M1' | 'M2' | 'M3' | 'M4' | 'M5' | 'M6' | 'M7'
  | 'M8' | 'M9' | 'M10' | 'M11' | 'M12' | 'M13' | 'M14'
  | 'M15' | 'M16' | 'M17' | 'M18' | 'M19' | 'M20' | 'M21';

/** Injection policy per ARCS WRITING_AGENT_REGISTRY (Phase 2 +6 ContextBlockId). */
export type InjectionStrategy =
  | 'always_inject'           // every chapter, compressed summary
  | 'on_demand'               // only when scene goal matches
  | 'rag_only'                // retrieved via search keys
  | 'post_generation_only';   // only consulted after generation (validation/update)

/** Lock strength for any locked entity (ending, glossary, secret). */
export type LockLevel = 'soft' | 'hard';

/** Module-side lifecycle status. */
export type ModuleStatus = 'candidate' | 'approved' | 'locked' | 'deprecated';

/** Common metadata for every 21-module record. */
export interface ModuleRecordBase {
  /** ULID. */
  id: string;
  /** Project / work ID — references existing Loreguard work. */
  work_id: string;
  /** Semver of this record's data shape. */
  schema_version: '1.0.0';
  /** ISO 8601. */
  created_at: string;
  /** ISO 8601. */
  updated_at: string;
}

// ============================================================
// PART 2 — M2: Ending Lock
// ============================================================
//
// "최종화의 마지막 장면이 어떻게 끝나는가? 절대 깨면 안 되는 종착점."
// MVP-tier module (per 21-module report §A). Inject policy: always_inject.
// Compliance hook: ending-match-check (severity: blocker if hard locked).
// ============================================================

/**
 * M2 EndingLock — lock the ending state.
 * Once locked at hard level, AI generation must not contradict the final state.
 */
export interface EndingLock extends ModuleRecordBase {
  // Tier A (required)
  final_chapter_number: number | null;          // null = TBD
  final_image: string;                          // 1-3 sentences describing last scene
  protagonist_final_state: {
    external: string;                           // social / circumstantial
    internal: string;                           // psychological
    relational: string;                         // relationship-based
  };
  world_final_state: string;
  theme_resolution: string;                     // 1 sentence — story's answer to its central question
  must_payoffs: string[];                       // ref → M12 ForeshadowThread.id[]
  banned_reversals: string[];                   // what can never happen

  // Tier B — market-specific (optional)
  hea_guaranteed?: boolean;                     // Romance Happily Ever After contract
  hfn_guaranteed?: boolean;                     // Happy For Now
  dark_ending_warning?: boolean;
  cp_pairing_lock?: { char_a: string; char_b: string };  // ZH/JP markets: CP rules
  cultivation_realm_final?: string;             // ZH 仙侠/玄幻
  isekai_purpose_achieved?: boolean;            // JP 異世界転生

  // Lock state
  lock_level: LockLevel;                        // hard = AI generation hard-blocked
  locked_at: string | null;                     // ISO 8601, null if not yet locked
  locked_by: 'author' | 'ai_suggested' | null;
  attestation_seal?: string;                    // Witness Seal (LG-{YY}{MM}-{n}-{hash})

  // Validation
  validation_hash: string;                      // SHA-256 of lock fields (tamper detect)
}

// ============================================================
// PART 3 — M4: Glossary Index (명칭 색인)
// ============================================================
//
// "용어 권위를 누가 갖는가" — automated extraction + author approval.
// MVP-tier (per §A). Inject policy: rag_only.
// Algorithm: NER (KoBERT/Aho-Corasick) → candidate registration → author approve.
// ============================================================

export type GlossaryEntityType =
  | 'person' | 'place' | 'artifact'
  | 'organization' | 'system_term' | 'concept' | 'event';

export type SpoilerTier = 'public' | 'mid' | 'late';

/**
 * M4 GlossaryEntry — canonical name + aliases + spoiler control.
 * Symbol Outline (Phase B) uses this as its data backbone.
 */
export interface GlossaryEntry extends ModuleRecordBase {
  canonical_name: string;
  aliases: string[];
  entity_type: GlossaryEntityType;

  // Lifecycle
  status: ModuleStatus;
  source: 'auto_extracted' | 'manual' | 'imported';
  confidence: number;                           // 0-1; only meaningful for auto_extracted

  // Spoiler control
  spoiler_tier: SpoilerTier;
  first_appearance_planned: number | null;
  first_appearance_actual: number | null;

  // Usage statistics (auto-updated)
  occurrence_count: number;
  last_seen_episode: number | null;
  forbidden_surface_forms: string[];            // typos / non-canonical forms to flag

  // i18n (Translation Studio integration)
  translations?: Partial<Record<AppLanguage, string>>;

  // Workflow timestamps
  approved_at: string | null;
  approved_by: 'author' | null;
}

/** Result of auto-extraction batch run. */
export interface ExtractionResult {
  /** New candidates (status: 'candidate'). */
  candidates: GlossaryEntry[];
  /** Collisions with existing entries (name match but different entity). */
  collisions: Array<{
    existing: GlossaryEntry;
    new: Partial<GlossaryEntry>;
    similarity: number;                         // 0-1
  }>;
  total_scanned_chars: number;
  duration_ms: number;
}

// ============================================================
// PART 4 — M5: Timeline Graph
// ============================================================
//
// "연대기 단위 vs 에피소드 단위 vs 이벤트 그래프" — supports all three.
// Inject policy: on_demand (current episode's events only).
// ============================================================

export type TimelineAxis = 'in_world_year' | 'episode_index' | 'event_chain';

export type TimelineEventType =
  | 'historical' | 'plot' | 'character_milestone' | 'world_change';

export type TimelineVisibility = 'reader_only' | 'protagonist' | 'public';

/**
 * M5 TimelineEvent — single event on the timeline (in-world or out-of-world axis).
 * Supports branching (parallel universes / BranchSelector integration).
 */
export interface TimelineEvent extends ModuleRecordBase {
  title: string;
  event_type: TimelineEventType;
  description: string;

  // Time coordinate
  timeline_axis: TimelineAxis;
  timeline_value: number | string;              // 1024 (year) | 50 (episode) | "after_war"

  // Branching (BranchSelector integration)
  branch_id?: string;
  parent_event_id?: string;                     // causal parent
  triggers_events: string[];                    // causal children

  // Participants
  involved_characters: string[];                // ref → Character.id[]
  involved_locations: string[];                 // ref → WorldEntry.id[]
  visible_to: TimelineVisibility;

  // Episode mapping
  shown_in_episodes: number[];
  hidden_until_episode: number | null;

  status: 'planned' | 'occurred' | 'deprecated';
}

/** Full timeline graph (events + branches + layout hint). */
export interface TimelineGraph {
  events: TimelineEvent[];
  branches: Array<{
    branch_id: string;
    parent_branch?: string;
    description: string;
  }>;
  visualization_layout?: 'linear' | 'force_directed' | 'radial';
}

// ============================================================
// PART 5 — M6: Information Release Tracker (3-track)
// ============================================================
//
// "비밀 공개를 누구 기준으로 추적할까" — recommended: 3 tracks (reader / protagonist / public).
// MVP-tier. Inject policy: always_inject (current episode slice only).
// Compliance hook: secret-release-guard (severity: blocker if hard violated).
// ============================================================

/**
 * M6 InfoReleaseRow — secret tracking across 3 audience tracks.
 * Linked to M2 (must_payoffs) and M12 (linked_foreshadows).
 */
export interface InfoReleaseRow extends ModuleRecordBase {
  secret_statement: string;                     // human-readable secret

  // 3 tracks (null = not yet revealed to that audience)
  audience_at: number | null;                   // episode reader becomes aware
  protagonist_at: number | null;                // episode protagonist becomes aware
  public_at: number | null;                     // episode public (world characters) becomes aware

  // False lead management
  false_lead_until: number | null;
  false_lead_statement: string | null;

  // Lock strength
  lock_level: LockLevel;
  release_trigger: string;                      // human-readable trigger

  // Dependencies
  linked_foreshadows: string[];                 // ref → ForeshadowThread.id[]
  linked_characters: string[];                  // ref → Character.id[]
  related_glossary: string[];                   // ref → GlossaryEntry.id[]

  // Validation
  last_validated_at: string;
  validation_status: 'consistent' | 'leak_detected' | 'pending';
}

// ============================================================
// PART 6 — M8: Speech Register (6-tier Korean honorifics + JP/EN/ZH variants)
// ============================================================
//
// "한국어 화계를 어떻게 제어할까" — relations-table with forbidden shifts + sample endings.
// Enhancement of existing Character voice memo. Inject policy: always_inject.
// Compliance hook: honorific-consistency (severity: warning).
// ============================================================

/** Korean 6-tier speech levels (Wikipedia: Korean speech levels). */
export type KoreanSpeechLevel =
  | '해라체' | '하게체' | '하오체'
  | '하십시오체' | '해체' | '해요체';

/** Japanese register (M8 JP variant). */
export type JapaneseRegister =
  | 'teineigo' | 'tameguchi' | 'sonkeigo' | 'kenjougo' | 'yakuwarigo';

/** Japanese 一人称 pronoun. */
export type JapaneseFirstPersonPronoun =
  | '俺' | '僕' | '私' | '拙者' | '余' | 'わし' | 'あたし' | 'ウチ';

/** Japanese 役割語 (role language) type. */
export type YakuwarigoType =
  | 'standard' | 'hakase' | 'ojou' | 'yankee'
  | 'foreigner' | 'ancient' | 'robot';

/**
 * M8 SpeechProfile — voice rules per character.
 * Enhancement: replaces single-string voice memo with structured 6-tier rules.
 */
export interface SpeechProfile extends ModuleRecordBase {
  character_id: string;                         // ref → Character.id

  // Korean 6-tier (for KO works)
  default_speech_level: KoreanSpeechLevel;

  /** Relation-by-relation rules. */
  rules_by_counterparty: Array<{
    target_id: string;                          // ref → Character.id
    speech_level: KoreanSpeechLevel;
    honorific: boolean;
    forbidden_shift: string[];                  // endings that must never appear
    sample_endings: string[];
    last_changed_at_episode?: number;
  }>;

  // Japanese variants (M8-JP)
  jp_register?: {
    default: JapaneseRegister;
    pronoun_first: JapaneseFirstPersonPronoun;
    pronoun_second?: string;
    kyara_gobi: string;                         // unique character sentence-ending
    yakuwarigo_type: YakuwarigoType;
    dialect?: 'standard' | 'kansai' | 'tohoku' | 'kyushu' | 'okinawa';
  };

  // English variants (M8-EN)
  en_register?: {
    pov_type: 'first_person' | 'third_limited' | 'third_omniscient' | 'second';
    narrative_distance: 'close' | 'intimate' | 'distant';
    vocabulary_register: 'literary' | 'standard' | 'colloquial' | 'period_specific';
    sentence_rhythm: 'short_punchy' | 'long_lyrical' | 'varied';
    unreliable_narrator_degree?: number;        // 0-1
    dialect_region?: string;
  };

  // Chinese variants (M8-ZH)
  zh_register?: {
    narrator_pov: 'third_person_limited' | 'third_person_omniscient' | 'first_person';
    self_address: '我' | '本座' | '本少' | '老子' | '咱' | '本王' | '吾';
    speech_era_style: 'modern' | 'ancient_formal' | 'mixed';
    classical_tone: boolean;                    // 文言 elements
  };

  // Evolution arc (voice changes over the work)
  voice_evolution_arc: Array<{
    chapter: number;
    change: string;
    trigger: string;
  }>;
}

// ============================================================
// PART 7 — M9: Relationship Map + Honorific Evolution
// ============================================================
//
// "호칭은 어떻게 저장할까" — labelled edges + honorific evolution table.
// Enhancement of existing single-string relation memo. Inject policy: always_inject.
// Compliance hook: honorific-evolution-track (severity: warning).
// ============================================================

export type RelationEdgeType =
  | 'ally' | 'mentor' | 'rival' | 'patron'
  | 'enemy' | 'family' | 'romantic';

export type IntimacyLevel =
  | 'stranger' | 'acquaintance'
  | 'friend' | 'close_friend'
  | 'lover' | 'family';

/**
 * M9 RelationEdge — directed edge between two characters with honorific evolution.
 * The evolution table is what makes this distinct from a simple relation memo.
 */
export interface RelationEdge extends ModuleRecordBase {
  source_char: string;                          // ref → Character.id
  target_char: string;                          // ref → Character.id

  edge_type: RelationEdgeType;
  trust_score: number;                          // -100 ~ 100
  power_asymmetry: number;                      // -5 ~ 5 (negative = source weaker)

  // Current state
  current_epithet_a_to_b: string;               // e.g. "千夏さん" / "Marchetti"
  current_epithet_b_to_a: string;
  forbidden_epithets: string[];

  /** The core enhancement — honorific changes over time. */
  honorific_evolution: Array<{
    chapter: number;
    epithet_a_to_b: string;
    epithet_b_to_a: string;
    trigger: string;                            // e.g. "고백 씬", "shared crisis"
    intimacy_level: IntimacyLevel;
  }>;

  // Cross-language honorifics (Translation Studio integration)
  market_address?: Partial<
    Record<AppLanguage, { from: string; to: string }>
  >;
}

// ============================================================
// PART 8 — M11: Beat Bank (trigger-style motif library)
// ============================================================
//
// "trigger-style motif library" — beats trigger on conditions (after_episode,
// after_event, or foreshadow status change). Inject policy: on_demand.
// 4-language market variants are separate rule pack territory —
// this file only declares the shape.
// ============================================================

export type BeatCategory =
  | 'romance' | 'action' | 'mystery'
  | 'comedy' | 'character_arc';

export interface Beat extends ModuleRecordBase {
  category: BeatCategory;
  beat_name: string;                            // "meet_cute" | "first_kiss" | "black_moment" | ...
  description: string;

  /** Conditions under which this beat fires. */
  trigger_conditions: {
    after_episode?: number;
    after_event?: string;                       // ref → TimelineEvent.id
    foreshadow_status?: {
      thread: string;                           // ref → ForeshadowThread.id
      status: ForeshadowStatus;
    };
  };

  // Usage tracking
  used_in_episodes: number[];
  reusable: boolean;
  genre_tags: string[];                         // e.g. ["romance", "slow_burn"]

  /**
   * 4-language market variants — populated only by a separately supplied rule pack.
   * The proprietary software repository leaves this undefined.
   */
  market_variants?: Partial<
    Record<AppLanguage, { name: string; convention: string }>
  >;
}

// ============================================================
// PART 9 — M12: Foreshadow Thread Tracker (enhancement)
// ============================================================
//
// "setup/payoff 1:1 vs false lead + partial payoff + hard payoff 포함 추적기"
// — recommended option C. Inject policy: on_demand (at payoff episode).
// Compliance hook: foreshadow-pair-check (severity: warning).
// Existing: free-text marker [떡밥-id] only. Enhancement: structured pair table.
// ============================================================

export type ForeshadowStatus =
  | 'seeded' | 'armed' | 'misdirected'
  | 'paid' | 'dropped';

export type ForeshadowPayloadType =
  | 'object' | 'line' | 'behavior' | 'rumor' | 'system_rule';

export interface ForeshadowThread extends ModuleRecordBase {
  /** Body marker text: [떡밥-{id}] or [복선-{id}] or [foreshadow-{id}]. */
  marker_id: string;

  // Status lifecycle
  status: ForeshadowStatus;
  payload_type: ForeshadowPayloadType;

  // Episode tracking
  setup_ep: number;
  armed_at_ep?: number;                         // when foreshadow is re-emphasized
  partial_payoff_ep?: number;
  final_payoff_ep?: number;
  dropped_at_ep?: number;
  dropped_reason?: string;

  // Intent vs reality
  intended_payoff: string;
  actual_payoff?: string;

  // False lead handling
  is_false_lead: boolean;
  false_lead_misdirection?: string;

  // Dependencies
  linked_secrets: string[];                     // ref → InfoReleaseRow.id[]
  linked_characters: string[];                  // ref → Character.id[]

  /** Whether this thread is in M2.must_payoffs (= ending depends on it). */
  required_for_ending: boolean;

  // Auto-computed metrics
  payoff_distance_episodes?: number;            // final_payoff_ep - setup_ep
  payoff_quality_score?: number;                // 0-100 (closure strength)
}

// ============================================================
// PART 10 — M18: Platform Profile (separate rule pack interface)
// ============================================================
//
// "platform_target (munpia/kakao) → Royal Road / Wattpad / なろう / 起点 etc."
// — interface only; rule pack DATA is supplied separately from this repository.
// MVP-tier. Inject policy: always_inject (active platform meta only).
// Compliance hook: platform-rating-check (severity by violation type).
// ============================================================

export type PlatformMarket = 'KR' | 'JP' | 'EN' | 'ZH';

export type AgeRating = 'all_ages' | 'teen_15' | 'mature_18' | 'r18';

export type UploadFormat = 'web_serial' | 'book_completed' | 'episode_paid';

export type MonetizationModel =
  | 'free' | 'paid_chapters' | 'subscription' | 'royalty_share';

export type RulePackSource =
  | 'commercial_license'                        // legacy value: separately licensed rule pack
  | 'community'                                 // user-contributed (limited reliability)
  | 'official_api';                             // platform-provided official rules

export interface PlatformProfile {
  /** e.g. "naver_romance" | "narou" | "qidian" | "royalroad". */
  platform_id: string;
  platform_name: string;
  market: PlatformMarket;

  // Chapter length rules
  word_count_per_chapter: {
    min: number;
    max: number;
    recommended: number;
  };
  daily_update_target?: number;                 // e.g. 起点 3 chapters/day

  // Genre / age
  genre_constraints: string[];
  age_rating: AgeRating;

  // Publishing
  upload_format: UploadFormat;
  monetization: MonetizationModel;
  promotion_unlock_criteria?: string;           // e.g. "Naver challenge league 12 weeks"

  // M13 forbidden content code linkage (KO-T01, EN-T05, JP-T03, ZH-T01, ...)
  forbidden_content_codes: string[];

  // Platform-specific custom metadata
  platform_specific?: Record<string, unknown>;

  // Rule pack provenance & versioning
  rule_pack_version: string;
  rule_pack_source: RulePackSource;
  last_updated: string;                         // ISO 8601
}

export type ViolationSeverity = 'blocker' | 'warning' | 'info';

/** Per-episode cross-platform fitness scoring (0-100 per axis). */
export interface PlatformFitnessScore {
  platform_id: string;
  episode_index: number;

  // 4-axis sub-scores
  word_count_fit: number;
  genre_fit: number;
  age_rating_fit: number;
  forbidden_content_fit: number;

  /** Weighted average (default weights: 0.3 / 0.3 / 0.2 / 0.2). */
  overall: number;

  // Per-violation detail
  violations: Array<{
    code: string;                               // e.g. "KO-T01" | "platform.word_count.over"
    severity: ViolationSeverity;
    description: string;
    suggested_fix: string;
  }>;

  computed_at: string;                          // ISO 8601
}

// ============================================================
// PART 11 — Re-exports & Module Union
// ============================================================

/** Union of all 21-module record types (excluding meta/transient like ExtractionResult). */
export type TwentyOneModuleRecord =
  | EndingLock
  | GlossaryEntry
  | TimelineEvent
  | InfoReleaseRow
  | SpeechProfile
  | RelationEdge
  | Beat
  | ForeshadowThread
  | PlatformProfile;

/** Module-id → record-type lookup (for type-safe registry consumers). */
export interface ModuleRecordTypeMap {
  M2: EndingLock;
  M4: GlossaryEntry;
  M5: TimelineEvent;
  M6: InfoReleaseRow;
  M8: SpeechProfile;
  M9: RelationEdge;
  M11: Beat;
  M12: ForeshadowThread;
  M18: PlatformProfile;
}
