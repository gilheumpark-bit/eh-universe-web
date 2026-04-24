# Changelog

All notable changes to EH Universe Web are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/).

## [2.3.0-alpha] — 2026-04-23 ~ 2026-04-24

### Licensing — Dual License 전환 (BREAKING, 커밋 414fe9ea 이후)

**`CC-BY-NC-4.0` → `AGPL-3.0-or-later` + Commercial 이중 트랙**으로 전환.

- **오픈소스 트랙** `AGPL-3.0-or-later` — 개인/학술/소스 공개 SaaS 무료. 네트워크 서비스 제공 시 §13에 따라 전체 소스 공개 의무
- **상업 트랙** `COMMERCIAL-LICENSE.md` — 클로즈드 SaaS, OEM, 퍼블리셔·엔터프라이즈 자가호스트 대상. 명시적 특허 grant + indemnification 포함
- **특허 전략 결합** — 한국 특허 출원 (ARCS 관련)을 AGPL §11 + Commercial 명시 grant 이중 구조로 집행 가능
- **비취소 조항** — 커밋 `414fe9ea` 이전 릴리스는 CC-BY-NC-4.0 영구 유지 (CC 비취소 원칙). 이후 커밋부터 dual 적용
- `LICENSE` 교체 — AGPL-3.0 전문 + EH Universe 헤더 (dual notice, patent notice, prior license notice)
- `COMMERCIAL-LICENSE.md` 신설 — 티어 (Indie / SMB / Enterprise / SaaS / Publisher) + CLA 계획 (cla-assistant.io)
- `package.json` `"license": "AGPL-3.0-or-later"` · README 라이선스 섹션 + 뱃지 동기화

**배경**: CC-BY-NC는 "NC(비상업)" 해석 모호 + 기업 법무팀 기피 + 특허 grant 조항 부재로 베타 확장 단계에 부적합. MongoDB(SSPL)·Sentry(FSL)·Elastic 선례 분석 후 **MongoDB 모델 (AGPL + Commercial)** 채택.

### Added — ARCS 응답 제어 시스템 기반 레이어 (하루 6 커밋)

**EH Universe의 핵심 엔진 ARCS (AI Response Control System)의 오픈소스 표면부 완성.** Loreguard·Code Studio·Translation Studio가 공유하는 공통 기반 3 모듈 구축.

#### WRITING_AGENT_REGISTRY (1acaeb8a)
- `src/lib/ai/writing-agent-registry.ts` 신설 — Code Studio 19-role `AGENT_REGISTRY` 패턴을 집필·번역·아카이브에 이식
- **11 agent entries**: studio-draft · inline-completion · inline-rewrite · detail-pass · translator-stage-1~5 · story-bible · codex-structured-json · network-agent-archive
- **6 GuardId**: no-english-thinking-korean-novel, no-think-translation, no-yap-json, **ip-brand-guard**, prism-ALL/T15/M18
- **7 Context Block ID**: character-dna, world-book, scene-sheet, genre-rules, story-summary, glossary, continuity-notes
- `buildAgentSystemPrompt(id, ctx)` 공용 빌더 + `auditRegistry()` 감사 유틸

#### IP Guard L1~L5 (2c681ca3)
- `src/lib/ip-guard/` 5 파일 신설
- **L1 Ingestion Guard** — `network-agent/ingest`: critical IP 매칭 시 403 거부 + 상세 리포트
- **L2 Retrieval Filter** — `ragService.sanitizeRagResults`: annotate/strict/off 3 모드
- **L3 Prompt-time Brand Guard** — `ip-brand-guard` GuardId (집필 5 에이전트 자동 주입)
- **L4 Output Post-Check** — `compliance-axis-7` + `buildIPAvoidanceDirective` 재생성 지시문
- **L5 Cross-Corpus N-gram** — 한국어 문자 단위 Jaccard 유사도 (`ngram-similarity.ts`)
- **80+ 브랜드 엔트리** (9 카테고리: US/JP/KR 엔터·KR 웹툰·웹소설·게임·테크·럭셔리·푸드·스포츠·영화)
- **Codex 동적 블록리스트** — `localStorage` CRUD (`load/upsert/remove`)
- **한국어 저작권 패턴** 지원 ("무단 전재 금지", ©/™/® 등)

#### Compliance 7축 채점 엔진 (6798d38c)
- `src/lib/compliance/` 8 파일 신설 (types + axes 1~7 + orchestrator)
- **7축**: worldbook · character · direction(POV+tone) · genre · scene-sheet · continuity · IP
- `scoreAllAxes(ctx, options)` + `applyDirectiveToPrompt` 재생성 루프 연동
- 가중 평균 총점 + critical 축 자동 재시도 (strict-critical 모드)
- MVP 정량 규칙 기반, LLM Auditor 확장 (같은 vLLM 8001 low-temp self-critique) 계획

#### ARCS 인프라 갱신 (964610b8)
- Engine A/B 쌍포(9B) + Nginx LB → **Qwen 3.6-35B-A3B-FP8 MoE 단일 (vLLM 8001)** 전환
- FlashInfer + N-Gram Speculative Decoding 실측 40~50 tok/s, TTFT 0.05s
- 번역 경로 `buildTranslationGuard(to)` 언어별 `/no_think` 가드 주입 (한글 소설 가드와 충돌 분리)
- Network Agent `modelPromptSpec.preamble` — 집필 보조 역할 + HSE 4대 권리 유지

### Changed — 네이밍·법적 카피 정리 (ca212047, 7438223d)
- **"연출 스튜디오" → "작품 연출"** 4언어 통일 (ko/en/ja/zh i18n)
- `SceneDirectionData` vs `EpisodeSceneSheet` 주석 정정 (작품 전체 연출 vs 에피소드 시나리오 구분)
- **"평생 50% 할인" → "기간 한정 할인"** (계약법 모호성 제거)
- **"공동 창설자" → "얼리 액세스 멤버"** (조합·회사 관계 오인 방지)
- **"제품 크레딧 등재" → "알파 기여자 명시"** (영구 권리 약속 회피)
- README·SUPPORT·manifesto 3파일 × 4언어 매트릭스 동시 반영
- RAG 출처 명시: "ChromaDB 99만 문서 **(위키백과 CC BY-SA 라이선스 선별)**"

### Security — IP/저작권 방어 전수 구조화
- 브랜드 · 저작권 문구 · 표절 3축 자동 탐지
- 재생성 루프 연동 (L4)으로 AI 출력에서 실존 IP 감지 시 자동 회피
- `Codex` 작가별 동적 블록리스트로 장르·프로젝트 특화 방어 가능

### Documentation
- `ARCHITECTURE.md` 2.3.0-alpha 갱신 — DGX 단일 모델·ARCS 섹션·IP Guard·Compliance 7축 추가
- `CLAUDE.md` 인프라 섹션 갱신 (35B MoE 단일 구조)
- `docs/manifesto.md` v2.2 법적 표현 정리 완료

### Verification
- `npx tsc --noEmit` → 0 errors
- **13 신규 파일** + **6 수정 파일**
- 총 **+2,300 라인** 추가
- 4 커밋 (ai refactor → ai registry → ip-guard → compliance) + 2 커밋 (i18n → legal)

### Documentation — 24일 기준 최신본 문서 동기화 (2d273b77)

- README `프로젝트 상태` 2026-04-21 → 2026-04-24 · **ARCS 레이어 지표 1줄 신설**
- README CHANGELOG 링크 버전 v2.2.0-alpha.1 → v2.3.0-alpha
- AGENTS.md 상단에 **2026-04-24 v2.3.0-alpha 섹션** 신설 (ARCS 레이어 · IP Guard L1-L5 테이블 · AI 호출 엔트리 감사 결과 · 네이밍 통합 · 법적 카피 정돈)
- AGENTS.md AI 모델 테이블 DGX 라인 → **Qwen 3.6-35B-A3B-FP8 MoE 단일**
- ARCHITECTURE.md 2.1.2 → 2.3.0-alpha (DGX 35B MoE · RAG Wikipedia CC BY-SA · ARCS 섹션 신설)

