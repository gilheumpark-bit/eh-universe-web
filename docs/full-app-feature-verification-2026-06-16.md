# Loreguard 전체 기능 후보 검증 보고서 — 2026-06-16

> Historical snapshot note (updated 2026-06-24): 아래 수치는 2026-06-16 실측 장부다. 현재 repo 기준 Playwright E2E 활성 spec 은 51개가 아니라 17개다.

## 범위

요청: 앱 전체 기능을 1~1000개 범위에서 찾고 검증.

검증 기준은 현재 제품 표면 기준으로 잡았다.

- 활성: Loreguard Studio, Translation Studio, Docs, 공개/가격/상태/법적 문서
- 비활성/복구 금지: Code Studio, Network, Archive, Codex, Reports, Reference, Rulebook, Tools
- 검증 방식: 파일 기반 전수 수집 + 타입 체크 + Jest 전체 + 라우트 스모크 + 사용자 노출 검사 + 릴리스 게이트 + secret/size/lint 검사

## 2026-06-16 후속 패스 — 기능 장부 운영 기준

사용자가 기능을 하나씩 찍어서 검증하는 방식은 제품 검수 방식으로 부적절하다.
이 문서는 이후부터 "기능 후보 장부"로 사용한다.

운영 방식:

1. 파일/라우트/컴포넌트/훅/도메인 라이브러리에서 기능 후보를 자동 추출한다.
2. 기능 후보를 P0/P1/P2로 나눈다.
3. 각 후보마다 화면 연결, 저장 연결, API 연결, 테스트 연결, 문구 기준, 결제 명분을 표시한다.
4. 사용자가 하나씩 지정하지 않아도 P0부터 자동으로 검증하고, 실패 항목만 수리 대상으로 올린다.

현재 원시 범위 재집계:

| 분류 | 수 |
|---|---:|
| `src/app`, `src/components`, `src/hooks`, `src/lib` 전체 | 1,441 |
| App Router 파일 | 133 |
| API 라우트 파일 | 67 |
| Loreguard 컴포넌트 | 52 |
| Studio 계열 컴포넌트 | 237 |
| Translation 컴포넌트 | 31 |
| Hooks | 109 |
| Creative Process 도메인 파일 | 76 |
| 테스트 자산 | 468 |

P0 기능군 최신 검증:

| 기능군 | 상태 | 검증 |
|---|---|---|
| 프로젝트 시작/보관함/파일 불러오기 | PASS | Loreguard component tests 포함 |
| 10단계 창작 흐름 상태표 | PASS | `WorkflowReadinessStrip` test 통과 |
| 노아 제안/API 게이트 | PASS | `/api/chat`, `/api/complete`, structured route tests 포함 |
| 저장/불러오기/복구 | PASS | `useProjectManager`, `useStudioImport`, `useStudioExport`, `useAutoSave`, `useRecovery` 관련 테스트 통과 |
| 과정기록/확인서/검증 레지스트리 | PASS | Creative Process 전체 271 tests 통과 |
| 출고 패키지/권리/IP 묶음 | PASS | submission package, ZIP, IP manifest tests 포함 |
| 번역 스튜디오/용어집/설정 톤 | PASS | Translator component tests 통과 |
| 설정/접근성 보조 | PASS | Settings/aria/modal/ergonomics 묶음 통과 |
| 사용자 노출 문구 | PASS-with-warn | critical 0, console warn 27 |
| 타입 경계 | PASS | `npx tsc --noEmit --pretty false` 통과 |

후속 패스에서 실행한 검증:

| 명령 | 결과 |
|---|---|
| `npx jest src\components\loreguard src\lib\creative-process src\app\api ... --no-coverage --runInBand` | 79 suites / 499 tests PASS |
| `npx jest src\components\translator ... src\components\studio\settings ... --no-coverage --runInBand` | 12 suites / 107 tests PASS |
| `npx jest src\lib\creative-process --no-coverage --runInBand` | 36 suites / 271 tests PASS |
| `npm run check:user-exposure` | critical 0 / warn 27 |
| `npx tsc --noEmit --pretty false` | PASS |
| `npm run gate:evidence:remaining` | 핵심 상용 막힘 2개 / release evidence HOLD 16 |

추적 기술 보강:

- `src/lib/creative-process/chain-verify.ts`
  - 해시 체인 시작 뒤 무해시 이벤트가 끼면 `legacy-after-hash-start` 손상으로 판정한다.
- `src/lib/creative-process/report-builder.ts`
  - 확인서 발급 직전에 `verifyEventChain`을 강제 실행한다.
  - 과정기록 해시 체인이 손상되면 `EVENT_CHAIN_INVALID`로 확인서 발급을 차단한다.
- 회귀 테스트 2건 추가
  - 해시 체인 시작 뒤 무해시 이벤트 삽입 검출
  - 손상된 과정기록 위에서 확인서 발급 차단

현재 상용 핵심 HOLD:

| 게이트 | 남은 이유 | 다음 수리/증거 |
|---|---|---|
| T2 live Stripe billing | 실제 결제·웹훅·유료 권한 반영·확인서 크레딧 지급의 연속 증거 없음 | Stripe 테스트 결제부터 권한/크레딧 반영까지 e2e 증거 생성 |
| T11 signed C2PA external chain | 서명된 C2PA 매니페스트 저장소와 외부 출처 체인 조회 증거 없음 | C2PA 서명/저장/조회 경로 구현 또는 증거 산출 |

## 기능 후보 수집 결과

총 기능 후보: 998개

