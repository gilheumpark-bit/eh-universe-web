# Cleanup Status

Last updated: 2026-06-19

## Current Status

Source cleanup for removed public product surfaces is largely complete.

2026-06-14 app-route pass:

- Physically removed stale `src/app` route files for `/codex`, `/reference`, `/reports`, `/rulebook`, `/tools/*`, and `/world/[id]`.
- Kept the proxy guard for those paths so regressions still return removed-surface responses instead of reviving old pages.
- Removed public global shortcuts/action-catalog entries that could route users back to removed surfaces.

2026-06-19 E2E/debt pass:

- Recast stale Network/Tools E2E files as retired-surface regression tests.
- Added/kept 410 compatibility responses for `GET/POST /api/network-agent/search`, `GET/POST /api/network-agent/ingest`, and `/api/network-agent/smoke`.
- Verified the related browser suite: 55 Playwright tests passed for current public routes plus removed-surface 404/410 gates.

`src` scan result after cleanup:

- `Codex`: 0 active source hits
- `codex`: 0 active source hits
- `code-studio`: 0 active source hits
- `Code Studio`: 0 active source hits
- `CodeStudio`: 0 active source hits
- `/code-studio`: 0 active source hits
- 구 네트워크 검색 에이전트 ID: 0 active source hits
- 구 아카이브 검색 가드 ID: 0 active source hits
- 구 HSE 검색 방어 가드 ID: 0 active source hits

Detailed deletion ledger:

- `docs/구잔재_삭제_목록_2026-06-12.md`

## Removed Public Surfaces

Removed:

- `/code-studio`
- `/network`
- `/archive`
- `/codex`
- `/reference`
- `/rulebook`
- `/reports`
- `/tools/*`
- `/world/[id]`

Related deleted areas include:

- Code Studio APIs/hooks/modal ids/preload references
- Network agent UI/libraries/tests. Only 410 compatibility API routes remain.
- public Codex UI and route
- public Reports data and route
- public Reference/Rulebook/Tools routes
- public article/report datasets
- former desktop route
- old Studio chrome, old tab router, and dead panels

## Preserved Active Areas

Preserved:

- Loreguard shell and tabs
- Translation Studio
- Creative process record modules
- Creative structured prompt modules under `creative-domain-prompts`
- Writing workspace utilities under `writing-workspace`
- Scene sheet helpers
- IP guard scanner
- Legal/support pages

## Translation Studio Decision

Decision as of 2026-06-14: keep, do not delete.

Reason:

- `src/app/translation-studio`, `src/components/translator`, and `src/lib/translation` are still active product paths.
- The dedicated Translation Studio has deeper workflow panels than the Studio `번역·현지화` step, including source integrity, author sign-off, multi-language batch, save/backup, and translation environment status.
- The author premise is distinct: the author may not know the target language, so review must present Korean-readable risk, back-translation/comparison evidence, and recommendation states.

Integration direction:

- Studio `번역·현지화` remains the in-flow step.
- `/translation-studio` remains the advanced translation workspace until the in-flow tab reaches parity.
- After parity, decide between a redirect/deep-link shell and a fully merged Studio panel. Do not delete before parity evidence exists.

## Size Notes

Current recorded cleanup numbers:

- additional 1~4 cleanup: 110 files, about 1.13 MB
- tracked deletion cumulative total: 232 files, about 2.88 MB
- `src/components/studio`: 181 files, about 2.52 MB

The renamed `creative-domain-prompts` folder is preserved and is not counted as net deletion.

## Verification Notes

Latest checks from cleanup round:

```bash
npx tsc --noEmit
```

Passed.

Targeted Jest:

```bash
npx jest src/__tests__/navigation.test.ts src/components/__tests__/GlobalShortcuts.test.tsx src/components/__tests__/Header.test.tsx src/lib/actions/__tests__/action-registry.test.ts src/lib/keyboard/__tests__/keyboard-manager.test.ts src/lib/modals/__tests__/modal-manager.test.tsx src/lib/__tests__/changelog-data.test.ts src/lib/creative/__tests__/work-receipt-journal.test.ts src/lib/writing-workspace/__tests__/global-search-index.test.ts src/services/__tests__/geminiService.test.ts --cacheDirectory .jest-cache
```

Result:

- 10 suites passed
- 158 tests passed

Jest config warning:

- Fixed on 2026-06-12: `setupFilesAfterEach` was corrected to `setupFilesAfterEnv` in `jest.config.ts`.

## Documentation Cleanup

Current source-of-truth docs have been rewritten:

- `AGENTS.md`
- `CLAUDE.md`
- `README.md`
- `.agents/skills/eh-universe-guideline/SKILL.md`
- `docs/PRODUCT-FRAME.md`
- `docs/ARCHITECTURE.md`
- `docs/CLEANUP-STATUS.md`

Still historical or mixed:

- older ADRs
- release notes
- audit reports
- old feature inventories
- long strategy/research docs

Those should not be treated as current architecture unless they are updated or explicitly referenced by the current source-of-truth docs.

## Design-Only Absorption Notes

2026-06-19 `연극부`/rehearsal audit:

