# Loreguard Documentation Status Ledger

Last updated: 2026-06-24

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
- `docs/README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/FEATURE_FLAGS.md`
- `docs/PRODUCT-FRAME.md`
- `docs/CLEANUP-STATUS.md`
- `docs/redeem-agent-operations-2026-06-14.md`
- `docs/security/auth-matrix.md`

## Operational Reference

- `ROADMAP.md`
- `docs/ops-runbook.md`
- `docs/RUNBOOK.md`
- `docs/rollback-policy.md`
- `docs/SLO.md`
- `docs/stripe-revenue-path.md`
- `docs/compliance.yml`
- `docs/ai-supply-chain.yml`
- `docs/incident-response.md`

## Historical Snapshot

- `docs/full-app-feature-verification-2026-06-16.md`
- `docs/LOREGUARD_IMPLEMENTATION_REPAIR_LOOPS_2026-06-12.md`
- `docs/LOREGUARD_QA_CHIEF_REPORT_2026-06-14.md`
- `docs/writing-tab-m2-final.md`
- `docs/RELEASE-NOTES-v2.2.0-alpha.md`
- `docs/RELEASE-NOTES-v2.3.0-alpha.md`
- `docs/gates/day0-baseline-2026-06-12.md`
- `docs/gates/release-evidence-current-hold-2026-06-21.md`

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

## 2026-06-24 Refresh Outcome

- 현재 Playwright 활성 spec 기준선: `17개`
- `2026-06-15` 이전 수정 시각의 구형 E2E spec `39개` 정리
- 로컬 생성물/테스트 산출물/임시 로그/단독 스크린샷은 EH 외부 이관 폴더로 분리
- 역사 문서는 삭제보다 `historical-snapshot` 식별을 우선 적용

## Reading Order

1. `docs/README.md`
2. `docs/DOCUMENT-STATUS-2026-06-24.md`
3. `docs/ARCHITECTURE.md`
4. `docs/API.md`
5. `docs/FEATURE_FLAGS.md`
6. `docs/CLEANUP-STATUS.md`

[검사 적용] - [C] 안전성 - [G] 성능 - [K] 간결성
