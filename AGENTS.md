<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## EH Universe — Agent Instructions (human + AI)

- **NOA Rules v1.2 + 프로젝트 규칙(전체)**: 저장소 루트의 `GEMINI.md`
- **에이전트 요약 스킬**: `.agents/skills/eh-universe-guideline/SKILL.md`
- **보안 헤더**: `src/proxy.ts`에서 통합 — **현재 middleware.ts 미연결 상태 (P0)**, 보안 헤더 실제 미적용
- **Code Studio 시스템 지시문**: `src/lib/code-studio/core/architecture-spec.ts`의 `CODE_STUDIO_ARCHITECTURE_APPENDIX`
- **Design System v8.0**: `src/lib/code-studio/core/design-system-spec.ts` (FULL/COMPACT/MINIMAL 3-Tier)
- **Design Linter**: `src/lib/code-studio/core/design-linter.ts` + `pipeline/design-lint.ts` (16룰 런타임)
- **Design Presets**: `src/lib/code-studio/core/design-presets.ts` (5 프리셋 + 자동 감지)

## 3앱 구조

| 앱 | 경로 | 역할 |
|----|------|------|
| Universe | `/`, `/archive`, `/codex`, `/reference`, `/rulebook`, `/tools/*` | 아카이브 + 코덱스 + 도구 |
| Studio | `/studio` | 소설 집필 스튜디오 (NOA Writing Engine) |
| Code Studio | `/code-studio` | 검증형 코드 생성 스튜디오 |
| Network | `/network` | 행성 커뮤니티 + 보고서 + 정착지 |
| Translation Studio | `/translation-studio` | 번역 스튜디오 |

## 코드 스튜디오 아키텍처

- **Shell 3파일 분리**: CodeStudioShell + CodeStudioEditor + CodeStudioPanelManager
- **lib/code-studio/ 6-directory**: `core/`, `ai/`, `pipeline/`, `editor/`, `features/`, `audit/`
- **Panel Registry**: `core/panel-registry.ts` + `PanelImports.ts` — 하드코딩 금지
- **Design v8.0 3-Tier 토큰 효율**:
  - FULL (~3K) → css-layout, interaction-motion, ChatPanel
  - COMPACT (~800) → app-generator, autopilot UI step
  - MINIMAL (~100) → useCodeStudioChat 폴백
- **UI 프리미티브**: `ui/Tooltip`, `ui/Dropdown`, `ui/Accordion`, `ui/ProgressBar` — 재구현 금지, import 사용

## Design System v8.0 규칙

- **시맨틱 토큰 필수**: `bg-bg-primary`, `text-text-primary`, `border-border` — raw Tailwind 금지
- **z-index 변수**: `var(--z-dropdown)`, `var(--z-overlay)`, `var(--z-modal)`, `var(--z-tooltip)` — 숫자 하드코딩 금지
- **4px 배수 간격**: `--sp-xs`(4px) ~ `--sp-2xl`(32px) — 비4배수 금지
- **터치 타겟**: 최소 44px
- **포커스**: `focus-visible:ring-2 ring-accent-blue` — `outline: none` 단독 금지
- **상태 표시**: 색상 + 아이콘 + 텍스트 최소 2가지 조합
- **런타임 린트**: `runDesignLint(code)` → 16룰 자동 검사 → verification-loop Step 1.6

## 보안 주의 (전수 진단 결과)

현재 P0 보안 이슈:
1. `proxy.ts` 보안 헤더 미적용 — middleware.ts 부재
2. `chat/route.ts:352` — PRO_LOCKED 하드코딩 인증 우회
3. `sandbox.ts:170` — 사용자 코드 script 직접 삽입
4. `webcontainer.ts:54` — new Function() eval 동등

## AI 모델 현황 (2026-04)

| Provider | 기본 모델 | 사용 가능 |
|----------|----------|----------|
| Gemini | gemini-2.5-pro | 2.5-flash, 2.5-flash-lite, 3.1-pro-preview, 3-flash-preview, 3.1-flash-lite-preview |
| OpenAI | gpt-5.4 | 5.4-mini, 5.4-nano, 5.3-instant, 4.1, 4.1-mini, 4.1-nano |
| Claude | claude-sonnet-4-6 | opus-4-6, haiku-4-5, opus-4-5, sonnet-4-5 |
| Groq | llama-3.3-70b | llama-3.1-8b-instant, qwen-qwq-32b |
