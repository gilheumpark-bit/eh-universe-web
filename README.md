<div align="center">

<img src="public/images/logo-badge.svg" alt="EH Universe" width="320" />

### Where are you headed?

A worldbuilding portal for 200,000 star systems — with an AI writing OS and a verified code IDE.

[![한국어](https://img.shields.io/badge/lang-한국어-blue?style=flat-square)](README.ko.md)
![Next.js](https://img.shields.io/badge/Next.js-16.2-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Tests](https://img.shields.io/badge/tests-1600+-22c55e?style=flat-square)
![License](https://img.shields.io/badge/CC--BY--NC--4.0-blue?style=flat-square)

[Live](https://ehsu.app) · [Docs](#documentation) · [Contributing](CONTRIBUTING.md)

</div>

---

## Overview

**EH Universe Web — NOA Studio** is a full-stack creative platform built on a single Next.js 16.2 application. Five apps share a unified design system and authentication layer:

1. **Universe Portal** — 140+ lore documents across 8 categories
2. **NOA Studio** — Novel IDE with GitHub-backed persistence, Tiptap block editor, and 7-Phase architecture
3. **Code Studio** — Verified code IDE with 9-team pipeline + Quill Engine (224 rules)
4. **Translation Studio** — Novel-specific AI translation with 6-axis scoring
5. **EH Network** — Writer community with planet systems

**BYOK (Bring Your Own Key)** — works with Gemini, OpenAI, Claude, Groq, Mistral, Ollama, LM Studio. Free to use.

---

## 주요 기능 / Key Features

### 소설 IDE 7-Phase 아키텍처
- **Phase 1**: GitHub OAuth + Octokit 파일 CRUD (persistent storage)
- **Phase 2**: Markdown + YAML 직렬화 계층 (project-serializer)
- **Phase 3**: Tiptap 블록 에디터 (NovelEditor — textarea 교체)
- **Phase 4**: 에피소드 파일 트리 UI (EpisodeExplorer — Volume 구조)
- **Phase 5**: 하이브리드 컨텍스트 3-Tier (context builder)
- **Phase 6**: Git 브랜치 평행우주 (BranchSelector, ParallelUniversePanel, BranchDiffView)
- **Phase 7**: Tab 인라인 자동완성 (InlineCompletion extension, Copilot 방식)

### 연출탭 리웍
- 13탭 → 3섹션 (줄거리/분위기/캐릭터) + 고급 설정 접기
- 10개 장르 프리셋 (SceneSheet 3-section rework)
- 에피소드별 씬시트 저장 (EpisodeScenePanel)

### 품질 검증
- 100개 기능 점수 시스템 (avg 875/1000 target)
- UX 직관성 45건 개선 (9.5+/10 목표)
- 4개국어 i18n (KO/EN/JA/ZH) — 자연스러운 번역 품질

### AI 인프라
- DGX Spark 14B 서버 (Qwen2.5-14B-Instruct-AWQ, 128GB VRAM)
- SSE 스트리밍 (TTFT 0.05s)
- Quill Engine 224-rule verification (4-layer: pre-filter, AST, TypeChecker, esquery)

---

## Apps

<table>
<tr>
<td width="50%">

**Universe Portal** `/archive`
140+ documents across 8 categories (Core, Timeline, Factions, Technology, Geography, Military, Classified, Reports). Color-coded security levels (PUBLIC / RESTRICTED / CLASSIFIED).

</td>
<td width="50%">

**NOA Studio** `/studio`
Novel IDE with Tiptap block editor, GitHub persistence, 5 writing modes, real-time paragraph quality analysis, continuity checking, inline rewrite (Ctrl+Shift+R), parallel universe branching, Tab autocomplete, EPUB/DOCX/TXT export, version diff, DGX SSE streaming, Zen mode, scene direction sheet (3-section), character smart injection, Story Bible.

</td>
</tr>
<tr>
<td>

**Code Studio** `/code-studio`
Browser IDE with Monaco editor, 51-panel registry, 9-team verification pipeline, diff-guard (SCOPE/CONTRACT/@block protection), 4-Tier orchestration, 224-rule Quill Engine + 436-rule dual catalog, design linter (16 rules), and WebContainer preview.

</td>
<td>

**Translation Studio** `/translation-studio`
Novel-specific AI translation with 2-mode x 41-band scoring (Fidelity 4-axis / Experience 6-axis), auto-recreation loop (score < 0.70), glossary manager, character register (6 relation levels), XLIFF/TMX/TBX export, and language-specific presets (JP narou-kei, CN wangwen).

</td>
</tr>
<tr>
<td>

**EH Network** `/network`
Writer community with planet systems, posts, comments, logs, settlements, and moderation.

</td>
<td>

**Tools** `/tools/*`
Galaxy map, vessel specs, warp gate calculator, soundtrack player, Neka sound generator, NOA tower, style studio.

</td>
</tr>
</table>

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.2, React 19, TypeScript 5 |
| UI | Tailwind CSS 4, Design System v8.0 (3-Tier), Lucide Icons |
| Novel Editor | Tiptap (block editor) + InlineCompletion extension + Octokit (GitHub sync) |
| AI | Gemini, OpenAI, Claude, Groq, Mistral, Ollama, LM Studio (BYOK) |
| Writing Engine | ANS 10.0 — quality gate, tension curves, genre presets, HFCP, DGX routing |
| Code Engine | 9-team pipeline + 224-rule Quill Engine, diff-guard, apply-guard, intent-parser, 4-Tier |
| DGX Spark | GB10 128GB, Qwen2.5-14B-Instruct-AWQ (single model) |
| Translation Engine | 6-axis scoring, 41-band, auto-recreation, glossary, CAT standard |
| Editor | Monaco Editor (Code Studio), Tiptap (Novel Studio), xterm.js, WebContainer API |
| Storage | localStorage + IndexedDB + GitHub (Octokit) + Firestore (CLOUD_SYNC) + Google Drive |
| Serialization | Markdown + YAML front-matter (project-serializer, markdown-serializer) |
| Auth | Firebase Auth + Stripe tiers |
| Export | EPUB 3.0 / DOCX / TXT / XLIFF / TMX — pure JS |
| i18n | 4 languages (KO, EN, JA, ZH) via LangContext |
| Testing | Jest (~1,600 tests), Playwright E2E |
| Deploy | Vercel (ehsu.app) |

---

## Quick Start

```bash
git clone https://github.com/gilheumpark-bit/eh-universe-web.git
cd eh-universe-web
npm install
npm run dev
```

Open [localhost:3000](http://localhost:3000). No API key required for archive, editing, and export.

```bash
npm run build        # Production build
npm run lint         # ESLint
npm test             # Unit tests
```

---

## Architecture

```
src/
├── app/                    # Next.js App Router
│   ├── studio/             # NOA Writing OS (Novel IDE)
│   ├── code-studio/        # Verified Code IDE
│   ├── translation-studio/ # Translation Workspace
│   ├── network/            # Writer Community
│   ├── archive/            # Universe Archive (140+ docs)
│   └── api/                # 22 API routes
├── components/
│   ├── studio/             # Novel IDE (NovelEditor, EpisodeExplorer, BranchSelector, etc.)
│   │   └── extensions/     # Tiptap extensions (inline-completion, novel-keymap)
│   ├── code-studio/        # IDE panels (87 files)
│   └── translator/         # Translation editor + panels
├── engine/                 # ANS 10.0 — pipeline, quality-gate, director, genre-presets
├── hooks/                  # useGitHubSync, useInlineCompletion, useQualityAnalysis, etc.
└── lib/
    ├── code-studio/        # IDE core (6 directories)
    ├── github-sync.ts      # GitHub Octokit integration
    ├── project-serializer.ts  # MD+YAML serialization
    └── firestore-project-sync.ts  # Cloud sync (feature-flagged)
```

---

## Documentation

| Document | Description |
|----------|------------|
| [README.ko.md](README.ko.md) | Korean documentation |
| [CHANGELOG.md](CHANGELOG.md) | Version history (v2.1.0) |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System architecture |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Contribution guide |
| [SECURITY.md](SECURITY.md) | Security policy |
| [RUNBOOK.md](RUNBOOK.md) | Operations runbook |

---

## License

[CC-BY-NC-4.0](https://creativecommons.org/licenses/by-nc/4.0/) — Free for non-commercial use.

<div align="center">

---

*"Where are you headed?"*

Built with Next.js 16.2, TypeScript, Tiptap, seven AI providers, and Quill Engine.

</div>
