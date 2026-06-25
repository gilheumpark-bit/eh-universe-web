// ============================================================
// PART 1 — Module Header
// ============================================================
//
// twentyone-modules/registry.ts
// — Single source of truth for the 21-module ↔ Loreguard tab mapping.
//
// Each entry declares:
//   - module_id        : M1 ~ M21
//   - name             : human-readable
//   - status_in_loreguard : 'covered' | 'gap' | 'enhancement'
//   - host_tab         : which existing Loreguard tab hosts this module
//   - injection_policy : ARCS WRITING_AGENT_REGISTRY injection strategy
//   - priority         : 'A' (MVP) | 'B' (Phase 2) | 'C' (Phase 3+)
//   - feature_flag     : opt-in level (off / essential / standard / pro)
//
// Used by:
//   - Settings → Advanced → "21-Module Mode" toggle
//   - Compliance 16-hook router (per-module hook lookup)
//   - Authorship Journal _4 Provenance Report (module completion stats)
//   - ARCS ContextBlock builder (auto-derive injection_policy)
//
// [C] Frozen object — no runtime mutation.
// [G] All lookups are O(1) via index maps (built once at module load).
// [K] Single REGISTRY array, no abstraction wrappers.
// ============================================================

import type { AppTab } from '@/lib/studio-types';
import type { ModuleId, InjectionStrategy } from './types';

// ============================================================
// PART 2 — Types
// ============================================================

/** Coverage status of a module within Loreguard. */
export type ModuleCoverageStatus =
  /** Loreguard already has full or near-full implementation. */
  | 'covered'
  /** Gap — feature does not exist; must be added by 21-module fusion. */
  | 'gap'
  /** Existing partial implementation; will be enhanced (not replaced). */
  | 'enhancement';

/** Feature flag tier — see Settings → Advanced → "21-Module Mode". */
export type FeatureFlagTier =
  /** Default — module hidden entirely (no UI surface, no Compliance hook). */
  | 'off'
  /** Tier A modules only (M2 / M4 / M18). */
  | 'essential'
  /** Tier A + B (essential + M5 / M6 / M11). */
  | 'standard'
  /** Full 21-module mode (essential + standard + M8 / M9 / M12 enhancements). */
  | 'pro';

/** Implementation priority (per 21-module §A.A). */
export type ModulePriority = 'A' | 'B' | 'C';

/** Module registry entry — one per 21 modules. */
export interface ModuleRegistryEntry {
  module_id: ModuleId;
  /** English short name. */
  name: string;
  /** Korean short name. */
  name_ko: string;
  /** Coverage status in current Loreguard (2026-05-11 baseline). */
  status_in_loreguard: ModuleCoverageStatus;
  /**
   * Which Loreguard tab hosts this module's UI surface.
   * `null` means no UI surface (e.g. M21 Change History is purely backend).
   */
  host_tab: AppTab | 'novel-ide-launcher' | null;
  /** ARCS injection policy. */
  injection_policy: InjectionStrategy;
  /** MVP priority. */
  priority: ModulePriority;
  /** Minimum feature flag tier at which this module's UI surfaces (only for gap/enhancement). */
  feature_flag: FeatureFlagTier;
  /**
   * ARCS ContextBlockId this module contributes to (if any).
   * Several modules share `character-dna` etc.
   */
  context_block_id?: string;
  /**
   * Compliance hook ID (if Compliance 16-hook router uses this module).
   * `undefined` means the module does not register a Compliance hook.
   */
  compliance_hook_id?: string;
  /** One-line description of the module's role. */
  role: string;
}

// ============================================================
// PART 3 — Registry (21 entries, frozen)
// ============================================================

