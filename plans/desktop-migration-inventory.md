# Phase A-1 — 보존/삭제 인벤토리

작업 브랜치: `feat/desktop-only-migration`
스냅샷 커밋: `b9a434e`
시작일: 2026-04-07

---

## CS 직접 의존 (17개 import)

| import 경로 | 분류 |
|---|---|
| `components/code-studio/ui/ProgressBar` | 내부 |
| `lib/LangContext` | i18n 컨텍스트 |
| `lib/ai-providers` | provider 정의 |
| `lib/code-studio/ai/agents` | 엔진 |
| `lib/code-studio/audit/audit-types` | 타입 |
| `lib/code-studio/core/adr` | 엔진 |
| `lib/code-studio/core/composer-state` | 엔진 |
| `lib/code-studio/core/design-system-spec` | 디자인 토큰 |
| `lib/code-studio/core/module-profile` | 엔진 |
| `lib/code-studio/core/store` | 스토어 |
| `lib/code-studio/core/types` | 타입 |
| `lib/code-studio/pipeline/code-rhythm` | 파이프라인 |
| `lib/code-studio/pipeline/cognitive-load` | 파이프라인 |
| `lib/code-studio/pipeline/migration-audit` | 파이프라인 |
| `lib/code-studio/pipeline/pipeline` | 파이프라인 |
| `lib/logger` | 공용 |
| `types/code-studio-agent` | 타입 |

## CS 간접 의존 (lib/code-studio 내부 → 외부)

- `cli/core/good-pattern-catalog` ⚠️ CLI 영역 의존 (Quill 엔진으로 이전 필요)
- `lib/multi-key-bridge`, `lib/multi-key-manager` (Firebase 연동 — 데스크탑은 keystore로 교체)
- `lib/firebase` (BYOK sync — 제거 후 keystore IPC로 대체)
- `lib/i18n` (LangContext가 사용)
- `lib/code-studio/ai/ari-engine` (ARI Circuit Breaker)

---

## 최소 보존 셋 (renderer)

```
renderer/
├── app/code-studio/                       # 4 files (page/layout/loading/error)
├── components/code-studio/                # 86 files
├── components/ui/                         # 공용 UI 프리미티브
├── components/ErrorBoundary.tsx
├── hooks/useCodeStudio*.ts                # 7 files
├── hooks/useAIProvider.ts                 # CS chat 의존
├── hooks/useUndoRedo.ts                   # CS 에디터 의존 (확인 필요)
├── hooks/useAppDialog.tsx                 # 공용 다이얼로그
├── lib/code-studio/                       # 124 files (추후 quill-engine 분리)
├── lib/{ai-providers,logger,LangContext,i18n}.ts
├── lib/multi-key-{bridge,manager}.ts      # firebase 의존 제거 후
├── types/code-studio-agent.ts
└── types/                                 # CS 타입만
```

## Quill 엔진 추출 대상 (→ packages/quill-engine)

| 파일 수 | 경로 | 비고 |
|---|---|---|
| 1 | `renderer/cli/core/quill-engine.ts` | 본체 |
| 1 | `renderer/cli/core/detector-registry.ts` | 레지스트리 |
| 1 | `renderer/cli/core/rule-catalog.ts` | 룰 카탈로그 |
| 1 | `renderer/cli/core/deep-verify.ts` | 깊은 검증 |
| 228 | `renderer/cli/core/detectors/**` | api/sec/rte/log/typ/cmx/asy/prf/var/syn/stl/tst/res/err/cfg/aip |
| 1 | `renderer/cli/core/good-pattern-catalog.ts` | 좋은 패턴 |
| ~10 | `renderer/lib/code-studio/audit/**` | audit-engine, audit-quality, audit-types |
| ~? | `renderer/lib/code-studio/pipeline/**` | code-rhythm, cognitive-load, migration-audit |
| 1 | `renderer/lib/code-studio/core/scope-policy.ts` | Scope Policy |
| 1 | `renderer/lib/code-studio/ai/ari-engine.ts` | ARI Circuit Breaker (순수 로직만 추출) |
| 5 | `renderer/cli/ai/{cross-judge,planner,team-lead,verify-orchestrator,precision-checklist}.ts` | 검증 AI 로직 |

**원칙:** 엔진은 Pure TS — Node API(`fs`, `child_process`, `path` 등) 의존 금지. 호출자가 어댑터 주입.

## Quill CLI 추출 대상 (→ packages/quill-cli)

| 경로 | 내용 |
|---|---|
| `renderer/cli/bin/cs.ts` | CLI 엔트리 |
| `renderer/cli/commands/**` | apply/audit/bench/bookmark/compliance/config/explain/fun/generate/init/ip-scan/learn/playground/preset/report/serve/sprint/stress/suggest/verify/vibe |
| `renderer/cli/adapters/**` | ast-engine/debug/dep-analyzer/fs/git-{deep,enhanced}/lint/local-model/lsp/multi-lang/perf/sandbox/search/security/terminal/test/web-quality/worker-pool |
| `renderer/cli/formatters/receipt.ts` | 출력 포맷 |
| `renderer/cli/tui/{diff-preview,progress}.ts` | TUI |
| `renderer/cli/{daemon,index}.ts` | 데몬/엔트리 |
| `tsconfig.cli.json` | CLI 빌드 설정 |

