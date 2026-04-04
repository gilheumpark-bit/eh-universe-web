<div align="center">

<img src="public/images/logo-badge.svg" alt="EH Universe" width="320" />

### 어디로 향할까요?

20만 행성계 세계관 포털 — AI 소설 스튜디오와 검증형 코드 IDE를 갖춘 창작 플랫폼.

[![English](https://img.shields.io/badge/lang-English-blue?style=flat-square)](README.md)
![Next.js](https://img.shields.io/badge/Next.js-16.2-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Tests](https://img.shields.io/badge/tests-1600+-22c55e?style=flat-square)
![Audit](https://img.shields.io/badge/audit-94%2F100-22c55e?style=flat-square)
![License](https://img.shields.io/badge/CC--BY--NC--4.0-blue?style=flat-square)

</div>

---

은하 중앙 의회가 관할하는 20만 행성계의 역사, 세력, 기술, 지리를 아카이브로 탐색하는 **세계관 포털**이자, AI 기반 집필 스튜디오와 검증형 코드 IDE를 갖춘 창작 플랫폼.

## 핵심 구성

| 영역 | 설명 | 상태 |
|------|------|------|
| **EH Universe 포털** | 설정집 아카이브(109문서) + 기밀 보고서(80건) + 코덱스 + 룰북 + 레퍼런스 | Production |
| **NOA Studio** | AI 소설 집필 엔진 — 세계관/캐릭터/연출/문체/원고 관리 | Production |
| **Code Studio** | 검증형 코드 IDE — Verification Loop + Composer State Machine | Beta |
| **Translation Studio (EH Translator)** | 장편 번역 워크스페이스 — Translate/Chapters/Context/Network | Production |
| **EH Network** | 작가 네트워크 — 행성 시스템, 로그, 정산 | Beta |
| **Tools** | 은하 지도, 함선 제원, 워프 게이트, 사운드트랙 등 7종 | Production |

## Tech Stack

| 영역 | 기술 |
|------|------|
| Framework | Next.js 16.2 (App Router, 28 routes) |
| Language | TypeScript 5, React 19 |
| UI | Tailwind CSS 4, Lucide Icons |
| AI | Gemini, OpenAI, Claude, Groq, Mistral, LM Studio (BYOK) |
| Editor | Monaco Editor, xterm.js, WebContainer API |
| DB/Auth | Firebase Firestore + Auth (EH Network) |
| Engine | ANS 10.0 (서사 엔진), Verification Loop (코드 검증) |
| Export | EPUB / DOCX / TXT (순수 JS, 외부 의존성 없음) |
| Test | Jest 30 (~1,600 tests, 161 suites) + Integration tests (50 cases) |
| Audit | 16-area Project Audit Engine — 94/100 (S) |
| Deploy | Vercel |

## Quick Start

```bash
npm install
npm run dev          # localhost:3000
npm run build        # production build
npm run lint         # ESLint
npm test             # Jest unit tests
npm run test:integration  # Integration tests
```

서버 API·라우트 명세는 [`docs/API.md`](docs/API.md)를 본문으로 둡니다.

## EH Universe 포털

세계관 탐색 포털 — 홈에서 스플래시 후 허브로 진입.

- **설정집 아카이브**: 6개 카테고리(핵심/연표/세력/군사/지리/기술), 109개 문서
- **기밀 보고서**: 80건, 7종 서브카테고리, 등급 필터(CLASSIFIED/RESTRICTED/PUBLIC)
- **코덱스**: 세계관 핵심 법칙, 용어, 구조 참조
- **룰북 v1.0**: 서사 엔진의 구조와 원리
- **레퍼런스**: 프로젝트 4페이지 요약본
- **Tools**: 은하 지도, 함선 제원, 워프 게이트, 사운드트랙, 네카 사운드, 노아 타워 등 (`/tools/*`). 문체 기능은 소설 스튜디오 `/studio` 안 문체 탭만 사용(레거시 `/tools/style-studio`는 스튜디오로 리다이렉트).

## NOA Studio (소설 스튜디오)

| 탭 | 기능 |
|----|------|
| 세계관 (`world`) | 3-tier 설계, 문명 시뮬레이터, 분석, 타임라인, 지도 (서브탭 5) |
| 캐릭터 (`characters`) | 캐릭터/아이템 스튜디오 (서브탭 2), 관계/리소스 관리 |
| 룰북 (`rulebook`) | **SceneSheet(연출 기능 포함)**, 복선/텐션/전환 설계 데이터 |
| 집필 (`writing`) | AI 생성/편집/캔버스/리파인/고급 (모드 5) |
| 문체 (`style`) | DNA/슬라이더 기반 문체 프로파일링 (`/studio?tab=style`) |
| 원고 (`manuscript`) | 원고/에피소드 관리 |
| 비주얼 (`visual`) | NOI 프롬프트 카드, 일관성 태그 |
| 아카이브 (`history`) | 세션/프로젝트 아카이브 |
| 문서 (`docs`) | User Guide |

## Code Studio (검증형 IDE)

- **Panel Registry**: 40개 패널 (필수 기본 노출 + Advanced 토글, `audit` 포함)
- **Design Linter**: Step 1.6 in verification-loop, 16 runtime rules
- **Shell Architecture**: CodeStudioShell + CodeStudioEditor + CodeStudioPanelManager 3파일 분리 (1,721줄 → 3파일)
- **lib/code-studio/**: 6-directory 구조 — `core/`, `ai/`, `pipeline/`, `editor/`, `features/`, `audit/`
- **useAIProvider Hook**: 18개 컴포넌트의 ai-providers 레이어 위반 → 훅 브릿지 경유
- **Verification Loop**: Pipeline(50%) + Bug Scan(20%) + Stress Test(30%) 3회 검증
- **Composer State Machine**: idle → generating → verifying → review → staged → applied
- **Staging/Rollback**: 사람 승인 후 반영, 되돌리기 가능
- **Session Restore**: IndexedDB 기반 마지막 세션 자동 복원
- **ActivityBar**: Explorer / Editor / Chat / Terminal / Pipeline

## i18n

한국어(KO), 영어(EN), 일본어(JP), 중국어(CN) — 실시간 전환.
중앙 사전: `studio-translations.ts` (leaf count 동일).
Fallback: JP/CN → EN → KO.

## Resilience

- **ErrorBoundary**: 통합 컴포넌트, variant prop (`full-page` | `section` | `panel`)
- **SkeletonLoader**: 5 variants (`text` | `card` | `panel` | `editor` | `sidebar`) — shimmer 기반
- **CSP / Security headers**: `next.config.ts headers()` — CSP 및 보안 헤더 통합 관리
- **Design System v8.0**: 3-Tier token efficiency, 16-rule runtime linter, 5 design presets
- **Logger**: `@/lib/logger` — `console.*` 대신 logger.info/warn/error 사용
- **Streaming**: fetch 120s + AI 180s + 구조화 60s + 동시실행 lock
- **Storage**: localStorage try/catch + IndexedDB 백업 + 용량 감지
- **Input Validation**: maxLength 45건 + 엔진 50K 하드 리밋

## Test Architecture

```
Layer 1: Static — TypeScript + ESLint + Next.js Build (28 routes)
Layer 2: Unit   — Jest 161 suites (~1,600 tests), 22 component + 19 hooks + 137 lib suites
Layer 3: Integration — 3 suites, 50 test cases (navigation, studio, code-studio)
Layer 4: Audit  — 16-area Project Audit Engine, 4,400+ checks, 94/100 (S)
Layer 5: Runtime Guards — ErrorBoundary (3 variants), AbortController, generationLockRef
```

Coverage thresholds: branches 50%, functions/lines/statements 60%.

## Project Audit (94/100 S)

16개 영역, 4개 카테고리 자동 감사:

| 카테고리 | 점수 | 영역 |
|----------|------|------|
| Code Health | A | operations, complexity, architecture, dependencies |
| Quality | S | testing, error-handling, feature-completeness, documentation |
| User Experience | S | design-system, accessibility, ux-quality, i18n |
| Infra & Security | S | security, performance, api-health, env-config |

## NOA Rules

이 프로젝트는 `CLAUDE.md`의 NOA Rules v1.2를 따른다.

- **NOA-CORE**: 응답 운영 (언어 동기화, 톤 매칭, 반복 방지, 확신도 게이트)
- **NOA-EXEC**: 실행 규칙 (Preflight Plan, 3-Persona 검사, PART 구조, Terminal 검증)
