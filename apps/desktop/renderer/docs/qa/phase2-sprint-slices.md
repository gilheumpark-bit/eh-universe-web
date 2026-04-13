# Phase 2 — 전수 패스 스프린트 분할

**목표:** 51 패널 + Shell/키보드/모바일/Electron을 **한 스프린트에 전부** 끝내지 않고, **검증 가능한 덩어리**로 나눕니다.

## 1차 진행 (W1 · 필수 패널 10)

**선행:** [P0 스모크](./p0-smoke-checklist.md) 통과 후 시작.

`PANEL_REGISTRY`에서 `isEssential: true`인 패널 **10개**를 아래 순서로 **열기 → 대표 동작 1~2회 → 닫기** 하고, [`panel-performance-inventory.csv`](../../lib/code-studio/panel-performance-inventory.csv)에서 해당 `id` 행의 `qa_status`·`last_functional_pass`·실패 시 `notes`를 갱신합니다.

| id | 대표 동작 힌트 (팀이 한 줄로 구체화) |
|----|--------------------------------------|
| `chat` | 스레드 입력·응답 또는 UI 로드 |
| `quick-verify` | 원클릭/검증 버튼 1회 |
| `project-spec` | 패널 로드·명세 관련 탭/섹션 1회 |
| `search` | 검색창 열림·결과 영역 표시 |
| `outline` | 심볼 트리 표시·항목 1회 클릭 |
| `preview` | 프리뷰 영역 갱신 또는 빈 상태 확인 |
| `composer` | 멀티파일 UI 로드·입력 필드 1회 |
| `pipeline` | 단계/로그 영역 표시 |
| `bugs` | 버그 목록 또는 빈 상태 |
| `git` | 브랜치·변경 목록 또는 빈 상태 |

**P0 스모크와의 관계:** 릴리스 전 **최소** 검증은 `chat`, `search`, `preview`, `pipeline`, `git` 다섯 개( [p0-smoke-checklist](./p0-smoke-checklist.md) ). W1에서는 **나머지 필수 5개**(`quick-verify`, `project-spec`, `outline`, `composer`, `bugs`)까지 포함해 10행을 채웁니다.

## 권장 속도 (예시)

| 스프린트 | 범위 | 산출 |
|----------|------|------|
| W1 | 필수 패널 10개 전부 기능 QA (`qa_status` 갱신) | CSV 10행 + 회귀 노트 |
| W2 | `editing` 그룹 나머지 + `ai` 그룹 | CSV 해당 행 |
| W3 | `verification` + `git` | CSV |
| W4 | `tools` + `settings` | CSV |
| W5 | Shell/메뉴/탭 + `useCodeStudioKeyboard` 단축키 표 대조 | [tracker-template](./tracker-template.md) 행 |
| W6 | 탐색기 `FileExplorer` 컨텍스트 메뉴 전 항목 | tracker 행 |
| W7 | 하단 패널(터미널/Problems/Pipeline) | tracker 행 |
| W8 | 모바일 레이아웃 경로 | tracker `mobile` 열 |
| W9 | Electron 전용(`hasBridge` 등) | tracker `electron_only` |

W2 이후에는 **W1에서 이미 `qa_status`를 갱신한 id는 건너뛰고**, `PANEL_REGISTRY`에 남은 행을 채웁니다(그룹명은 참고용).

일정은 팀 속도에 맞게 압축·늘림 가능합니다.

## 2C 통합 시나리오 (스프린트마다 1개 이상 · 3~5개 풀)

1. 새 파일 → 편집 → 저장/더티
2. 파이프라인 또는 버그 패널 열기 → 한 번 실행 또는 표시 확인
3. Git 패널 열기(가능한 범위)
4. 아웃라인에서 심볼 이동 → 에디터 커서/스크롤 일치 확인
5. 검색으로 다른 파일 열기 → 탭 전환 후 다시 원 파일

## 합격 기준 (팀 합의)

- P0 스모크 [p0-smoke-checklist](./p0-smoke-checklist.md) 매번 통과
- 진행 중 스프린트 범위 내 `fail`은 알려진 이슈에 연결
