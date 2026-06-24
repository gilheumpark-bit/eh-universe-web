## Notation 표준 — Issue Code (P19 루프3 — 2026-06-08)

코드 주석·ADR·이슈 트래킹의 식별자 표기를 단일 표준으로 통합. 점진 마이그레이션 (새 PR 부터 강제, 기존 주석은 자연 노출 시점에 갱신).

**형식:** `[ISSUE-CODE priority-LEVEL YYYY-MM-DD]`

| 필드 | 정의 |
|------|------|
| ISSUE-CODE | 카테고리 prefix + 번호. 아래 표 참조. |
| priority-LEVEL | `critical` / `high` / `medium` / `low` 중 1. 또는 `P0..P9` 수치. |
| YYYY-MM-DD | 진단/수리 일자. ISO 8601 단축. |

**ISSUE-CODE prefix 표:**

| Prefix | 도메인 | 예시 |
|--------|--------|------|
| `P0..P9` | Production readiness (range: per-loop) | `[P3 priority-high 2026-06-08]` |
| `S1..S9` | Security | `[S2-XFF 2026-04-24]` (XFF 스푸핑 방어) |
| `N1..N9` | Network / Distributed | `[N-01 2026-06-03]` (공유 DB store 레이스) |
| `M1..M9` | Mobile / Touch | `[M-01 2026-05-10]` (44px 터치 타겟) |
| `O1..O9` | Observability | `[O-01 2026-06-08]` (trace_id 전파) |
| `A1..A9` | Accessibility (WCAG) | `[A-03 2026-06-08]` (focus trap) |
| `L1..L9` | Legal / Compliance | `[L-02 2026-06-08]` (license header) |
| `I1..I9` | i18n | `[I-07 2026-05-10]` (safety-registry) |

**Loop 표기:** `루프 N` (1/2/3...) 를 priority 옆에 병기. 예: `[P3 루프3/senior-architect 2026-06-08]`.

**예시 (기존 → 신규 점진 마이그레이션):**
```
# 기존 (혼용)
[Doc 1 Studio P0 — 2026-05-12]
[priority 8 — 2026-06-08]
[루프 2 P4 — 2026-06-08]

# 신규 (통합)
[P0 doc1-studio 2026-05-12]
[P8 루프3 2026-06-08]
[P4 루프2/senior-architect 2026-06-08]
```

**규칙:**
- 기존 주석은 마이그레이션 강제 X (해당 라인 편집 시 자연 갱신).
- 새 주석은 표준 형식 강제. 코드 리뷰 시 1차 점검 항목.
- ADR 본문은 `Loop: 루프 N / P_n` 헤더 별도 명시.

## Naming 표준 — 단일 글자 변수 금지 (P15 루프3 — 2026-06-08)

`t = createT(...)` 같은 단일 글자 변수는 같은 파일에서 다른 의미 (`t = setTimeout(...)`) 와 충돌 가능. 다음 규칙 강제:

- 단일 글자 변수 사용 금지 (예외: 1줄 람다의 인덱스 `i`, 좌표 `x`/`y`).
- `createT` 결과 → `translator` 또는 `i18nFn`.
- `setTimeout` 반환 → `warningTimeout` / `dismissTimeout` 등 의미 부여.
- `new URLSearchParams` → `searchParams`.

신규 PR 부터 강제. 기존 코드는 자연 노출 시점에 점진 정리.

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

- **현재 제품 기준(2026-06-14)**: 공개 표면은 Loreguard Studio(`/studio`), Translation Studio(`/translation-studio`), Docs/가격/상태/법적 문서다. Code Studio, Network, Archive, Codex, Reports, Reference, Rulebook, Tools는 현 제품 약속으로 복구하지 않는다. 필요한 기능은 `히스토리`, `불러오기`, `참조 컨텍스트`, `출고 패키지`, `환경 설정` 같은 Loreguard 용어로 흡수한다.
- **10단계 Studio 흐름**: 프로젝트 생성 → 세계관 생성 → 캐릭터·아이템 → 메인 시나리오 → 씬시트 → 연출 → 집필 → 퇴고 → 번역·현지화 → 출고.
- **리딤/결제 기준**: `/api/checkout`은 feature gate 뒤에 있으며 `/api/redeem`과 리딤 UI는 아직 없다. 리딤은 활성 기능처럼 문서화하지 않는다. 기준 문서: `docs/redeem-agent-operations-2026-06-14.md`.
- **에이전트 기준**: 제품 표면은 `노아`, `노아 인터뷰`, `노아 제안`으로 표현한다. `/api/agent-search`, `/api/agent-search/status`, `/api/network-agent/search`, `/api/network-agent/ingest`는 disabled 호환 라우트이며 활성 검색/색인 기능으로 설명하지 않는다.
- **NOA Stack v2.1 + 프로젝트 규칙(전체)**: 본 `AGENTS.md` + 루트 `CLAUDE.md` (GEMINI.md 는 v2.1 통합 후 격리됨 — 2026-05-10)
- **에이전트 요약 스킬**: `.agents/skills/eh-universe-guideline/SKILL.md`
- **보안 헤더**: `next.config.ts` headers()로 적용 완료 (proxy.ts는 참조용)