### Fixed — 미연결·미구현·50%·스텁·에러 전수 감사 및 수리 (bcb622eb)

**tracked 1,787 / src 1,586** 파일 전수 패턴 스캔 + 의심 파일 **개별 Read 판정 후 실수리 5건**:

1. **미연결** — `TermTooltip` LangContext 미연결 → `language?: AppLanguage | string` prop + `L4()` 4언어 활성 (5 호출자 전파: TranslationPanel×4 / AdvancedSection×2 / SceneSheet×1)
2. **문서-구현 불일치** — `novel-plugin-registry.ts:425` docstring → 실제 fail-closed 동작 명시 (signature 있을 때 valid=false 강제)
3. **미연결** — `image-gen/route.ts` `referenceImageRequested` 주석 의도 → 응답 metadata 반영 (OpenAI / Stability / local-spark 3 provider, 호출자 `imageGenerationService.ts`는 `data.images`만 읽어 호환 유지)
4. **dead state** — `StatusIndicator` storage state 미표시 → 제거 (StatusBadge 담당)
5. **dead code** — `AdvancedPlanningSection` tier1/2/3 Pct/Unlocked + handleGuidedToggle + 미사용 imports 7건 제거

ESLint 품질 수리:
- `--fix` Unused disable directive 22건 자동 제거
- exhaustive-deps 2 · jsx-a11y 5 (Dropdown useId+aria-controls · treeitem aria-selected · tab 의 잘못된 aria-pressed) · unused-expressions 2 · no-img-element 2 · no-unused-vars 28 전수 수리 또는 `_prefix`
- **240 warn → 178** (CLI 레이어 any 144 + @ts-nocheck 34 잔존 — 배포 영향 없음, 별도 사이클)

검증: TS 0 / ESLint 0 errors / jest 298 suites 3,304 tests pass / 회귀 0

### Fixed — 옆 골목 점검 (30746c71)

직진 점검(패턴 매칭 파일)이 놓친 부속 게이트 전수 실행:

- `next build` 프로덕션 빌드 — 통과
- `npm audit` — high 1 (`@xmldom/xmldom` XXE/DoS 4건) + moderate 2 (`uuid` buffer bounds + `@sentry/webpack-plugin` 전이) → `npm audit fix` (non-force) → **0 vulnerabilities**
- `npm run check:size:ci` — `ShadowDiffDashboard.tsx` 811줄 **NEW VIOLATION** 발견 (이전 커밋 `b8fe2492` 에서 성장)
  - PART 3.6 `PromotionHistoryPanel` → `ShadowPromotionHistoryPanel.tsx` 별도 모듈 추출
  - 분리 후 738줄 (FAIL 임계 800 하회, **grandfather 리스트 증가 없이** 해결)
- 역방향 의존 회귀 — image-gen / TermTooltip / StatusIndicator / AdvancedPlanningSection / novel-plugin-registry 호출자 전수 확인 → 파손 없음
- `.husky` 비어있음 (pre-commit hook 미설치, hooks 통과 문제 없음)
- 통합 스크립트 `verify:static` / `verify:build` / `verify` 인지 — 다음 사이클부터 개별 도구 대신 체인 사용

### Chore — Housekeeping
- 루트 untracked 일회용 스크립트 `fix-eslint.mjs` 제거 + `.gitignore`에 `fix-*.mjs` 패턴 등록 (동종 임시 파일 자동 제외)

### Experimental — CS Quill CLI v0.1.0
- `src/cli/bin/cs.ts` — Code Studio CLI 엔트리 (🦔 CS Quill — 코드 퀄리티 고슴도치)
- 명령: `init` (프로젝트 온보딩), `generate` (SEAL 계약 병렬 코드 생성)
- **상태**: 내부 실험용. `npm bin` 등록만 유지, 외부 배포·공개 문서화 전

### Ops — 로컬 실측 검증 (2026-04-24)

- `scripts/project-integrity-scan.mjs` — exit 0, 신규 P0/P1 **0건** (이전 전수 감사 판정 재확인: TODO 16은 전부 검출기 regex / 의도적 skeleton / 원어민 검수 요청)
- Lighthouse 3 URL 로컬 prod 실측 (`npm run lh:check`):
  - `/`                    Perf 69 / A11y  96 / BP 96 / SEO 92
  - `/studio`              Perf 70 / A11y 100 / BP 96 / SEO 58 (로그인 게이팅 영향 추정)
  - `/translation-studio`  Perf 69 / A11y 100 / BP 96 / SEO 92
  - Threshold 75 미달 (Perf 3개 + `/studio` SEO) → 별도 사이클 번들/LCP 과제
- Playwright E2E (`npm run test:e2e`):
  - Desktop chromium (workers=2): **142 passed / 7 skipped / 0 failed / 0 worker crash** (11.3분)
  - Mobile device emulation: Windows `STATUS_ACCESS_VIOLATION` 로컬 한계 → CI(Ubuntu)에 위임 (`.github/workflows/ci.yml` 이미 chromium + mobile 전수 커버)
- `scripts/lighthouse-check.mjs` Windows EPERM 내성 개선 — `finally` 의 `chrome.kill()` 내부 `rmSync(tmpdir)` sync throw 를 try/catch 로 흡수. 이전까지 3 URL 런이 끝난 뒤 리포트 쓰기 전에 crash 되던 문제 해결.
- `.gitignore` 확장 — `docs/lighthouse-report.md` + `/e2e*.log` (로컬 런 산출물 자동 제외)

### Security — 외부 감사 2차 + defense-in-depth 일괄 수리 (6 커밋, 2026-04-24 후반)

외부 리뷰어의 일반/고급 14+14 체크리스트 + Mythos 시각 attack chain 감사 결과로 식별된 22건 중 **16건 즉시 수리**. 잔여 6건 은 [`docs/unfixed-backlog.md`](docs/unfixed-backlog.md) 별도 추적.

#### 1차 — Sentry · DGX · 버전 · robots (021161e4)
- Sentry DSN 하드코딩 폴백 제거 (client/server/edge 3 config) — 미설정 시 자동 비활성
- `sentry-scrub.ts` 신설 — PII scrubber (sk-/AIza/Bearer/email/card/private_key 6 정규식 + 4 헤더 키 redact)
- `deploy-dgx.sh` — 듀얼 9B + FastAPI 프록시 폐기 → 35B MoE 단일 (vLLM :8001) 동기화
- `uvicorn --reload` 프로덕션 플래그 제거
- `SECURITY.md` 버전 정책 재작성 — 2.3.x-alpha + < 2.2-alpha 단일 규칙
- `robots.ts` AI 크롤러 9 → 22개 (Meta-ExternalAgent · Applebot-Extended · Diffbot 등 2026-Q1 적극 크롤러)
- code-studio CSP `frame-src http://localhost:*` — NODE_ENV 분기로 프로덕션 제거

#### 2차 — Mythos attack chain 8건 일괄 차단 (5cf354d9)
- **R1 CRITICAL** `firestore.rules` users/{uid} update 룰에 role/id 불변성 조항 — 자체 admin 승격 차단 (`isAdmin()` 의존 관리자 엔드포인트 전방위 방어)
- **S1-share** expiresInHours 30일 캡 + content 200K chars + Content-Length 500KB 사전 게이트
- **S1-SSRF** `validatePostFetchUrl(response.url)` 호출 연결 (이전 dead code) — DNS rebinding post-fetch 재검증
- **S2-cron** PROD-only secret → 환경 무관 필수 (Preview 배포 노출 차단)
- **S2-XFF** `getClientIp` x-vercel-forwarded-for 1순위 (Vercel 엣지 전용, 위조 불가) + self-host 폴백
- **S2-EPUB** `zip-bomb-guard.ts` 신설 — ZIP EOCD 파서 (의존성 0) + 100MB 압축해제 캡
- **S2-error** body.message/stack/source/url control char stripping (defense-in-depth)

