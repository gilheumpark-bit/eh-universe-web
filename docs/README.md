# Loreguard Docs Index

Last updated: 2026-06-25

This folder contains the current documentation baseline for the Loreguard web app.

2026-06-25 baseline note:

- UI 갭 G1-G6 연결 완료 (SealCard QR·독자 피드백·DetailPass·충돌해소·IP팩 출고 UI).
- dual-rail 분류 Phase 1 (`rail.ts`) + certHash 회귀 수정 완료.
- Playwright E2E 활성 spec 기준선: `17개` (전일과 동일, flaky 방어 강화).
- Jest: **5707 테스트 all green**.

2026-06-24 baseline note:

- Playwright E2E 활성 spec 기준선은 현재 `17개`다.
- `2026-06-15` 이전 수정 시각의 구형 E2E spec 39개는 정리되었다.
- 루트 로컬 생성물/테스트 산출물은 EH 외부 이관 폴더로 분리되었고, 현재 문서는 그 정리 이후 상태를 기준으로 본다.

## Current Source Of Truth

Read these first:

- `docs/ARCHITECTURE.md` — current app shape, active/removed surfaces, 신규 레이어 (dual-rail·registry-contract)
- `docs/API.md` — API route contract
- `docs/FEATURE_FLAGS.md` — runtime and local feature gates
- `docs/DOCUMENT-STATUS-2026-06-25.md` — current/historical/design document classification
- `docs/PRODUCT-FRAME.md` — product framing
- `docs/loreguard-creative-ide-design-master-plan-2026-06-18.md` — Creative IDE design master plan and 1000-point design gate
- `docs/redeem-agent-operations-2026-06-14.md` — redeem, entitlement, Noa, and inactive agent-route state
- `docs/stripe-revenue-path.md` — Stripe, subscription entitlement, and release-credit flow
- `docs/release-evidence/README.md` — external evidence intake rules for release gates
- `docs/security/auth-matrix.md` — auth and route protection matrix

## 2026-06-25 Documentation Refresh Scope

- UI 갭 G1-G6 연결 반영 (신규 컴포넌트 5개 + 훅 1개 + 버그픽스 2건)
- `CHANGELOG.md` — 2026-06-25 항목 추가 (G1-G6·dual-rail·certHash·Quiet Page Pro)
- `docs/ARCHITECTURE.md` — dual-rail 레이어 + 신규 컴포넌트 목록 추가
- `docs/CLEANUP-STATUS.md` — 2026-06-25 pass 내역 추가
- `docs/DOCUMENT-STATUS-2026-06-25.md` 신규 생성
- Use `docs/DOCUMENT-STATUS-2026-06-25.md` before treating an older report as current architecture or current QA truth

## 2026-06-24 Documentation Refresh Scope

This refresh aligned the baseline docs with the current repo after the 2026-06-24 cleanup pass.

- Active Playwright baseline updated to 17 specs
- Historical docs that mention removed dedicated E2E files are preserved, but marked as historical snapshots where needed
- Repo-local generated artifacts and migrated cleanup evidence are treated as external handoff material, not in-repo baseline
- Use `docs/DOCUMENT-STATUS-2026-06-24.md` before treating an older report as current architecture or current QA truth

## Active Product Surfaces

- Loreguard Studio: `/studio`
- Translation Studio: `/translation-studio`
- Public docs/status/pricing/legal routes
- Verify and creative-process public verification support

## Removed Public Surfaces

The following names may remain in historical documents or compatibility route notes, but must not be treated as active product promises:

- Code Studio
- Network
- Archive
- Codex
- Reports
- Reference
- Rulebook
- Tools

When a current feature needs an old capability, describe it with Loreguard terms such as history, import, reference context, export package, and settings.

## Release State

The static/local app checks can pass while release evidence remains on HOLD. The current external blockers are tracked by:

```powershell
npm run gate:evidence:remaining
```

Do not mark Stripe billing, signed C2PA manifest storage, legal review, provider attestation, or staging replay as complete until a real evidence JSON under `docs/release-evidence/` passes `npm run gate:evidence`.
