# Unfixed Security / Hardening Backlog

**Snapshot date**: 2026-04-24
**Scope**: 외부 리뷰어 14+14 체크리스트 + Mythos attack chain 감사 후 "오늘 세션에 수리하지 않은" 항목 추적.
**Context**: 같은 날 16 커밋 (414fe9ea → c6a1ba38) 로 주요 18 건 중 11 건 수리 완료.
**Source-of-truth**: 이 파일 + `CHANGELOG.md [2.3.0-alpha] ### Security` 블록.

---

## Category A — 법무 / 외부 의존 (1건)

### A1. Legal content 변호사 리뷰 (P3)
**Files**: `src/app/privacy/page.tsx`, `src/app/terms/page.tsx`, `src/app/ai-disclosure/page.tsx`, `src/app/copyright/page.tsx`

**Gap**:
- 실제 법조문 적합성 (GDPR Art.13/14, K-PIPA §15, EU AI Act Art.52) 미검증
- 현재 4 페이지 존재 + 4언어 번역 완료, 구조적 섹션 포함. 내용 품질은 개발자 작성 수준.

**Required action**: 변호사 (KR 로펌 + EU counsel) 리뷰
**Estimate**: 외부 3~4주
**Priority**: 정식 출시 전 필수. 알파 단계에서는 disclaimer 로 완화 가능.

---

## Category B — 설계 선행 필요 (2건)

### B1. CSP nonce 도입 (C1, P1)
**File**: `next.config.ts:65` — `script-src 'self' 'unsafe-inline' ...`

**Gap**: `'unsafe-inline'` 가 여전히 script-src 에 있음. XSS 발견 시 1차 방어선 없음.

**Required action**:
1. Next.js 16 middleware 로 per-request nonce 생성 (`crypto.randomBytes`)
2. `headers()` 대신 middleware 에서 CSP 헤더 동적 설정
3. React 컴포넌트에 nonce 전달 (`async headers` 불가 — strict-dynamic 패턴 필요)
4. Next.js `__NEXT_DATA__` 인라인 스크립트 nonce 주입 확인 (공식 지원 여부 검증)

**블로커**:
- `CLAUDE.md` 에 "`middleware.ts` 는 Next.js 16 라우팅 충돌 위험" 명시. 선행 연구 필요.
- Next.js 16.2 에서 middleware 정상성 테스트 + fallback 전략 필요.

**Estimate**: 연구 1일 + 구현 0.5일
**Priority**: 베타 진입 전 권장 (SOC2 계열 감사 대비).

### B2. Firestore `/users/{uid}/public` 서브컬렉션 분리 (W1, P1)
**File**: `firestore.rules:105-125`

**Gap**: `allow read: if signedIn()` — 인증만 하면 모든 사용자 프로필 PII 조회 가능. 주석(`:105-106`)에 이미 자인.

**Required action**:
1. 데이터 마이그레이션 — 공개 가능 필드 (displayName, photoURL, bio 등) 를 `/users/{uid}/public/profile` 서브컬렉션으로 복사
2. PII 필드 (email, ip, lastLogin 등) 는 `/users/{uid}` 루트에 유지 + `allow read: if auth.uid == uid || isAdmin()` 로 제한
3. 클라이언트 read 코드 수정 — 공개 프로필 조회 경로를 서브컬렉션으로 변경
4. 롤아웃 중 이중 쓰기 기간 필요 (데이터 정합성)

**블로커**: 라이브 데이터 50+ 작가 얼리액세스 중이라 마이그 플랜 사전 검토 필수.

**Estimate**: 설계 0.5일 + 마이그 0.5일 + 쓰기 코드 수정 1일
**Priority**: 유료 베타 진입 직전.

---

## Category C — 별도 스프린트 (4건)

### C1. Lighthouse Performance 69~70 → 75+ (Perf, P2)
**Reports**: `docs/lighthouse-report.md`

**Gap**: 3 URL 중 3개 모두 threshold 미달. 주 원인 추정:
- 번들 크기 (Monaco + Tiptap + 25 언어 폰트 + 59 provider adapter)
- LCP (루트 홈페이지의 hero section)
- 스트리밍 ChatPanel / Studio 초기 렌더 비용

**Required action**:
1. `npm run build:analyze` → 번들 청크 크기 분석
2. Route segment 별 dynamic import 재검토
3. LCP 요소 preload + priority hint
4. Critical CSS 인라인 (Above-the-fold only)
5. Cold start 영향 (Vercel Edge) 개별 측정

**Estimate**: 1~2일 전력 집중
**Priority**: 정식 출시 전.

### C2. A11y `/` Lighthouse 96 → 100 (A11y, P2)
**Gap**: 최근 로컬 실측에서 `/` 페이지만 96점. `/studio`, `/translation-studio` 100점 유지.

**Required action**: Lighthouse audit JSON 상세 — 4점 감점 원인 (contrast, label, ARIA) 특정 후 패치.

**Estimate**: audit 30분 + 수리 30분
**Priority**: 알파 → 베타 전환 블로커 (A11y 100 유지 공약 있음).