#### 3차 — 운영·CSP (bcc073c3 + 95654f6c)
- `/status` 페이지 — `/api/health` 30초 폴링 + aria-live 상태 배지 (4언어)
- `vercel.json` DR 리전 hnd1 추가 (icn1 + hnd1) + 스트리밍 라우트 개별 maxDuration (chat/translate 300s, complete/image-gen 180s, 기본 60s)
- `docs/incident-response.md` 8 섹션 — S0~S3 심각도 + 롤백 절차 + SLI/SLO 초안
- `docs/dgx-runbook.md` 8 섹션 — 35B MoE 배포·헬스·장애·Cloudflare Tunnel 상태
- CSP `img-src 'https:'` 범용 허용 제거 → 명시 화이트리스트 (Google/Firebase/GitHub/Gravatar) + `CSP_EXTRA_IMG_SRC` env 확장
- CSP connect-src 하드코딩 문자열 → 카테고리 배열 (AI provider 5 + Firebase 7 + CDN/monitor 3 + Sentry 1) + `CSP_EXTRA_CONNECT_SRC` env
- A5 SRI integrity — 판정 "무의미" (layout.tsx 외부 `<script src="">` 없음)

#### 4차 — Consent + CSRF 스캐폴드 (f1a611a3)
- `src/lib/consent.ts` 신설 — 중앙 consent 상태 관리 (getConsent·hasAnalyticsConsent·setConsent) + `eh:consent-changed` 이벤트 버스
- `CookieConsent.tsx` — 중앙 lib 위임, 수락 시 이벤트 dispatch
- `sentry.client.config.ts` — `enabled` 3중 게이트 (DSN + prod + `hasClientAnalyticsConsent()`) — GDPR Art.7 실효
- `src/lib/csrf.ts` 신설 — double-submit cookie 설계 + constant-time verify
- `/api/csrf` 엔드포인트 — 토큰 발급 (SameSite: Strict + 24h) — 이후 라우트 enforce 단계적

#### 5차 — DSAR + Stripe (c6a1ba38)
- `/api/user/export` GDPR Art.15/20 · K-PIPA §35 — Origin + CSRF + Firebase ID token 3중 검증, 5/day rate, users/{uid} JSON 즉시 다운로드 + 추가 데이터 30일 SLA 메일 안내
- `/api/user/delete` GDPR Art.17 · K-PIPA §36 — 3/day rate, `deletion_requests` 티켓 기록 + 30일 SLA, Firestore 실패 시에도 ticketId 반환 (이메일 fallback)
- `/api/stripe/webhook` — stripe SDK 시그너처 검증 (raw body) + 6종 이벤트 dispatch + 구조화 로그. Firebase custom claim 실제 갱신은 firebase-admin SDK 통합 후속

### Deferred — docs/unfixed-backlog.md 에서 추적 (6건)

- **A** 법무 1건 — Legal content 변호사 리뷰 (외부 의존)
- **B** 설계 선행 2건 — C1 CSP nonce (Next.js 16 middleware 연구) · W1 Firestore public 분리 (데이터 마이그)
- **C** 별도 스프린트 4건 — Perf 75+ · A11y 100 · CLI strict · ShadowDiffDashboard 738→500
- **D** 사용자 도메인 9건 — Sentry DSN · Stripe secret · CRON_SECRET scope · firebase-admin · CLA · 브릿G 모집 · 모두의창업 · PCT · feature flag

---

## [2.2.0-alpha.1] — 2026-04-21

### Fixed — Lighthouse 5페이지 전수 A11y 100/100 달성

**3종 7건의 접근성 실패를 전수 수리해 `/`, `/studio`, `/translation-studio`, `/network`, `/archive` 5페이지가 Lighthouse Accessibility 100/100 만점.**

#### `heading-order` (WCAG 1.3.1) × 5
- `MobileStudioView`의 섹션 헤딩 h3 → h2 승격
  (세계관 메모 / 캐릭터 스케치 / 플롯 브레인스토밍 / 내 원고)
- 상단 h1 "로어가드 — 모바일 스케치" 다음 h2가 맞는 구조로 정규화

#### `label-content-name-mismatch` (WCAG 2.5.3) × 5
- Header 로고: EH 배지 / TEST 배지 / 서브타이틀 `aria-hidden="true"` 처리
- Header 언어 토글 (데스크톱+모바일): `aria-label`에 현재 언어 코드 동적 포함
  `"Toggle language"` → `"${lang.toUpperCase()} — Toggle language"`
- Archive 기사 링크: 번호(01) · 화살표(->) 장식 요소 `aria-hidden` 처리

#### `color-contrast` (WCAG 1.4.3) × 2
- Archive "EH" 배지: `bg-accent-amber/20 text-accent-amber` → `bg-accent-amber/40 text-text-primary`
  (1.85:1 → >7:1, WCAG AAA 통과)
- MobileDesktopOnlyGate 공유 버튼: `text-white` 제거 + inline `color:#fff`
  (light 모드 `.text-white` 오버라이드로 인한 1.85 대비 → 5.5 AA 통과)

### Changed
- `CHANGELOG.md`에 `v2.2.0-alpha.1` 항목 추가 (사용자 노출 + 릴리스 마킹)
- `src/lib/changelog-data.ts` 동기화 (앱 내 `/changelog` 페이지 자동 반영)

### Verification
- `npx tsc --noEmit` → 0 errors
- `npx next build` → exit 0
- Lighthouse `/ /studio /translation-studio /network /archive` → **A11y 100 × 5, fails 0**

---

## [2.2.0-alpha] — 2026-04-19 ~ 2026-04-20

### Added — 알파 전수 리포지셔닝 (M1~M8 Milestones)

**8개 마일스톤 태그 (`M1-M8-COMPLETE-2026-04-20`) 달성. 알파 배포 가능 상태 확정.**

#### 라이브 프리뷰 접근성 마감 (2026-04-21)
- axe 감사 P1 전건 수리
- 라이트/다크 accent 토큰 WCAG 4.5:1 기준 0.3단계 재밸런싱
  - light: amber #8a6a20→#6f5318 / red #c16258→#a04938 / green #2f9b83→#1a6e58 / purple #5b4b93→#4a3d7a / blue #4a6a8f→#3e5c7e
  - dark: amber #b8955c→#caa572 / red #a85c52→#c4786d / green #4a8f78→#6aaa90 / purple #8b6f56→#a08573 / blue #6d7d8f→#8898ad
- `UnifiedSettingsContext` JS 인라인 오버라이드와 `globals.css` 단일 소스 동기화
- 페이지별 `<main>`/`<article>`/`<h1>` 랜드마크 36곳 정돈 (nested main 제거)
- 모바일 8항목 + 데스크톱 4항목 네비 `min-h: 44px` 통일로 WCAG 2.1 AAA 터치타겟
- `privacy/terms/copyright/ai-disclosure` 4페이지 `generateMetadata` 4언어(KO/EN/JP/CN) 추가
- `universeStats` 숫자에 `tabular-nums` 적용
- `realtime-collab` 사용자 색상 6종을 다크 토큰 시리즈에 맞춰 재지정
- Codex 탭 임베드 `<div>` → `<article aria-label>` (h1 중복 경고 완화)

#### AI 고지 stale 수리 (2026-04-20)
- `privacy/ai-disclosure/terms` 3페이지 DGX 모델 표기 갱신
  `Qwen 3.5-9B FP8 (8080/8081)` → `Qwen 3.6-35B-A3B-FP8 MoE (vLLM 8001)`
- 4언어(ko/en/ja/zh) 일괄 업데이트
- 허위 고지 방지 — AI 공시 의무 준수

#### 라우트별 error boundary 확장
- `src/app/archive/error.tsx` + `src/app/codex/error.tsx` 신규
- 7개 라우트 일관성 (root / studio / translation-studio / code-studio / network / archive / codex)

