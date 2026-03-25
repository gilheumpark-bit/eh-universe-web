# Changelog

All notable changes to EH Universe Web are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/).

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
