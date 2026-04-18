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

## 2026-04-19 v2.1 업데이트

### 보안 감사 (커밋 3419e3a2)
- 전수 1,292 파일 스캔 → P0 6 + P1 13 수리
- 주요 P0: GlossaryPanel XSS / PreviewPanel iframe sandbox / CLI shell injection × 3 / autopilot config

### 3루프 정밀 진단 (e80a2fca → 7834b0f4 → 047ff905)
- Loop 1: 790 파일 전수 Read / 69 수리 (saga AI 이중 호출 / suggest ReferenceError 등 진짜 P1)
- Loop 2: 회귀 검증 + 크로스파일 통합 + 이월 6건
- Loop 3: 최종 + `useCodeStudioPanels` 530→103줄 분해

### UX 5축 (커밋 03c78412 / 32 파일)
- 작가 세션 관리 (포모도로 / 일일 목표 / 휴식 알림)
- 블루라이트 필터 / AI FAB (Ctrl+Enter) / 씬시트 인라인 경고
- 키보드 내비 (Ctrl+\ 분할뷰, Arrow Key 에피소드)
- 공용 `EmptyState` + 6곳 적용
- 5모달 aria + 색상+텍스트 병기

### 인프라 5축 (커밋 1920e0d2)
- DGX fallback (DGX → BYOK 자동 전환)
- IndexedDB quota 모니터링 + Firebase tracker
- 원고 전체 export (JSON/ZIP + atomic rollback)
- 법적 문서 4페이지 (Terms / Privacy / Copyright / AI Disclosure)
- SEO 풀스택 (AI 크롤러 9종 차단)
- AI 라벨 자동 삽입 + 19+ 자가 선언 + changelog

### Progressive Disclosure (커밋 4faa70ae)
- `UserRoleContext` (writer / translator / publisher / developer / explorer)
- Writing Tier 단순화 (기본 = 수동, 5모드는 opt-in)
- Code Studio 역할 기반 숨김
- Translation Studio 30초 샘플 체험
- Settings 4탭 (Easy / Writing / Advanced / Developer)
- TabHeader + TermTooltip (12 용어 4언어 사전)
- Welcome 4번째 슬라이드 (역할 선택)

## 신규 컴포넌트/훅 (2026-04-19)

- `contexts/UserRoleContext.tsx` — 역할 / Tier / developerMode
- `hooks/useSessionTimer.ts` — 포모도로 + 일일 목표 + 휴식
- `hooks/useSparkHealth.ts` — DGX 모니터
- `hooks/useStorageQuota.ts` — IndexedDB 용량
- `components/ui/EmptyState.tsx` — 공용 빈 상태
- `components/ui/TermTooltip.tsx` — 용어 툴팁
- `components/studio/TabHeader.tsx` — 탭 헤더
- `components/studio/settings/SessionSection.tsx` / `ComplianceSection.tsx`
- `components/legal/LegalPageLayout.tsx` / `TermsUpdateBanner.tsx`
- `components/translator/SampleTranslationDemo.tsx`
- `app/copyright/page.tsx` / `ai-disclosure/page.tsx` / `changelog/page.tsx`

## 신규 라이브러리 (2026-04-19)

- `lib/ai-usage-tracker.ts` — AI 메타데이터 자동 삽입
- `lib/content-rating.ts` — 19+ 자가 선언
- `lib/changelog-data.ts` — 7 엔트리
- `lib/firebase-quota-tracker.ts`
- `lib/full-backup.ts` — 전체 export (JSON/ZIP)

## 프로젝트 상태 (2026-04-19)

- 테스트: **2,331 passing** / 221 suites / 0 실패
- 타입: **0 errors** (strict)
- 보안: P0 모두 수리
- 단계: **알파** (배포 가능 상태)

오늘 7개 커밋 통합 결과: 164+ 파일 / 200+ 이슈 수리 / +99 테스트 (2,232→2,331)

---

## 신규 컴포넌트 (2026-04-18 v2.0)

### Novel Studio 확장
- `NovelBreadcrumb.tsx` — 3단계 경로 네비 (모바일 축약)
- `OutlinePanel.tsx` — 씬 트리 + 검색/필터
- `RenameDialog.tsx` + `rename-engine.ts` — 일괄 변경 엔진
- `EditorMinimap.tsx` — Canvas 기반 품질 색상 미니맵
- `WorkProfilerView.tsx` + `work-profiler-engine.ts` — 작품 전체 분석
- `MarketplacePanel.tsx` + `MarketplaceModal.tsx` — 플러그인 카탈로그
- `MergeConflictResolver.tsx` + `conflict-parser.ts` — Git 3-way diff
- `WorkspaceTrustDialog.tsx` + `workspace-trust.ts` — 외부 신뢰 모델
- `WordCountBadge.tsx` — 플러그인 실동작 샘플

### Settings 섹션 분리 (2026-04-18)
- `settings/ApiKeysSection.tsx` (81줄)
- `settings/ProvidersSection.tsx` (104줄)
- `settings/BackupsSection.tsx` (489줄)
- `settings/AdvancedSection.tsx` (205줄)
- `settings/PluginsSection.tsx` (167줄)

