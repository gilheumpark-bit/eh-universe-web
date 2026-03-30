# EH Universe Web

![Tests](https://img.shields.io/badge/tests-1400+-green)
![Suites](https://img.shields.io/badge/suites-212-green)
![Audit](https://img.shields.io/badge/audit-95%2F100%20(S)-brightgreen)
![Languages](https://img.shields.io/badge/i18n-KO%20EN%20JP%20CN-purple)
![License](https://img.shields.io/badge/license-CC--BY--NC--4.0-blue)

은하 중앙 의회가 관할하는 20만 행성계의 역사, 세력, 기술, 지리를 아카이브로 탐색하는 **세계관 포털**이자, AI 기반 집필 스튜디오와 검증형 코드 IDE를 갖춘 창작 플랫폼.

## 핵심 구성

| 영역 | 설명 | 상태 |
|------|------|------|
| **EH Universe 포털** | 설정집 아카이브(109문서) + 기밀 보고서(53건) + 코덱스 + 룰북 + 레퍼런스 | Production |
| **NOA Studio** | AI 소설 집필 엔진 — 세계관/캐릭터/연출/문체/원고 관리 | Production |
| **Code Studio** | 검증형 코드 IDE — Verification Loop + Composer State Machine | Beta |
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
| Test | Jest 30 (~1,400 tests, 212 suites) + Playwright 1.58 (E2E 3 specs) |
| Audit | 16-area Project Audit Engine — 95/100 (S) |
| Deploy | Vercel |

## Quick Start

```bash
npm install
npm run dev          # localhost:3000
npm run build        # production build
npm run lint         # ESLint
npm test             # Jest unit tests
npm run test:e2e     # Playwright E2E
```

## EH Universe 포털

세계관 탐색 포털 — 홈에서 스플래시 후 허브로 진입.

- **설정집 아카이브**: 6개 카테고리(핵심/연표/세력/군사/지리/기술), 109개 문서
- **기밀 보고서**: 53건, 7종 서브카테고리, 등급 필터(CLASSIFIED/RESTRICTED/PUBLIC)
- **코덱스**: 세계관 핵심 법칙, 용어, 구조 참조
- **룰북 v1.0**: 서사 엔진의 구조와 원리
- **레퍼런스**: 프로젝트 4페이지 요약본
- **Tools**: 은하 지도, 함선 제원, 워프 게이트, 사운드트랙, 네카 사운드, 노아 타워, 스타일 스튜디오

## NOA Studio (소설 스튜디오)

| 탭 | 기능 |
|----|------|
| 세계관 | 3-tier 설계, 문명 시뮬레이터 (5파일 분리), 타임라인, 지도 |
| 캐릭터 | 22필드 3-tier, 관계 그래프, 아이템/스킬/마법 체계 |
| 연출 | 씬시트, 복선 관리, 텐션 커브, 장면 전환 |
| 집필 | AI 초안 생성 (6종 프로바이더), 캔버스, 인라인 리라이터 |
| 문체 | 5축 슬라이더, DNA 카드, 문장 리듬 분석 |
| 원고 | 원고 관리, 작가 대시보드, 감정 아크, 독자 피로도 |
| 비주얼 | NOI 프롬프트 카드, 일관성 태그, 이미지 생성 |

## Code Studio (검증형 IDE)

- **Panel Registry**: 37개 패널 (8개 필수 기본 노출 + Advanced 토글)
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
- **CSP Middleware**: `src/middleware.ts` — nonce 기반 보안 헤더 통합 관리
- **Logger**: `@/lib/logger` — `console.*` 대신 logger.info/warn/error 사용
- **Streaming**: fetch 120s + AI 180s + 구조화 60s + 동시실행 lock
- **Storage**: localStorage try/catch + IndexedDB 백업 + 용량 감지
- **Input Validation**: maxLength 45건 + 엔진 50K 하드 리밋

## Test Architecture

```
Layer 1: Static — TypeScript + ESLint + Next.js Build (28 routes)
Layer 2: Unit   — Jest 212 suites (~1,400 tests), 22 component + 19 hooks + 137 lib suites
Layer 3: E2E    — Playwright 3 specs (navigation, studio, code-studio)
Layer 4: Audit  — 16-area Project Audit Engine, 4,400+ checks, 95/100 (S)
Layer 5: Runtime Guards — ErrorBoundary (3 variants), AbortController, generationLockRef
```

Coverage thresholds: branches 50%, functions/lines/statements 60%.

## Project Audit (95/100 S)

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
