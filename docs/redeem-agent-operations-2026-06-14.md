# Loreguard 리딤·노아 운영 최신 기준

Last updated: 2026-06-15

## 목적

이 문서는 앱 안팎 문서가 같은 기준을 쓰도록 맞추는 현재 기준표다.
리딤, 결제, 노아 운영, 에이전트, BYOK, 로컬 모델, 비활성 레거시 경로를 한곳에 모은다.

## 공개 용어

| 영역 | 공개 화면에서 쓸 말 | 피할 표현 범주 |
|---|---|---|
| 보조 작업 | 노아, 노아 설정 가이드, 노아 제안 | 자동 대화 도구처럼 보이는 표현 |
| 산출 제안 | 제안, 후보, 초안 후보 | 자동 작성·자동 산출처럼 보이는 표현 |
| 기록 | 과정기록, 작업 이력, 출고 참고 자료 | 법적 효력 대체나 완전 책임 방어처럼 보이는 표현 |
| 결제/혜택 | 리딤 코드, 이용권 적용, 출고 크레딧 | 제한 없는 제공을 단정하는 표현 |
| 출고 | 출고 패키지, 권리/IP 점검 | 법적 방어 완료 |

법적 문서와 정책 고지에서는 필요한 범위에서 AI, 모델, BYOK 같은 기술 용어를 그대로 쓴다.

## 리딤 현재 상태

현재 코드 기준으로 리딤 전용 제품 기능은 아직 없다.

| 항목 | 현재 상태 | 코드/문서 기준 |
|---|---|---|
| Stripe checkout | 기능 게이트 뒤에 있음. `FEATURE_STRIPE_CHECKOUT=on`과 Stripe 환경변수 필요 | `src/app/api/checkout/route.ts` |
| Stripe webhook | 구독 상태와 정확한 Loreguard 플랜을 서버 구독 문서에 반영하고 Firebase custom claim을 갱신 | `src/app/api/stripe/webhook/route.ts` |
| 리딤 코드 입력 UI | 미구현 | 향후 `환경 설정` 또는 `결제/이용권` 표면 필요 |
| `/api/redeem` | 미구현 | 라우트 없음 |
| 출고 상품 라인 | 반영 | 과정기록 카드, C2PA 회차 패키지, 완결 과정기록, 완결 출고 패키지 Pro, Publisher 제출 패키지 |
| 출고 크레딧 미리보기 | 반영 | 발급 전 상품·크레딧·프로젝트 범위를 표시 |
| 출고 크레딧 원장 코어 | 반영 | `src/lib/billing/release-credit-ledger.ts`에서 idempotency, 차감, 환불/복구, 조직 플랜 무제한 처리 |
| 정확한 플랜 동기화 | 반영 | checkout metadata와 webhook 구독 문서로 Starter/Studio/Pro 출고 크레딧 수량을 구분 |
| 출고 크레딧 서버 차감 | 반영 | `POST /api/release-credit/debit`에서 인증된 유료 사용자의 서버 구독 문서로 프로젝트 월 원장을 만들고 차감. 클라이언트 플랜 값은 신뢰하지 않음 |
| 별도 구매·재발급·환불 원장 API | 반영 | `POST /api/release-credit/operation`에서 구매 반영, 환불/복구, 차감 취소, 재발급 기록 처리. 구매·환불·복구는 내부 서버 secret 필요 |
| 확인서 단건 구매 checkout | 반영 | `POST /api/release-credit/checkout`에서 서버 상품 가격표 기준으로 Stripe payment mode 세션 생성. webhook이 구매 metadata를 원장에 반영 |
| 확인서/출고 크레딧 리딤 | 대기 | `/api/redeem`, 리딤 코드 UI 연결 필요 |

문서와 화면은 리딤을 활성 기능처럼 말하지 않는다. 공개 표현은 `준비 중`, `대기`, `운영 설계 중`으로 제한한다.

## 리딤 목표 계약

리딤은 결제 우회가 아니라 엔타이틀먼트 원장에 기록되는 이용권 적용이다.

| 리딤 종류 | 적용 대상 | 필수 기록 |
|---|---|---|
| 체험 연장 | 플랜 체험 기간 | 코드 ID, 사용자 ID, 만료일, 적용 시각 |
| 출고 기록 묶음 | 과정기록 카드/완결 과정기록 | 남은 건수, 발급 시 차감 로그 |
| 출고 패키지 묶음 | 제출용 패키지 생성 | 작품 ID, 패키지 타입, 차감 로그 |
| 번역 묶음 | 번역·현지화 작업량 | 언어, 글자 수 또는 회차 기준 |
| 퍼블리셔 좌석 | 그룹/워크스페이스 초대 | 그룹 ID, 관리자, 좌석 수 |

필수 방어 장치:

