# 21-Module Authoring System ↔ Loreguard Mapping

**Document version**: 1.0.0
**Last updated**: 2026-05-11
**Status**: Tier-1 whitepaper (alpha-phase normalization document)
**Audience**: Loreguard contributors, commercial license holders, academic reviewers

---

## 1. Scope

The "21-Module Authoring System" is Loreguard's internal normalization of established industry standards for long-form fiction authoring:

| Source | Contribution |
|---|---|
| WGA Series Bible (5-15 pp) | M1 Series Bible / Pitch Document |
| Save the Cat (Blake Snyder, 2005) | Logline 5W1H formula (M1) |
| The Anatomy of Story (John Truby, 2007) | Character web — desire / need / ghost / flaw (M7) |
| Sanderson's Three Laws of Magic | World rules — limits / costs / sacrifice (M3) |
| Pixar Story Spine (Kenn Adams) | Beat structure (M11) |
| Amazon KDP self-publishing standards | Genre / age / monetization (M18) |
| MFA Creative Writing conventions | Voice / POV / show vs tell (M17, M8) |
| Korean speech-level reference (Wikipedia: Korean speech levels) | M8 6-tier honorifics |

This document maps each of the 21 modules to its location within Loreguard's existing surface, identifies the 6 coverage gaps and 3 enhancement opportunities, and specifies the synergy with existing Loreguard subsystems (ARCS, Authorship Journal, Compliance, IP Guard).

**Trade-secret separation**: This whitepaper describes module *schemas*. The associated rule pack data (M18 18-platform rules, M11 beat seeds, market-variant honorific tables) is commercial-license territory and not redistributed under AGPL.

---

## 2. The 21 Modules — Six Groups

| Group | Modules |
|---|---|
| **Constitution** | M1 Series Bible · M2 Ending Lock |
| **World** | M3 World Bible · M4 Glossary · M5 Timeline · M6 Info Release |
| **Character** | M7 Character Bible · M8 Speech Register · M9 Relations + Honorific Evolution |
| **Plot** | M10 ARC · M11 Beat Bank · M12 Foreshadow Tracker · M13 Taboo Code |
| **Chapter** | M14 Scene Sheet · M15 Scene Design · M16 Emotion Curve |
| **Operations** | M17 Style Guide · M18 Platform Adapter · M19 Continuity DB · M20 QA Checklist · M21 Change History |

---

## 3. Loreguard Coverage Matrix (2026-05-11 Baseline)

| Module | Loreguard host tab | Status | Notes |
|---|---|---|---|
| M1 Series Bible | `world` | ✓ covered | StoryConfig + manuscript metadata |
| **M2 Ending Lock** | `world` | ✗ **gap** | Tier A — new lib `twentyone-modules/ending-lock` |
| M3 World Bible | `world` | ✓ covered | WorldEntry + 109 archive entries |
| **M4 Glossary Index** | `world` | ✗ **gap** | Tier A — Symbol IDE Phase B integration |
| **M5 Timeline Graph** | `rulebook` | ✗ **gap** | Tier B |
| **M6 Info Release** | `rulebook` | ✗ **gap** | Tier A — 3-track (reader/protagonist/public) |
| M7 Character Bible | `characters` | ✓ covered | DNA Tier 1/2/3 |
| **M8 Speech Register** | `characters` | △ **enhance** | Replace string memo with 6-tier rules |
| **M9 Relations + Honorific** | `characters` | △ **enhance** | Add evolution table |
| M10 ARC Design | `rulebook` | ✓ covered | Outline subsystem |
| **M11 Beat Bank** | `style` | ✗ **gap** | Tier B — trigger-style motif library |
| **M12 Foreshadow Tracker** | `rulebook` | △ **enhance** | Structured pair table replaces marker-only |
| M13 Taboo Code | `settings` | ✓ covered | IP Guard L1-L5 + PRISM 3-tier |
| M14 Scene Sheet | `scene-sheet` | ✓ covered | 3-section restructure |
| M15 Scene Design | `rulebook` | ✓ covered | SceneDirectionData |
| M16 Emotion Curve | `visual` | ✓ covered | series-direction-dna avgTensionCurve |
| M17 Style Guide | `style` | ✓ covered | WriterProfileCard |
| **M18 Platform Adapter** | `settings` | ✗ **gap** | Tier A — 18 platforms (KR 5 / JP 4 / EN 5 / ZH 4) |
| M19 Continuity DB | `rulebook` | ✓ covered | useContinuityCheck |
| M20 QA Checklist | (backend) | ✓ covered | Compliance 7-axis (→ 16-axis with new hooks) |
| M21 Change History | `history` | ✓ covered | useAutoVersionSnapshot |

**Summary**: 12 covered (57%) · 6 gap · 3 enhancement.

---

## 4. ARCS Synergy — 11 → 17 ContextBlock Expansion

The 21-module fusion adds 6 new `ContextBlockId` to the WRITING_AGENT_REGISTRY:

| New ContextBlockId | Source module | Injection policy |
|---|---|---|
| `ending-lock` | M2 | always_inject |
| `glossary` | M4 | rag_only |
| `timeline-graph` | M5 | on_demand |
| `info-release-table` | M6 | always_inject (current-episode slice) |
| `beat-bank` | M11 | on_demand |
| `platform-profile` | M18 | always_inject (active platform only) |
| `foreshadow-pair` | M12 | on_demand (at payoff episode) |