#### 번들 최적화 (2단계)
- `/studio`: 1,709 KB → 644 KB (-62%)
  - `StudioShell` dynamic ssr:false + `DirectorPanel` / `EngineDashboard` / `GlobalSearchPalette` / `ShortcutsModal` lazy
- `/archive`: 700 KB → 645 KB (-7.9%)
- `/network`: 724 KB → 668 KB (-7.7%)
- 전 라우트 645~715 KB 구간으로 수렴 (심사 관점 일관성 확보)

#### 인체공학 자가 진단 62→100점
- `src/lib/ime-guard.ts` 신규 — 한글/일본어/중국어 조합 중 Tab 제안 보호
- ProseMirror `max-width: 68ch` + `caret-color: amber`
- `prefers-contrast: less` 블록 추가
- StatusBar: 'DGX 128GB' / 'Qwen-32B' → '로컬 AI' / 'Local AI' (엔지니어 지표는 개발자 모드에서만)
- `docs/design-principles.md` — 세 기둥(장기 체류·인체공학·작가가 주어) + R1~R8, R11

#### Draft + Detail 2-stage 집필 플로우 (Phase 1~3, flag-gated)
- `src/engine/pipeline-constants.ts` — `DRAFT_TARGET_CHARS` / `DETAIL_TARGET_CHARS` / 플랫폼별 `PLATFORM_DRAFT_OVERRIDE` 8개
- `src/lib/feature-flags.ts` — `FEATURE_DRAFT_DETAIL_V2` (off/shadow/on 3-mode)
- `DetailPassButton` + `DetailPassPreviewModal` — Accept/Edit/Reject 3-action, `useFocusTrap` WCAG 2.1 AA
- Settings 고급 탭에서 opt-in

#### DGX 인프라 전환 (2026-04-20)
- vLLM 단일 서빙(8001) + Qwen 3.6-35B-A3B-FP8 MoE 128GB 최적화
- `SPARK_GATEWAY_URL` / `VLLM_MODEL_ID` 환경변수 기반 구동
- 레거시 9B 쌍포 + Nginx LB(8090) 구조 폐기
- `stripEngineArtifacts` 강화 — Qwen 3.6-35B `<think></think>` / "Final Output:" 마커 5종 누출 패턴 대응

#### 입력 방어 + API 본문 캡
- `/api/network-agent/search` — 8KB body_too_large (413) + 500자 query_too_long (400)
- `PlanetEditClient` tagsText/repTagsText `maxLength` 200/120 추가
- `NetworkAgentSearchClient` query `maxLength=500` (서버 상한 일치)

#### 번역 사전 JP/CN 시드
- 각각 40 entries — `LANGUAGE_PURITY_SUPPORTED` → `{KO,EN,JP,CN}`
- `IDENTITY_SEAL` 4-way 반영

#### QA 인프라 (E2E Chaos)
- `e2e/scenarios/10-chaos-runtime.spec.ts` — 6 시나리오 Playwright 템플릿
  (전수 클릭 / 카오스 주입 / Race condition / Offline / Slow 3G / 저장 중 뒤로가기)

#### 카테고리 리포지셔닝 (랜딩)
- "소설 스튜디오" → "소설 IDE" (4언어)
- 히어로 숫자 배지: "통과 테스트 3,230 / 10,000회 카오스 × 0 유실 / 언어 4 / FMEA 20/20 방어"
- "준비 중" 유령 카피 2건 정직화

### Changed
- `ops-runbook.md` 신규 (1페이지, 7섹션) — SLA + 6 장애 시나리오 5분 대응 + 3-Tier 백업
- `opengraph-image.tsx` alt / footer strip 집필 IDE 포지션으로 일관화
- 테스트 2,331 → **3,304 passing** (298 suites) — E2E Chaos + Draft Detail + Detail Pass + 기타 신규 18+건 테스트
- lighthouse / axe setup 추가 (`scripts/lighthouse-check.mjs`, `@axe-core/react` devDep)

### Removed
- `/api/spark-stream` Edge 프록시 (SSE 직결 전환으로 불필요)
- `AIPhaseIndicator` (TTFT 0.13초로 단계 pill 불필요)
- 레거시 routing 상수 (`SPARK_HEAVY_URL` / `ROLE_ENGINE_MAP` / `getModelForRole()` 등)

### Verification
- 테스트: **3,304 passing** / 298 suites
- 타입: **0 errors** (strict)
- Lighthouse A11y: **100/100** × 5 페이지
- 마일스톤 태그: M1~M8-COMPLETE-2026-04-20, v2.2.0-alpha, v2.2.0-alpha.1

---

## [2.1.3] — 2026-04-19

### Changed — UX 감사 S등급(951/1000) 진입
- **NOA 인격 통일** (51+건) — UI 전면 "AI" → "NOA" (인격화 조력자)
  - 유지 예외: 외부 공급자 BYOK(Gemini/Claude/OpenAI) · Stability AI 고유명 · 백엔드 AI 모델 맥락
  - 통일 범위: 번역 파일 4종(KO/EN/JP/CN) + 11 컴포넌트 (WritingTab, AuditPanel, TerminalPanel 등)
- **연령 등급 각국 표준 용어화** — "PRISM-MODE" UI에서 제거
  - KO: 연령 등급 (방심위 / 전체이용가·15세이용가·청소년이용불가)
  - EN: Content Rating (ESRB/MPAA 병기)
  - JP: 年齢区分 (CERO 기반)
  - CN: 内容分级
  - 버튼 순서 재배치: OFF → ALL(안전) → T15 → M18(자유) → FREE(NOA 자율) → CUSTOM
  - "기록됨/미기록" 배지 추가 — 면피 증거 가시화 (AI 프롬프트·Export·EPUB 기록 명시)
- **prismMode ↔ ContentRating 단일 소스 통합**
  - `derivRatingFromPrism()` — prismMode → ContentRating 자동 파생
  - `getEffectiveRating()` — 파생 우선 + localStorage 수동 선언 fallback
  - Export 3곳 일괄 전환 (EPUB manifest · DOCX 파일명 · AI 고지)
- **UX S등급 달성** (업계 표준 6 프레임워크, 951/1000, 이전 782 대비 +169)
  - Nielsen 278/300, WCAG 240/250, Web Vitals 78/100, Readability 141/150, IA 86/100, Mobile 93/100
- **Progressive Disclosure 완성** — WritingTab 기본 2모드(AI/Edit), 고급 3모드(Canvas/Refine/Advanced) 조건부 토글
- **Design System v8.0 강제** — raw Tailwind red/blue 704건 일괄 시맨틱 토큰 치환 (118 파일)

### Added
- **`docs/manifesto.md`** — 철학 원본 문서 (2 기둥 + 15 선언 + 4언어 카피 라이브러리, 247줄)
  - 카테고리 선언(하라 시장 유일) + 자유-책임 합의 + 15 UI 적용 위치 매트릭스
- `F9` 단축키 — 집필 에디터 미니맵 토글 (VSCode 유사)
- "고급 모드 3종 더 보기" 4언어 링크 — Progressive Disclosure UX

### Fixed
- Footer 앱 경로(`/studio`, `/translation-studio`, `/code-studio`, `/welcome`, `/network`)에서 null 리턴 — 집필 몰입 방해 해소
- 연출 탭 제목 "규칙집" → "연출" 4언어 통일 (독 탭과 일치)
- 참고 패널 aria-label "연출 참고" → "참고 패널" 단순화
- StatusBar 폰트 9-11px → 11-12px, h-6→h-7 (WCAG 본문 기준 충족)
- NovelEditor `font-family` CJK 우선 — `var(--font-document), Georgia, Times, serif`
- NovelEditor `line-height` 2.0 → 1.75 (Readability 최적 1.6~1.8 구간)
- WritingTab Advanced 모드 raw amber-500/orange-500 → accent-amber 통일