## 활성 표면 구조

| 표면 | 경로 | 역할 |
|----|------|------|
| Loreguard Studio | `/studio` | 소설 집필·권리/IP·출고 흐름 |
| Translation Studio | `/translation-studio` | 번역·현지화 작업 표면 |
| Docs/Public/Legal | `/docs`, `/pricing`, `/status`, 법적 문서 | 사용자 안내·상태·정책 |

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
- **5가지 집필 모드**: 노아 제안 / 수동편집 / 3단계캔버스 / 자동30%리파인 / 고급

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

## 2026-04-24 v2.3.0-alpha 업데이트

### ARCS (AI Response Control System) 레이어
집필판 AI 호출 엔트리·가드·컨텍스트 블록·사후 스캔·프롬프트 보정을 5개 모듈로 통합.

- **WRITING_AGENT_REGISTRY** (`lib/ai/writing-agent-registry.ts`) — 현행 집필·번역·구조화 에이전트 × 4 GuardId × ContextBlockId 단일 레지스트리 [2026-06-16 창작 RAG/구 네트워크 검색 엔트리 제거 반영]
  - 에이전트: `studio-draft` / `studio-inline-completion` / `studio-inline-rewrite` / `studio-detail-pass` / `translator-stage-1~5` / `translator-story-bible` / `creative-structured-json`
  - GuardId: `no-english-thinking-korean-novel` · `no-think-translation` · `no-yap-json` · `ip-brand-guard`
  - ContextBlockId: `character-dna` · `world-book` · `scene-sheet` · `genre-rules` · `story-summary` · `glossary` · `continuity-notes` · `act-guide` · `style-dna` · `tension-curve` · `origin-guide`
  - `buildAgentSystemPrompt(id, context)` + 4언어 LANG_DIRECTIVE 자동 주입 + `auditRegistry()` 메타 유틸
  - 호출처 통합: `complete/route.ts` / `chat/route.ts` (PRISM via safety-registry) / `engine/pipeline.ts buildSystemInstruction` / `lib/build-prompt.ts buildPrompt` 는 `useAgentRegistry: true` opt-in 으로 호출처 (geminiService / dual-pipeline) 활성화.
