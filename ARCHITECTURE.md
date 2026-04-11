# EH Universe Web -- Architecture

## Overview

EH Universe Web is a Next.js 16.2 single-app (App Router, Turbopack) deployed on Vercel ICN (ehsu.app).
It hosts five applications under a single domain with shared auth, i18n, and design system infrastructure.

**Version**: 1.4.0 (2026-04-11)

## Applications

| App | Route | Purpose |
|-----|-------|---------|
| Universe Portal | `/`, `/archive`, `/codex`, `/reference`, `/rulebook`, `/tools/*` | Lore archive (140+ 문서, 8 카테고리), codex, reference tools |
| NOA Studio | `/studio` | 집필 OS — macOS 스타일 독/윈도우프레임, 5가지 집필 모드, 실시간 품질 분석, 연속성 검사 |
| Code Studio | `/code-studio` | 검증형 코드 생성 — 8-team 파이프라인, diff-guard, 4-Tier 오케스트레이션 |
| EH Network | `/network` | 행성 커뮤니티 — 보고서, 정착지, 포스트 |
| Translation Studio | `/translation-studio` | 소설 전용 AI 번역 — 6축 채점, MODE1/MODE2, 재창조 루프 |

## Directory Structure

```
src/
  app/                  # Next.js App Router pages + API routes
    api/                # 22 API routes (chat, translate, agent-search, etc.)
    (universe)/         # Universe Portal pages
    studio/             # NOA Studio
    code-studio/        # Code Studio
    network/            # EH Network
    translation-studio/ # Translation Studio
  components/           # Shared React components
  lib/                  # Core libraries
    code-studio/        # Code Studio engine (6 dirs: core, ai, pipeline, editor, features, audit)
    server-ai/          # Server-side AI provider abstraction
  services/             # AI provider integrations
```

## NOA Studio Architecture (2026-04-11)

집필 OS 변환 완료. macOS 스타일 UI + 5가지 집필 모드 + 실시간 품질 분석.

### UI 구조
- **OSDesktop**: macOS 독 (8 스튜디오 탭 + 3 앱 링크) + 상단 메뉴바
- **WindowTitleBar**: 트래픽 라이트 + 탭 이름 + 포커스 모드 토글
- **StudioStatusBar**: 글자수/단어수/모드/에피소드/저장 상태 (z-40)
- **Zen 모드**: `body:has(textarea[data-zen-editor]:focus)` CSS 자동 숨김

### 집필 엔진
- **5가지 모드**: AI생성 / 수동편집 / 3단계캔버스 / 자동30%리파인 / 고급
- **useQualityAnalysis**: show/tell, 반복어, 문장 다양성, 밀도, 대사 비율 (5지표)
- **useContinuityCheck**: 캐릭터 이름 오타, 특성 모순, 시간대/장르 모순
- **InlineActionPopup**: 문맥 인식 리라이트 (장르+캐릭터+주변 ±200자)
- **useUndoStack**: 50단계 Undo/Redo + 라벨 기반 추적
- **QualityGateAttemptRecord**: 시도별 등급/감독점수/태그/실패사유 이력

### AI 워크플로우
- **재시도**: 3회 + 지터 백오프 + Retry-After 연동 (ai-providers.ts)
- **토큰 버짓**: buildSystemInstruction() 후 30% 초과 경고
- **캐릭터 절삭**: 20명 초과 시 noa:character-truncated 이벤트
- **품질 게이트**: evaluateQuality → 6차원(등급/감독/EOS/텐션/AI톤/레드태그)

### 내보내기
- EPUB 3.0 + DOCX + TXT/MD/JSON/HTML/CSV (export-utils.ts + useStudioExport.ts)

### 저장소
- **로컬**: localStorage (500ms 디바운스) + IndexedDB (10분 버전 백업)
- **클라우드**: Firestore (CLOUD_SYNC flag) + Google Drive 동기화
- **비상**: beforeunload 동기 저장 + sendBeacon 폴백

## Code Studio Pipeline (8 Teams)

The Code Studio uses a simulated 8-team development pipeline:

1. **PM** -- Requirements analysis and task decomposition
2. **Architect** -- System design and component structure
3. **Frontend** -- UI implementation with Design System v8.0
4. **Backend** -- API and data layer generation
5. **QA** -- Automated test generation
6. **Security** -- Vulnerability scanning (436-rule dual catalog)
7. **DevOps** -- Build verification and deployment prep
8. **Tech Lead** -- Final review, scoring, and approval gate

Each team runs in sequence within a Gen-Verify-Fix loop (adaptive 5-round, convergence detection).
Pipeline scoring: goodBoost 20, filterBonus 15, teamHealthBonus 5.

### New Pipeline Modules (2026-04-11 synced from desktop)
- `diff-guard.ts`: SCOPE/CONTRACT/@block 편집 경계 보호 (450줄)
- `apply-guard.ts`: diff-guard 래퍼, 코드 적용 시 자동 검증
- `design-transpiler.ts`: 외부 AI 코드 보안 필터 + 시맨틱 토큰 변환
- `intent-parser.ts`: 결정론적 의도→AST 제약 변환 (LLM 불필요)
- `calc-protocol.ts`: SCAN→VALIDATE→ROUTE→PLAN 4단계 프롬프트 프로토콜
- `tier-registry.ts`: Ultra/ProPlus/Standard/Lite 4-Tier 오케스트레이션
- `AuditInvoice.tsx`: NOA-AGI 실행 명세서 UI

