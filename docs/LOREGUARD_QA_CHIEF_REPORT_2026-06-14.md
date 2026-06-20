# Loreguard QA 최고 책임자 리포트 — 2026-06-14

## 요약 매트릭스

| 구분 | 위치 | 재현 절차 | 로그·화면 증상 | 심각도 |
|---|---|---|---|---|
| 50% 구현 | `/studio` 프로젝트 생성 | 첫 진입 후 프로젝트 생성 화면 확인 | `ProjectStart`의 `ps-*` 클래스가 CSS에 없어 입력·캔버스가 기본 나열처럼 보임 | P1 |
| 50% 구현 | `/studio` 프로젝트 생성 | `빈 프로젝트 생성` 연타 또는 더블 클릭 | 세션 생성 중 버튼이 잠기지 않아 중복 생성 가능성이 있음 | P1 |
| 디자인 | `/studio` 환경 설정 | 헤더 설정 버튼 클릭 | 패널 표기가 `설정` 중심이라 통합 설계의 `환경 설정` 용어와 불일치 | P2 |
| 정리 완료 | 구표면 route | `/codex`, `/reference`, `/reports`, `/rulebook`, `/tools`, `/world` 접근 | 공개 route 파일 제거 완료. 현재 E2E는 404/410 은퇴 표면으로 회귀 방지 | P2 |
| 검증 대기 | 전 페이지 | Next dev 실행 중 화면 확인 | 개발 환경의 Next issues 배지는 프로덕션 노출 여부를 빌드/preview로 재확인 필요 | P3 |

## 2026-06-15 업데이트

프로젝트 생성/관리 P1 항목은 현재 코드 기준으로 1차 수리됨.

- `ProjectStart` 전용 `ps-*` 화면 구조는 적용된 상태이며, `/studio?tab=project&entry=manage` 브라우저 확인에서 `작품 보관함`, `새 작품`, `작업 열기`, `파일 불러오기`, 삭제 2중 안내가 노출됨.
- `빈 프로젝트 생성`은 기존 작품 덮어쓰기 대신 새 작품 세션 생성 경로를 타며, 생성 중 버튼 잠금과 handler early-return이 유지됨.
- 기본 이름으로 여러 작품을 만들 때 보관함에서 모두 `새 작품`으로 보이는 혼선을 막기 위해 저장 훅에서 `새 작품`, `새 작품 2`, `새 작품 3`처럼 구분 이름을 붙임.
- 화면 한국어 문구에서 `프로젝트 저장`, `프로젝트에 채택`, `제목 없는 프로젝트`, `채택 전에는 프로젝트에 반영` 같은 개발자식 표현을 `작품 저장`, `작품에 채택`, `제목 없는 작품`, `채택 전에는 작품에 반영`으로 정리함.
- `프로젝트 생성`이라는 10단계 탭명은 제품 흐름의 단계명이라 유지함.

## 2026-06-19 구표면 route 재검증

- 공개 route 파일 기준으로 `/codex`, `/reference`, `/reports`, `/rulebook`, `/tools/*`, `/world/[id]`는 활성 앱 표면에서 제거됨.
- `/api/network-agent/search`, `/api/network-agent/ingest`, `/api/network-agent/smoke`는 호환 라우트로만 남기며 `GET/POST` 모두 410 `surface_removed`를 반환함.
- 관련 E2E는 Network/Tools/World/Archive를 정상 페이지로 기대하지 않고, 은퇴 표면 회귀 방지로 검증하도록 갱신됨.

검증:

- `npx jest src\components\loreguard\__tests__\ProjectStart.import.test.tsx src\hooks\__tests__\useProjectManager-setConfig.test.tsx --runInBand`
  - 2 suites passed
  - 31 tests passed
- `npx tsc --noEmit --pretty false`
  - passed
- Browser `/studio?tab=project&entry=manage`
  - console warn/error: 0
  - residue check: `AI-TEST-INPUT`, `기본 스튜디오`, `초안 컨트롤`, `WABI`, `AI 생성`, `AI 채팅`, `기계결함` 미노출
  - 비파괴 확인: `작품 보관함`, `새 작품`, `작업 열기`, 삭제 입력 안내 노출 확인. 저장소 백업/복원 접근은 브라우저 안전 평가 영역에서 제한되어 실제 A/B 생성 클릭은 단위 테스트로 대체함.
