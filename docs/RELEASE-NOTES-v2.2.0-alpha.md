# Loreguard v2.2.0-alpha — Novel Studio Fortress

**Release date**: 2026-04-20
**Branch**: `feature/M7-hardening`
**Stability**: Alpha — deployable

---

## What's new (for writers)

- **Automatic save you can trust.** A new journaling save engine records every edit as a content-addressable chain. If anything goes wrong, the chain tells us exactly what was written, when, and where it came from.
- **Recovery for unexpected crashes.** If Loreguard crashes while you're mid-sentence, the next launch now offers a recovery dialog with three strategies (restore, roll back, discard). No more silent loss.
- **Multi-tab conflict detection.** Open the same project in two tabs? Loreguard notices, elects a leader, and tells you which tab holds the pen. No more clobbered scenes.
- **3-tier backup.** Primary (journal) + secondary (encrypted mirror) + tertiary (manual file export) — all orchestrated, all observable.
- **Writing studio refactored.** The Writing tab is 38% smaller (890 → 552 lines) and substantially faster to mount. The AI control is now a floating FAB you drive — not a dock that hovers over your prose.
- **Scene preset library.** Save your favourite scene setups (genre + pacing + cliff types + emotional arc). Reuse them on the next episode in one click.
- **Origin tagging.** Every field in the scene sheet is now labelled USER / TEMPLATE / ENGINE_SUGGEST / ENGINE_DRAFT. At a glance you can see what you wrote and what NOA drafted. Writer accountability built into the data layer.
- **Genre translation.** Switch between novel / webtoon / drama / game modes — the prompt layer adapts. Your scene sheet data is preserved across switches.
- **Long-haul ergonomics.** Typography presets (comfort / compact / large), eye-strain dimmer, keystroke heatmap for wrist awareness, session timer with break reminders. Built for 8-hour sessions.

---

## Under the hood (for engineers)

### Milestone chain (SHAs)

| Milestone | Head SHA | Ships |
|---|---|---|
| M0 | `80735ca5` | FMEA-20 perf baseline + regression E2E + blackbox reports |
| M1 | `4680faec` | Journal engine (17 modules, 114 tests), recovery, multi-tab, 3-tier backup, shadow-write, 10k chaos bench |
| M2 | `87580978` | Writing IDE refactor (hooks 35→19), React.memo, dynamic imports |
| M3 | `29f61c7e` | Scene preset library, episode transitions |
| M4 | `eac781b3` | Origin tagging V1↔V2 migration (NOA Core 3-Axis patent) |
| M5 | `be8c8c76` | 4-genre translation layer (novel/webtoon/drama/game × ko/en/ja/zh) |
| M6 | `fdc9189a` | Typography presets, eye-strain dimmer, session timer |
| M7 | this branch | Audit, env-sanity, alpha smoke suite, docs, version bump |

### Metrics

| Metric | M6 (prior) | M7 (this release) |
|---|---|---|
| Jest tests | 3,200 passing | 3,217 passing (+17) |
| Jest suites | 287 | 289 (+2) |
| TypeScript errors | 0 | 0 |
| Static pages built | 56 | 56 |
| Next build time | ~18.7s | ~18.7s |
| Fortress diff (M1 paths) | N/A | empty vs eac781b3 |

Fortress zero-diff guarantee: the M1 save-engine, useAutoSave, useRecovery, useMultiTab, useBackupTiers, usePrimaryWriter surfaces are byte-identical to M4 head. M7 did not touch the fortress.

### New in M7

- `src/lib/env-sanity.ts` — boot-time probe for IndexedDB / BroadcastChannel / Web Locks / crypto.subtle + localStorage headroom; emits `noa:environment-degraded` event.
- `src/hooks/useEnvironmentSanity.ts` — optional React subscription.
- `src/lib/__tests__/env-sanity.test.ts` — 5 tests (probe + missing-API + event emission contract).
- `src/__tests__/alpha-smoke.test.ts` — 12-test integration smoke suite exercising shell load, save round-trip, crash recovery, multi-tab wire, backup tier, scene preset, origin migration, genre switch, ergonomics, env-sanity.
- `docs/m7-hardening-audit.md` — full pre-release audit.
- `docs/RELEASE-NOTES-v2.2.0-alpha.md` — this document.
- `package.json` version → `2.2.0-alpha`.
- `StudioShell.tsx` — one additive line: `useEnvironmentSanity()` hook call.

### Known limitations (deliberately deferred)

- **Bundle analysis table**: Next.js 16 / Turbopack does not emit the classic First Load JS table at build time. Use `npm run build:analyze` or `npm run build:report` for per-route size detail.
- **axe-core automated a11y**: package not installed. Manual WCAG 2.1 AA audit tracked in `docs/eh-universe-baseline-checklist.md`. Installing `@axe-core/react` is tagged for post-alpha.
- **MarketplacePanel**: still a skeleton wired to placeholder manuscript getters. Feature-flagged off.

---

## Upgrade notes (for users)

None. Existing projects migrate transparently:

- V1 scene sheets auto-convert to V2 (origin-tagged) on first read. All fields receive `origin='USER'` — the safe default.
- V2 projects export back to V1 losslessly (metadata dropped; values preserved).
- Genre mode defaults to `novel` — no change for existing novels.
- Typography preset defaults to `comfort` — readable without any action.

---

## Thanks

To every alpha tester who survived the shadow-write phase, the chaos-10k bench, and the journal-primary swap. You made the fortress real.
