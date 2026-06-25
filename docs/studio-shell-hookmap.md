# StudioShell.tsx — Hook Map (P16 루프3 — 2026-06-08)

**File:** `src/app/studio/StudioShell.tsx` (1495 lines)
**Purpose:** Novel Studio (집필 스튜디오) shell — 51+ hooks 오케스트레이션.
**Maintenance:** 신규 hook 추가 시 본 문서 갱신 의무.

## ASCII DAG — 데이터 흐름 (high-level)

```
                 ┌──────────────┐
                 │  AuthContext │ (외부 Provider)
                 └──────┬───────┘
                        │ user, accessToken
                        ▼
        ┌───────────────┴────────────────┐
        │ useLang / useRouter / pathname │ (Next.js)
        └───────────────┬────────────────┘
                        │ lang, pathname
                        ▼
   ┌────────────────────┼────────────────────┐
   │                    │                    │
   ▼                    ▼                    ▼
 useProjectManager  useStudioMounts    useSessionSnapshot
   │ pm.projects        │ mountMap          │
   │ currentProject     │                   │
   ▼                                        │
 useStudioAI                                │
   │ pipeline events                        │
   ▼                                        │
 setPipelineResult                          │
   │                                        │
   ▼                                        ▼
 useAutoVersionSnapshot          useCreativeEventLogger
                                     │
                                     ▼
                            useCreativeProcessAutoTrigger
```

## Hook 목록 (등록 순)

| # | Hook | Line | 책임 | 의존성 | Side-effect |
|---|------|------|------|--------|-------------|
| 1 | `useLang` | 102 | 4 언어 (ko/en/ja/zh) 상태 | LangContext | localStorage |
| 2 | `useRouter` | 103 | Next.js navigation | next/navigation | history.push |
| 3 | `usePathname` | 104 | 현재 path 추적 | next/navigation | — |
| 4 | `useSessionSnapshot(pathname)` | 116 | session 정보 | pathname | — |
| 5 | `useCmdPalette` | 124 | Ctrl+P 팔레트 | action-registry | keyboard-manager |
| 6 | `useIsMobile` | 134 | viewport 감지 | window.matchMedia | resize listener |
| 7 | `useStudioMounts` | 169 | 모듈 마운트 매니저 | language | — |
| 8 | `useEnvironmentSanity` | 171 | env 검증 | next/env | console.warn |
| 9 | `useProjectManager` | 173 | 프로젝트 CRUD | language | IndexedDB |
| 10 | `useAutoVersionSnapshot` | 196 | 자동 스냅샷 | projects | IndexedDB |
| 11 | `useStorageQuota` | 200 | IndexedDB 용량 | navigator.storage | event |
| 12 | `useCreativeProcessAutoTrigger` | 204 | 창작 로그 자동 | projects, currentProjectId | dispatch event |
| 13 | `useCreativeEventLogger` | 212 | 창작 이벤트 | currentProjectId | localStorage |
| 14 | `useStudioAI` | (서치) | AI 파이프라인 | provider, key | DGX SSE |
| 15 | `useAuth` | 329 | Firebase auth | AuthContext | onAuthStateChanged |
| 16+ | (35+ 추가 hooks) | — | (이하 inline) | — | — |

## 7-Phase 매핑 (Novel IDE)

| Phase | 관련 hook | Components |
|-------|----------|-----------|
| 1 GitHub sync | `useGitHubSync` | `NovelIDELauncher` |
| 2 Serializer | `useProjectManager` | `project-serializer.ts` |
| 3 Tiptap editor | (별도 NovelEditor) | `NovelEditor.tsx` |
| 4 Episode tree | `useStudioMounts` | `EpisodeExplorer.tsx` |
| 5 Hybrid context | (engine/pipeline) | — |
| 6 Branch | (parallel-universe-state.ts) | `BranchSelector.tsx` |
| 7 Tab autocomplete | `useInlineCompletion` | `extensions/inline-completion.ts` |

## Performance 주의

- `useCallback` / `useMemo` 미사용 시 prop drilling 발생 — `useStudioAI` 의 callback 은 ref 안정화 패턴 사용.
- 51 hooks → 마운트 비용 큼. lazy mount (dynamic import) 로 OSDesktop / MobileStudioView / StudioOverlayManager 분할.
- `useStudioMounts` 가 18개 도구함 마운트 매니저 — `showToolbox=false` 시 mount X.

## 호출 순서 정책

1. **외부 Provider 의존** (useAuth / useLang) → 가장 먼저.
2. **Next.js navigation** (useRouter / usePathname) → 그 다음.
3. **Studio 도메인 hooks** (useProjectManager / useStudioAI) → 위 의존성에 묶임.
4. **side-effect hooks** (useAutoVersionSnapshot / useStorageQuota) → 가장 늦게 — 데이터 준비 후.

## 신규 hook 추가 가이드

```ts
// 1. useStudioMounts 와 비슷한 책임이면 useStudioMounts 안에 통합 검토.
// 2. 단순 effect 면 useEffect 직접 사용 권장 (hook 분해 비용 회피).
// 3. 5+ hooks 가 같은 책임이면 별도 hook 으로 추출 (예: useStudioAI 추출 패턴).
// 4. 본 문서에 행 추가 — line / 책임 / 의존성 / side-effect 4 컬럼.
```

## References

- `src/app/studio/StudioShell.tsx` — 본문
- `src/lib/studio-types.ts` — 타입 정의 (read-only, no-edit list)
- `src/app/studio/StudioMainContent.tsx` — 자식 컴포넌트
- AGENTS.md § 7-Phase Novel IDE — 단계별 매핑
