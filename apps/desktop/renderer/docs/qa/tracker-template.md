# Phase 0 — 표면 인벤토리·트래커 템플릿

스프레드시트에 옮기거나, 이 표를 복사해 행을 늘려 사용합니다.

## 컬럼 정의

| column | 설명 |
|--------|------|
| area | 아래 **area 그룹** 중 하나 |
| id | 시나리오 식별자 (영문 스네이크) |
| scenario | 무엇을 검증하는지 한 줄 |
| desktop | pass / fail / skip |
| mobile | pass / fail / skip / n/a |
| electron_only | yes / no (Electron 전용이면 yes) |
| last_ok | 마지막 통과일 (YYYY-MM-DD) |
| notes | 실패 시 재현·스크린·이슈 번호 |

## area 그룹 (전수 커버리지)

1. `shell` — 상단 메뉴(Code/File/Edit/View/AI), 탭, 레이아웃
2. `keyboard` — 앱 단축키( `useCodeStudioKeyboard` / Shell 등록 키 )
3. `editor` — Monaco 입력, 검색, 포맷, 우클릭 컨텍스트 메뉴
4. `explorer` — 파일 트리, 컨텍스트 메뉴, 열기/삭제/이름 변경
5. `panel_right` — 우측 패널(레지스트리 ID; 51개는 CSV와 동일 키 사용)
6. `bottom` — 하단 터미널 / Problems / Pipeline
7. `mobile` — 모바일 레이아웃 전용 경로
8. `electron` — 브릿지·로컬 폴더 등 데스크톱 전용

## 시작 행 예시 (복사용)

| area | id | scenario | desktop | mobile | electron_only | last_ok | notes |
|------|-----|----------|---------|--------|---------------|---------|-------|
| shell | shell-menus | 상단 메뉴 각 항목 1회 클릭 | | | no | | |
| editor | editor-ctx-all | 에디터 우클릭 메뉴 전 항목 1회 | | n/a | no | | |
| explorer | explorer-ctx | 트리 우클릭 주요 항목 | | n/a | no | | |

패널 51개는 **CSV** `qa_status` / `last_functional_pass`로 추적하고, 여기서는 통합 시나리오만 적어도 됩니다.
