# Loreguard Studio — 팀 온보딩 가이드

**대상**: 신규 합류 엔지니어 (mid-level 가정)
**목표**: 1회 정독(60분) + 2회 재독(각 30분) = 코드 기여 시작 가능
**버전 기준**: v2.3.0-alpha (2026-04-25)
**최종 갱신**: 박길흠 / EH Universe — 22 commits in 2026-04-24~25

> 막히면 먼저 `docs/incident-response.md` · `docs/dgx-runbook.md` · `docs/unfixed-backlog.md` 순으로 보고, 그래도 안 풀리면 `gilheumpark@gmail.com` 으로 직접.

---

## 0. 30초 요약

```
무엇:    한국 웹소설·라이트노벨 작가용 AI 집필 IDE
누구:    박길흠 1인 운영 → 알파 작가 50명 → 베타 → 정식
어떻게:  Next.js 16 + React 19 + 자체 35B MoE (Qwen) + 6 BYOK
경쟁사:  Sudowrite · Novelcrafter · NovelAI (전부 영미·일본 우위, 한국 빈자리)
무기:    한국 장르 클리셰 + 번역 6축 + IP Guard 5계층 + 특허 출원 + AGPL/Commercial dual
배포:    Vercel (Hobby plan, icn1) + DGX 서버 (192.168 내부망, 한국)
```

알파 단계라 코드 회전 빠르고 실험적 구조 많음. 코드만 보고 판단하지 말고 CHANGELOG에서 "왜 이렇게 짰는지" 확인 권장.

---

## 1. 첫 30분 — 환경 설정

### 필수

- **Node.js 18+** (20 LTS 권장)
- **npm** (yarn 미사용)
- **Git**
- 추천 IDE: VS Code (TypeScript + ESLint + Tailwind CSS extensions)

### 클론 + 설치

```bash
git clone https://github.com/gilheumpark-bit/eh-universe-web.git
cd eh-universe-web
npm install            # 약 2~3분
```

### 환경 변수 (`.env.local`)

루트에 `.env.local` 생성. **최소** 키는 다음:

```bash
# Firebase (필수 — Auth + Firestore)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

# 사이트 URL (옵션, 기본 https://eh-universe.com)
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Vertex AI (서비스 계정 JSON 전체 — 한 줄로)
VERTEX_AI_CREDENTIALS={"type":"service_account",...}

# DGX 서버 (있으면)
NEXT_PUBLIC_SPARK_SERVER_URL=http://localhost:8001

# BYOK (옵션, 개발용)
GEMINI_API_KEY=...
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
GROQ_API_KEY=...
```

> Firebase 환경 변수 받기 → 박길흠한테 직접. 서비스 계정 JSON은 절대 commit 금지 (.gitignore 자동 제외).

### 실행

```bash
npm run dev               # http://localhost:3000
npm run build             # 프로덕션 빌드 검증
npx tsc --noEmit          # 타입 체크 (0 errors 목표)
npm run test              # jest 298 suites
npm run test:e2e          # Playwright (시간 걸림, 11분)
npm run lint              # ESLint
```

> 처음 dev 실행 시 SWC binary 다운로드로 1~2분 추가 소요.

### 검증 체크리스트

- [ ] `http://localhost:3000` 접속 → 랜딩 페이지 보임
- [ ] `/studio` 접속 → 로그인 게이트 (Firebase 인증)
- [ ] `/network` 접속 → 행성 카드 3개 (샘플)
- [ ] `npx tsc --noEmit` → 0 errors
- [ ] `npm run test -- --testPathPattern=lib` → pass

---

## 2. 첫 1시간 — 멘탈 모델

### 2.1 5 앱 구조

| 앱 | 경로 | 책임 | 진입점 |
|----|------|------|--------|
| **Universe** | `/`, `/archive`, `/codex`, `/reference`, `/rulebook` | 브랜드·아카이브·도구 (정적·검색) | `src/app/page.tsx` |
| **Studio** | `/studio` | 소설 집필 IDE (NOA 엔진, 7-Phase) | `src/app/studio/page.tsx` |
| **Code Studio** | `/code-studio` | 코드 생성 (CS Quill, 9팀 파이프라인) | `src/app/code-studio/page.tsx` |
| **Translation Studio** | `/translation-studio` | 소설 번역 (6축 채점) | `src/app/translation-studio/page.tsx` |
| **Network** | `/network` | 작가 커뮤니티 (행성 시스템) | `src/app/network/page.tsx` |

