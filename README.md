# NOA Studio — EH Universe Web

한국 웹소설 전문 AI 집필 스튜디오. 세계관 설계부터 AI 초안 생성, 원고 관리, 비주얼 프롬프트까지 하나의 워크벤치에서 처리한다.

## Tech Stack

| 영역 | 기술 |
|------|------|
| Framework | Next.js 16.2 (App Router) |
| Language | TypeScript 5 |
| UI | React 19, Tailwind CSS 4, Lucide Icons |
| AI | Gemini, OpenAI, Claude, Groq, Mistral (BYOK) |
| DB | Firebase Firestore (EH Network) |
| Auth | Firebase Auth (Google SSO) |
| Export | EPUB / DOCX (브라우저 완결형, 외부 라이브러리 없음) |
| Engine | ANS 10.0 (장르 벤치마크, HFCP, 맥락 추적) |
| Test | Jest 30 (unit) + Playwright 1.58 (e2e) |
| Deploy | Vercel |

## Quick Start

```bash
npm install
npm run dev          # localhost:3000
npm run build        # production build
npm run lint         # ESLint
```

## Project Structure

```
src/
├── app/                        # Next.js App Router (29 routes)
│   ├── studio/                 # 메인 스튜디오 (page.tsx)
│   ├── network/                # EH Network 커뮤니티
│   ├── tools/                  # 독립 도구 7종
│   │   ├── galaxy-map/
│   │   ├── neka-sound/
│   │   ├── noa-tower/
│   │   ├── soundtrack/
│   │   ├── style-studio/
│   │   ├── vessel/
│   │   └── warp-gate/
│   ├── archive/  codex/  docs/  reference/  rulebook/  about/
│   └── api/
│       ├── chat/               # AI 스트리밍 프록시
│       └── gemini-structured/  # 구조화 생성 API
│
├── components/studio/ (44개)   # 스튜디오 UI 컴포넌트
│   ├── tabs/                   # 탭 컨테이너 8종
│   │   ├── WorldTab       CharacterTab     WritingTabInline
│   │   ├── StyleTab        ManuscriptTab    HistoryTab
│   │   └── RulebookTab    VisualTab
│   ├── SectionErrorBoundary    # 섹션별 에러 바운더리
│   ├── LoadingSkeleton         # 로딩 스켈레톤
│   ├── EmotionArcChart         # 감정 아크 그래프
│   ├── FatigueDetector         # 독자 피로도 감지
│   ├── RhythmAnalyzer          # 문장 리듬 분석
│   ├── AuthorDashboard         # 작가 대시보드
│   ├── ResourceView            # 캐릭터 + 관계 그래프
│   ├── VisualPromptEditor      # NOI 비주얼 프롬프트
│   └── ...
│
├── engine/ (19개)              # 서사 엔진
│   ├── pipeline.ts             # 스타일 파이프라인
│   ├── director.ts             # 감독 패널
│   ├── validator.ts            # AI 톤 검증 (50K 하드 리밋)
│   ├── hfcp.ts                 # 환각 제어
│   ├── scoring.ts              # 품질 채점
│   ├── continuity-tracker.ts   # 연속성 추적
│   ├── quality-gate.ts         # 품질 게이트 루프
│   └── auto-pipeline.ts        # 자동 파이프라인
│
├── hooks/ (8개)                # 커스텀 훅
│   ├── useStudioAI.ts          # AI 생성 (타임아웃 + 동시실행 잠금)
│   ├── useProjectManager.ts    # 프로젝트 CRUD
│   └── useStudioSession / Sync / Theme / Keyboard / Export / UX
│
├── lib/ (29개)                 # 유틸리티
│   ├── ai-providers.ts         # 멀티 AI 프로바이더 관리
│   ├── studio-types.ts         # 전체 타입 정의
│   ├── studio-translations.ts  # i18n (KO/EN/JP/CN)
│   ├── noi-auto-tags.ts        # NOI 일관성 태그 자동생성
│   ├── export-utils.ts         # EPUB/DOCX/TXT 내보내기 (순수 JS)
│   └── errors/StudioError.ts   # 타입 분류 에러 시스템
│
├── services/                   # 외부 서비스
│   ├── geminiService.ts        # Gemini 구조화 생성 (60s timeout)
│   └── driveService.ts         # Google Drive 백업
│
└── contexts/
    └── StudioContext.tsx        # 스튜디오 전역 상태
```

## Features

### Studio Tabs