- Original source remains outside the app at `C:\Users\sung4\OneDrive\바탕 화면\claude\_사상\_연극부_시스템.md`.
- Current app source has no active `연극부`, `backstage`, or rehearsal implementation in `src/app`, `src/components`, `src/hooks`, or `src/lib`.
- `docs/novel-ide/융합설계/02-창작융합.md` lists `_연극부_시스템.md` as `design`, not `wired`.
- Treat the concept as internal design ancestry for future `노아 인터뷰`, `씬 리허설`, `과정기록`, or `제작 계약` work. Do not describe it as an active product feature until UI/API/storage wiring exists and is verified.

2026-06-19 active source wording cleanup:

- Removed stale active-sounding `Private Archive`, `Network` inline, `Archive-style`, and old 5-app wording from current source comments and user-facing copy.
- Follow-up scan of active `src` paths leaves only benign hits: Firebase `auth/network-request-failed`, generic `Source/reference record`, removed-surface shortcut note, and chat retry comments.
- `npm run check:user-exposure`, `npx tsc --noEmit --pretty false`, and targeted creative-process/ProjectStart Jest checks passed for this cleanup pass.
- Added `docs/novel-ide/README.md` to distinguish current product references from historical notes and design-only ledgers.
- Added `docs/novel-ide/융합설계/README.md` and status-line banners to the fusion ledgers so `wired`, `design`, `phantom`, and `[미매핑·확인필요]` are not mistaken for current shipped features.

2026-06-15 documentation refresh:

- `/docs` public manual, `docs/README.md`, `docs/API.md`, `docs/ARCHITECTURE.md`, `docs/FEATURE_FLAGS.md`, `docs/security/auth-matrix.md`, and `docs/redeem-agent-operations-2026-06-14.md` are current baseline documents.
- `docs/README.md` and `docs/FEATURE_FLAGS.md` were previously removed as stale contents, then recreated as current 2026-06-15 baseline documents. Treat the recreated files as current, not as the deleted historical versions.
- Historical reports, old ADRs, and research notes may still mention removed surfaces. They are retained as history unless a current baseline document cites them as active.

## June 10-Before Data Cleanup

Additional cleanup on 2026-06-12 removed pre-2026-06-10 local/generated artifacts and stale docs that conflicted with the current Loreguard-centered frame.

Deleted local untracked root artifacts:

- 27 generated screenshots, evidence scripts, sample scrape helpers, and temporary result files from 2026-05-07.
- Approximate local size removed: 15,525,687 bytes.

Deleted stale docs or stale historical copies:

- `docs/README.md`
- `docs/FEATURE_FLAGS.md`
- `docs/QA-bug-report-checklist.md`
- `docs/feature-inventory.md`
- `docs/bundle-report.md`
- `docs/lighthouse-report.md`
- `docs/alpha-exposure-policy.md`
- `docs/bug-check-2026-06-06.md`
- `docs/eh-universe-baseline-checklist.md`
- `docs/github-release-v3.md`
- `docs/patch-notes-v2.md`
- `docs/patch-notes-v3.md`
- `docs/RELEASE_NOTES_v2.2.0-alpha.1.md`

2026-06-16 correction:

- `docs/README.md` and `docs/FEATURE_FLAGS.md` were recreated as current baseline documents after the stale copies were removed.
- Treat the recreated files as active docs. Treat the other deleted items in this list as removed unless a current source-of-truth document explicitly restores them.

2026-06-16 app-folder asset cleanup:

- Removed local temp folders, generated logs, verification screenshots, unused default Next/Vercel SVGs, and unused legacy public images.
- Kept referenced public assets: `public/images/hero-mina.jpg`, `public/images/gate-infrastructure-visual.jpg`, and `public/images/logo-badge.svg`.
- Verified deleted asset names are not referenced from current source or docs.

Rationale:

- Files were older than 2026-06-10.
- They were generated artifacts, old release/support notes, or stale inventories that referenced removed public surfaces such as Code Studio, Network, Archive, Reports, Tools, Reference, or Rulebook as active products.
- Current source-of-truth docs remain `AGENTS.md`, `README.md`, `docs/PRODUCT-FRAME.md`, `docs/ARCHITECTURE.md`, and this file.

Not deleted in this pass:

- Current Loreguard source files.
- `src/lib/writing-workspace/*`, even though some files are older than 2026-06-10, because they are preserved active writing IDE utilities.
- Business/research/design docs that may still contain usable strategy or design material.
- Historical docs still referenced by code comments or e2e scenario notes.

## Regenerable Space Cleanup

Additional local-only cleanup on 2026-06-12 removed regenerable build/test artifacts:

- `.next`
- `coverage`
- `tsconfig.tsbuildinfo`
- `.dev-3011.log`
- `_evidence_screenshots`
- `_modoo_capture`
- `.codex-design-audit`
- `.playwright-mcp`

Approximate size removed: 7,682,806,856 bytes.

Not deleted:

- `node_modules` remains, even though it is the largest remaining directory, because it is required for local development until dependencies are reinstalled.
- Current source, public assets, scripts, and test files remain.

## Next Cleanup Candidates

1. Separate historical docs into `docs/history` or mark them with a clear legacy banner.
2. Update ADR index to distinguish active decisions from historical decisions.
3. Convert design-only `연극부` material into a current `노아 인터뷰`/`씬 리허설` implementation spec before any UI claim.
3. Continue pruning `src/components/studio` only after import/reference verification.
4. Decide whether old Code Studio/Network business history should be preserved as sealed/internal history or removed from public docs.