각 앱은 동일 Next.js 인스턴스 안에서 라우팅으로 분기. 데이터 모델은 일부 공유 (Firestore `users`, `planets`, `posts` 등).

### 2.2 핵심 개념 사전

코드를 이해하려면 다음 약어를 외워야 함:

| 약어 | 풀이름 | 위치 | 무엇을 함 |
|------|--------|------|---------|
| **NOA** | Narrative Operations Architecture | `src/engine/pipeline.ts` | Studio 집필 엔진. AI 호출·품질 게이트·연속성 검사 통합 |
| **ARCS** | AI Response Control System | `src/lib/ai/writing-agent-registry.ts` | 11 agent × 6 GuardId × 7 ContextBlockId 단일 레지스트리 |
| **IP Guard** | IP/저작권 방어 5계층 | `src/lib/ip-guard/` | L1 입력 → L2 retrieval → L3 prompt → L4 output → L5 n-gram |
| **Compliance 7축** | 7-axis quality scoring | `src/lib/compliance/axes/` | worldbook · character · direction · genre · scene-sheet · continuity · ip |
| **PRISM** | 콘텐츠 등급 모드 | `src/lib/content-rating.ts` | ALL / T15 / M18 / CUSTOM (성·폭·욕 3축) |
| **DGX Spark** | 자체 GPU 서버 | `scripts/deploy-dgx.sh`, `CLAUDE.md` | Qwen 3.6-35B-A3B-FP8 MoE (vLLM :8001) |
| **BYOK** | Bring Your Own Key | `src/lib/ai-providers.ts` | 사용자가 자기 OpenAI/Claude/Gemini 키로 호출 |
| **L4()** | 4-language i18n helper | `src/lib/i18n.ts` | `L4(lang, {ko, en, ja, zh})` → 현재 언어 문자열 |
| **CS Quill** | Code Studio 코드 검증 엔진 | `src/lib/code-studio/`, `src/cli/` | 224 룰 4-layer (pre-filter → AST → TypeChecker → esquery) |
| **L4Context** | Lang state | `src/lib/LangContext.tsx` | localStorage + cookie 양방향 |

### 2.3 데이터 흐름 — 사용자가 글 1줄 쓰면 무슨 일이 일어나나

```
[사용자 입력]
   ↓
src/components/studio/NovelEditor.tsx (Tiptap 블록 에디터)
   ↓
useInlineCompletion.ts (1.5초 멈춤 감지)
   ↓
fetch /api/complete (Firebase ID token + body)
   ↓
src/app/api/complete/route.ts
   ↓
buildSystemPrompt(language) — 한/영 분기
   ↓
streamSparkAI() OR ai-providers.ts (BYOK)
   ↓
DGX :8001 (Qwen 35B) OR 외부 API
   ↓
SSE 스트리밍 응답
   ↓
stripEngineArtifacts (영어 thinking 제거)
   ↓
NovelEditor 인라인 회색 텍스트로 노출 → Tab 누르면 수락
```

**중요**: AI 호출은 거의 다 `writing-agent-registry.ts` 의 `buildAgentSystemPrompt(id, ctx)` 를 통해 이루어짐. 새 AI 호출 추가할 때 직접 프롬프트 짜지 말고 레지스트리에 agent 추가.

### 2.4 라이선스 모델 (반드시 이해)

```
소프트웨어 (src/**, lib/**) → AGPL-3.0-or-later + Commercial dual
세계관 콘텐츠 (archive/codex/rulebook 본문) → CC-BY-NC-4.0 분리
이전 릴리스 (커밋 414fe9ea 이전) → CC-BY-NC-4.0 영구
```

**기여자 PR 시**: 자동으로 dual license 동의. CLA 인프라 (`cla-assistant.io`) 미연결 — 첫 외부 PR 도착 전에 박길흠이 등록 예정.

---

## 3. 1~3일차 — 자주 하는 작업 5선

### 3.1 새 페이지 추가

```typescript
// src/app/{경로}/page.tsx
"use client";  // 또는 server component

import { useLang } from "@/lib/LangContext";
import { L4 } from "@/lib/i18n";

export default function MyPage() {
  const { lang } = useLang();
  const T = (v: { ko: string; en: string; ja?: string; zh?: string }) => L4(lang, v);

  return (
    <main>
      <h1>{T({ ko: "제목", en: "Title", ja: "タイトル", zh: "标题" })}</h1>
    </main>
  );
}
```

