# E2E Tests

Novel Studio 통합 테스트 (Playwright 1.58+).

## 구조

```
e2e/
├── fixtures/
│   └── studio-state.ts       # 공통: localStorage seed + DGX Spark 모킹
├── scenarios/                # 신규 Novel Studio 시나리오 (5종)
│   ├── 01-onboarding.spec.ts
│   ├── 02-new-episode.spec.ts
│   ├── 03-writing-flow.spec.ts
│   ├── 04-global-search.spec.ts
│   └── 05-rename-flow.spec.ts
├── helpers/                  # 기존 스모크/BYOK 헬퍼
└── *.spec.ts                 # 기존 스모크 / API / regression / landing 등
```

## 실행

```bash
npm run test:e2e              # 전체 실행 (headless, chromium + mobile 프로젝트)
npm run test:e2e:ui           # Playwright UI 모드
npm run test:e2e:debug        # 디버그 모드
npm run test:e2e:scenarios    # 신규 scenarios 5종만 실행
```

`playwright.config.ts`의 `webServer`가 `npm run build && next start -p 3005`로
프로덕션 서버를 자동 기동합니다. 기본 포트 변경:

```bash
PLAYWRIGHT_TEST_PORT=3010 npm run test:e2e
```

## 시나리오

| 번호 | 파일 | 검증 대상 |
|------|------|-----------|
| 01 | `01-onboarding.spec.ts` | `/welcome` 3슬라이드 + 건너뛰기 + `eh-onboarded` 플래그 |
| 02 | `02-new-episode.spec.ts` | `Ctrl+Shift+N` 새 에피소드 단축키 + 프로젝트 localStorage 유지 |
| 03 | `03-writing-flow.spec.ts` | `F4` 집필 탭 전환 + AI 엔드포인트 완전 모킹 검증 |
| 04 | `04-global-search.spec.ts` | `Ctrl+K` 팔레트 열기/닫기 + 캐릭터 검색 결과 |
| 05 | `05-rename-flow.spec.ts` | `Ctrl+Shift+H` 다이얼로그 + From/To + Preview + Esc |

## 안전 원칙

- **실제 DGX Spark / 외부 AI 호출 금지.** `mockDGXSpark()`가
  `/v1/chat/completions`, `/api/chat`, `/api/spark*`, `/api/rag/*`,
  `api.ehuniverse.com` 요청을 모두 `route.fulfill`로 차단합니다.
- **localStorage는 `addInitScript`로 주입.** 테스트 간 격리 보장.
- **각 테스트 독립.** 순서 의존 금지.

## 모킹 확장

새 엔드포인트를 모킹하려면 `fixtures/studio-state.ts`의 `mockDGXSpark()`에
`page.route(/pattern/, handler)`를 추가하세요. 외부 도메인을 추가할 땐
`03-writing-flow.spec.ts`의 `leaked` 가드 패턴도 같이 갱신합니다.

## CI 통합

`.github/workflows/e2e.yml`에 스켈레톤이 존재합니다. 현재는 주석 처리되어
있으며, 활성화는 수동 결정입니다.
