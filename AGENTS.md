## 판단 체계 (Judgment Framework) — NOA Unified Stack v2.1
9개 스킬 단일 파이프라인 (noa-unified-anti-sycophancy-stack v2.1):
- 신규 코드: `/first-production-judgment` (4-GATE: Intent→Contract→Minimal→Simulation)
- 기존 코드 수정: `/multi-agent-judgment-v2` (Builder→Critic→Arbiter 2-Pass)
- 코드 품질: noa-code-structure + noa-3persona-inspection + noa-confidence-gate
- 수리/응답: noa-repair-strategy + noa-anti-repeat + noa-response-tuner
- ARI Circuit Breaker + Scope Policy (Global > Workspace > Module) 적용

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## EH Universe — Agent Instructions (human + AI)

- **NOA Rules v1.2 + 프로젝트 규칙(전체)**: 저장소 루트의 `GEMINI.md`
- **에이전트 요약 스킬**: `.agents/skills/eh-universe-guideline/SKILL.md`
- **보안 헤더**: `next.config.ts` headers()로 적용 완료 (proxy.ts는 참조용)
- **Code Studio 시스템 지시문**: `src/lib/code-studio/core/architecture-spec.ts`의 `CODE_STUDIO_ARCHITECTURE_APPENDIX`
- **Design System v8.0**: `src/lib/code-studio/core/design-system-spec.ts` (FULL/COMPACT/MINIMAL 3-Tier)
- **Design Linter**: `src/lib/code-studio/core/design-linter.ts` + `pipeline/design-lint.ts` (16룰 런타임)
- **Design Presets**: `src/lib/code-studio/core/design-presets.ts` (5 프리셋 + 자동 감지)

## 5앱 구조

| 앱 | 경로 | 역할 |
|----|------|------|
| Universe | `/`, `/archive`, `/codex`, `/reference`, `/rulebook`, `/tools/*` | 아카이브 + 코덱스 + 도구 |
| Studio | `/studio` | 소설 집필 스튜디오 (NOA Writing Engine + 집필 OS) |
| Code Studio | `/code-studio` | 검증형 코드 생성 스튜디오 (9-team + Quill Engine) |
| Network | `/network` | 행성 커뮤니티 + 보고서 + 정착지 |
| Translation Studio | `/translation-studio` | 소설 전용 번역 스튜디오 (6축 채점) |

## 소설 스튜디오 아키텍처 (2026-04-14 최신)

### 7-Phase Novel IDE
- **Phase 1**: GitHub OAuth + Octokit 파일 CRUD — `github-sync.ts`, `useGitHubSync`
- **Phase 2**: Markdown + YAML 직렬화 — `project-serializer.ts`
- **Phase 3**: Tiptap 블록 에디터 — `NovelEditor.tsx` (textarea 교체)
- **Phase 4**: 에피소드 파일 트리 — `EpisodeExplorer.tsx` (Volume 구조)
- **Phase 5**: 하이브리드 컨텍스트 3-Tier — context builder
- **Phase 6**: Git 브랜치 평행우주 — `BranchSelector`, `ParallelUniversePanel`, `BranchDiffView`
- **Phase 7**: Tab 인라인 자동완성 — `extensions/inline-completion.ts`, `useInlineCompletion`

### 집필 OS UI
- OSDesktop(독) + WindowTitleBar + StudioStatusBar + Zen 모드
- **5가지 집필 모드**: AI생성 / 수동편집 / 3단계캔버스 / 자동30%리파인 / 고급

### 신규 컴포넌트 (2026-04-14)
- `NovelEditor.tsx` — Tiptap 기반 블록 에디터
- `EpisodeExplorer.tsx` — 볼륨/에피소드 파일 트리 UI
- `BranchSelector.tsx` — Git 브랜치 (평행우주) 선택기
- `ParallelUniversePanel.tsx` — IF 전개 패널
- `BranchDiffView.tsx` — 브랜치 간 차이 비교
- `WriterProfileCard.tsx` — 작가 프로필 카드
- `EpisodeScenePanel.tsx` — 에피소드별 씬시트 이력

### 신규 훅
- `useGitHubSync` — Octokit 기반 GitHub 동기화
- `useInlineCompletion` — Tab 자동완성 Tiptap 연동

### 신규 라이브러리
- `lib/github-sync.ts` — GitHub Octokit CRUD 추상화
- `lib/project-serializer.ts` — MD+YAML 프로젝트 직렬화

### 씬시트 리웍 (SceneSheet 3-section)
- 13탭 → 3섹션 (줄거리/분위기/캐릭터) + 고급 설정 접기
- 10개 장르 프리셋 (이모지+색상 그리드)
- 에피소드별 씬시트 저장 (`EpisodeSceneSheet` 타입)