### Removed
- `origin/123` 브랜치 (2026-04-14 중단 vLLM 실험)
- 10개 Dependabot 자동 생성 브랜치 (필요 시 재생성)

## [2.1.2] — 2026-04-17

### Changed — DGX 인프라 전환
- **단일 게이트웨이 일원화**: 모든 백엔드 트래픽을 `https://api.ehuniverse.com`으로 통합
  - `/v1/chat/completions` → Nginx LB(8090) → Engine A/B 자동 분산
  - `/api/rag/*`, `/api/image/generate` → RAG API / ComfyUI
- **Qwen 3.5-9B FP8 듀얼 엔진 전환** — 기존 32B+1.5B Speculative Decoding 폐기
  - Engine A(8080): 메인 집필 / Engine B(8081): 번역·요약
  - TTFT 0.13초, 18-20 tok/s 실측
- **SSE 직결 전환** (Cloudflare Tunnel 관통)
  - 게이트웨이의 `: heartbeat` 코멘트 선행 + aiohttp 스트리밍으로 520/502 해결
  - 브라우저·서버 모두 직결 경로 사용, 진짜 SSE passthrough
- **`/api/spark-stream` Edge 프록시 폐기** — non-stream 청크 체이닝 + 타자기 폴백 제거 (373줄 순감소)
- **`AIPhaseIndicator` 컴포넌트 폐기** — SSE 직결 TTFT 0.13초로 단계 pill 불필요

### Removed — 라우팅 부채 전수 청산
- `SPARK_HEAVY_URL` / `SPARK_FAST_URL` / `SPARK_UNIFIED_URL` 중복 export 제거
- `ROLE_ENGINE_MAP` / `getServerUrlForRole` / `getServerUrlForModel` / `getFallbackUrl` 제거
- `MODEL_WRITER` / `MODEL_PLANNER` / `MODEL_ACTOR` / `MODEL_GENERAL` 상수 삭제
  → 전 호출 지점을 `VLLM_MODEL_ID` (`'/model'`)로 일괄 교체
- `getModelForRole()` → `VLLM_MODEL_ID` 직접 사용으로 대체
- `_singleSparkRequest` 데드 코드(70줄) 제거
- `noa:ai-phase` CustomEvent dispatch 로직 제거

### Added
- **GitHub PAT 친절 가이드** (`SettingsView.tsx`) — 처음 사용자 30분 → 1분 축소
  - 3단계 펼침식 안내 (가입 → 토큰 생성 → 붙여넣기)
  - 원클릭 프리셋 URL: `github.com/settings/tokens/new?scopes=repo&description=로어가드`
  - 4개 언어 (ko/en/ja/zh) 전체 번역
  - 🔒 "브라우저에만 저장, 서버 전송 안 됨" 신뢰 안내

### Fixed
- SSE 파서 `:` 코멘트 라인 명시 스킵 (`sparkService.ts` heartbeat 대응)
- DGX 주석 최신화 — "별도 프록시 불필요, SSE 직결 관통"

## [2.1.1] — 2026-04-17

### Added
- 로어가드 (Loreguard) 브랜딩 — 제품명 통일
- 창작→번역→출판 파이프라인 (Studio → Translation Studio 자동 연결)
- 원고 완성 감지 번역 CTA 토스트
- 마지막 세션 자동 복원 (`noa_last_project_id` / `noa_last_session_id`)
- 모바일 전용 스케치 뷰 (세계관/캐릭터/플롯 3탭)
- `MobileDesktopOnlyGate` (PC 전용 기능 모바일 유도)
- `AuditInvoice` 패널 등록 + `intent-parser` 연결
- `apply-guard` / `snapshot-manager` / `tier-registry` 런타임 연결

### Changed
- Feature Flag 기본값 재조정
  - `SECURITY_GATE`: false → true (상용 기본 활성)
  - `GITHUB_ETAG_CACHE`: false → true
  - `ARI_ENHANCED`: false → true
  - `MULTI_FILE_AGENT`: false → true
  - `GITHUB_SYNC`: false → true
  - `CLOUD_SYNC`: true → false (Firestore 과금 리스크 차단)
- 집필 탭 고급 드롭다운 호버→클릭 토글 (터치 접근성)
- `window.confirm` / `window.alert` 13건 → `showConfirm` / `showAlert` 통일
- 텍스트 하한 13px 적용 (83건)
- 터치 타겟 44px 적용 (10건)
- Sentry DSN 환경변수화

### Fixed
- Tab 인라인 자동완성 401 (Authorization 헤더 추가)
- GitHub 역동기화 (`repoFilesToConfig` 연결)
- Studio 설정 주입 파이프라인 43% 누락 복구
- `handleRegenerate` 품질 파이프라인 복구
- `exportDOCX` manuscripts 우선 사용
- 138건 ja/zh 번역 한국어 혼입 정리
- `OPEN_BETA` 안전 가드 (`STRIPE_SECRET_KEY` 감지)
- Stripe `apiVersion` 가짜값 제거

### Security
- `/api/structured-generate` Firebase JWT 인증 게이트
- `/api/analyze-chapter` Firebase JWT 인증 게이트
- `/api/image-gen` local-spark 우회 방어
- `/api/code/autopilot` JWT + 실측 시간
- `/api/github/token` origin 엄격 비교
- `/api/share` Firestore 영속화

## [2.1.0] — 2026-04-14

### 소설 IDE 아키텍처 전면 구현 (7-Phase)
- Phase 1: GitHub OAuth + Octokit 파일 CRUD (`github-sync.ts`, `useGitHubSync`)
- Phase 2: Markdown + YAML 직렬화 계층 (`project-serializer.ts`)
- Phase 3: Tiptap 블록 에디터 (`NovelEditor.tsx` — textarea 교체)
- Phase 4: 에피소드 파일 트리 UI (`EpisodeExplorer.tsx` — Volume 구조)
- Phase 5: 하이브리드 컨텍스트 3-Tier 명시화 (context builder)
- Phase 6: Git 브랜치 평행우주 (`BranchSelector`, `ParallelUniversePanel`, `BranchDiffView`)
- Phase 7: Tab 인라인 자동완성 (`InlineCompletion` Tiptap extension, `useInlineCompletion`)

### 연출탭 디자인 리웍
- 13탭 → 3섹션 (줄거리/분위기/캐릭터) + 고급 설정 접기 (`SceneSheet` 3-section rework)
- 10개 장르 프리셋 이모지+색상 그리드
- 에피소드별 씬시트 저장 (`EpisodeScenePanel` — 오른쪽 이력 사이드바)

### UX 직관성 대폭 개선 (45건)
- Git 용어 → 소설 용어 (branch→버전, main→본편)
- 독 13개→5개+더보기
- 인라인 리라이트 한글 라벨
- 고급 모드 5개 상황 프리셋 (전투/일상/고백/추격/대화)
- 품질 게이트→품질 검사 용어 순화
- 세계관 3단계 가이드 배너
- 씬 플레이어 시네마 모드 진입점
- Tab 자동완성 온보딩 힌트
- 프롬프트 예시 칩 (퀵스타트 + AI 입력)
- 20개 마이크로 폴리시 (빈 상태 메시지, 툴팁, 돌아가기 통일 등)

### 100개 기능 전수 개선
- 30건 수정 — 점수 평균 731→875+ 목표
- `WriterProfileCard`: 작가 프로필 카드 신규 추가

### i18n 번역 품질
- 일본어: キャラクターDNA→キャラクター特性, プロットツイスト→どんでん返し
- 중국어: 引擎先知→引擎顾问, 脏话→粗俗语言

### 린트 대청소
- eslint 917 → 0 에러
- rules-of-hooks 3건, exhaustive-deps 18건 수정
- TypeScript 0 에러, 빌드 Pass

### 인프라
- Gemini 데스크톱 마이그레이션 리버트 (618파일 복구)
- 번역 스튜디오 에디터 색 밸런스 (앰버/블루 톤 분리)
- DGX Spark 14B 단일 모델 통합 (다중 모델 하이브리드 폐기)

