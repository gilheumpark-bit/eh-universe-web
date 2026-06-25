# Loreguard Documentation Status Ledger

Last updated: 2026-06-25

이 문서는 `docs/` 와 루트 문서의 현재 상태를 빠르게 판정하기 위한 장부다.
문서를 읽을 때는 아래 4분류를 먼저 본다.

## 분류 규칙

| 상태 | 의미 |
|---|---|
| `current-baseline` | 현재 repo 기준선으로 바로 따라야 하는 문서 |
| `historical-snapshot` | 당시 구현/검증/수리 기록. 현재 상태와 다를 수 있음 |
| `design-research` | 설계안, 연구안, 철학/전략 자료 |
| `operational-reference` | 현재 운영에 참고하지만, 코드/증거와 같이 봐야 하는 문서 |

## Current Baseline

- `AGENTS.md`
- `README.md`
- `README.ko.md`
- `CHANGELOG.md` ← 2026-06-25 업데이트 (G1-G6 연결·dual-rail·certHash 회귀)
- `docs/README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md` ← 2026-06-25 업데이트 (dual-rail 레이어·신규 컴포넌트 목록)
- `docs/FEATURE_FLAGS.md`
- `docs/PRODUCT-FRAME.md`
- `docs/CLEANUP-STATUS.md` ← 2026-06-25 업데이트
- `docs/redeem-agent-operations-2026-06-14.md`
- `docs/security/auth-matrix.md`
- `docs/DOCUMENT-STATUS-2026-06-25.md` ← 현재 파일

## Operational Reference

- `ROADMAP.md` ← 2026-06-25 note 추가
- `docs/ops-runbook.md`
- `docs/RUNBOOK.md`
- `docs/rollback-policy.md`
- `docs/SLO.md`
- `docs/stripe-revenue-path.md`
- `docs/compliance.yml`
- `docs/ai-supply-chain.yml`
- `docs/incident-response.md`

## Historical Snapshot

- `docs/DOCUMENT-STATUS-2026-06-24.md` (전일 스냅샷)
- `docs/full-app-feature-verification-2026-06-16.md`
- `docs/LOREGUARD_IMPLEMENTATION_REPAIR_LOOPS_2026-06-12.md`
- `docs/LOREGUARD_QA_CHIEF_REPORT_2026-06-14.md`
- `docs/writing-tab-m2-final.md`
- `docs/RELEASE-NOTES-v2.2.0-alpha.md`
- `docs/RELEASE-NOTES-v2.3.0-alpha.md`
- `docs/gates/day0-baseline-2026-06-12.md`
- `docs/gates/release-evidence-current-hold-2026-06-21.md`
- `docs/internal/loreguard-context-index-judgment-os-design-2026-06-23.md`

## Design / Research

- `docs/absorb-3systems-roadmap.md`
- `docs/loreguard-creative-ide-design-master-plan-2026-06-18.md`
- `docs/noa-capture-ledger-design-2026-06-21.md`
- `docs/noa-behavior-profile-hfcp-design-2026-06-14.md`
- `docs/noa-compose-wabi-implementation-plan-2026-06-14.md`
- `docs/origin-tagging-spec.md`
- `docs/journal-engine-spec.md`
- `docs/loreguard-project-storage-layout-2026-06-14.md`
- `docs/QCTS_WABI_NOA_APPLICATION_RESEARCH_2026-06-14.md`
- `docs/internal/openrouter-routing-design-2026-06-22.md`
- `NOA_APP_BRAIN_DESIGN_2026_06_22/` (전체 — 설계안, 현재 구현 중)

## 2026-06-25 변경 요약

### 신규 코드 (UI 갭 G1-G6 연결 · commit `0e7b1946`)

| 파일 | 역할 |
|---|---|
| `src/components/loreguard/SealCard.tsx` | 봉인번호 + QR 80×80 카드 |
| `src/components/loreguard/RegulatoryReportSummary.tsx` | 규제 준수 현황 표시 |
| `src/components/loreguard/IpPackExportModal.tsx` | IP 팩 4-프로필 출고 모달 |
| `src/components/studio/reader-sim/SceneFeedbackViewer.tsx` | 독자 피드백 조회 |
| `src/hooks/useSceneShare.ts` | 장면 공유 링크 생성 + config 영속 |
| `src/lib/creative-process/rail.ts` | dual-rail 분류 Phase 1 |

### 핵심 버그 수정 (commit `0e7b1946` + `bacd805c`)

| 버그 | 수정 |
|---|---|
| `logAcceptAI` actorType 'human' → 'ai' | `useCreativeEventLogger.ts:317` |
| certHash mismatch (정직 cert도 항상 실패) | `registry-contract` export + `index.ts` 재배선 |
| WorldMap 드래그 write-amplification | `pointermove` 로컬, `pointerUp` 1회 commit |

### 검증 결과

- `tsc --noEmit`: 클린 (에러 0)
- `next build`: 성공 (경고 0)
- `jest`: **5707 테스트 전부 통과**

## 2026-06-25 Refresh Outcome

- 현재 Playwright 활성 spec 기준선: `17개` (전일과 동일, e2e flaky 방어 강화)
- Jest 5707 통과 (이전 세션 대비 +0 회귀, 안정 확인)
- 신규 파일 6개 추가, 기존 파일 22개 수정

## Reading Order

1. `docs/README.md`
2. `docs/DOCUMENT-STATUS-2026-06-25.md`
3. `docs/ARCHITECTURE.md`
4. `docs/API.md`
5. `docs/FEATURE_FLAGS.md`
6. `docs/CLEANUP-STATUS.md`

[검사 적용] - [C] 안전성 - [G] 성능 - [K] 간결성