| 탭 | 기능 | 등급 |
|----|------|------|
| 세계관 | 3-tier 세계관 설계, 문명 시뮬레이터, 세계관 분석, 타임라인, 지도 | Stable |
| 캐릭터 | 22필드 3-tier 캐릭터, 관계 그래프, 아이템/스킬/마법 체계 | Stable |
| 연출 | 씬시트, 고구마/사이다, 복선 관리, 텐션 커브, 장면 전환 | Stable |
| 집필 | AI 초안 생성 (5종 프로바이더), 캔버스 모드, 인라인 리라이터 | Stable |
| 문체 | 5축 슬라이더, DNA 카드 4종, 문장 리듬 분석, 프리뷰 비교 | Stable |
| 원고 | 원고 목록, 작가 대시보드, 감정 아크 그래프, 독자 피로도 감지 | Stable |
| 비주얼 | NOI 프롬프트 카드, 일관성 태그 자동생성, 이미지 생성 | Beta |
| 히스토리 | 프로젝트/세션 관리, 검색, 내보내기 | Stable |
| 설정 | API 키 (BYOK), 플랫폼, 언어, 테마 | Stable |

> **등급**: Stable = QA 통과, 프로덕션 사용 가능 / Beta = 핵심 동작 확인, 엣지케이스 미검증 / Experimental = 프로토타입

### i18n
한국어(KO), 영어(EN), 일본어(JP), 중국어(CN) 4개 언어 실시간 전환.

### Export
TXT, JSON, EPUB, DOCX — 외부 라이브러리 없이 순수 JS로 ZIP/EPUB/DOCX 생성.

---

## Resilience Architecture

### Error Boundaries (2계층)

```
ErrorBoundary (전역 — app 전체)
  └── SectionErrorBoundary (탭별 — 10개)
        ├── WorldTab        ├── StyleTab
        ├── CharacterTab    ├── ManuscriptTab
        ├── WritingTabInline├── HistoryTab
        ├── RulebookTab     ├── SettingsView
        ├── StudioDocsView  └── VisualTab
```

하위 컴포넌트 크래시 → 해당 섹션만 에러 + Retry 버튼, 나머지 앱 정상.

### Streaming Resilience

| 계층 | 타임아웃 | 방어 |
|------|---------|------|
| 서버 API fetch | 120s | `AbortSignal.timeout` |
| 클라이언트 AI 생성 | 180s | `AbortController` + `setTimeout` |
| 구조화 생성 | 60s | `AbortSignal.timeout` |
| 동시 실행 | ref lock | `generationLockRef` — 이중 호출 차단 |

### Storage Safety

| 기능 | 구현 |
|------|------|
| localStorage 안전 | 모든 접근 try/catch 래핑 |
| 용량 감지 | `getStorageQuotaPercent()` — 90% 초과 시 경고 |
| 백업 폴백 | IndexedDB 자동 백업 |
| API 키 보호 | XOR + Base64 난독화 (`noa:2:` 프리픽스) |

### Input Validation
- 모든 텍스트 입력에 `maxLength` 적용 (45건)
- 엔진 텍스트 50,000자 하드 리밋 (ReDoS 방어)
- SVG 차트 `role="img"` + `aria-label` 접근성

---

## Test Architecture

### Overview

```
┌─────────────────────────────────────────────────┐
│              Layer 1: Static Analysis            │
│         TypeScript + ESLint + Next.js Build      │
│                   29 routes                      │
└──────────────────────┬──────────────────────────┘
                       │
         ┌─────────────┼─────────────┐
         │             │             │
┌────────┴────────┐ ┌──┴──────────┐ ┌┴────────────────┐
│  Layer 2: Unit  │ │  Layer 3:   │ │  Layer 4:       │
│  Jest (13 files)│ │  E2E (2+13) │ │  Runtime Guards │
│                 │ │  Playwright  │ │  (code-level)   │
│  engine:        │ │             │ │                  │
│  · serialization│ │  studio:    │ │  ErrorBoundary   │
│  · pipeline     │ │  · load     │ │  SectionEB ×10   │
│  · scoring      │ │  · session  │ │  safe-storage    │
│  · validator    │ │  · tabs     │ │  useAsyncGuard   │
│  · hfcp         │ │  · i18n     │ │  AbortController │
│  · builders     │ │  · modal    │ │  maxLength ×45   │
│  · models       │ │  · export   │ │  ARIA labels     │
│  · types        │ │  · errors   │ │                  │
│                 │ │             │ │                  │
│  lib:           │ │  network:   │ │                  │
│  · migration    │ │  · landing  │ │                  │
│  · ai-providers │ │  · auth     │ │                  │
│  · errors ×2    │ │  · 404      │ │                  │
│                 │ │             │ │                  │
│  services:      │ │             │ │                  │
│  · driveService │ │             │ │                  │
└─────────────────┘ └─────────────┘ └──────────────────┘
```

### Layer 1 — Static Analysis

```bash
npm run build    # TypeScript 컴파일 + 번들링 + 정적 생성
npm run lint     # ESLint
```

### Layer 2 — Unit Tests (Jest)

```bash
npm test                  # 전체 실행
npm run test:watch        # watch 모드
npm run test:coverage     # 커버리지 리포트
```

**Config**: `jest.config.ts` — ts-jest, jsdom, `@/` alias

