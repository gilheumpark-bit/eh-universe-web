# Novel IDE Docs Status

Last updated: 2026-06-19

This folder contains mixed material: current Loreguard Studio references, historical implementation notes, and design-only integration plans.

## Current Product Baseline

The current public product surfaces are:

- Loreguard Studio: `/studio`
- Translation Studio: `/translation-studio`
- Docs, pricing, status, and legal/support pages

Use these current baseline documents first:

- `docs/ARCHITECTURE.md`
- `docs/PRODUCT-FRAME.md`
- `docs/CLEANUP-STATUS.md`
- `docs/API.md`
- `docs/FEATURE_FLAGS.md`

## Folder Map

| Path | Status | How to Read |
|---|---|---|
| `handbook.md` | Mostly current, but contains older implementation history | Read after the baseline docs. Terms should be interpreted through the current Loreguard Studio frame. |
| `external-integration.md` | Current direction | External systems call Loreguard APIs. It does not revive separate old tools. |
| `dual-track-spec.md` | Historical/background | Kept for translation design history. Current UI terms are 보존안, 현지화안, 작가 승인, 과정기록. |
| `lsp-spec.md` | API design | Treat as external integration design until each endpoint is verified in current code. |
| `symbol-ide.md` | Studio helper design | The idea maps to creative references and navigation, not to a separate Code Studio product. |
| `vscode-extension-spec.md` | Replaced direction | Prefer `external-integration.md`; do not treat a VS Code extension as an active product promise. |
| `융합설계/` | Design-only ledger | Many rows are `design`, `partial`, or `phantom`. Do not describe them as active features unless current code wiring proves it. |
| `tab-예비설계안/` | Draft design notes | Use as implementation input only after reconciling with current `Project` data and Studio tabs. |

## Removed Surface Rule

Do not restore or describe the following as current public products from this folder:

- Code Studio
- Network
- Archive
- Codex
- Reports
- Reference
- Rulebook
- Tools

If an old document uses those names, translate the useful idea into current Loreguard language such as 히스토리, 불러오기, 참조 컨텍스트, 출고 패키지, 환경 설정, 노아 인터뷰, 노아 제안, or 과정기록.

## Design-Only Note

`연극부`, `_backstage`, roleplay contracts, and rehearsal material are design ancestry for future 노아 인터뷰 or 씬 리허설 work. They are not active app features until UI, API, storage, and tests are wired and verified.