**checklist**:
- [ ] 4언어 모두 작성 (ja/zh 임시 placeholder 도 OK)
- [ ] Server component 면 `"use client"` 빼고 `await` 가능
- [ ] 검색엔진 노출 페이지면 `src/app/{경로}/layout.tsx` 에 metadata 정의
- [ ] sitemap.ts 에 URL 추가 (4언어 alternates 자동)
- [ ] robots.ts 차단 영역 인지 (`/api`, `/studio`, `/translation-studio`, `/code-studio` 등)

### 3.2 i18n 문자열 추가

**원칙**: 모든 사용자 노출 텍스트는 `T({ko, en, ja, zh})` 형태로.

```typescript
// 짧은 문자열
{T({ ko: "저장", en: "Save", ja: "保存", zh: "保存" })}

// 긴 문구
{T({
  ko: "이용약관에 동의하고 회원가입을 진행합니다.",
  en: "I agree to the Terms of Service and proceed with sign-up.",
  ja: "利用規約に同意して登録を進めます。",
  zh: "同意服务条款并继续注册。",
})}
```

**금지**:
- `ja` / `zh` 에 `"... / English fallback"` 패턴 (오늘 8건 절단 사고로 학습됨)
- 빈 문자열 `ja: ""` 그냥 두기 (영문 폴백이 의도면 명시 주석)
- `T({ ko, en })` 처럼 ja/zh 생략 (`L4` 가 ko 폴백 하지만 score 떨어짐)

**현재 점수**: ko 10 / en 8 / ja 9.7 / zh 9.7 (목표 9.5+)

### 3.3 새 API 라우트 추가

```typescript
// src/app/api/{경로}/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getClientIp, checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { verifyCsrf } from '@/lib/csrf';
import { verifyFirebaseIdToken } from '@/lib/firebase-id-token';

export const runtime = 'nodejs';   // 또는 'edge'
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // 1. Rate limit (필수)
  const ip = getClientIp(req.headers);
  const rl = checkRateLimit(ip, '/api/my-route', RATE_LIMITS.default);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
  }

  // 2. Origin 체크 (mutating 라우트 필수)
  const origin = req.headers.get('origin');
  const host = req.headers.get('host');
  if (!origin || (host && new URL(origin).host !== host)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 3. CSRF (mutating + 사용자 데이터 변경 시)
  if (!verifyCsrf(req)) {
    return NextResponse.json({ error: 'CSRF token invalid' }, { status: 403 });
  }

  // 4. 인증 (사용자 식별 필요 시)
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Auth required' }, { status: 401 });
  }
  const decoded = await verifyFirebaseIdToken(authHeader.slice(7));
  if (!decoded?.uid) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  // 5. body 크기 + content 검증
  const contentLength = parseInt(req.headers.get('content-length') || '0', 10);
  if (contentLength > 100_000) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  }

  const body = await req.json();
  // ... 비즈니스 로직

  return NextResponse.json({ ok: true });
}
```

**참고 라우트** (좋은 예시):
- `src/app/api/share/route.ts` — rate limit + content cap + Firestore + in-memory fallback
- `src/app/api/user/export/route.ts` — DSAR 패턴 (rate + Origin + CSRF + auth)
- `src/app/api/stripe/webhook/route.ts` — webhook 시그너처 검증

### 3.4 AI 호출 추가 (writing-agent-registry)

직접 system prompt 짜지 말고 레지스트리 사용.

```typescript
// 1. 새 agent 등록
// src/lib/ai/writing-agent-registry.ts
export const WRITING_AGENT_REGISTRY = {
  // ...
  'my-new-agent': {
    role: '나의 새 에이전트 — 한 줄 설명',
    guards: ['no-english-thinking-korean-novel'],   // 6 GuardId 중 선택
    contextBlocks: ['character-dna', 'world-book'], // 7 ContextBlockId 중 선택
    promptBuilder: (ctx) => `시스템 프롬프트 본문...`,
  },
} as const;

// 2. 호출 측
import { buildAgentSystemPrompt } from '@/lib/ai/writing-agent-registry';
import { streamSparkAI } from '@/services/sparkService';

const systemPrompt = buildAgentSystemPrompt('my-new-agent', {
  characterDna: { ... },
  worldBook: { ... },
});

const stream = await streamSparkAI({
  system: systemPrompt,
  user: userInput,
  temperature: 0.7,
});
```

**왜 이 패턴**: 향후 prompt 감사 / IP guard 자동 주입 / temperature 표준화 / token budget 추적이 일괄 적용됨.

### 3.5 Firestore 읽기·쓰기

