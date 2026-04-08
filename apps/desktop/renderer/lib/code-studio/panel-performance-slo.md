# Code Studio — “프로덕션 95” 성능 기준 (SLO)

**베타 라벨(`status: beta`)은 성능 부족을 표시하는 용도가 아닙니다.** 구현 성숙도(부분 기능·실험)용이며, 성능은 **측정·예산·SLO**로 관리합니다.

## “95”의 의미 (팀 합의 후 고정 권장)

| 축 | 기준 예시 | 비고 |
|----|-----------|------|
| **지연 p95** | 필수 10 패널: 열기 후 **첫 의미 있는 상호작용 가능**까지 **p95 &lt; 300ms** (로컬 DevTools Profiler/Performance) | 기기·빌드에 따라 절대값은 변동 → **증가율**도 함께 추적 |
| **Long task** | 패널 열기·첫 입력 구간에서 **&gt;50ms 작업 0~1회** 이하(가능하면 0) | Chrome Performance “Long task” |
| **검증 파이프라인 점수** | 별도: 자동 검증 **overall ≥ 95** 등은 **품질 게이트**이지 UI 성능과는 분리 | 용어 충돌 방지 |

## 코드 측면 (이미 반영된 방향)

- 우측 패널: **활성 패널 한 개만** 분기(`switch`) — 매 렌더 **51개 패널 클로저 생성 제거** (`right-panel-branch.tsx` + `renderRightPanelBranch`).
- 동적 import: `PanelImports.tsx` 유지.
- 추가로 필요할 때: 큰 리스트 가상 스크롤, `useDeferredValue`(검색 등), 패널 언마운트 시 구독 정리.

## 측정·회귀

- 수동: [`essential-panels-profiling.md`](./essential-panels-profiling.md)
- 선택: [`panel-bundle-baseline.md`](./panel-bundle-baseline.md)