총 CLI 영역 ~316 파일 — 그중 detectors 228개 빼고 나머지가 quill-cli 본체.

---

## 삭제 대상 — 카테고리별

### A-2-1. 임시 산출물 (이미 gitignore됨, 물리 삭제만)

```
build*.log, build_err.txt, out.log, tmp_*.txt, verify_output.txt, tsc-errors.txt
e2e_out*.log, test_*.log
dist/                                       # 982M Electron output
coverage/                                   # 17M
playwright-report/, test-results/
```

### A-2-2. 백업 폴더

```
renderer/app/_backup_2026-04-02/            # 빈 폴더
renderer/app/_backup_theme_original/        # 빈 폴더
renderer/app/_brand/                        # 빈 폴더
```

### A-2-3. API routes (정적 export 시 무력)

```
api_logic/                                  # parked routes (28개)
excluded_routes/
renderer/app/api/                           # (있다면)
```

→ 추후 main/ipc/ 로 포팅. 지금은 보존(parking)

### A-2-4. Sentry/Firebase/Vercel/Playwright 설정

```
sentry.client.config.ts, sentry.edge.config.ts, sentry.server.config.ts
instrumentation.ts
firebase.json, firestore.indexes.json, firestore.rules
vercel.json
playwright.config.ts, e2e/
```

### A-2-5. 웹 전용 라우트 (renderer/app/)

이미 대부분 삭제됨. 남은 것:

```
renderer/app/{layout,page,loading,error,not-found}.tsx → CS용으로 재작성
renderer/app/{apple-icon,icon,favicon}.* → 유지 (앱 아이콘)
renderer/app/globals*.css → 통합/정리
```

### A-2-6. 웹 전용 components/hooks/lib/data/engine

```
renderer/components/{studio,network,translator,tools,world-simulator,home,layout}/
renderer/components/{Header,StarField,WorldSimulator,DeferredClientMetrics,
  ErrorReporterInit,MainContentRegion,PWAInstallButton,WebFeaturesInit,
  WebVitalsReporter,SkeletonLoader,ApiKeyHydrator}.tsx
renderer/hooks/{useStudio*,useTranslation,useFeatureFlags,useSVIRecorder,
  useSessionRestore,useTTS,useWebFeatures,useWritingChat,useProjectManager}.ts
renderer/lib/articles*.ts, renderer/lib/articles.ts
renderer/lib/{AuthContext,UnifiedSettingsContext}.tsx
renderer/lib/{firebase,firestore-service-rest,firebase-id-token}.ts
renderer/lib/{stripe,supabase}.ts
renderer/lib/{network,network-*,vertex-network-agent}.ts
renderer/lib/{translation,translations-*,studio-translations,
  translator-*,use-code-studio-translations}.ts
renderer/lib/{visual-*,planning-presets,demo-presets,scene-share,
  studio-share-serialize,studio-types,studio-constants,studio-entry-links,
  studio-ai-backend-label,export-utils,build-prompt,style-benchmarks}.ts
renderer/lib/{report-categories,noi-auto-tags,grammar-packs,typo-detector,
  google-genai-server,server-ai,vertex-app-builder,fetch-url-guard}.ts
renderer/lib/{tier,tier-gate,token-utils,rate-limit,api-logger,
  analytics,error-reporter,error,errors,project-migration,
  project-normalize,project-sanitize,indexeddb-backup,show-alert,
  i18n,feature-flags,force-graph}.ts
renderer/lib/network/, renderer/lib/translation/, renderer/lib/tools/,
renderer/lib/web-features/, renderer/lib/noa/, renderer/lib/electron/,
renderer/lib/hooks/, renderer/lib/browser/
renderer/data/reports/
renderer/engine/
renderer/services/
renderer/store/                             # studio-ui-store 등
```

⚠️ 주의: `lib/logger`, `lib/ai-providers`, `lib/multi-key-*`, `lib/LangContext`, `lib/i18n` 은 CS 의존 → **유지**

### A-2-7. 의존성 dry-run

각 카테고리 삭제 후:
```bash
pnpm tsc --noEmit -p renderer/tsconfig.json
```
→ 깨진 import 발견 시 stub 또는 진짜 삭제 대상으로 판정

---

## A-2 실행 순서 (커밋 단위)

1. `chore(cleanup): remove temp build artifacts and logs` → A-2-1
2. `chore(cleanup): remove empty backup folders` → A-2-2
3. `chore(cleanup): remove sentry/firebase/vercel/playwright config` → A-2-4
4. `chore(cleanup): remove studio (writing) module` → A-2-6 일부
5. `chore(cleanup): remove network module` → A-2-6 일부
6. `chore(cleanup): remove translator module` → A-2-6 일부
7. `chore(cleanup): remove tools/world-simulator module` → A-2-6 일부
8. `chore(cleanup): remove web-only lib utilities` → A-2-6 마무리
9. `chore(cleanup): purge web-only hooks and contexts` → A-2-6 마무리
10. `chore(cleanup): drop web app routes (keep code-studio only)` → A-2-5
11. `chore(cleanup): retire web data and engine` → data/, engine/, services/

각 단계 후 `git status` + 깨진 import 점검.

⏸️ **api_logic/, excluded_routes/ 는 일단 보존** (A-2-3) — 추후 main/ipc/ 로 포팅 시 참조용.