## [2.0.0] - 2026-04-13

### Added — Quill Engine Integration
- 224-rule catalog ported from local-code-studio (16 categories, CWE mappings)
- 4-layer verification engine (pre-filter → AST → TypeChecker → esquery)
- Deep Verify: 5th-order logic bug detection
- Pipeline upgraded: 8-team → 9-team (Quill non-blocking stage)

### Added — Scene Direction Overhaul
- Inline DirectionReferencePanel: [연출] [인물] [참고] 3-tab split view
- Character smart injection: activeCharacters → Tier 1 (full DNA) / Tier 2 (name+role only)
- Token savings: 3000 → 840 tokens (72% reduction)
- Scene sheet moved from chat to direction panel

### Added — Multi-Agent DGX Routing
- 4-model routing: writer(abliterated) / planner(r1) / actor(eva) / general(qwen)
- Task-based structured generation routing (characters→eva, items→r1)
- Genre temperature: 11 genres × 0.01 precision
- Writer profile: voiceFingerprint + skill-level differentiation

### Added — 90+ Score Upgrade (56 items)
- Phase 1-5: Theme auto-detect, token alert, focus management, print stylesheet
- Canvas 3-step mode, quality gate user controls, episode summary UX
- Network: feed recommendation, comment threading, planet templates
- EPUB cover image, DOCX heading styles, settlement roles

### Fixed — Precision Diagnostic (20 items)
- Retry callback binding, pipeline failure diagnostics
- HFCP NRG strategy injection, storage auto-cleanup
- Event listener/dispatch pairing verification
- Session restore failure notification

### Fixed — UX Audit (42 items)
- Delete confirmations on all destructive actions
- Modal stacking prevention (priority queue)
- 39 aria-label additions, sr-only screen reader text
- Color-coded guardrail indicators, metric tooltips

### Performance
- Global CSS transition: html * → interactive elements only (2-3x faster tab switch)
- 5 static tabs → dynamic import (bundle size reduction)
- will-change + contain:layout GPU hints
- Page transition: 0.28s → 0.18s

## [1.5.0] - 2026-04-13

### Added — DGX 진짜 SSE 스트리밍
- `sparkService.ts`: `stream:false` → `stream:true` 전환 — 첫 토큰 30초→0.05초
- SSE 실시간 파싱 + 프론트 SSE 즉시 포워딩 (zero-copy)
- 청크 이어쓰기 유지 (4000토큰/청크, 최대 4연타 = 16K)
- DGX 엔드포인트: `api.ehuniverse.com` (프로덕션) + `<DGX-SERVER-IP>:8000` (로컬 내부망)

### Added — 집필 몰입도 시스템
- 에디터 원고지 모드: `max-width: 65ch` + `text-indent: 1em` + `--editor-font-size` CSS 변수
- Zen 터널 비전: `[data-zen-dim]` opacity 0.25 + 강화된 amber glow (32px+64px)
- 타이핑 리듬: `not(:placeholder-shown):focus` 따뜻한 glow pulse
- `Ctrl+=` / `Ctrl+-` 글자 크기 조절 (12~28px)
- 세션 워드카운터: 상태바에 `+N자` 초록색 표시

### Added — 디자인 시스템 보강
- 터치 타겟 44px: `.ds-btn`, `.ds-input`, `.premium-button.sm`
- Optimistic UI: `BookmarkButton` 즉시 반영 + 실패 시 롤백
- CSS 유틸리티: `.ds-disclosure`, `.ds-icon-text`, `.ds-empty-state`, `.ds-labor-illusion`
- Vertical Rhythm: `--vr-unit: 8px`, `.eh-vr-1`~`.eh-vr-section`
- CLS 방어: `.eh-stable-height`, `.eh-contain-content`, 이미지 width/height 명시

### Fixed — AI 생성 버그
- `geminiStructuredTaskService.ts`: 사일런트 `fallback: []` → `throw Error` 전환
- 배열 JSON regex 추가 (`/(\[[\s\S]*\])/`) — DGX 응답 파싱 실패 해소
- `CharacterTab`/`ItemStudioView`: 실제 에러 메시지 표시 + retry 콜백
- `useStudioAI.ts`: `generationLockRef` 데드락 수정 — cancel/cleanup/120s 타임아웃 3중 방어

### Fixed — 라이트 모드 시인성
- OSDesktop 독/상단바: 하드코딩 amber-200~700 → 시맨틱 토큰 (`text-text-secondary` 등)
- `WorldAnalysisView`: textarea placeholder `rgba(255,200,50,0.3)` → `placeholder-text-tertiary`
- `WorldTimeline`: SVG fill 하드코딩 → CSS 변수 (`--color-text-primary` 등)
- 독 아이콘: `opacity-50` → `opacity-70`, `text-white/40` → `text-text-tertiary`

## [1.4.0] - 2026-04-11

### Added — 집필 스튜디오 OS 변환
- OSDesktop: macOS 스타일 독 + 상단 메뉴바 (`OSDesktop.tsx`)
- WindowTitleBar: 트래픽 라이트 + 탭 이름 표시 + 포커스 모드
- StudioStatusBar: 글자수/단어수/모드/에피소드/저장 상태
- Zen 모드: `body:has(textarea[data-zen-editor]:focus)` CSS 자동 숨김
- ReferenceSplitPane: 세계관/인물/설정집 3탭 참조 패널
- WritingContextPanel: 편집 모드 좌측 슬라이드 참조

### Added — 품질 분석 엔진
- `useQualityAnalysis`: 문단별 show/tell, 반복, 다양성, 밀도, 대사 비율 (5지표, 0~100점)
- `QualityGutter`: 미니 바 차트 + 약한 문단 클릭→점프
- `useContinuityCheck`: 캐릭터 이름 편집거리 1, 특성 모순, 시간대/장르 모순
- `ContinuityWarnings`: 인라인 경고 패널 (dismiss 가능)

### Added — AI 워크플로우 강화
- 재시도: 3회 + 지터 백오프 + Retry-After 헤더 연동
- 토큰 버짓 감사: 시스템 프롬프트 30% 초과 경고 이벤트
- 캐릭터 절삭 경고: 20명 초과 시 `noa:character-truncated` 이벤트
- `QualityGateAttemptRecord`: 시도별 등급/감독점수/태그/실패사유 이력
- 인라인 리라이트: 문맥 인식 (장르+캐릭터+주변 ±200자 주입)
- `useUndoStack`: 인라인 리라이트 50단계 Undo/Redo
- Ctrl+Shift+R: 인라인 리라이트 단축키
- VersionDiff 통합: 300자+ 변경 시 자동 스냅샷 + diff 뷰
- Firestore 클라우드 동기화: `CLOUD_SYNC` feature-flag, 3초 디바운스, onSnapshot
- `useStudioUX`: `noa:token-budget-warning` + `noa:character-truncated` 리스너

### Added — 코드 스튜디오 데스크탑 동기화
- `diff-guard.ts`: SCOPE/CONTRACT/@block 편집 경계 보호 (450줄)
- `apply-guard.ts`: diff-guard 래퍼, 코드 적용 시 자동 검증
- `intent-parser.ts`: 결정론적 의도→AST 제약 변환 (LLM 불필요)
- `design-transpiler.ts`: 외부 AI 코드 보안 필터 + 시맨틱 토큰 변환
- `calc-protocol.ts`: SCAN→VALIDATE→ROUTE→PLAN 4단계 프로토콜
- `tier-registry.ts`: Ultra/ProPlus/Standard/Lite 4-Tier 오케스트레이션
- `AuditInvoice.tsx`: NOA-AGI 실행 명세서 UI
- `deploy-logic.ts` + `git-logic.ts`: 패널별 로직 분리