### C3. CLI 레이어 strict TS 전환 (P3)
**Scope**: `src/cli/**`

**Gap**:
- `@typescript-eslint/no-explicit-any` 경고 144건
- `// @ts-nocheck` 직접 선언 34건
- 루트 `src/` 엄격화와 분리된 예외 구역

**Required action**: 파일별 any 치환 + nocheck 해제 + 타입 정의 보강. 이미 작동하는 코드라 테스트 커버리지 선행 필요.

**Estimate**: 1일+
**Priority**: 기술 부채. 외부 기여자 받기 시작할 때 블로커화.

### C4. `ShadowDiffDashboard.tsx` 738 → 500 줄 재분해 (P3)
**File**: `src/components/studio/settings/ShadowDiffDashboard.tsx`

**Gap**: 현재 738줄 (check:size:ci FAIL 임계 800 미만, WARN 임계 500 초과). Grandfathered list 에 포함됨 (점진 축소 정책).

**Required action**:
- PART 단위로 추가 3~5 파일 추출
- Props interface 노출 + 컴포지션 패턴
- 테스트 유지하며 리팩토링

**Estimate**: 4시간
**Priority**: 중 — 기능 영향 없음, 유지보수성 개선.

### C5. Grandfathered 800+ 줄 파일 축소 (상시)
**Policy**: `scripts/check-file-size.mjs` — 30 파일 예외. 신규 추가 금지, 기존 점진 축소.

**Required action**: 기능 개선 PR 때 해당 파일 포함되면 연계 분해. 단독 대형 리팩토링 PR 권장 안 함.

**Estimate**: 상시
**Priority**: 상시 — 마감 없음, 기능 개선 시 opportunistic.

---

## Category D — 사용자 도메인 (기술 외)

### D1. Sentry DSN Vercel 환경변수 바인딩
**Action**: Vercel 대시보드 Settings → Environment Variables → `NEXT_PUBLIC_SENTRY_DSN` 설정 (Production scope)
**Note**: 현재 code 는 env 필수, 미설정 시 Sentry 비활성. 프로덕션 에러 추적을 원한다면 필수.

### D2. Stripe webhook 시크릿 설정
**Action**:
1. Stripe Dashboard → Webhooks → Add endpoint
2. URL: `https://ehsu.app/api/stripe/webhook`
3. Events: `checkout.session.completed`, `customer.subscription.*`, `invoice.paid`, `invoice.payment_failed`
4. Signing secret → Vercel env `STRIPE_WEBHOOK_SECRET`
5. `STRIPE_SECRET_KEY` 도 env 에 설정 (Production scope)

### D3. CRON_SECRET 설정 (Preview + Production 모두)
**Action**: Vercel env → `CRON_SECRET` → Production + Preview 둘 다 scope (과거: Production only 였음)

### D4. firebase-admin SDK 도입 판단
**Background**: 현재 Firestore 접근은 service account JWT 기반 REST API. 많은 서버 작업에 충분하나 custom claim 설정·batch write 등은 firebase-admin 이 편함.
**Action**: 필요한 기능 정리 후 (Stripe tier 연동 시점) 도입. 의존성 10MB+.

### D5. CLA 인프라 준비
**Action**: `cla-assistant.io` 에 레포 등록 → GitHub App 설치 → 자동 PR 검사 활성화. 첫 외부 기여자 도착 전 완료.

### D6. 브릿G 작가 50명 얼리 액세스 모집 실행
**Action**: 모집 공고 게재 · 양식 수집 · 알파 초대 메일.

### D7. 모두의 창업 2026 제출
**Action**: 제출 양식 + 사업계획서 + MVP 데모 URL.

### D8. KIPO 출원 → PCT 국제 출원 연계
**Action**: 변리사 협의. 기간 18개월 내 PCT 시작 권장.

### D9. Feature flag 승격 판단
**Examples**: `CLOUD_SYNC` (Firestore 동기화) 등 현재 비활성 플래그. 사용자 도메인 결정.

### D10. EN 네이티브 카피에디터 발주 (외부 인간)
**Background**: ja/zh 는 9.7 달성했으나 EN 은 8.0 에 머무름. 원본 언어라 fallback 패턴이 없고, 개선 경로가 "네이티브 영어권 교정자의 관용구·article·legal English 다듬기"뿐.
**Scope**: terms · privacy · copyright · ai-disclosure 4 페이지 + landing
**Estimate**: Fiverr legal-en 등급 $100~200, turnaround 3~5 일
**Priority**: 베타 진입 전 권장 (알파에서는 이해도 통과로 충분).

### D12. Vercel Pro 플랜 업그레이드 판단
**Background**: Hobby plan 단일 리전 강제 (icn1). Hobby plan 멀티 리전 시도 시 silent fail (2026-04-24 사고). DR 위해선 hnd1 (도쿄) 추가 필요.
**Trigger**: 알파 작가 50명 안정 운영 + 베타 진입 단계
**Cost**: $20/month (Pro plan)
**Benefit**: hnd1 추가 / 더 긴 maxDuration / 동시 빌드 / 분석 데이터 보존
**Priority**: 베타 직전.