**클라이언트 사이드** (Studio 작가 데이터 같은 것):

```typescript
// 일반 firebase-js SDK 사용
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const docRef = doc(db, 'users', uid);
const snap = await getDoc(docRef);
```

**서버 사이드** (API 라우트, cron 등):

```typescript
// firebase-admin SDK 미설치 — REST API 사용
import { firestoreCreateDocument, firestoreListDocuments } from '@/lib/firestore-service-rest';

const result = await firestoreCreateDocument(projectId, 'collection', {
  name: { stringValue: 'foo' },
  count: { integerValue: '42' },
  createdAt: { timestampValue: new Date().toISOString() },
});
```

**Firestore Rules** (`firestore.rules`):
- 인증 + ownerId 매칭이 기본
- `users/{uid}` 는 role/id immutability (R1 권한 상승 방어, 2026-04-24 추가)
- 변경 시 `firebase deploy --only firestore:rules` (CLI) 또는 Console

---

## 4. 코딩 규칙 (NOA Rules 요약)

자세한 내용은 루트 `CLAUDE.md` 의 "NOA Rules" 섹션. 핵심만 발췌:

### 4.1 PART 구조 (100줄+)

```typescript
// ============================================================
// PART 1 — Imports & Types
// ============================================================
// (코드)

// ============================================================
// PART 2 — Helpers
// ============================================================
// (코드)

// ============================================================
// PART 3 — Main Component
// ============================================================
// (코드)
```

100줄+ flat 코드 금지. 300줄+ 최소 3 PART. 500줄+ 최소 5 PART.

### 4.2 3-Persona 검사 [C][G][K]

코드 편집 후 수령증 출력 (CLAUDE.md 강제):

```
[검사 적용]
- [C] None 가드 추가 (foo.tsx:23)        — 안전성
- [G] set 조회로 교체 (utils.ts:45)      — 성능
- [K] 미사용 import 제거 (types.ts:3)    — 간결성
```

우선순위: **안전성 [C] > 성능 [G] > 간결성 [K]**.

### 4.3 파일 크기 게이트

`scripts/check-file-size.mjs`:
- 500 줄: WARN
- 800 줄: FAIL (CI 차단)
- 30개 grandfathered 파일 (점진 축소)

```bash
npm run check:size:ci      # CI에서 자동 실행
```

### 4.4 i18n 패턴 강제

```typescript
// O — L4 사용
{T({ ko: "...", en: "...", ja: "...", zh: "..." })}

// X — 하드코딩
<span>한국어 텍스트</span>

// X — fallback 패턴 (오늘 사고)
ja: "日本語テキスト / English fallback"
```

### 4.5 보안 원칙

- API 키 등 secret은 `process.env` 만, 절대 클라이언트 코드에 포함 금지
- `dangerouslySetInnerHTML` 사용 시 반드시 escape (JSON-LD 케이스 참고)
- `eval`, `new Function`, `child_process` 금지 (CLI는 예외)
- API 라우트는 Origin + rate limit 필수 + 필요 시 CSRF + auth

---

## 5. 배포

### 5.1 자동 (master push → Vercel)

```bash
git push origin master
# Vercel webhook → 자동 빌드 → production
# 5~10분 후 https://eh-universe.com 반영
```

**확인**: `https://vercel.com/gilheumpark-bits-projects/eh-universe-web/deployments`

### 5.2 수동 (Vercel CLI)

자동 배포 실패 시:

```bash
npx vercel whoami         # 인증 확인
npx vercel --prod --yes   # 즉시 production 배포
```

### 5.3 DGX 서버 (AI 추론)

별도 머신. 자세한 내용 `docs/dgx-runbook.md` 참고.

```bash
# DGX 서버 SSH 접속 후
bash scripts/deploy-dgx.sh
# vLLM :8001 (Qwen 35B MoE) 단일 엔진 기동
```

### 5.4 함정 (오늘 사고 사례, 2026-04-24)

**vercel.json 수정 시 plan 제약 사전 확인 필수**:

```json
// X — Hobby plan 멀티 리전 금지
{ "regions": ["icn1", "hnd1"] }

// O — Hobby plan 단일 리전
{ "regions": ["icn1"] }
```

위 실수로 23시간 동안 silent fail (UI에 ERROR 도 안 남음). push 후 deployments 마지막 timestamp가 갱신됐는지 즉시 확인 권장.

```bash
# push 후 5분 내 확인 명령
git log -1 --format="%H %s"
# Vercel deployments API 또는 대시보드에서 동일 SHA 확인
```