- 1회성 코드와 반복 사용 코드 구분
- 만료일, 적용 가능 플랜, 적용 가능 국가/통화
- 서버 검증, 사용자 확인, 적용 후 영수증
- 중복 제출 방지용 idempotency key
- 관리자 발급 로그와 사용자 적용 로그 분리
- 환불/취소 시 회수 가능한 엔타이틀먼트 구조

## 노아 운영 현재 상태

노아는 제품 표면의 작업 조력자 이름이다. 내부적으로는 여러 모델·가드·레지스트리·라우트가 붙지만, 사용자가 보는 화면은 `노아`로 통일한다.

| 영역 | 현재 상태 | 기준 파일 |
|---|---|---|
| 노아 대화 도크 | Studio 탭별 채팅/제안 도크 활성 | `src/components/loreguard/ChatCanvasDock.tsx` |
| 채팅 프록시 | `/api/chat` + 서버 게이트 + BYOK/로컬/호스티드 경로 | `src/app/api/chat/route.ts`, `src/lib/ai-providers.ts` |
| 인라인 이어쓰기 | `/api/complete`에서 레지스트리 프롬프트 사용 | `src/app/api/complete/route.ts` |
| 구조화 제안 | `structured-generate`, `gemini-structured` 경로 | `src/app/api/structured-generate/route.ts`, `src/app/api/gemini-structured/route.ts` |
| 번역 | `/api/translate` + 번역 스튜디오 sign-off/record 경로 | `src/app/api/translate/route.ts`, `src/lib/translation/*` |
| 서버 게이트 | NOA 차등 차단 + 고지 정책 적용 | `docs/NOA_POLICY.md` |

## 에이전트 레지스트리 기준

현재 `src/lib/ai/writing-agent-registry.ts`에는 집필·퇴고·연출·번역·구조화 작업용 역할 정의가 있다.

활성 또는 연결된 주력 역할:

- `studio-inline-completion`
- `studio-direction`
- `translator-stage-1-draft`
- `translator-stage-2-lore-tone`
- `translator-stage-3-rhythm`
- `translator-stage-4-culture`
- `translator-stage-5-chief-editor`
- `translator-story-bible`

등록은 되어 있으나 연결 상태 확인이 필요한 역할:

- `studio-draft`
- `studio-inline-rewrite`
- `studio-detail-pass`
- `studio-proofread`
- `creative-structured-json`

제거된 구 역할:

- 구 네트워크 검색 에이전트
- 구 아카이브 검색 그라운딩 가드
- 구 HSE 검색 방어 가드

이 엔트리는 구글 Discovery Engine 제거 이후 레지스트리에서도 제거됐다. 공개 문서에서는 `네트워크 에이전트`를 활성 기능으로 쓰지 않는다.

## 비활성 에이전트 라우트

| 라우트 | 현재 응답 | 문서 표현 |
|---|---|---|
| `POST /api/agent-search` | 503 `agent_search_disabled` | 비활성 호환 라우트 |
| `GET /api/agent-search/status` | 503 `agent_search_disabled` | 비활성 호환 라우트 |
| `GET/POST /api/network-agent/search` | 410 `surface_removed` | 제거된 호환 표면 |
| `GET/POST /api/network-agent/ingest` | 410 `surface_removed` | 제거된 호환 표면 |

테스트와 문서는 이 라우트들이 크레딧을 쓰거나 외부 검색을 수행한다고 말하지 않는다.

## 모델 운영 모드

| 모드 | 사용자 의미 | 문서 기준 |
|---|---|---|
| Hosted | 앱이 운영하는 기본 모델 경로 | 환경변수와 서버 상태에 따라 제공 |
| BYOK | 사용자가 자기 키를 넣어 모델 선택 | 키는 로컬 저장소에서 AES-GCM 우선 암호화 |
| Local | LM Studio/Ollama/DGX 같은 로컬 OpenAI 호환 서버 | `/api/local-proxy` 경유 |
| Offline | 모델 호출 없이 로컬 편집/저장/출고 준비 | 저장·내보내기 위주 |

지원 Provider 기준은 `src/lib/ai-providers.ts`가 단일 소스다.
2026-06-15 현재 사용자 선택 후보는 Gemini, OpenAI, Claude, DeepSeek, Qwen, MiniMax, Kimi, LM Studio이며, Groq/Mistral/Ollama는 개발 또는 보조 노출로 취급한다.

## 문서 갱신 규칙

1. 앱 문서(`/docs`)는 실제 Studio 10단계와 일치해야 한다.
2. 리딤은 구현 전까지 활성 기능처럼 쓰지 않는다.
3. `agent-search`, `network-agent`는 비활성 호환 경로로만 설명한다.
4. 공개 UI 용어는 노아 중심으로 쓴다.
5. 법적 책임 표현은 확인/기록/보조 자료/출고 참고 자료로 제한한다.
6. 결제·리딤·모델·정책은 시간 민감 정보이므로 갱신일을 표시한다.
