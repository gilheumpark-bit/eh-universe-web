# Changelog

All notable changes to EH Universe Web are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/).

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