### Fixed
- 아이템 스튜디오: SF 하드코딩 색상(emerald/cyan) → 시맨틱 토큰 전수 교체
- 캐릭터 데이터베이스: 연보라 rgba(141,123,195) 28개소 → 시맨틱 토큰
- clip-path polygon SF 장식 → rounded-xl 일반 라운드
- InlineActionPopup: streamChat 호출 시그니처 수정 (StreamOptions 객체)
- useProjectManager: uid 파라미터 기본값 null 명시

### Changed
- 유니버스 아카이브: 히어로 헤더 + 카테고리별 테마 아이콘 + 등급 색상(PUBLIC/RESTRICTED/CLASSIFIED)
- 스플래시 화면: 단일 STUDIO CTA + "웹소설 집필 스튜디오" 정체성
- 설정집(Rulebook): 카드 대시보드 4그룹 리디자인
- NOA 브랜딩: AI→NOA 4개 언어 ~150건 치환
- 12점 디자인: skeleton-shimmer + hover-lift + button:active 마이크로 인터랙션
- 집필 모드 기본값: ai → edit (수동 집필 우선)
- feature-flags: `CLOUD_SYNC` 추가 (기본 비활성)

## [1.3.0] - 2026-04-06
### Added
- 436-rule dual catalog (224 bad + 212 good patterns) wired to generation + verification
- CRDT collaboration engine (7 PARTs, BroadcastChannel, IndexedDB persistence)
- Gen-Verify-Fix loop (adaptive 5-round, convergence detection)
- DatabasePanel: sql.js WebAssembly SQLite
- GitPanel: isomorphic-git real operations
- DeployPanel: build verification + ZIP export
- 51 panel registry fully wired + LUCIDE_MAP complete
- Good pattern detector (40 regex rules)
- Quality rules from catalog (context-aware, memoized)
### Fixed
- P0 security: sandbox nonce, Firebase tier, next.config route gap
- TODO regex: comment-only detection
- 4 failing tests fixed (theme, writing mode, genai-server)
### Changed
- Pipeline scoring: goodBoost 20, filterBonus 15, teamHealthBonus 5
- 7 simulated panels documented with JSDoc

## [2026-04-05] Quality Sweep + Design v8.0 + Content

### Added
- Design System v8.0 (3-Tier tokens, 16-rule linter, 5 presets, 4 UI primitives)
- 57 missing reports (total 80 KO+EN bilingual)
- Integration tests: 3 suites, 50 test cases (navigation, studio, code-studio)
- Security headers via next.config.ts headers()
- Simulation badges on CollabPanel/DatabasePanel/DeployPanel

### Fixed
- P0 security: PRO_LOCKED auth bypass, sandbox injection, eval, open redirect (24 fixes)
- P1 memory leaks: 8 fixes (AbortController, AudioContext, setTimeout cleanup)
- P1 race conditions: 2 fixes (getIdToken, user null guard)
- P1 input validation: 8 fixes (parseInt NaN, silent validation failure)
- Visibility: 56 dark-mode contrast fixes + 37 yellow→semantic amber
- Light mode: 2 contrast fixes (translator options, status bar)
- Theme switch: data-theme wrapper removal, dark mode inline vars
- Scroll to top on studio tab change
- React hooks violation in ArticleClient.tsx
- Upload route 500→400 on parse error

### Changed
- Language codes: JA→JP, ZH→CN across 53 files
- "AI 자동 생성" → "스튜디오 제안/초안 생성" (writer-friendly)
- "Narrative Workbench" → "Writing Workbench"
- Gemini 3.1 model support across 6 files

### Removed
- Dead code: rss-feed.ts, builders/index.ts, 3 fake E2E tests (-206 lines)
- middleware.ts (caused 404, replaced by next.config.ts headers)

## [1.3.0] - 2026-04-04

### Pipeline Merge — 40+ Feature Commits
- `claude/check-pipeline-cOffy` 브랜치 master 병합 (98파일, +8,387줄)
- 하네스 아키텍처, NOD 컨설턴트, 브라우저 API, 번역 시스템, 웹 피처 등

### Theme — Light Mode 전면 대응
- `@theme inline` → `@theme` — Tailwind CSS 4 런타임 변수 오버라이드 활성화
- JS inline style로 라이트 모드 변수 강제 (oklch 변환 우회)
- 소설/번역/코드 스튜디오 전체 100+ 하드코딩 다크 색상 교체
  - `bg-[#11100e]`, `bg-[#0d1117]`, `bg-black/*` → `bg-bg-primary/*`, `bg-bg-secondary/*`
  - `text-white/*` → `text-text-primary/*`
  - `border-white/*` → `border-border`
- 배지 라이트모드: classified/amber/allow/blue 4종 대응
- PlanningView: 30+ amber rgba 하드코딩 → Tailwind 토큰

### Dead Code Cleanup — 147 Files Deleted (-17,154 LOC)
- 76개 소스 파일 삭제 (5 broken + 15 AI + 17 editor + 29 features + 3 pipeline + 7 core)
- 66개 연관 테스트 파일 삭제
- 5개 백업 디렉토리/파일 삭제 (-3,659줄)
- 전수 grep 검증: 삭제 파일 import 깨짐 0건

### Harness 3-Core Upgrade (63% → 85%)
- **Spy 확장**: fetch → 6개 API (localStorage, sessionStorage, console.error, XMLHttpRequest, indexedDB)
- **Mutation 확장**: 4종 → 11종 연산자 (>=, <=, !==, ||, +, -, *, return false)
- **피드백 루프 연결**: `buildHarnessFeedback()` → `runHarnessLoop()` → AI 프롬프트 JSON
- **프로토콜 ID**: 6개 게이트 태그 (GATE-SPY/FUZZ/MUT/AST/BUILD/TEST)
- **타임아웃 가드**: `runWithTimeout()` 3초 제한 (while true 방어)
- **Fail-Fast**: `runMasterHarness()` 단일 진입점 — Gate1(정적 0.1s) → Gate2(린터 0.2s) → Gate3(동적 3s)

### UX Polish
- 모바일 헤더: 텍스트 크기/간격 조정, 저장 상태 sm:hidden
- 번역 스튜디오: API 배너 1줄 축약, 헤더 겹침 해결 (ZH/KO 2자 코드)
- 코드 스튜디오: `onQuickVerify` 데스크탑 레이아웃 연결 (이지모드 버그 수정)
- doc-header: 다크 gradient → `var(--color-surface-strong)` + 라이트 오버라이드

### Design System Polish
- `@theme` 토큰 확장: `--spacing-*` 6단계 + `--blur-*` 3단계
- border-radius: 11종 하드코딩 → 5단계 `var(--radius-*)` 스케일
- shadow: 하드코딩 rgba → `var(--shadow-panel/luxury)`
- transition: 18종 → 3단계 `var(--transition-fast/normal/slow)`
- backdrop-filter: 5종 → 3단계 `var(--blur-sm/md/lg)`
- focus ring: 3곳 분산 → 단일 `*:focus-visible` + glow
- hover 상태: ds-card-sm, ds-panel, zone-card 3개 추가

### Code Quality
- `@ts-ignore` 39건 → 0건 (proper type cast 교체)
- `@ts-expect-error` → `@ts-ignore` 일괄 전환 (실험적 브라우저 API)
- TODO/FIXME: 실제 1건만 존재 (나머지 106건은 감사 규칙 문자열)

### Security
- 시크릿 스캔: 실제 키 0건 (placeholder만)
- `.gitignore` 강화: +30줄 (*.key, *.p12, credentials, _backup, *.sql, tmp-*)
- 백업 파일 전수 삭제

### Stats
- 19 commits, 192 files changed
- +2,144 / -19,298 lines (net -17,154)

## [1.2.1] - 2026-04-01

### Bug Fixes — Resilience
- **Splash Screen**: `sessionStorage` 하이드레이션 블랙스크린 오류 수정 (try/catch 가드 추가)
- **Noa Tower**: `localStorage` 하이드레이션 오류 수정 (useEffect 이전)