---

## 6. 보안 핵심 (오늘 fix 16 건 + Mythos 8건)

### 6.1 CSRF Double-submit
- `/api/csrf` 엔드포인트 → token 발급 → cookie + JS 메모리
- mutating 라우트 모두 `X-CSRF-Token` 헤더 검증 (`verifyCsrf`)
- SameSite: Strict 으로 cross-site 차단

### 6.2 Rate Limit
- `src/lib/rate-limit.ts` 전역 Map (per-instance)
- preset: `chat 30/min` · `imageGen 10/min` · `default 60/min` · `upload 24/min`
- DSAR 5/day · 3/day per IP

### 6.3 CSP 화이트리스트
- `next.config.ts` `img-src` / `connect-src` 명시 화이트리스트
- 새 외부 도메인 추가 시 env `CSP_EXTRA_IMG_SRC` 또는 `CSP_EXTRA_CONNECT_SRC`
- code-studio 만 `unsafe-eval` 허용 (webcontainer)

### 6.4 Sentry PII Scrubbing
- `sentry-scrub.ts` — sk-/AIza/Bearer/email/card/private_key 6 정규식
- 4 민감 헤더 (authorization·cookie·x-api-key·x-auth-token) redact
- 분석 동의 (`hasAnalyticsConsent()`) 없으면 Sentry 자체 비활성

### 6.5 IP Guard L1-L5
| 계층 | 시점 | 모듈 |
|------|------|------|
| L1 입력 차단 | 사용자 input / network ingest | `brand-blocklist.ts` + `scan.ts` |
| L2 Prompt 회피 | LLM 호출 전 prompt 주입 | `compliance-axis-7.ts` |
| L3 사후 유사도 | 생성 후 n-gram | `ngram-similarity.ts` |
| L4 개인 블록리스트 | localStorage 작가별 | `codex-blocklist.ts` |
| L5 RAG sanitize | RAG 응답 | `ragService.ts` |

---

## 7. 막힐 때 (FAQ + 트러블슈팅)

| 증상 | 1차 진단 | 2차 진단 |
|------|---------|---------|
| 빌드 실패 | `npx tsc --noEmit` | `next build` 로그 확인 |
| 테스트 깨짐 | 단일 파일 격리 `jest <path>` | `git diff` 회귀 의심 |
| 배포 안 됨 | `vercel deployments` 마지막 timestamp | vercel.json plan 제약 |
| AI 응답 이상 | DGX 서버 살아있나? `curl :8001/v1/models` | BYOK fallback 작동 (`dgx-models.ts`) |
| Firestore read 403 | `firestore.rules` deploy 됐나 | service account 권한 |
| 한국어만 노출됨 | cookie `eh-lang` 설정 안 됨 | Accept-Language 헤더 확인 |
| Sentry 안 들어옴 | `NEXT_PUBLIC_SENTRY_DSN` env 설정 | cookie `eh-cookie-consent` = "accepted" |
| OG image 한국어만 | 캐시 문제, Facebook Sharing Debugger 로 무효화 | 빌드 시각 vs 마지막 commit |

---

## 8. 어디서 뭘 찾나 (참조 인덱스)

### 결정·이력
- `CHANGELOG.md` — 모든 릴리스 기록 (Keep a Changelog 형식)
- `docs/unfixed-backlog.md` — 미수리 항목 추적

### 인프라·설정
- `CLAUDE.md` — NOA Rules + 인프라 + 모델 (사용자/AI 통합 가이드)
- `AGENTS.md` — 5앱 구조 + ARCS + 패치 노트
- `next.config.ts` — CSP + headers + redirects
- `vercel.json` — 배포 설정 (single region)
- `firestore.rules` — DB 보안 규칙

### 운영·트러블슈팅
- `docs/incident-response.md` — S0~S3 장애 대응 + 롤백
- `docs/dgx-runbook.md` — DGX 서버 배포·헬스·장애
- `SECURITY.md` — 취약점 신고 절차

### 라이선스·법무
- `LICENSE` — AGPL-3.0 전문 + EH 헤더 (720줄)
- `COMMERCIAL-LICENSE.md` — 상업 라이선스 5 티어
- `CONTRIBUTING.md` — 기여 가이드 + dual grant + CLA 계획

