## 판단 체계 (Judgment Framework) — NOA Unified Stack v2.1
9개 스킬 단일 파이프라인 (noa-unified-anti-sycophancy-stack v2.1):
- 신규 코드: `/first-production-judgment` (4-GATE: Intent→Contract→Minimal→Simulation)
- 기존 코드 수정: `/multi-agent-judgment-v2` (Builder→Critic→Arbiter 2-Pass)
- 정밀 진단: "정밀 진단 실시" 명령 시 발동 → 4-Phase 퇴로 차단 기법 (팩트 해체 → MECE 스캐닝 → 레드팀 자가 반증 → 실행 아키텍처)
- 코드 품질: noa-code-structure + noa-3persona-inspection + noa-confidence-gate
- 수리/응답: noa-repair-strategy + noa-anti-repeat + noa-response-tuner
- ARI Circuit Breaker + Scope Policy (Global > Workspace > Module) 적용

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## NOA Code Studio — Agent Instructions

- **NOA Rules v1.2 + 프로젝트 규칙**: 저장소 루트의 `GEMINI.md`
- **보안 헤더**: `apps/desktop/renderer/proxy.ts`만 요청 훅으로 사용. Dev에서 CSP·보안 헤더 적용.

## 아키텍처 개요

- **단일 앱 구조**: 이 프로젝트는 오직 NOA Code Studio (검증형 코드 생성 스튜디오) 기능만을 담당합니다.
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

P0 보안 이슈 (2026-04-09 수정 완료):
1. ~~보안 헤더 미연결~~ — 웹 앱 렌더러는 `proxy.ts`에서 CSP 등 적용. **데스크톱 프로덕션**에서는 `proxy.ts` 제어가 무효화되므로 `main.ts`의 `webRequest.onHeadersReceived` 세션 인터셉터에서 구동 시 COOP/COEP 주입 완료.
2. ~~Static Export 호환성 위반~~ — Node API 호스팅용 구 루트 `/api/chat` 제거 완료 (데스크톱 데드코드 축출). 통신은 IPC 및 외부 Proxy로 이관.
3. ~~WebContainer Path Traversal & 런타임 누수~~ — `../` 악용 경로 스택 해석 방식으로 원천차단 (`normalizePath`). Dev Server 구동 폴백 로직 등에서 `clearTimeout` 적용하여 클로저 메모리 누수 해소 완료.
4. ~~런타임 샌드박싱 뚫림 위험~~ — `design-transpiler.ts`에서 `new Function`의 생성 패턴을 FORBIDDEN_PATTERN 추가로 전면 차단 완료.

## AI 모델 현황 (2026-04)

| Provider | 기본 모델 | 사용 가능 |
|----------|----------|----------|
| Gemini | gemini-2.5-pro | 2.5-flash, 2.5-flash-lite, 3.1-pro-preview, 3-flash-preview, 3.1-flash-lite-preview |
| OpenAI | gpt-5.4 | 5.4-mini, 5.4-nano, 5.3-instant, 4.1, 4.1-mini, 4.1-nano |
| Claude | claude-sonnet-4-6 | opus-4-6, haiku-4-5, opus-4-5, sonnet-4-5 |
| Groq | llama-3.3-70b | llama-3.1-8b-instant, qwen-qwq-32b |
