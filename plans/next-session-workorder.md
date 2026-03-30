# 다음 세션 작업 지시서

> 생성일: 2026-03-30 | 기준 커밋: `80fb699` (master)
> 프로덕션: ehsu.app / ehuniverse.com — 배포 정상 (READY)

---

## 현재 상태 요약

### 이번 세션 완료 (16건)

| # | 작업 | 커밋 |
|---|------|------|
| 1 | CodeStudioShell 1,721줄 → 3파일 분리 (963+369+514) | cb8ae6a |
| 2 | aria-label 35+ 요소 + skip-nav 추가 (21파일) | cb8ae6a |
| 3 | CN 번역 용어 수정 (色情→性描写) | cb8ae6a |
| 4 | logger.ts 생성 + console→logger 38파일 전환 | cb8ae6a |
| 5 | ErrorBoundary 3개 → 1개 통합 (variant prop) | cb8ae6a |
| 6 | Suspense 2→6 경계 + SkeletonLoader + loading.tsx 3개 | cb8ae6a |
| 7 | 컴포넌트 테스트 22 suites / 60 cases 추가 | cb8ae6a |
| 8 | code-studio-*.ts 119개 → 6디렉토리 + shim 역호환 | cb8ae6a |
| 9 | CSP nonce middleware, script-src unsafe-inline 제거 | cb8ae6a |
| 10 | JSDoc 55개 export 함수 문서화 | cb8ae6a |
| 11 | Code Studio layout ErrorBoundary 추가 | 80fb699 |
| 12 | dangerouslySetInnerHTML 7건 보안 문서화 | 80fb699 |
| 13 | API 타임아웃 30초 (3라우트) | 80fb699 |
| 14 | /api/vitals CSRF Origin 검증 | 80fb699 |
| 15 | lang==="ko" 102건 → L4() 전환 (5파일) | 80fb699 |
| 16 | 브랜치 정리 5개 삭제 + 서류 최신화 | 2094799 |

### QA 결과
- `next build`: ✅ 통과
- 컴포넌트 테스트 22/22: ✅ 통과
- 기존 테스트 리그레션: 0건
- Vercel 프로덕션: ✅ READY

---

## 잔여 작업 (우선순위순)

### P1 — 대형 리팩터링 (에이전트 팀 권장)

#### 1. WorldSimulator 2,084줄 God 컴포넌트 분리
- **파일**: `src/components/WorldSimulator.tsx` (2,084줄, 25+ useState)
- **목표**: 3~4파일로 분리 (Shell + MapView + SimulationEngine + EventLog)
- **참고**: CodeStudioShell 분리 패턴 동일 적용
- **예상 점수 영향**: Complexity +10점

#### 2. 레이어 위반 수정 — hooks 브릿지 18개 컴포넌트
- **이슈**: 18개 컴포넌트가 hooks 없이 `@/lib/ai-providers` 직접 import
- **대상 파일**:
  ```
  ApiKeyHydrator.tsx, AIHub.tsx, ModelSelector.tsx, ModelSwitcher.tsx,
  TerminalPanel.tsx, ApiKeyModal.tsx, AutoRefiner.tsx, ChapterAnalysisView.tsx,
  InlineRewriter.tsx, ItemStudioView.tsx, MultiKeyPanel.tsx, PlanningView.tsx,
  ResourceView.tsx, SettingsView.tsx, StyleStudioView.tsx, TabAssistant.tsx,
  WorldAnalysisView.tsx, WorldStudioView.tsx
  ```
- **전략**: `useAIProvider()` 커스텀 훅 생성 → 컴포넌트에서 직접 import 제거
- **예상 점수 영향**: Architecture +8점

### P2 — i18n `lang==="ko"` 잔여 149건

파일별 잔존 현황 (5건 이상만):
```
WorldSimulator.tsx          18건
NetworkLogNewClient.tsx     15건
BoardPostDetailClient.tsx   12건
SceneSheet.tsx               9건
NetworkNewClient.tsx          9건
CodeStudioShell.tsx           9건
noa-tower/page.tsx            9건
CommentSection.tsx            8건
AuditPanel.tsx                6건
```
- **전략**: L4() 헬퍼 패턴 동일 적용 (이번 세션 5파일 완료분 참고)
- **주의**: WorldSimulator는 P1-1 분리 후 처리 권장 (충돌 방지)

### P3 — 품질 강화

#### 3. studio/page.tsx 1,627줄 분리
- 33 useState — CodeStudioShell 동일 패턴 적용 가능

#### 4. 테스트 커버리지 확대
- 현재: 22 컴포넌트 suites + 기존 lib 테스트
- 목표: 주요 hooks 테스트 10건 추가 (useStudioAI, useCodeStudioComposer 등)
- E2E 시나리오: studio 글쓰기 플로우, code-studio 파일 열기 플로우

#### 5. style-src unsafe-inline 제거
- CSP에서 style-src 'unsafe-inline' 유지 중 (243건 인라인 스타일 때문)
- Tailwind class 전환 후 nonce 기반으로 교체 가능

---

## 에이전트 팀 배치 권장

```
Wave 1 (병렬):
  Agent A: P1-1 WorldSimulator 분리 (components/ only)
  Agent B: P1-2 useAIProvider 훅 + 18파일 마이그레이션 (hooks/ + components/)
  Agent C: P2 lang==="ko" 잔여 149건 전환 (network/ + code-studio/ + studio/)

Wave 2 (후속):
  Agent D: P3-3 studio/page.tsx 분리
  Agent E: P3-4 hooks 테스트 10건

Wave 3:
  QA: 빌드 + 린트 + 전체 테스트 + 미연결 스캔
```

---

## 주의사항

1. **lib/code-studio/ shim 구조**: 기존 import 경로(`@/lib/code-studio-*.ts`)는 shim으로 유지됨. 새 코드는 shim 경로 사용 가능 (barrel index 미사용)
2. **ErrorBoundary**: 통합 컴포넌트 `@/components/ErrorBoundary` 사용, variant prop 필수
3. **logger**: `@/lib/logger` 사용 필수, console.* 직접 사용 금지
4. **i18n**: L4() 패턴 사용, `lang === "ko" ?` 바이너리 패턴 금지
5. **CSP**: `src/middleware.ts`가 모든 보안 헤더 관리, next.config.ts에서 헤더 설정하지 않음