| 분류 | 수 |
|---|---:|
| 공개/API 라우트 | 48 |
| 앱 페이지 | 24 |
| 앱 shell/loading/error/not-found | 17 |
| 컴포넌트 | 297 |
| 훅 | 70 |
| 도메인 라이브러리 | 534 |
| 서비스 클라이언트 | 8 |

테스트 자산:

| 분류 | 수 |
|---|---:|
| Jest/Playwright 테스트 파일 | 564 |
| E2E spec | 51 (2026-06-16 snapshot, current repo baseline 17) |

주요 기능 영역:

| 영역 | 확인 내용 |
|---|---|
| Loreguard Studio | 프로젝트 시작, 10단계 탭, 노아 도크, 세계관/캐릭터/구성/집필/퇴고/출고, 과정기록, 확인서/출고 패키지 |
| Translation Studio | 번역 워크스페이스, 세그먼트, 용어집, 문체/품질, 저장/백업, signoff |
| API | 채팅, 이어쓰기, 구조화 제안, 번역, 이미지, 업로드, 결제, 확인서, LSP, health/readiness |
| 저장/복구 | IndexedDB/localStorage, backup tiers, shadow log, snapshot, migration, crash recovery |
| 권리/IP | IP 점검, n-gram 유사도, 확인서, 출고 패키지, 공개 검증 URL |
| 결제/권한 | Stripe checkout/webhook, tier gate, release credit, paywall notice |
| 운영/보안 | CSRF, rate-limit, local secret scan, release gate, privacy gate, supply-chain docs |

## 자동 검증 결과

| 검증 | 결과 | 메모 |
|---|---|---|
| TypeScript | PASS | `npx tsc --noEmit --pretty false` 통과 |
| Public route smoke | PASS | `e2e/smoke-routes.spec.ts`: 26/26 통과 |
| 사용자 노출 검사 | WARN | critical 0, warn 33 |
| Jest 전체 | FAIL | 513 suites 중 501 pass, 12 fail. 5667 tests 중 5653 pass, 14 fail |
| Lint | FAIL | 4 errors, 20 warnings |
| Local secret scan | FAIL | `.env.local`에 배포급 비밀 감지 |
| Size guard | FAIL | 23개 신규 800줄 초과 파일 |
| Day 0 gate | HOLD | static blocker 79, release evidence HOLD |

## Jest 실패 14건

| 구분 | 파일 | 판단 |
|---|---|---|
| 런타임 함수 누락 | `src/components/__tests__/WritingTab.test.tsx`, `src/components/__tests__/ResourceView.test.tsx` | `normalizeAppLanguage` mock/export 불일치. 실제 렌더 경로 영향 가능성이 있어 우선 수리 필요 |
| 키보드 탭 상태 | `src/components/studio/__tests__/GlobalSearchPalette.test.tsx` | Tab 이동 후 `aria-selected` 기대 불일치. 접근성/키보드 UX 확인 필요 |
| 문구 클리닝 후 테스트 stale | `DetailPassButton`, `VisualTab`, `geminiService`, `imageGenerationService`, `ip-bible-builder`, `ip-readiness-gates`, `attestation-text`, `c2pa-ready-manifest` | 실제 UI는 새 용어를 쓰고 테스트가 구문구를 기대하는 케이스가 다수 |
| 과정기록 요약 | `src/lib/loreguard/__tests__/candidate-decision-summary.test.ts` | `candidate-accepted`가 영수증 텍스트에서 빠짐. 의도 변경인지 회귀인지 확인 필요 |

## Lint / Gate 핵심 차단점

| 차단 | 내용 |
|---|---|
| ESLint cache 포함 | `.codex-tmp/playwright-transform-cache`가 lint 대상에 들어감. ignore 처리 필요 |
| React effect 규칙 | `src/components/studio/settings/BackupsSection.tsx`에서 effect 내부 동기 `setLastSync` |
| Hook deps | `src/hooks/useStudioAI.ts` callback dependency에 `currentProjectId` 누락 경고 |
| Local secrets | `.env.local`의 Vercel/OIDC 토큰, GCP/Firebase private key marker 감지. 값은 출력하지 않음 |
| Size guard | Loreguard 탭/출고/프로젝트 시작 등 신규 대형 파일 23개가 800줄 초과 |
| Gate HOLD | 구표면 잔재, HTML insertion review, live Stripe/registry/evidence 미첨부 등으로 release HOLD |

## 통과 확인된 부분

- 공개 라우트 `/`, `/about`, `/pricing`, `/status`, `/docs`, `/studio`, `/translation-studio`, 법적 문서 렌더 통과.
- 구 공개 표면 `/code`, `/code-studio`, `/codex`, `/reference`, `/reports`, `/rulebook`, `/tools`, `/world` 비공개 처리 통과.
- `/api/network-agent/smoke` retired 처리 통과.
- 타입 수준에서는 전체 앱 연결이 깨지지 않음.

## 결론

앱 전체에서 998개 기능 후보를 찾았고, 자동 검증 가능한 범위는 실행했다.

현재 상태는 "대부분 기능 표면은 살아 있으나 릴리스 가능 상태는 아님"이다.

출시 차단 우선순위:

1. `.env.local` 비밀 분리/교체
2. `normalizeAppLanguage` 테스트/모듈 불일치 수리
3. stale 문구 테스트 갱신
4. `candidate-decision-summary` 과정기록 회귀 여부 확인
5. lint ignore 및 `BackupsSection` effect 수정
6. 신규 800줄 초과 파일 분해 계획 수립
7. Day 0 gate static blocker 및 live evidence 보강

[검사 적용] - [C] 안전성 - [G] 성능 - [K] 간결성
