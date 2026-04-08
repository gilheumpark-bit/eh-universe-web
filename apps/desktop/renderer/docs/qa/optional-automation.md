# Phase 3 — 자동화 (선택)

## 단위 테스트 (이미 추가 가능)

- 에디터 우클릭 메뉴 **액션 id**와 `runEditorSurfaceMenuAction` 분기 일치:  
  [`editor-surface-context-menu.ts`](../../lib/code-studio/editor/editor-surface-context-menu.ts)의 `EDITOR_SURFACE_MENU_ACTION_IDS` +  
  [`editor-surface-context-menu.test.ts`](../../lib/code-studio/editor/__tests__/editor-surface-context-menu.test.ts)

추가로 할 수 있는 것:

- `buildEditorSurfaceMenu`의 `id` 필드가 위 상수와 동일한지 **주석으로 동기화** 또는 소스에서 상수 재사용(리팩터 시).

## E2E (Playwright 등)

`apps/desktop`에 Playwright를 아직 붙이지 않았다면:

1. `npm run dev` 또는 Electron 패키지 기준 **base URL** 확정
2. P0만: 앱 로드 → `#main-editor` 또는 대표 셀렉터 존재
3. 점진적으로 에디터 입력·패널 열기 추가

비용 대비 효과는 팀에서 판단; 전수 QA의 본체는 **수동 시트 + CSV**입니다.