export const REGISTRY: readonly ModuleRegistryEntry[] = Object.freeze([
  // ── Constitution (M1-M2) ─────────────────────────────────
  {
    module_id: 'M1',
    name: 'Series Bible / Pitch',
    name_ko: '작품 개요',
    status_in_loreguard: 'covered',
    host_tab: 'world',
    injection_policy: 'always_inject',
    priority: 'A',
    feature_flag: 'off',
    context_block_id: 'story-summary',
    role: 'Title / logline / genre / target audience / themes / series engine',
  },
  {
    module_id: 'M2',
    name: 'Ending Lock',
    name_ko: '결말 잠금',
    status_in_loreguard: 'gap',
    host_tab: 'world',
    injection_policy: 'always_inject',
    priority: 'A',
    feature_flag: 'essential',
    context_block_id: 'ending-lock',
    compliance_hook_id: 'ending-match-check',
    role: 'Final image / banned reversals / must payoffs / lock level',
  },

  // ── World (M3-M6) ────────────────────────────────────────
  {
    module_id: 'M3',
    name: 'World Bible',
    name_ko: '세계관 바이블',
    status_in_loreguard: 'covered',
    host_tab: 'world',
    injection_policy: 'on_demand',
    priority: 'B',
    feature_flag: 'off',
    context_block_id: 'world-book',
    role: 'Geography / political systems / magic rules / unbreakable rules',
  },
  {
    module_id: 'M4',
    name: 'Glossary Index',
    name_ko: '명칭 사전',
    status_in_loreguard: 'gap',
    host_tab: 'world',
    injection_policy: 'rag_only',
    priority: 'A',
    feature_flag: 'essential',
    context_block_id: 'glossary',
    compliance_hook_id: 'glossary-surface-form',
    role: 'Canonical names / aliases / spoiler tier / NER auto-extract + approval',
  },
  {
    module_id: 'M5',
    name: 'Timeline Graph',
    name_ko: '타임라인',
    status_in_loreguard: 'gap',
    host_tab: 'direction',
    injection_policy: 'on_demand',
    priority: 'B',
    feature_flag: 'standard',
    context_block_id: 'timeline-graph',
    role: 'In-world events / branches / causal chains',
  },
  {
    module_id: 'M6',
    name: 'Info Release Tracker',
    name_ko: '정보 공개표',
    status_in_loreguard: 'gap',
    host_tab: 'direction',
    injection_policy: 'always_inject',
    priority: 'A',
    feature_flag: 'standard',
    context_block_id: 'info-release-table',
    compliance_hook_id: 'secret-release-guard',
    role: '3-track (reader/protagonist/public) secret reveal + false-lead tracking',
  },

  // ── Character (M7-M9) ────────────────────────────────────
  {
    module_id: 'M7',
    name: 'Character Bible',
    name_ko: '캐릭터 바이블',
    status_in_loreguard: 'covered',
    host_tab: 'characters',
    injection_policy: 'always_inject',
    priority: 'A',
    feature_flag: 'off',
    context_block_id: 'character-dna',
    role: 'Desire / need / ghost / flaw / arc type (DNA Tier 1/2/3)',
  },
  {
    module_id: 'M8',
    name: 'Speech Register',
    name_ko: '말투 / 화계',
    status_in_loreguard: 'enhancement',
    host_tab: 'characters',
    injection_policy: 'always_inject',
    priority: 'A',
    feature_flag: 'pro',
    context_block_id: 'character-dna',
    compliance_hook_id: 'honorific-consistency',
    role: 'Korean 6-tier speech levels / JP yakuwarigo / EN POV / ZH classical tone',
  },
  {
    module_id: 'M9',
    name: 'Relation + Honorific Evolution',
    name_ko: '관계 / 호칭 진화',
    status_in_loreguard: 'enhancement',
    host_tab: 'characters',
    injection_policy: 'always_inject',
    priority: 'A',
    feature_flag: 'pro',
    context_block_id: 'character-dna',
    compliance_hook_id: 'honorific-evolution-track',
    role: 'Labelled edges + trust score + per-chapter honorific evolution table',
  },

  // ── Plot (M10-M13) ───────────────────────────────────────
  {
    module_id: 'M10',
    name: 'ARC Design',
    name_ko: '아크 설계',
    status_in_loreguard: 'covered',
    host_tab: 'direction',
    injection_policy: 'on_demand',
    priority: 'B',
    feature_flag: 'off',
    context_block_id: 'act-guide',
    role: '3-act / 5-act / heros journey / save-the-cat / kishotenketsu',
  },
  {
    module_id: 'M11',
    name: 'Beat Bank',
    name_ko: '비트 뱅크',
    status_in_loreguard: 'gap',
    host_tab: 'style',
    injection_policy: 'on_demand',
    priority: 'B',
    feature_flag: 'standard',
    context_block_id: 'beat-bank',
    role: 'Trigger-style motif library (after_event / foreshadow_status / after_episode)',
  },
  {
    module_id: 'M12',
    name: 'Foreshadow Tracker',
    name_ko: '복선 추적',
    status_in_loreguard: 'enhancement',
    host_tab: 'direction',
    injection_policy: 'on_demand',
    priority: 'A',
    feature_flag: 'pro',
    context_block_id: 'foreshadow-pair',
    compliance_hook_id: 'foreshadow-pair-check',
    role: 'setup/payoff/false-lead status (seeded/armed/misdirected/paid/dropped)',
  },
  {
    module_id: 'M13',
    name: 'Taboo Code',
    name_ko: '금기 / 금지 전개',
    status_in_loreguard: 'covered',
    host_tab: 'settings',
    injection_policy: 'always_inject',
    priority: 'A',
    feature_flag: 'off',
    context_block_id: 'genre-rules',
    role: 'IP Guard L1-L5 + PRISM 3-tier + per-language forbidden content codes',
  },

  // ── Chapter (M14-M16) ────────────────────────────────────
  {
    module_id: 'M14',
    name: 'Scene Sheet',
    name_ko: '회차 씬시트',
    status_in_loreguard: 'covered',
    host_tab: 'scene-sheet',
    injection_policy: 'on_demand',
    priority: 'A',
    feature_flag: 'off',
    context_block_id: 'scene-sheet',
    compliance_hook_id: 'episode-hook-check',
    role: 'Episode goal / aftertaste / must_include / must_not_include / scene options A/B/C',
  },
  {
    module_id: 'M15',
    name: 'Scene Design',
    name_ko: '장면 설계',
    status_in_loreguard: 'covered',
    host_tab: 'direction',
    injection_policy: 'on_demand',
    priority: 'B',
    feature_flag: 'off',
    role: 'Camera / rhythm / dialogue density / hook style',
  },
  {
    module_id: 'M16',
    name: 'Emotion Curve',
    name_ko: '감정 곡선',
    status_in_loreguard: 'covered',
    host_tab: 'visual',
    injection_policy: 'on_demand',
    priority: 'B',
    feature_flag: 'off',
    context_block_id: 'tension-curve',
    role: 'Tension / emotion intensity per episode (series-direction-dna avgTensionCurve)',
  },

  // ── Operations (M17-M21) ─────────────────────────────────
  {
    module_id: 'M17',
    name: 'Style Guide',
    name_ko: '문체 가이드',
    status_in_loreguard: 'covered',
    host_tab: 'style',
    injection_policy: 'always_inject',
    priority: 'B',
    feature_flag: 'off',
    context_block_id: 'style-dna',
    role: 'Prose density / dialogue ratio / adverb policy / POV discipline',
  },
  {
    module_id: 'M18',
    name: 'Platform Adapter',
    name_ko: '플랫폼 어댑터',
    status_in_loreguard: 'gap',
    host_tab: 'settings',
    injection_policy: 'always_inject',
    priority: 'A',
    feature_flag: 'essential',
    context_block_id: 'platform-profile',
    compliance_hook_id: 'platform-rating-check',
    role: '18-platform conformance (KR 5 + JP 4 + EN 5 + ZH 4) — rule pack via commercial license',
  },
  {
    module_id: 'M19',
    name: 'Continuity DB',
    name_ko: '연속성 DB',
    status_in_loreguard: 'covered',
    host_tab: 'direction',
    injection_policy: 'rag_only',
    priority: 'A',
    feature_flag: 'off',
    context_block_id: 'continuity-notes',
    compliance_hook_id: 'continuity-cost-check',
    role: 'Fact log with source episode / confidence / canon vs provisional',
  },
  {
    module_id: 'M20',
    name: 'QA Checklist',
    name_ko: '검수 체크리스트',
    status_in_loreguard: 'covered',
    host_tab: null,
    injection_policy: 'post_generation_only',
    priority: 'A',
    feature_flag: 'off',
    role: 'Compliance 7-axis + 16-hook router (deterministic + model checks)',
  },
  {
    module_id: 'M21',
    name: 'Change History',
    name_ko: '변경 이력',
    status_in_loreguard: 'covered',
    host_tab: 'history',
    injection_policy: 'rag_only',
    priority: 'A',
    feature_flag: 'off',
    role: 'Diff per module field with reason / effective_episode / requires_backfill',
  },
]);