- **SAFETY_REGISTRY** (`lib/ai/safety-registry.ts`) — PRISM 3등급 (all-ages / teen-15 / mature-18) 분리 모듈. `buildSafetyEnhancedPrompt(base, level)` + 4언어 라벨. 안전 정책과 역할 정의 직교 관리.
- **creative-domain-prompts/** (`lib/ai/creative-domain-prompts/`) — 4 도메인 × 7 handler prompt 매트릭스 (한국 웹소설 / Western fantasy / 라노벨 / 선협). 각 도메인 prompt 는 그 언어로 직접 작성.
- **lang-normalize** (`lib/ai/lang-normalize.ts`) — AppLanguage (KO/EN/JP/CN) ↔ AgentLanguage (ko/en/ja/zh) 양방향 변환 + 비표준 별칭 (kr/jp/cn/tw) 흡수.
- **IP Guard L1-L5** (`lib/ip-guard/`) — 5계층 브랜드·저작권 방어
  | 계층 | 모듈 | 시점 | 상태 |
  |------|------|------|------|
  | L1 입력 차단 | `brand-blocklist.ts` + `scan.ts:scanTextForIP` | 사용자 입력 / 외부 참조 문서 등록 전 점검 | ✅ wired |
  | L2 프롬프트 회피 | `compliance-axis-7.ts:buildIPAvoidanceDirective` | LLM 호출 전 prompt 주입 | ✅ wired |
  | L3 사후 유사도 | `ngram-similarity.ts` | 생성 후 n-gram Jaccard 의심 구간 탐지 | ✅ wired via `axis-7-ip.ts` (작가가 `ctx.referenceCorpus` 등록 시 활성, 2026-05-12 audit fix) |
  | L4 개인 블록리스트 | 권리/IP 점검 설정 | localStorage 작가별 CRUD | ⚠️ localStorage only — 다기기 sync 미구현 (Firestore 통합 follow-up) |
  | L5 외부 참조 정제 | `ragService.ts:sanitizeRagResults` | 번역 보강용 검색 결과 `off`/`annotate`/`strict` 모드 | ✅ wired |
- **Compliance 7축 채점** (`lib/compliance/axes/`) — axis-1 세계관 · 2 캐릭터 · 3 연출 · 4 장르 · 5 씬시트 · 6 연속성 · 7 IP
  - `orchestrator.ts:scoreAllAxes(ctx, options)` → 0~100 점수 + 가중 평균 + `applyDirectiveToPrompt()` 자동 보정 directive
  - ⚠️ **2026-05-12 audit Round 6: production wiring 부재** — `scoreAllAxes` 가 unit test 외 prod callers 0건. 9 파일 (orchestrator + 7 axes + types) 전체가 `engine/pipeline.ts` 또는 생성 경로에서 호출되지 않음. axis-7-ip 의 ngram-similarity wiring (Round 5)도 dead parent 에 attach. follow-up: post-generation hook을 `useStudioAI` 또는 `engine/pipeline.ts:runQualityGate` 와 통합해야 함.
- **커스텀 블록리스트 UI** — 작가별 개인 금지어 등록 (브랜드/프랜차이즈/캐릭터/기타)
- **라이선스 감지 재정렬** — 중복 SUSPICIOUS_PATTERNS 제거, `scanTextForIP` 위임. 라이선스 감지는 내부 검증 경로에 한정.

### AI 호출 엔트리 감사 결과 (2026-04-23)
각 엔트리가 "자기 역할"을 알도록 시스템 프롬프트 주입을 일원화:
- **Studio 본문 집필** — `engine/pipeline.ts:buildSystemInstruction()` — 캐릭터 DNA Tier 1/2/3 + actGuide + tensionCurve
- **Tab 자동완성** — `api/complete/route.ts:buildSystemPrompt(language)` — 한/영 분기
- **번역 6단계** — `lib/build-prompt.ts:buildPrompt()` — stage별 온도 + `buildTranslationGuard(to)` 언어별 `/no_think` 가드
- **구 Network Agent 검색** — Discovery Engine 기반 검색/색인 경로는 비활성 호환 라우트로만 남긴다. 현행 레지스트리에는 등록하지 않는다.
- **Chat 채팅·분석** — `api/chat/route.ts:buildSystemInstruction()` — PRISM 3등급 + LoRA 어댑터
- **공통 레지스트리** — `lib/ai/writing-agent-registry.ts` — 집필판 역할 정의 집중화

### 인프라 정비
- **Hosted / 개발 API 기준**: 정식 운영 기본 경로는 서버 측 개발 API 키가 설정된 Hosted provider다. DGX/Qwen/vLLM은 로컬·개발·비상 검증용 OpenAI 호환 경로이며 Hosted 기본값으로 설명하지 않는다.
  - DGX 개발 API 사용 시에만 Qwen 3.6-35B-A3B-FP8 MoE(vLLM 8001) 직결 SSE를 쓴다.
  - FlashInfer + N-Gram Speculative Decoding 수치는 내부 개발 검증 메모이며 공개 운영 성능 약속으로 쓰지 않는다.
  - 영어 "Thinking Process:" 누출 방어 이중: 서버 `NO_ENGLISH_THINKING_GUARD` + 클라이언트 `stripEngineArtifacts`
- **창작 RAG 제거**: Loreguard Studio 집필 경로는 외부 RAG를 자동 주입하지 않는다. 8082 검색 사이드카는 번역 보강용 레거시 경로로만 남긴다.
- **Network Agent preamble 제거**: 구 검색 에이전트 역할/가드는 현행 레지스트리에서 제거.

### 네이밍 통합
"연출 스튜디오" 용어가 `SceneDirectionData`(작품 전체 연출)와 `EpisodeSceneSheet`(에피소드별 씬시트) 두 대상에 겹쳐 쓰이던 혼동 해소:
- 4언어 통합: **"작품 연출"** (ko) / **"Work Direction"** (en) / **作品演出** (ja/zh)
- 변경 파일: `studio-types.ts:125` 코멘트 + `engine/pipeline.ts:553/702` 프롬프트 헤더 + `translations-{ko,en,ja,zh}.ts`의 `rulebook` / `setupDirection` 키

### 법적 카피 정돈 (공개 저장소)
- "평생 50% 할인" → "기간 한정 할인 (구체 조건 추후 공지)"
- "공동 창설자" → "얼리 액세스 멤버"
- "제품 크레딧 등재" → "알파 기여자 명시"
- 적용: README.md / SUPPORT.md / docs/manifesto.md (4언어 카피 블록)

### 프로젝트 상태 (2026-05-12 최신 — 이전 2026-04-24 stale 정정)
- 테스트: **3,912 passing** / 360 suites (2026-06-03 `npx jest` 실측). 4건 사전 실패(WorldTab×3 · useJournalEngineMode×1 — repair 무관, 별도 follow-up). 이전 "3,772/350"·"3,304" stale → 정정
- 타입: **0 errors** (strict)
- Lighthouse A11y: `/` 96 · `/studio` 100 · `/translation-studio` 100 — **3 페이지 측정** (이전 "5 페이지 100/100" 주장 정정. 나머지 2 페이지 측정은 ROADMAP §2.1 일정)
- 보안: P0 6건 + P1 13건 + 2026-05-10 INTERNAL 7건 + 2026-05-12 bug-hunt R/B/O/S 6건 수리 + **2026-06-03 정밀 진단 Round 7: N-01(공유 DB store 레이스)·P-01(SSE 재연결 누수)·P-06(토스트 33Hz) 수리, S-02(nonce CSP) 전용 패스 보류**
- 단계: **알파** (브릿G 장르문학 작가 50명 얼리 액세스 모집 중)

---

## 2026-04-19 v2.1 업데이트

### 보안 감사 (커밋 3419e3a2)
- 전수 1,292 파일 스캔 → P0 6 + P1 13 수리
- 주요 P0: GlossaryPanel XSS / PreviewPanel iframe sandbox / CLI shell injection × 3 / autopilot config

### 3루프 정밀 진단 (e80a2fca → 7834b0f4 → 047ff905)
- Loop 1: 790 파일 전수 Read / 69 수리 (saga AI 이중 호출 / suggest ReferenceError 등 진짜 P1)
- Loop 2: 회귀 검증 + 크로스파일 통합 + 이월 6건
- Loop 3: 최종 + 구 표면 잔재 정리

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
- 구 표면 역할 기반 숨김
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

## E2E 테스트 인프라 (2026-06-24 기준)

- `playwright.config.ts`
- 현재 Playwright E2E 활성 spec: 총 `17개`
- 공개 표면/은퇴 표면 회귀:
  - `e2e/smoke-routes.spec.ts`
  - `e2e/network.spec.ts`
  - `e2e/tools-about.spec.ts`
  - `e2e/edge-routes.spec.ts`
  - `e2e/security-headers.spec.ts`
  - `e2e/regression-critical.spec.ts`
- Studio/Translation 핵심 표면:
  - `e2e/studio.spec.ts`
  - `e2e/translation-studio.spec.ts`
  - `e2e/mobile-smoke.spec.ts`
  - `e2e/resilience-network.spec.ts`
- Loreguard 핵심 흐름:
  - `e2e/loreguard-project-import-file-picker.spec.ts`
  - `e2e/loreguard-authoring-to-export-persistence.spec.ts`
  - `e2e/loreguard-submission-package-export-verify.spec.ts`
  - `e2e/byok-api-settings-commercial.spec.ts`
- 반응형/접근성/백업:
  - `e2e/loreguard-design-a11y.spec.ts`
  - `e2e/scenarios/12-backup-tiers.spec.ts`
  - `e2e/scenarios/23-mobile-viewport.spec.ts`

2026-06-24 정리 메모:

- `2026-06-15` 이전 수정 시각의 구형 E2E spec 39개는 정리됨.
- 오래된 개별 시나리오 문서가 남아 있더라도, 현재 기준선은 위 17개 활성 spec 이다.

## 카테고리 선언 (2026-04-18 신규)

Loreguard는 "하라 시장"(제작 도구)의 카테고리 창시자.
- 해줘 시장 (소비): Sudowrite, Novelcrafter 등
- 하라 시장 (제작): **Loreguard (유일)**
- 레퍼런스: Adobe, VS Code, Logic Pro 계열

상세: `docs/category-declaration.md` / `docs/brand-philosophy.md` Part 13
현재 문서 기준: `docs/README.md` / `docs/ARCHITECTURE.md` / `docs/CLEANUP-STATUS.md`

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

## Design System v8.0 규칙

- **시맨틱 토큰 필수**: `bg-bg-primary`, `text-text-primary`, `border-border` — raw Tailwind 금지
- **z-index 변수**: `var(--z-dropdown)`, `var(--z-overlay)`, `var(--z-modal)`, `var(--z-tooltip)` — 숫자 하드코딩 금지
- **4px 배수 간격**: `--sp-xs`(4px) ~ `--sp-2xl`(32px) — 비4배수 금지
- **터치 타겟**: 최소 44px
- **포커스**: `focus-visible:ring-2 ring-accent-blue` — `outline: none` 단독 금지
- **상태 표시**: 색상 + 아이콘 + 텍스트 최소 2가지 조합
- **검증 기준**: 현재 앱에서 실제 사용하는 스타일·접근성 검사와 토큰 규칙을 우선한다.

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
| Ollama/LM Studio | local-model | Local / development API path. DGX/Qwen vLLM is an internal compatible endpoint, not the Hosted default. |
