# NOA Studio — EH Universe Web

![Tests](https://img.shields.io/badge/tests-910+-green)
![Coverage](https://img.shields.io/badge/coverage-60%25-yellow)
![Panels](https://img.shields.io/badge/panels-37-blue)
![Languages](https://img.shields.io/badge/i18n-KO%20EN%20JP%20CN-purple)

세계관 창작 + AI 집필 + 검증형 코드 스튜디오. 세계관 설계부터 AI 초안 생성, 원고 관리, 비주얼 프롬프트, 그리고 검증 파이프라인 내장 IDE까지 하나의 플랫폼에서 처리한다.

**3개 앱 구성**: NOA Studio (서사 엔진) / Code Studio (검증형 IDE) / EH Network (커뮤니티)

## Tech Stack

| 영역 | 기술 |
|------|------|
| Framework | Next.js 16.2 (App Router) |
| Language | TypeScript 5 |
| UI | React 19, Tailwind CSS 4, Lucide Icons |
| AI | Gemini, OpenAI, Claude, Groq, Mistral (BYOK) |
| DB | Firebase Firestore (EH Network) |
| Auth | Firebase Auth (Google SSO) |
| Code Editor | Monaco Editor (@monaco-editor/react 4.7) |
| Terminal | xterm.js (@xterm/xterm 6.0, @xterm/addon-fit) |
| Container | WebContainer API (@webcontainer/api 1.6) |
| Export | EPUB / DOCX (브라우저 완결형, 외부 라이브러리 없음) |
| Engine | ANS 10.0 (장르 벤치마크, HFCP, 맥락 추적) |
| Verification | Verification Loop (Pipeline + Bug Scan + Stress Test) |
| Panel Management | Panel Registry (37개 패널 동적 관리) |
| Test | Jest 30 (unit, 45 suites) + Playwright 1.58 (e2e) |
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
├── app/                           # Next.js App Router (28 routes)
│   ├── studio/                    # NOA Studio (서사 엔진)
│   ├── code-studio/               # Code Studio (검증형 IDE)
│   ├── network/                   # EH Network 커뮤니티
│   ├── reports/                   # 기밀 보고서 아카이브 (53건)
│   ├── tools/                     # 독립 도구 7종
│   │   ├── galaxy-map/  neka-sound/  noa-tower/  soundtrack/
│   │   ├── style-studio/  vessel/  warp-gate/
│   ├── archive/  codex/  docs/  reference/  rulebook/  about/
│   ├── world/[id]/                # 세계관 상세
│   └── api/
│       ├── chat/                  # AI 스트리밍 프록시
│       └── gemini-structured/     # 구조화 생성 API
│
├── components/
│   ├── studio/ (58개)             # NOA Studio UI 컴포넌트
│   │   ├── tabs/                  # 탭 컨테이너 8종
│   │   │   ├── WorldTab       CharacterTab     WritingTabInline
│   │   │   ├── StyleTab        ManuscriptTab    HistoryTab
│   │   │   └── RulebookTab    VisualTab
│   │   ├── SectionErrorBoundary   # 섹션별 에러 바운더리
│   │   ├── EmotionArcChart        # 감정 아크 그래프
│   │   ├── FatigueDetector        # 독자 피로도 감지
│   │   ├── RhythmAnalyzer         # 문장 리듬 분석
│   │   ├── AuthorDashboard        # 작가 대시보드
│   │   ├── ResourceView           # 캐릭터 + 관계 그래프
│   │   ├── VisualPromptEditor     # NOI 비주얼 프롬프트
│   │   └── ...
│   │
│   └── code-studio/ (77개)        # Code Studio UI 컴포넌트
│       ├── CodeStudioShell        # 최상위 쉘 (ActivityBar + EditorGroup + Panels)
│       ├── ActivityBar            # 좌측 아이콘 바 (CSL 원본 패턴)
│       ├── EditorGroup            # 멀티 분할 편집 (split/drag-drop/resize)
│       ├── ComposerPanel          # AI 코드 생성 + Composer State Machine
│       ├── PipelinePanel          # 8-Team 정적 분석 파이프라인
│       ├── ReviewCenter           # 코드 리뷰 + Staging/Rollback
│       ├── TerminalPanel          # xterm.js 기반 터미널
│       ├── ProblemsPanel          # 에러/경고 목록
│       ├── StatusBar              # 하단 상태 바
│       ├── CommandPalette         # Ctrl+Shift+P 커맨드 팔레트
│       ├── FileExplorer           # 파일 트리
│       ├── GitPanel / GitGraph    # Git 연동
│       ├── SearchPanel            # 전역 검색
│       ├── CollabPanel            # 실시간 협업
│       ├── CodeCreatorPanel       # 코드 크리에이터
│       └── ...
│
├── engine/ (22개)                 # 서사 엔진
│   ├── pipeline.ts                # 스타일 파이프라인
│   ├── director.ts                # 감독 패널
│   ├── validator.ts               # AI 톤 검증 (50K 하드 리밋)
│   ├── hfcp.ts                    # 환각 제어
│   ├── scoring.ts                 # 품질 채점
│   ├── continuity-tracker.ts      # 연속성 추적
│   ├── quality-gate.ts            # 품질 게이트 루프
│   ├── auto-pipeline.ts           # 자동 파이프라인
│   ├── shadow.ts                  # 그림자 상태 추적
│   ├── social-register.ts         # 사회 계층 레지스터
│   └── writer-profile.ts          # 작가 프로필 분석
│
├── hooks/ (17개)                  # 커스텀 훅
│   ├── useStudioAI.ts             # AI 생성 (타임아웃 + 동시실행 잠금)
│   ├── useProjectManager.ts       # 프로젝트 CRUD
│   ├── useCodeStudioAgent.ts      # Code Studio 에이전트 관리
│   ├── useCodeStudioChat.ts       # Code Studio 채팅
│   ├── useCodeStudioComposer.ts   # Composer State Machine 훅
│   ├── useCodeStudioFileSystem.ts # 파일 시스템 훅
│   ├── useCodeStudioKeyboard.ts   # 키보드 단축키
│   └── useStudioSession / Sync / Theme / Keyboard / Export / UX / UndoRedo
│
├── lib/ (158개)                   # 유틸리티
│   ├── ai-providers.ts            # 멀티 AI 프로바이더 관리
│   ├── studio-types.ts            # 전체 타입 정의
│   ├── studio-translations.ts     # i18n (KO/EN/JP/CN)
│   ├── noi-auto-tags.ts           # NOI 일관성 태그 자동생성
│   ├── export-utils.ts            # EPUB/DOCX/TXT 내보내기 (순수 JS)
│   ├── errors/StudioError.ts      # 타입 분류 에러 시스템
│   │
│   ├── code-studio-panel-registry.ts      # 37개 패널 레지스트리
│   ├── code-studio-verification-loop.ts   # 3회 검증 루프 엔진
│   ├── code-studio-composer-state.ts      # 7단계 전이표 상태 머신
│   ├── code-studio-agents.ts              # Multi-Agent 오케스트레이션
│   ├── code-studio-bugfinder.ts           # 버그 스캔
│   ├── code-studio-build-scan.ts          # 빌드 스캔
│   ├── code-studio-chaos-engineering.ts   # 스트레스 테스트
│   ├── code-studio-ip-scanner.ts          # IP/라이선스 스캐너
│   └── ... (113개 code-studio-*.ts 모듈)
│
├── services/                      # 외부 서비스
│   ├── geminiService.ts           # Gemini 구조화 생성 (60s timeout)
│   ├── driveService.ts            # Google Drive 백업
│   └── imageGenerationService.ts  # 이미지 생성
│
└── contexts/
    └── StudioContext.tsx           # 스튜디오 전역 상태
```

## Features

### Studio Tabs (NOA Studio)

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

### Code Studio (Verification-First IDE)

| 기능 | 설명 | 상태 |
|------|------|------|
| Panel Registry | 37개 패널 레지스트리 기반 관리 | Stable |
| Verification Loop | Pipeline + Bug Scan + Stress Test 3회 검증 | Stable |
| Composer State Machine | 7단계 전이표 (idle→generating→verifying→review→staged→applied) | Stable |
| Staging/Rollback | 사람 승인 후 안전 반영 + 되돌리기 | Stable |
| 8-Team Pipeline | 정적 분석 8팀 (Simulation~Governance) | Stable |
| Stress Test | AI 예측 성능 분석 (5 시나리오) | Stable |
| IP Scanner | 특허/라이선스 리스크 체크 | Stable |
| Multi-Agent | Architect→Developer→Reviewer→Tester→Documenter | Beta |
| EditorGroup | 멀티 분할 편집 (split/drag-drop/resize) | Stable |
| ActivityBar | CSL 원본 패턴 좌측 아이콘 바 | Stable |
| Bottom Stacking | Terminal + Problems + Pipeline 독립 토글 | Stable |

### Reports Archive

53개 기밀 보고서, 7종 서브카테고리 (인물 파일/사건 보고/기술 사양/제도 규정/조직/분석 평가/기록 유물)
등급 필터: CLASSIFIED / RESTRICTED / PUBLIC

### i18n
한국어(KO), 영어(EN), 일본어(JP), 중국어(CN) 4개 언어 실시간 전환.
Studio + Code Studio 양쪽 모두 4개국어 지원.

### Export
TXT, JSON, EPUB, DOCX — 외부 라이브러리 없이 순수 JS로 ZIP/EPUB/DOCX 생성.

> **등급**: Stable = QA 통과, 프로덕션 사용 가능 / Beta = 핵심 동작 확인, 엣지케이스 미검증 / Experimental = 프로토타입

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

Code Studio: `CodeStudioShell`에 독립 에러 바운더리 적용.

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
┌──────────────────────────────────────────────────────────┐
│                Layer 1: Static Analysis                  │
│          TypeScript + ESLint + Next.js Build             │
│                     28 routes                            │
└────────────────────────┬─────────────────────────────────┘
                         │
          ┌──────────────┼──────────────┐
          │              │              │
┌─────────┴─────────┐ ┌─┴────────────┐ ┌┴─────────────────┐
│  Layer 2: Unit    │ │  Layer 3:    │ │  Layer 4:        │
│  Jest (45 files)  │ │  E2E (2+13)  │ │  Runtime Guards  │
│  ~910 tests       │ │  Playwright  │ │  (code-level)    │
│                   │ │              │ │                   │
│  engine (17):     │ │  studio:     │ │  ErrorBoundary    │
│  · serialization  │ │  · load      │ │  SectionEB ×10    │
│  · pipeline       │ │  · session   │ │  safe-storage     │
│  · scoring        │ │  · tabs      │ │  useAsyncGuard    │
│  · validator      │ │  · i18n      │ │  AbortController  │
│  · hfcp           │ │  · modal     │ │  maxLength ×45    │
│  · builders       │ │  · export    │ │  ARIA labels      │
│  · models/types   │ │  · errors    │ │                   │
│  · continuity     │ │              │ │                   │
│  · quality-gate   │ │  network:    │ │                   │
│  · auto-pipeline  │ │  · landing   │ │                   │
│  · shadow         │ │  · auth      │ │                   │
│  · social-register│ │  · 404       │ │                   │
│  · genre-review   │ │              │ │                   │
│  · writer-profile │ │              │ │                   │
│  · engine-config  │ │              │ │                   │
│  · proactive-sug  │ │              │ │                   │
│                   │ │              │ │                   │
│  lib (23):        │ │              │ │                   │
│  · composer-state │ │              │ │                   │
│  · verification-  │ │              │ │                   │
│    loop           │ │              │ │                   │
│  · panel-registry │ │              │ │                   │
│  · verification-  │ │              │ │                   │
│    integration    │ │              │ │                   │
│  · safe-fix-      │ │              │ │                   │
│    filtering      │ │              │ │                   │
│  · ai-providers   │ │              │ │                   │
│  · error-messages │ │              │ │                   │
│  · studio-error   │ │              │ │                   │
│  · migration      │ │              │ │                   │
│  · export-utils   │ │              │ │                   │
│  · rate-limit     │ │              │ │                   │
│  · sanitize/etc.  │ │              │ │                   │
│                   │ │              │ │                   │
│  hooks (1):       │ │              │ │                   │
│  · useUndoRedo    │ │              │ │                   │
│                   │ │              │ │                   │
│  services (3):    │ │              │ │                   │
│  · driveService   │ │              │ │                   │
│  · geminiService  │ │              │ │                   │
│  · imageGenService│ │              │ │                   │
└───────────────────┘ └──────────────┘ └───────────────────┘
```

### Coverage Thresholds

```json
{
  "branches": 50,
  "functions": 60,
  "lines": 60,
  "statements": 60
}
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

**주요 테스트 (45 파일, ~910 테스트)**:

| 영역 | 파일 수 | 핵심 검증 |
|------|---------|----------|
| engine | 17 | 직렬화, 파이프라인, 채점, 검증, HFCP, 그림자, 연속성 |
| lib (일반) | 18 | 마이그레이션, AI 프로바이더, 에러, 내보내기, rate-limit, sanitize |
| lib (Code Studio) | 5 | composer-state, verification-loop, panel-registry, integration, safe-fix |
| hooks | 1 | useUndoRedo |
| services | 3 | driveService, geminiService, imageGeneration |
| network | 1 | helpers |

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
| `SectionErrorBoundary` x10 | 각 탭 래핑 | 섹션별 격리 |
| `safe-storage` | `lib/safe-storage.ts` | localStorage 예외 방어 |
| `useAsyncGuard` | `hooks/useAsyncGuard.ts` | 동시 실행 차단 |
| `AbortSignal.timeout` | API route, geminiService | fetch 무한 대기 방지 |
| `generationLockRef` | `useStudioAI.ts` | AI 생성 이중 호출 차단 |
| `maxLength` x45 | InputArea, ResourceView, SceneSheet 등 | 입력 길이 제한 |
| `aria-label` | SVG 차트 컴포넌트 | 접근성 |
| Verification Loop | Code Studio Composer | 3회 자동 검증 후 hard gate |

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