Token-budget impact: always_inject sum 3,500 → 4,450 (+27%), still within DGX 35B MoE 8,192 max_model_len at 87% headroom. Compression of `continuity-notes` (400 → 250 tokens) reserves margin.

---

## 5. Compliance 7-axis → 16-axis (8 new hooks)

The existing 7-axis Compliance scorer (worldview / character / direction / genre / scene-sheet / continuity / IP) is extended with 8 new module-driven hooks routed through `lib/compliance/axes/hooks/`:

| New hook | Source module | Severity |
|---|---|---|
| `ending-match-check` | M2 | blocker (if hard locked) |
| `glossary-surface-form` | M4 | warning |
| `secret-release-guard` | M6 | blocker (if hard locked) |
| `platform-rating-check` | M18 | per-violation |
| `honorific-consistency` | M8 | warning |
| `honorific-evolution-track` | M9 | warning |
| `foreshadow-pair-check` | M12 | warning |
| `episode-hook-check` | M14 | info |

Implementation: each hook is a deterministic check (regex / structural / cache-friendly). No new LLM calls; existing DGX RPC pipeline unchanged. Severity grouping (blocker / warning / info / trace) prevents alert fatigue.

---

## 6. Authorship Journal Synergy

The Authorship Journal (`_1`/`_2`/`_3`/`_4` Visual Charter v1.0) gains 5 new metadata fields when 21-module mode is active:

| Field | Source | Reader value |
|---|---|---|
| `module_completion_score` | Registry `auditRegistry()` | Publisher sees how mature the work is |
| `foreshadow_payoff_distance_avg` | M12 stats | Plotting discipline indicator |
| `ending_lock_match_score` | M2 vs final episode | Promised-vs-delivered consistency |
| `platform_fitness_matrix` | M18 (per-platform) | Cross-market readiness |
| `honorific_consistency_score` | M8 / M9 | Korean-language quality indicator |

These enrich the existing 9-Origin × HCI 0-100 baseline with a 3-dimensional matrix (Origin × ContextBlock × Module).

---

## 7. Isolation §1 — Trade-Secret Separation

The 21-module subsystem ships as:

1. **AGPL-distributed** (this repo, `src/lib/twentyone-modules/`):
   - Schema interfaces (TypeScript)
   - Registry (module ↔ tab mapping + injection policy)
   - Compliance hook router
   - UI surface (Settings, WorldTab sections, etc.)

2. **Commercial-license grant** (not in this repo, external):
   - M18 18-platform rule pack (concrete word counts, age ratings, monetization rules)
   - M13 4-language forbidden content code data (ZH-T01..T08, EN-T01..T07, JP-T01..T06, KO content rules)
   - M11 4-language beat seed data (genre conventions per market)
   - M8 / M9 4-language honorific variants (yakuwarigo tables, classical-tone register)

The `.github/workflows/isolation-check.yml` workflow enforces this separation at every PR by grepping for trade-secret asset filenames and rule pack data hardcoding.

---

## 8. Feature-Flag Tiers

To avoid overwhelming alpha users, 21-module surfaces are tiered:

| Tier | Modules visible | Default for |
|---|---|---|
| `off` | 12 covered only | All new users (alpha default) |
| `essential` | + M2 / M4 / M18 (Tier A gaps) = 15 | Writers ready for ending lock + glossary + platform |
| `standard` | + M5 / M6 / M11 (Tier B gaps) = 18 | Writers approaching publication |
| `pro` | + M8 / M9 / M12 enhancements = 21 | Publishers / translators / mature works |

UserRoleContext maps roles to default tiers: explorer/writer → `off` initial; publisher → `essential` initial; translator → custom (M18 enabled).

---

## 9. Implementation Phases

| Phase | Scope | Effort |
|---|---|---|
| Phase 2 Step 1 (this commit) | Types + Registry + Isolation CI + this whitepaper | ~5 turns |
| Phase 2 Step 2-7 | M2 / M4 / M18 implementation + Feature Flag + Severity grouping | ~35 turns |
| Phase 2 Step 8-11 | ARCS ContextBlock expansion + Compliance 8 hooks | ~15 turns |
| Phase 3 | M5 / M6 / M11 + M8 / M9 / M12 enhancements + alpha measurement | ~60 turns |
| Phase 4 (commercial) | M18 rule pack integration + LSP platform API | ~30 turns |

---

## 10. References

Loreguard internal:
- [`src/lib/twentyone-modules/types.ts`](../../../src/lib/twentyone-modules/types.ts)
- [`src/lib/twentyone-modules/registry.ts`](../../../src/lib/twentyone-modules/registry.ts)
- [`ROADMAP.md`](../../../ROADMAP.md) §2.1, §2.8
- [`GOVERNANCE.md`](../../../GOVERNANCE.md) §3.2 (license policy)
- [`docs/whitepapers/tier1/01-noa-core-3axis-patent.md`](01-noa-core-3axis-patent.md)

External (industry standards referenced as design inputs):
- WGA Writers Guild of America — Series Bible guidelines (public industry standard)
- Snyder, Blake. *Save the Cat* (2005)
- Truby, John. *The Anatomy of Story* (2007)
- Sanderson, Brandon. BYU creative-writing lectures (public)
- Adams, Kenn. Pixar Story Spine (public framework)
- Wikipedia — Korean speech levels (encyclopedia entry, CC BY-SA 4.0)

---

*This document is part of the Loreguard tier-1 whitepaper set. Tier-2 (architectural deep-dives) and tier-3 (operational runbooks) are maintained separately.*