## Panel Registry (51 Panels)

Code Studio panels are managed through a centralized registry (`core/panel-registry.ts` + `PanelImports.ts`).
All panels use dynamic imports -- hardcoded panel references are prohibited.

Key panels include: EditorPanel, TerminalPanel, ChatPanel, DatabasePanel (sql.js WebAssembly),
GitPanel (isomorphic-git), DeployPanel (build verify + ZIP export), SecurityPanel, TestPanel,
CollabPanel (CRDT engine with BroadcastChannel), and 42 more. 7 panels are simulated (JSDoc-documented).

LUCIDE_MAP provides icon mappings for all 51 panels.

## AI Integration

- **Multi-provider**: Gemini, OpenAI, Claude, Groq, Mistral, DeepSeek, Ollama, LM Studio
- **Server proxy**: All AI calls route through `/api/chat` (SSE streaming) to prevent key exposure
- **BYOK + hosted**: Server env keys or user-provided keys
- **Structured generation**: `/api/structured-generate` (provider-agnostic JSON schema output)
- **Agent Builder**: Vertex AI Discovery Engine for semantic search across 3 studios
- **ANS v10.0**: Adaptive Narrative System with tension curves, HFCP state tracking, genre presets
- **NOA-PRISM v1.1**: Content rating and preservation/expansion control

## CLI Integration

- **Harness 3-Core**: Spy (6 API intercepts), Mutation (11 operators), Feedback loop
- **Gate protocol**: GATE-SPY, GATE-FUZZ, GATE-MUT, GATE-AST, GATE-BUILD, GATE-TEST
- **Fail-Fast pipeline**: Gate1 (static 0.1s) -> Gate2 (linter 0.2s) -> Gate3 (dynamic 3s)
- **Autopilot**: `/api/code/autopilot` for headless Gemini-powered code generation

## Design System v8.0

Three-tier token system (FULL ~3K / COMPACT ~800 / MINIMAL ~100 tokens).
16-rule runtime linter (`runDesignLint`), 5 presets, 4 UI primitives (Tooltip, Dropdown, Accordion, ProgressBar).
Semantic tokens required (`bg-bg-primary`, `text-text-primary`); raw Tailwind values prohibited.

## Translation Studio Architecture

소설 전용 AI 번역 — 1,408줄 엔진 + 6,298줄 UI.

- **2-모드 × 41-밴드**: Fidelity(4축) / Experience(6축) 직교 설계
- **6축 채점**: translationese, fidelity, naturalness, consistency, groundedness, voiceInvisibility
- **자동 재창조 루프**: 점수 < 0.70 → temperature 상승 + 재생성 (최대 2회)
- **Critical Axis 자동 차단**: translationese>0.60 / fidelity<0.40 등 임계 위반 시 강제 재창조
- **CAT 표준**: XLIFF 1.2 + TMX 1.4 + TBX 지원
- **Glossary Manager**: 반응형 싱글톤, 배치 중 용어 추가 시 미시작 청크만 적용
- **Character Register**: stranger/formal/colleague/friend/intimate/hostile 6단계
- **EMA 학습 프로필**: 번역 오류 패턴 축적 → 다음 번역 프롬프트에 힌트 주입
- **언어별 현지화**: JP(나로계 단문, 俺/僕/私), CN(网文, 성어 치환, 4·6자구)
- **길이 검증**: KO→EN 1.10~1.60, KO→JP 0.85~1.20, KO→CN 0.80~1.15

## Infrastructure

- **Auth**: Firebase Google Sign-In + Firestore security rules + Stripe subscription tiers
- **Storage**: localStorage (500ms) + IndexedDB (10분 백업) + Firestore (CLOUD_SYNC flag) + Google Drive
- **i18n**: 4 languages (KO, EN, JP, CN) via LangContext with type-safe switching
- **Security**: CSP headers via `next.config.ts headers()`, CSRF origin checks, rate limiting (sliding window per IP)
- **CI/CD**: GitHub Actions + Playwright E2E, Vercel deployment with Turbopack
- **Cron**: `/api/cron/universe-daily` for automated content generation
- **Feature Flags**: 7개 (IMAGE_GENERATION, GOOGLE_DRIVE_BACKUP, NETWORK_COMMUNITY, OFFLINE_CACHE, CODE_STUDIO, EPISODE_COMPARE, CLOUD_SYNC)
- **PWA**: Service Worker (`public/sw.js`) + `manifest.webmanifest` (standalone 설치 가능)

## Quality Catalog

436-rule dual catalog: 224 bad patterns (anti-patterns, vulnerabilities) + 212 good patterns.
Good pattern detector runs 40 regex rules. Context-aware, memoized for pipeline performance.
Wired to both generation (prompt injection) and verification (scoring) stages.