### 기존 시스템 유지
- **실시간 품질 분석**: `useQualityAnalysis` — show/tell, 반복어, 문장 다양성, 밀도, 대사 비율
- **연속성 검사**: `useContinuityCheck` — 캐릭터 이름 오타, 특성 모순, 설정 충돌
- **인라인 리라이트**: `InlineActionPopup` — 문맥 인식(장르/캐릭터/주변 ±200자) + Undo 스택
- **품질 게이트**: `QualityGateAttemptRecord` — 시도별 등급/감독점수/태그 이력 추적
- **버전 히스토리**: 300자+ 변경 시 자동 스냅샷 + VersionDiff
- **내보내기**: EPUB 3.0 + DOCX + TXT/MD/JSON/HTML/CSV

## 코드 스튜디오 아키텍처 (2026-04-14 동기화)

- **Shell 3파일 분리**: CodeStudioShell + CodeStudioEditor + CodeStudioPanelManager
- **lib/code-studio/ 6-directory**: `core/`, `ai/`, `pipeline/`, `editor/`, `features/`, `audit/`
- **Panel Registry**: `core/panel-registry.ts` + `PanelImports.ts` — 하드코딩 금지
- **9-team 파이프라인**: PM→Architect→Frontend→Backend→QA→Security→DevOps→Tech Lead→Quill
- **Quill Engine**: 224룰 카탈로그 검증 (4-layer: pre-filter → AST → TypeChecker → esquery)
- **파이프라인 모듈** (2026-04-13 동기화):
  - `pipeline/diff-guard.ts` — SCOPE/CONTRACT/@block 편집 경계 보호 (450줄)
  - `pipeline/apply-guard.ts` — diff-guard 래퍼, 코드 적용 시 자동 검증
  - `pipeline/design-transpiler.ts` — 외부 AI 코드 보안 필터 + 시맨틱 토큰 변환
  - `ai/intent-parser.ts` — 결정론적 의도→AST 제약 변환 (LLM 불필요)
  - `ai/calc-protocol.ts` — SCAN→VALIDATE→ROUTE→PLAN 4단계 프롬프트 프로토콜
  - `ai/tier-registry.ts` — Ultra/ProPlus/Standard/Lite 4-Tier 오케스트레이션
- **AuditInvoice.tsx** — NOA-AGI 실행 명세서 UI
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

P0 보안 이슈 (2026-04-06 수정 완료):
1. ~~`proxy.ts` 보안 헤더 미적용~~ — `next.config.ts` headers()로 적용 완료. proxy.ts는 참조용.
2. ~~`chat/route.ts:352` — PRO_LOCKED 하드코딩 인증 우회~~ — Firebase custom claims(stripeRole)로 tier 판별
3. ~~`sandbox.ts:170` — 사용자 코드 script 직접 삽입~~ — nonce 검증 + iframe sandbox 유지
4. ~~`webcontainer.ts:54` — new Function() eval 동등~~ — 이미 dynamic import로 교체됨, 코멘트 정리

## AI 워크플로우 (2026-04-11 최신)

- **재시도**: 3회 + 지터 백오프 + Retry-After 헤더 연동 (`ai-providers.ts`)
- **토큰 버짓 감사**: 시스템 프롬프트 30% 초과 시 `noa:token-budget-warning` 이벤트
- **캐릭터 절삭 경고**: 20명 초과 시 `noa:character-truncated` 이벤트
- **품질 게이트 이력**: `QualityGateAttemptRecord[]` — 시도별 등급/감독점수/실패사유 기록
- **인라인 리라이트 문맥**: 장르+캐릭터+주변 ±200자 자동 주입
- **Firestore 클라우드 동기화**: feature-flag `CLOUD_SYNC` (기본 비활성), 3초 디바운스, onSnapshot 실시간

## AI 모델 현황 (2026-04)

| Provider | 기본 모델 | 사용 가능 |
|----------|----------|----------|
| Gemini | gemini-2.5-pro | 2.5-flash, 2.5-flash-lite, 3.1-pro-preview, 3-flash-preview, 3.1-flash-lite-preview |
| OpenAI | gpt-5.4 | 5.4-mini, 5.4-nano, 5.3-instant, 4.1, 4.1-mini, 4.1-nano |
| Claude | claude-sonnet-4-6 | opus-4-6, haiku-4-5, opus-4-5, sonnet-4-5 |
| Groq | llama-3.3-70b | llama-3.1-8b-instant, qwen-qwq-32b |
| Ollama/LM Studio | local-model | DGX Spark 로컬: Gemma 4 26B/4B, EXAONE 32B |
