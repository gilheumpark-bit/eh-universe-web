# Code Studio — QA (전수 검증)

전수 QA는 [panel-performance-inventory.md](../../lib/code-studio/panel-performance-inventory.md) 및 아래 문서와 함께 운영합니다.

| 문서 | 용도 |
|------|------|
| [tracker-template.md](./tracker-template.md) | Phase 0 — 표면(area)별 수동 검증 행 추가용 컬럼·area 목록 |
| [p0-smoke-checklist.md](./p0-smoke-checklist.md) | Phase 1 — 릴리스/빌드 후 30~60분 스모크 (복붙 체크리스트) |
| [phase2-sprint-slices.md](./phase2-sprint-slices.md) | Phase 2 — 스프린트별 전수 패스 분할 (**1차 진행** = 문서 내 «W1 · 필수 패널 10») |
| [optional-automation.md](./optional-automation.md) | Phase 3 — E2E·단위 테스트 보강 (선택) |

**패널 51행 + 기능 QA 열:** [`panel-performance-inventory.csv`](../../lib/code-studio/panel-performance-inventory.csv) (`qa_status`, `last_functional_pass`).

CSV 갱신: 저장소 루트에서 `node apps/desktop/scripts/gen-panel-inventory-csv.cjs`.
