# Changelog

All notable changes to EH Universe Web are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/).

## [1.1.0] - 2026-03-29

### Code Studio — Full Implementation
- **Panel Registry**: 37개 패널 레지스트리 기반 관리, dynamic import barrel
- **Verification Loop Engine**: 3회 검증 루프 (Pipeline + Bug Scan + Stress Test), 5 stop reasons, hard gate
- **Composer State Machine**: 7단계 전이표 + canTransition guard
- **Staging/Rollback**: 사람 승인 후 안전 반영, snapshot 기반 되돌리기
- **CSL 원본 UI/UX 적용**: ActivityBar, ResizeHandle, 하단 패널 스태킹, a11y skip link
- **EditorGroup**: 멀티 분할 편집 (split right/down, drag-drop, resize, Ctrl+1~4)
- **73/76 컴포넌트 연결** (3개 의도적 standalone)

### Reports Archive
- `/reports` 전용 페이지: 53개 보고서, 7종 서브카테고리, 등급 필터
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