### Writing 모드 섹션 분리 (2026-04-18)
- `writing/AIModeSection.tsx` (139줄)
- `writing/EditModeSection.tsx` (242줄)
- `writing/CanvasModeSection.tsx` (102줄)
- `writing/RefineModeSection.tsx` (80줄)
- `writing/AdvancedModeSection.tsx` (38줄)
- `writing/InputDockSection.tsx` (68줄)
- `writing/MobileOverlaySection.tsx` (90줄)
- `writing/SplitPanelTabs.tsx` (105줄, 공용)

## 신규 훅 (2026-04-18)

- `useEditorScroll` — RAF + passive scroll + ResizeObserver
- `useFocusTrap` — WCAG 2.1 AA focus 관리
- `useMediaQuery` + `useIsMobileQuery/TabletQuery/DesktopQuery`

## 신규 라이브러리 (2026-04-18)

- `lib/rename-engine.ts` — 범위 기반 순수 치환 엔진
- `lib/conflict-parser.ts` — Git 충돌 마커 파싱
- `lib/workspace-trust.ts` — URL 신뢰 관리
- `lib/rewrite-range.ts` — 3-tier 치환 폴백
- `lib/novel-plugin-registry.ts` — 플러그인 등록/활성화
- `lib/plugin-sandbox.ts` — Worker 샌드박스 실행기
- `lib/novel-plugins/` — 번들 샘플 플러그인 3종

## 신규 엔진 (2026-04-18)

- `engine/language-purity.ts` — 로컬 AI 영어 혼입 정화
- `engine/contamination-dict.ts` — 영어→한국어 치환 사전 222개

## E2E 테스트 인프라 (2026-04-18)

- `playwright.config.ts`
- `e2e/fixtures/studio-state.ts` — 공통 픽스처 (DGX 모킹)
- `e2e/scenarios/01-onboarding.spec.ts` — /welcome 플로우
- `e2e/scenarios/02-new-episode.spec.ts` — Ctrl+Shift+N
- `e2e/scenarios/03-writing-flow.spec.ts` — AI 생성 플로우
- `e2e/scenarios/04-global-search.spec.ts` — Ctrl+K 팔레트
- `e2e/scenarios/05-rename-flow.spec.ts` — Ctrl+Shift+H

## 카테고리 선언 (2026-04-18 신규)

Loreguard는 "하라 시장"(제작 도구)의 카테고리 창시자.
- 해줘 시장 (소비): Sudowrite, Novelcrafter 등
- 하라 시장 (제작): **Loreguard (유일)**
- 레퍼런스: Adobe, VS Code, Logic Pro 계열

상세: `docs/category-declaration.md` / `docs/brand-philosophy.md` Part 13
상세 릴리스 노트: `docs/patch-notes-v2.md`

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
- **9-stage 정적 파이프라인** (`pipeline/pipeline.ts` `FULL_TEAMS`):
  1. simulation → 2. generation → 3. validation (blocking) → 4. size-density →
  5. asset-trace → 6. stability → 7. release-ip (blocking) → 8. governance → 9. quill
  - blocking 단계(validation/release-ip) 실패 시 다음 스테이지 차단
- **에이전트 역할** (`types/code-studio-agent.ts` `AGENT_REGISTRY`): 19개 role (team-leader, frontend-lead, backend-lead, domain-analyst, state-designer, css-layout, interaction-motion, core-engine, api-binding, overflow-guard, security-auth, memory-cache, render-optimizer, deadcode-scanner, coding-convention, stress-tester, dependency-linker, progressive-repair, snapshot-manager)
- **Quill Engine**: 224룰 카탈로그 검증 (4-layer: pre-filter → AST → TypeChecker → esquery)
- **파이프라인 모듈** (2026-04-17 동기화):
  - `pipeline/diff-guard.ts` — SCOPE/CONTRACT/@block 편집 경계 보호 (450줄)
  - `pipeline/apply-guard.ts` — diff-guard 래퍼, `handleApplyCode`에서 MULTI_FILE_AGENT flag로 호출
  - `pipeline/design-transpiler.ts` — 외부 AI 코드 보안 필터 (연결 대기)
  - `ai/intent-parser.ts` — 결정론적 의도→제약 변환, `agents.ts:runSingleAgent`에서 MULTI_FILE_AGENT flag로 프롬프트 주입
  - `ai/calc-protocol.ts` — SCAN→VALIDATE→ROUTE→PLAN 4단계 프롬프트 프로토콜 (헬퍼 정의)
  - `ai/tier-registry.ts` — 4-Tier (Auditor/Composer/Patcher/Predictor) 오케스트레이션, MULTI_FILE_AGENT flag로 temperature/systemPrompt 분기
  - `core/snapshot-manager.ts` — IndexedDB 스냅샷, `runAgentPipeline`의 progressive-repair 전에 자동 생성 + 실패 시 rollbackSnapshotId 노출
- **AuditInvoice.tsx** — `panel-registry.ts`의 `audit-invoice` 패널로 등록, 활성 파일 기반 intent-parser 실시간 분석 렌더
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