// ============================================================
// PART 4 — Indexed Lookups (O(1) helpers)
// ============================================================

/** Map: ModuleId → RegistryEntry. */
const BY_ID: ReadonlyMap<ModuleId, ModuleRegistryEntry> = new Map(
  REGISTRY.map((entry) => [entry.module_id, entry]),
);

/** Lookup: module entry by ID, or undefined. */
export function getModule(id: ModuleId): ModuleRegistryEntry | undefined {
  return BY_ID.get(id);
}

/** Filter: all modules hosted in a specific tab. */
export function modulesByHostTab(tab: AppTab | 'novel-ide-launcher' | null): readonly ModuleRegistryEntry[] {
  return REGISTRY.filter((entry) => entry.host_tab === tab);
}

/** Filter: all modules by coverage status. */
export function modulesByStatus(status: ModuleCoverageStatus): readonly ModuleRegistryEntry[] {
  return REGISTRY.filter((entry) => entry.status_in_loreguard === status);
}

/** Filter: all modules visible at a given feature-flag tier (cumulative). */
export function modulesEnabledAt(tier: FeatureFlagTier): readonly ModuleRegistryEntry[] {
  const tierOrder: Record<FeatureFlagTier, number> = {
    off: 0,
    essential: 1,
    standard: 2,
    pro: 3,
  };
  const userLevel = tierOrder[tier];
  return REGISTRY.filter((entry) => {
    // 'covered' modules are always enabled (they pre-existed).
    if (entry.status_in_loreguard === 'covered') return true;
    // gap / enhancement modules require user's tier ≥ module's tier.
    return tierOrder[entry.feature_flag] <= userLevel;
  });
}