### D13. 모바일 viewport (360px / 414px) 자동 측정 — ✅ 2026-04-25 구현 완료
**Trigger**: 외부 코워크 평가 (2026-04-25) "모바일 압축 가능성" 지적
**Scope**: 5 핵심 공개 페이지 (`/`, `/about`, `/network`, `/codex`, `/changelog`)
**구현**: `e2e/scenarios/23-mobile-viewport.spec.ts` 신설
  · Pixel 5 + iPhone 13 emulation × 5 페이지 × 3 측정 = 30 케이스
  · 측정 1: horizontal overflow 0 (가로 스크롤 없음)
  · 측정 2: 페이지 title 정상 노출
  · 측정 3: 터치 타깃 44px+ (WCAG AAA / Apple HIG, ≤2 작은 타깃 허용)
**실행**: CI Ubuntu (Windows STATUS_ACCESS_VIOLATION 회피)
**상태**: spec 작성 완료, CI 실행 결과는 다음 PR push 시 자동 검증.

### D14. Lighthouse A11y `/` 96 → 100 (4점 갭) — 별도 audit 필요
**Trigger**: 2026-04-19 1ae61b24 로컬 측정 + 2026-04-24 cowork 보고
**현재 상태**: `/studio`·`/translation-studio` 100, `/` 96
**Blocker**: 라이브 측정 없이 정확한 4점 원인 못 찾음
**조치**:
1. 로컬 `npm run lh:check` 실행 (port 3001)
2. `docs/lighthouse-report.md` 의 `/` 페이지 audit JSON 분석
3. 주요 의심: color contrast (text-tertiary on bg-secondary), aria-label 누락 (logo SVG), heading hierarchy
4. 4점 원인 특정 후 1~3건 패치
**Estimate**: 1시간
**Priority**: 베타 진입 전.

### D15. "17 챕터 가이드" 정정 — ✅ 2026-04-25 검증 완료
**조사 결과**: 우리 README/AGENTS/landing 어디에도 "17 챕터" 표기 없음.
StudioDocsView 실제 카운트: 12 core + 7 polish = **19 챕터 / 4언어**.
"17 챕터"는 외부 cowork report 자체의 under-count.
**조치**: 우리 카피 변경 불필요. cowork 보고가 stale.

### D11. 라이브 배포 현지화 실측 검증
**Trigger**: 최신 Vercel 빌드 (3f3d8d87 이후) 프로덕션 반영 완료 후
**Tests**:
- `https://developers.facebook.com/tools/debug/` — OG image 4 variant (?l=ko/en/ja/zh) 캐시 무효화 + preview 확인
- `https://search.google.com/test/rich-results` — JSON-LD SoftwareApplication 스키마 통과
- `https://www.google.com/search?hl=en&q=site:ehsu.app` — SERP 에 영어 메타 노출 확인
- Screen reader (NVDA/VoiceOver) 로 `?lang=en` 페이지 접근 → html lang=en 적용 확인
- Chrome DevTools > Application > Manifest — name "Loreguard" · lang "ko" 표시
**Estimate**: 30 분 수동 QA
**Priority**: Vercel 빌드 완료 직후 즉시 실행.

---

## Progress Tracking

**수리 상태 (2026-04-24 최종, 커밋 3f3d8d87 기준)**:
```
총 식별 (초기):     22 건 (외부 리뷰 14+14 + Mythos 8, 중복 제거)
2026-04-24 수리:   20 건 (10 커밋)
                   · 6 커밋 (보안): 021161e4 + 5cf354d9 + bcc073c3 + 95654f6c + f1a611a3 + c6a1ba38
                   · 4 커밋 (i18n·SSR): e952e624 + 571033b5 + 2faa1a64 + 3f3d8d87
이 백로그 (미수리):  6 건 (A · B · C 각 카테고리)
외부 의존:          1 건 (A1 변호사)
사용자 도메인:      11 건 (D1~D11) — 오늘 세션 추가: D10 (EN native) + D11 (live deploy QA)

총 커밋 수 (2026-04-24 단일 세션):
  21 커밋 (2d273b77 → 3f3d8d87)
  분야: docs · security · i18n · infra · license · ops · audit
```

**오늘 세션 전수 영향 요약**:
- 보안: Mythos 8 공격 체인 + 외부 감사 14+14 = 16 건 수리
- 라이선스: CC-BY-NC → AGPL+Commercial dual 전환
- i18n: ja/zh 9.7 달성 + SSR 4언어 메타 + sitemap hreflang + manifest rebrand
- 인프라: /status · DR 리전 · runbook · consent · CSRF · DSAR · Stripe webhook
- 문서: CHANGELOG 5 섹션 + unfixed-backlog.md 신설 + incident-response.md + dgx-runbook.md

---

*IDENTITY_SEAL: unfixed-backlog | role=security-hardening-roadmap | snapshot=2026-04-24-final*