### Optimizations — 10-Pass Audit
- **Noa Tower**: 10단계 전수 감사 및 수리 완료
- **UI/UX**: `SkeletonLoader`, `ErrorBoundary` 통합 및 Tailwind 4 최적화
- **i18n**: KO/EN/JP/CN 4개국어 완전 지원 및 사전 정밀화

## [1.2.0] - 2026-03-30

### Architecture — God Component Decomposition
- **WorldSimulator** 2,084줄 → 5파일 분리 (Shell + SimEngine + MapView + LanguageForge + types)
- **studio/page.tsx** 1,637줄 → 4파일 분리 (StudioShell + MainContent + RightPanel + wrapper)
- **globals.css** 1,511줄 → 5파일 분리 (base + components + studio + animations + utilities)
- **API routes** 3파일 헬퍼 추출 (chat, gemini-structured, structured-generate) — 순환 복잡도 50+ → ~20

### Layer Violation Fix
- **useAIProvider** 훅 생성 + 18개 컴포넌트 ai-providers 직접 import → 훅 경유 전환

### i18n — L4() Migration
- `lang === "ko"` 패턴 95건 → L4() 전환 (43파일)
- WorldSimulator 분리 파일 내 12건 추가 전환
- ai-providers.ts getModelWarning() 1건 전환
- 정당 스킵 28건 (boolean flag, locale selector, AppLanguage mapping)

### Testing — 대규모 확장
- 신규 테스트 **146 suites** 추가 (hooks 19, lib 19, code-studio 99, engine 6, E2E 3)
- 총 212 suites / 1,400+ tests (이전: 68 suites / 970 tests)
- hooks 테스트: useStudioTheme, useStudioUX, useStudioKeyboard, useCodeStudioComposer 등
- E2E 3 specs: navigation, studio-flow, code-studio-flow

### Audit Engine — 30→95 (S등급)
- eval 검출 오탐 수정 (RegExp.exec 제외, audit/lint 자기참조 제외)
- XSS 검사 audit:safe 어노테이션 지원
- 프로젝트 규모 비례 임계값 적용 (operations, feature-completeness, architecture)
- shim 파일 export* 카운트 제외, depth-2 디렉토리 카운팅

### Security & Performance
- API route 7개 REQUEST_TIMEOUT 추가
- API route 2개 요청 크기 검증 추가
- dangerouslySetInnerHTML 10건 audit:safe 어노테이션
- firebase dynamic import 대안 문서화
- 메모리 누수 cleanup (removeEventListener) 추가

### Cleanup
- `.next/` 5.6GB 빌드 캐시 삭제
- `7.0/` Python 게임 엔진 제거 (웹 참조 0건)
- docx 4개 + competitor-analysis.html git 추적 제거
- 완료된 작업 지시서 삭제
- .gitignore 강화 (*.docx, scripts/migrate-*)

## [1.1.0] - 2026-03-29

### Code Studio — Full Implementation
- **Panel Registry**: 40개 패널 레지스트리 기반 관리, dynamic import barrel
- **Verification Loop Engine**: 3회 검증 루프 (Pipeline + Bug Scan + Stress Test), 5 stop reasons, hard gate
- **Composer State Machine**: 7단계 전이표 + canTransition guard
- **Staging/Rollback**: 사람 승인 후 안전 반영, snapshot 기반 되돌리기
- **CSL 원본 UI/UX 적용**: ActivityBar, ResizeHandle, 하단 패널 스태킹, a11y skip link
- **EditorGroup**: 멀티 분할 편집 (split right/down, drag-drop, resize, Ctrl+1~4)
- **73/76 컴포넌트 연결** (3개 의도적 standalone)

### Reports Archive
- `/reports` 전용 페이지: 80개 보고서, 7종 서브카테고리, 등급 필터
- 아카이브/보고서 탭 네비게이션
- 랜딩 허브에 기밀보고서 카드 추가

### Novel Engine Fixes
- 인과율 검증(ruleLevel=2) 활성화
- 등급 스케일 통일 (director.ts ↔ scoring.ts)
- Director PART 번호 재정리, checkEndingMono 비한국어 방어
- PRISM 키워드 이중 toLowerCase 제거
- continuity-tracker lastIndex try/finally 보장

### Testing
- 115 new tests across 5 suites (composer-state, verification-loop, panel-registry, integration, safe-fix)
- CI coverage thresholds 상향 (50/60/60/60)
- Critical path test stage 추가

### Bug Fixes
- 초기 화면 깜빡임 수정 (3상태 splashState)
- Studio 모바일 사이드바 기본값 closed
- StudioChoiceScreen 데드코드 제거
- Network 에러/빈상태 분리 + 재시도
- 온보딩 API 키 모달 게이트 수정
- ESLint errors 0건
- rate-limit 코드/테스트/문서 정합화

### i18n
- CN 오번역 교정 8건
- JP/CN 미번역 보강
- 4개국어 구조 확장 (ArticleData jp?/cn? optional)
- 코드 스튜디오 8키 4개국어 추가

## [1.0.0] - 2026-03-25

First production release. 270 commits across 6 months of development.

### Core Platform
- **NOA Studio**: AI-assisted narrative workbench with 9 tabs (World, Characters, Rulebook, Writing, Style, Manuscript, History, Docs, Settings)
- **EH Network**: Community platform with planets, posts, comments, reactions, bookmarks, and reporting
- **Archive**: 109 bilingual (KO/EN) lore documents across 8 categories
- **Mini-Games**: Warp Gate Command + NOA Tower (native Next.js)

### AI Engine
- **ANS (Adaptive Narrative System) v10.0**: Story generation with tension curves, HFCP state tracking, and genre-specific presets
- **Multi-Provider Support**: Gemini, OpenAI, Claude, Groq, Mistral with automatic fallback on quota/rate-limit errors
- **NOA-PRISM v1.1**: Content rating and preservation/expansion control system
- **Token Guard**: Automatic context window management with per-model truncation
- **Server Proxy**: All API calls routed through `/api/chat` to prevent key exposure

### Internationalization
- Full 4-language support: KO, EN, JP, CN
- 14 global platform presets (KO 4 / EN 4 / JP 3 / CN 3)
- LangContext with type-safe language switching

### Infrastructure
- **CI/CD**: GitHub Actions + Playwright E2E tests
- **Deployment**: Vercel with Turbopack, ICN region
- **Storage**: IndexedDB primary + localStorage fallback + Google Drive sync
- **Auth**: Firebase Google Sign-In with Firestore security rules
- **Data Validation**: Server-side field size limits in Firestore rules

### Security
- API key obfuscation (`noa:1:` prefix, base64 encoding)
- Key health check button for migrating plain-text keys
- Firestore rules with data size guards (planets, posts, comments, reports)
- CSP headers configured in `next.config.ts`

### Studio Features
- Project-based session management with auto-save (500ms debounce)
- Guided/Free mode toggle for progressive disclosure
- Episode Jump: numbered session list with numeric navigation
- Export: TXT, JSON, EPUB, DOCX, Full Backup
- Import: JSON restore with project migration
- QuickStart: one-click world + character generation
- Inline Rewriter, Auto Refiner, Genre Review Chat
- Director Panel for manuscript analysis
- Continuity Graph visualization
- Keyboard shortcuts (F11 focus, Ctrl+S save, etc.)
- Light/Dark theme toggle
- Soft validation (visual warnings instead of hard blocks)

### Network Features
- Planet creation wizard (5-step: basics, cost structure, governance, rules, publish)
- NMF (Narrative Management Foundation) branding and guidelines
- Board types: FREE, OBSERVATION, SETTLEMENT
- Studio <-> Network bidirectional world import/export
- Visibility controls: public, members-only, private

### Performance
- N+1 query elimination with Firestore composite indexes
- Dynamic imports for heavy components (30+ lazy-loaded)
- Provider fallback without localStorage persistence (session-only)
- 64KB SSE buffer cap to prevent OOM
- Retry with exponential backoff (max 2 retries)

## [0.1.0] - 2025-09-15

Initial commit with bilingual archive and basic site structure.