| 파일 | 대상 | 검증 |
|------|------|------|
| `engine/__tests__/serialization.test.ts` | 직렬화 | 설정 직렬화/역직렬화 무결성 |
| `engine/__tests__/pipeline.test.ts` | 파이프라인 | 슬라이더→프롬프트 변환 |
| `engine/__tests__/scoring.test.ts` | 채점 | 메트릭 계산 정확도 |
| `engine/__tests__/validator.test.ts` | 검증기 | AI 톤 감지, 품질 검증 |
| `engine/__tests__/hfcp.test.ts` | HFCP | 환각 신호 감지 |
| `engine/__tests__/builders.test.ts` | 빌더 | 프롬프트 빌더 출력 |
| `engine/__tests__/models.test.ts` | 모델 | 프로바이더별 메타데이터 |
| `engine/__tests__/types.test.ts` | 타입 | 런타임 타입 가드 |
| `lib/__tests__/project-migration.test.ts` | 마이그레이션 | 데이터 버전 업 |
| `lib/__tests__/ai-providers.test.ts` | AI 프로바이더 | 설정/전환 |
| `lib/__tests__/error-messages.test.ts` | 에러 메시지 | 분류 매핑 |
| `lib/__tests__/studio-error.test.ts` | StudioError | 에러 타입 분류 |
| `services/__tests__/driveService.test.ts` | 드라이브 | 암호화/백업 |

### Layer 3 — E2E Tests (Playwright)

```bash
npm run test:e2e              # Chromium 기반 E2E
npx playwright test --ui      # UI 모드
npx playwright show-report    # HTML 리포트
```

**Config**: `playwright.config.ts` — Chromium, localhost:3000, dev 서버 자동 실행

| 파일 | 시나리오 | 검증 |
|------|---------|------|
| `e2e/studio.spec.ts` | 8개 | 페이지 로드, 세션 생성, 탭 전환, 가이드/자유 모드, 언어 전환, 집필 모드 진입, API 키 모달, 내보내기 버튼, 콘솔 에러 |
| `e2e/network.spec.ts` | 5개 | 네트워크 랜딩, 섹션 표시, 비인증 리다이렉트, 로그 작성 인증, 잘못된 ID 폴백 |

### Layer 4 — Runtime Guards (Code-level)

코드에 내장된 방어 계층. 테스트 없이도 동작하는 안전장치:

| 가드 | 위치 | 역할 |
|------|------|------|
| `ErrorBoundary` | `app/studio/page.tsx` | 전역 크래시 캐치 |
| `SectionErrorBoundary` ×10 | 각 탭 래핑 | 섹션별 격리 |
| `safe-storage` | `lib/safe-storage.ts` | localStorage 예외 방어 |
| `useAsyncGuard` | `hooks/useAsyncGuard.ts` | 동시 실행 차단 |
| `AbortSignal.timeout` | API route, geminiService | fetch 무한 대기 방지 |
| `generationLockRef` | `useStudioAI.ts` | AI 생성 이중 호출 차단 |
| `maxLength` ×45 | InputArea, ResourceView, SceneSheet 등 | 입력 길이 제한 |
| `aria-label` | SVG 차트 컴포넌트 | 접근성 |

---

## Design System

**Figma**: [NOA Studio Design System](https://www.figma.com/design/g6NvpEdpRGWv9rUFSWroqF)

### CSS Variables

| 토큰 | 값 | 용도 |
|------|-----|------|
| `--color-bg-primary` | `#070b11` | 메인 배경 |
| `--color-bg-secondary` | `#0f141c` | 카드/패널 |
| `--color-text-primary` | `#f5f0e8` | 본문 |
| `--color-text-secondary` | `#b5b0a8` | 보조 텍스트 |
| `--color-text-tertiary` | `#7e7a73` | 캡션/비활성 |
| `--color-accent-purple` | `#8b5cf6` | 주 액센트 |
| `--color-accent-amber` | `#f59e0b` | 보조 액센트 |
| `--color-accent-green` | `#22c55e` | 성공/확인 |
| `--color-border` | `#1e2530` | 테두리 |

### Utility Classes
`ds-card` `ds-btn-primary` `ds-btn-secondary` `ds-btn-danger` `ds-btn-ghost` `ds-input` `ds-label`

### Radius Scale
`sm(8) → md(12) → lg(16) → xl(24) → 2xl(32) → full`

---

## Scripts

| 명령 | 설명 |
|------|------|
| `npm run dev` | 개발 서버 (localhost:3000) |
| `npm run build` | 프로덕션 빌드 |
| `npm run lint` | ESLint |
| `npm test` | Jest 단위 테스트 |
| `npm run test:watch` | Jest watch 모드 |
| `npm run test:coverage` | 커버리지 리포트 |
| `npm run test:e2e` | Playwright E2E |

## NOA Rules

이 프로젝트는 `CLAUDE.md`의 NOA Rules v1.2를 따른다.

- **NOA-CORE**: 응답 운영 (언어 동기화, 톤 매칭, 반복 방지, 확신도 게이트)
- **NOA-EXEC**: 실행 규칙 (Preflight Plan, 3-Persona 검사, PART 구조, Terminal 검증, 수리 전략)