- `PLAYWRIGHT_TEST_PORT=3100 npx playwright test e2e/smoke-routes.spec.ts e2e/network.spec.ts e2e/tools-about.spec.ts e2e/edge-routes.spec.ts e2e/translation-studio.spec.ts e2e/mobile-smoke.spec.ts --project=chromium --reporter=list`
  - 55 tests passed

남은 P0/P1:

- 프로젝트 관리은 한 번 더 실제 사용자 플로우로 확인 필요: 새 작품 A/B 생성, 작품 선택, 저장 후 새로고침, 삭제 후 남은 작품 전환.
- 번역 스튜디오 신버전 톤 통합: 우측 설정 패널 시인성, 상단 복귀 문구, 4개국어 전환, 프로젝트 불러오기.
- 결제/티어: 서버 라우트 제한은 1차 검증 완료. 남은 것은 실제 Paywall UI 동선, Stripe test mode end-to-end, 결제 후 토큰 갱신 시나리오.
- 확인서/뱃지/출고 패키지: 공개용 뱃지와 제출용 확인서 분리, QR/C2PA/IP Pack 구매 흐름.

번역 스튜디오 1차 수리:

- 우측/하단 노출 문구에서 `API 키`를 `연결 키`로 정리함.
- `프로젝트 JSON`, `프로젝트 전체`를 `작업실 JSON`, `작업실 전체`로 정리해 번역실의 저장·복원 범위가 더 분명하게 보이도록 함.
- `기본 스튜디오` 잔재는 `/translation-studio` 화면 확인 기준 미노출.
- 탐색 패널의 검색·진행률·빈 상태 영역을 `bg-bg-*`, `border-border`, `text-text-*`, `accent-*` 계열로 정리해 구버전 다크 패널 느낌과 낮은 시인성을 완화함.

검증:

- `npx tsc --noEmit --pretty false`
  - passed
- `npx jest src\lib\translation\__tests__\translationese-lint.test.ts src\lib\translation\__tests__\project-bridge.test.ts src\lib\translation\__tests__\risk-report.test.ts --runInBand`
  - 3 suites passed
  - 63 tests passed
- Browser `/translation-studio`
  - console warn/error: 0
  - residue check: `기본 스튜디오`, `API 키`, `프로젝트 JSON`, `프로젝트 전체`, `AI-TEST-INPUT`, `초안 컨트롤`, `WABI`, `AI 생성`, `AI 채팅` 미노출

결제/티어 서버 게이트 1차 수리:

- `OPEN_BETA` 해제 기준은 `NEXT_PUBLIC_PAYMENT_LIVE` 하나로 고정함.
- `STRIPE_SECRET_KEY`는 checkout/webhook 같은 결제 서버 라우트의 조건으로만 남기고, 키가 로컬 또는 스테이징에 존재한다는 이유만으로 베타 제한이 꺼지지 않게 정리함.
- Hosted 노아 호출 제한 대상은 `/api/chat`, `/api/complete`, `/api/structured-generate`, `/api/gemini-structured`, `/api/analyze-chapter`, `/api/translate`, `/api/image-gen` 기준으로 확인함.
- Paywall 카드와 서버 제한 응답의 사용자 문구는 `사용자 API 키` 대신 `사용자 연결 키`로 정리함.
- `/api/local-proxy`는 로컬 모델 운영 경계라 Hosted 사용량 카운트에서 제외하되, 운영 배포 차단·사설망 제한·동일 출처 확인·요청 크기 제한 테스트로 별도 방어를 확인함.
- `/api/lsp/*` 중 번역 품질 검사는 결정론적 검사와 LSP 인증 계약을 따르므로 Hosted 모델 티어 제한 대상에서 제외함.

검증:

- `npx jest src\lib\__tests__\tier-gate.test.ts src\lib\noa\__tests__\server-tier-limit.test.ts src\lib\__tests__\tier.test.ts --runInBand`
  - 3 suites passed
  - 31 tests passed