/** All Compliance hook IDs registered by 21-module entries. */
export function allComplianceHookIds(): readonly string[] {
  return REGISTRY
    .map((entry) => entry.compliance_hook_id)
    .filter((id): id is string => typeof id === 'string');
}

/** All ARCS ContextBlock IDs registered by 21-module entries (deduplicated). */
export function allContextBlockIds(): readonly string[] {
  const set = new Set<string>();
  for (const entry of REGISTRY) {
    if (entry.context_block_id) set.add(entry.context_block_id);
  }
  return Array.from(set);
}

/** Audit info for debug / Settings UI. */
export interface RegistryAudit {
  total: number;
  covered: number;
  gap: number;
  enhancement: number;
  coverage_percent: number;
  by_priority: Record<ModulePriority, number>;
  by_feature_flag: Record<FeatureFlagTier, number>;
}

/** Audit summary — used by Settings → Advanced → "21-Module Mode" status display. */
export function auditRegistry(): RegistryAudit {
  const covered = REGISTRY.filter((e) => e.status_in_loreguard === 'covered').length;
  const gap = REGISTRY.filter((e) => e.status_in_loreguard === 'gap').length;
  const enhancement = REGISTRY.filter((e) => e.status_in_loreguard === 'enhancement').length;
  return {
    total: REGISTRY.length,
    covered,
    gap,
    enhancement,
    coverage_percent: Math.round((covered / REGISTRY.length) * 100),
    by_priority: {
      A: REGISTRY.filter((e) => e.priority === 'A').length,
      B: REGISTRY.filter((e) => e.priority === 'B').length,
      C: REGISTRY.filter((e) => e.priority === 'C').length,
    },
    by_feature_flag: {
      off: REGISTRY.filter((e) => e.feature_flag === 'off').length,
      essential: REGISTRY.filter((e) => e.feature_flag === 'essential').length,
      standard: REGISTRY.filter((e) => e.feature_flag === 'standard').length,
      pro: REGISTRY.filter((e) => e.feature_flag === 'pro').length,
    },
  };
}
