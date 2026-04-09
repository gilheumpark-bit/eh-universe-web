<div align="center">

<img src="public/images/logo-badge.svg" alt="NOA Code Studio" width="320" />

### NOA Code Studio 

검증형(Validation-First) 파이프라인과 자율 복구 엔진을 갖춘 AI 기반 웹 IDE.

[![English](https://img.shields.io/badge/lang-English-blue?style=flat-square)](README.md)
![Next.js](https://img.shields.io/badge/Next.js-16.2-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Tests](https://img.shields.io/badge/tests-1600+-22c55e?style=flat-square)
![Audit](https://img.shields.io/badge/audit-94%2F100-22c55e?style=flat-square)
![License](https://img.shields.io/badge/CC--BY--NC--4.0-blue?style=flat-square)

</div>

---

**NOA Code Studio**는 검증 중심(Validation-First) 설계와 자율 수정 루프(Gen-Verify-Fix)를 내장한 브라우저 기반 AI IDE 프로젝트입니다. 

## Tech Stack

| 영역 | 기술 |
|------|------|
| Framework | Next.js 16.2 (App Router) |
| Language | TypeScript 5, React 19 |
| UI | Tailwind CSS 4 (Glassmorphism), Lucide Icons |
| AI | Gemini, OpenAI, Claude, Groq, Mistral, LM Studio (BYOK) |
| Editor | Monaco Editor, xterm.js, WebContainer API |
| Engine | Verification Loop (코드 정적 분석 + 디자인 AST 검증) |
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

## 접근 경로

기본 실행 후 `http://localhost:3000/code-studio` 로 접속합니다.

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