- `npx jest src\app\api\chat\__tests__\route.test.ts src\app\api\complete\__tests__\route.test.ts src\app\api\structured-generate\__tests__\route.test.ts src\app\api\gemini-structured\__tests__\route.test.ts src\app\api\analyze-chapter\__tests__\route.test.ts src\app\api\translate\__tests__\route.test.ts src\app\api\image-gen\__tests__\route.test.ts src\app\api\code\autopilot\__tests__\route.test.ts --runInBand`
  - 8 suites passed
  - 18 tests passed
- `npx jest src\app\api\local-proxy\__tests__\route.test.ts --runInBand`
  - 1 suite passed
  - 8 tests passed
- `npx jest src\components\loreguard\__tests__\PaywallNoticeCard.test.tsx src\services\__tests__\imageGenerationService.test.ts src\services\__tests__\geminiService.test.ts src\lib\noa\__tests__\server-tier-limit.test.ts --runInBand`
  - 4 suites passed
  - 62 tests passed
- `npx tsc --noEmit --pretty false`
  - passed

남은 결제 P0:

- 실제 Paywall 카드/모달이 제한 응답을 받아 가격/환경 설정으로 자연스럽게 이어지는지 브라우저에서 확인.
- Stripe test mode 결제 → webhook → custom claim 반영 → ID token refresh → Pro 제한 해제 end-to-end 검증.
- Free/Pro/BYOK/Local/비로그인 모드별 수동 시나리오를 `NEXT_PUBLIC_PAYMENT_LIVE=true` 환경에서 한 번 더 실행.
- 구스튜디오·비활성 표면·옛 번역 리소스에 남은 `API 키` 표현은 별도 문구 클리닝 대상으로 유지.

## 상세 분석

- `ProjectStart.tsx`는 첫 화면 역할과 불러오기 후보, 프로젝트 캔버스 구조를 갖고 있었지만, 실제 CSS 정의가 없어 화면이 전문 IDE가 아니라 단순 HTML 나열처럼 보일 수 있었다.
- 프로젝트 생성 버튼은 `pendingCreate` 상태를 내부적으로 갖고 있었지만, 버튼 `disabled`와 handler early-return이 없어 더블 클릭·연타에 취약했다.
- 환경 설정 slide-over는 실 기능은 연결되어 있었으나 사용자 표면 문구가 새 제품 용어와 덜 맞았다.
- 구표면은 `proxy.ts` 차단 정책이 이미 있으므로, 이번 수리에서는 삭제보다 QA 리포트의 추적 항목으로 남겼다.

## 코드 패치

- `ProjectStart.tsx`
  - `projectStartBusy`를 추가해 프로젝트 생성 중 중복 실행을 차단.
  - `노아 인터뷰로 시작`, `빈 프로젝트 생성` 버튼에 `disabled`, `aria-busy`, `data-testid` 추가.
- `loreguard.css`
  - 공통 `.btn:disabled`, `.btn:focus-visible` 상태 추가.
  - `ProjectStart` 전용 `ps-*` 레이아웃, 입력, 캔버스, 불러오기 후보, 출고 기록, 모바일 반응형 CSS 추가.
- `LoreguardStudio.tsx`, `LoreguardShell.tsx`
  - 설정 표면을 `환경 설정`으로 정리.
  - 환경 설정 slide-over 폭을 전문 도구 패널 기준으로 조정.
- `e2e/loreguard-qa-chief-chaos.spec.ts`
  - 핵심 public route smoke, 프로젝트 생성 카오스 입력, 모바일/데스크톱/6K overflow, 위험 API write 차단 검증 추가.

## 테스트 목록

- `npx tsc --noEmit`
- `PLAYWRIGHT_TEST_PORT=3015 npx playwright test e2e/loreguard-qa-chief-chaos.spec.ts --project=chromium`
- `PLAYWRIGHT_TEST_PORT=3015 npx playwright test e2e/loreguard-design-a11y.spec.ts --project=chromium`
- 수동 확인: `/studio` 첫 화면, 환경 설정 slide-over, 프로젝트 생성 더블 클릭, 모바일 프로젝트 캔버스 sheet.