### 기술 핵심 모듈
- `src/engine/pipeline.ts` — Studio 집필 엔진 (NOA 코어)
- `src/lib/ai/writing-agent-registry.ts` — 11 agent 단일 레지스트리
- `src/lib/ip-guard/` — IP Guard L1-L5
- `src/lib/compliance/axes/` — 7축 채점
- `src/lib/code-studio/` — Code Studio 6 directory
- `src/lib/csrf.ts` · `src/lib/consent.ts` · `src/lib/rate-limit.ts` — 보안 코어
- `sentry-scrub.ts` — PII redactor

---

## 9. 알아두면 좋은 함정 / 의도된 비표준

### 9.1 middleware.ts 부재 (의도)
Next.js 16 라우팅 충돌 우려로 `middleware.ts` 미사용. CSP / 보안 헤더 모두 `next.config.ts` `headers()` 로 적용. `next/headers` 의 `cookies()`/`headers()` 는 RSC 안에서만 사용.

### 9.2 firebase-admin SDK 미사용 (의도)
번들 크기·초기 인증 지연 회피. 대신 `firestore-service-rest.ts` 에서 service account JWT 로 REST API 호출. 단점: Firebase custom claim (`stripeRole` 등) 갱신 못 함 — Stripe webhook이 `[TODO]` 상태인 이유.

### 9.3 DGX Cloudflare Tunnel 차단 중 (현황)
프로덕션에서 DGX 직결 불가. 알파 작가 50명 한정으로 BYOK 폴백 (lib/dgx-models.ts). WireGuard / Tailscale 도입 여부 unfixed-backlog 추적.

### 9.4 Hobby plan 단일 리전 (제약)
`vercel.json` `regions: ["icn1"]` 만 허용. Pro 플랜 업그레이드 후 `hnd1` 추가 가능. (2026-04-24 사고 학습)

### 9.5 영어 thinking 누출 방어 이중
35B MoE도 답변 전 "Thinking Process:" 영어 누출 발생. 서버 `NO_ENGLISH_THINKING_GUARD` + 클라이언트 `stripEngineArtifacts` 이중 방어. 새 AI 호출 추가 시 둘 다 적용 필수.

### 9.6 `_backup_*` 디렉토리 (.gitignore)
과거 작업 디렉토리. `.gitignore` 에 등록되어 무시. 커밋 시 실수로 포함 안 되도록 주의.

### 9.7 ja/zh fallback 패턴 금지
2026-04-24 perl regex 일괄 strip 사고로 학습. 이제 `ja: "日本語 / English"` 패턴 절대 금지.

---

## 10. 다음 단계 — 1주차 권장 학습 경로

### 1일차
- [ ] 환경 설정 + dev 실행 + 첫 페이지 보기
- [ ] CHANGELOG.md 최신 [2.3.0-alpha] 블록 정독 (왜 이렇게 짜였는지)
- [ ] `src/app/page.tsx` 랜딩 페이지 코드 읽기
- [ ] `src/lib/LangContext.tsx` + `src/lib/i18n.ts` 이해

### 2~3일차
- [ ] Studio 페이지 진입 + 작가 흐름 직접 사용해보기
- [ ] `src/engine/pipeline.ts` 정독 (NOA 코어, 700줄)
- [ ] `src/lib/ai/writing-agent-registry.ts` 11 agent 구조 이해
- [ ] 좋아하는 라우트 1개 골라서 코드 흐름 추적 (예: /api/share)

### 4~5일차
- [ ] 첫 PR 도전 — i18n 누락 1건 또는 작은 버그 수리
- [ ] 3-persona 검사 + 수령증 출력 패턴 익히기
- [ ] CHANGELOG에 entry 추가하는 흐름 익히기

### 1주 끝
- [ ] 5 앱 중 1개 선택해서 전체 코드 한 번 훑기
- [ ] `docs/incident-response.md` + `docs/dgx-runbook.md` 정독
- [ ] 박길흠과 30분 동기화 — 막힌 곳 / 의문점 / 다음 작업 협의

---

## 마무리

이 가이드는 **2026-04-25 기준 현황 스냅샷**. 코드베이스가 빠르게 변하므로 한 달 후에는 일부 정보가 stale 일 수 있음. 의심되면 항상 **CHANGELOG 최신 블록 + 해당 파일의 git blame** 우선 신뢰.

**막히면 묻는 게 빠르다**: gilheumpark@gmail.com 또는 GitHub Issues `question` label.

알파 단계 1인 운영 → 팀 합류는 정말 환영. 코드 짜다 막히는 부분이 곧 다음 개선의 단서.

---

*IDENTITY_SEAL: TEAM-ONBOARDING | role=신규 합류 멤버 가이드 | snapshot=2026-04-25 | reads=3-times-target*
