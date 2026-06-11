# 0007. Studio Context — God Object 해체 (4 도메인 sub-context)

- Status: Proposed
- Date: 2026-06-08
- Deciders: 프로젝트 오너
- Related: [0003 4-way 키 표준](0003-keymap-and-codex-domain-selector-mount.md)

## Context

루프 1 / priority 2 검출:
`src/app/studio/StudioContext.tsx` 의 `StudioContextValue` 인터페이스가 **157 필드의 God Object 패턴**.
초급 개발자가 진입 시 한 인터페이스의 책임 경계를 파악할 수 없어 onboarding 학습곡선이 가팔라짐.

### 현재 필드 분포 (실측)

| 도메인 | 필드 수 (개략) | 예시 |
|---|---|---|
| Writing | ~40 | `editDraft` / `setEditDraft` / `writingMode` / `canvasContent` / `promptDirective` / `advancedSettings` |
| Session | ~25 | `currentSession` / `sessions` / `projects` / `currentProjectId` / `hydrated` |
| UI | ~50 | `focusMode` / `isSidebarOpen` / `showSearch` / `showShortcuts` / `showGlobalSearch` / `activeTab` / `showDashboard` / `showToolbox` / `rightPanelOpen` |
| Config | ~20 | `themeLevel` / `toggleTheme` / `setConfig` |
| AI | ~20 | `isGenerating` / `lastReport` / `directorReport` / `tokenUsage` / `handleSend` / `handleCancel` / `handleRegenerate` / `hfcpState` |

### 문제

1. **학습곡선**: 신입은 어느 필드가 어느 책임인지 모름.
2. **불필요한 리렌더**: 한 필드 변경 시 모든 컨슈머 리렌더 (Context provider 의 단일 value).
3. **테스트 보일러플레이트**: 단위 테스트마다 157 필드 mock 필요.
4. **수정 위험**: 한 필드 시그니처 변경 시 영향 범위 파악 어려움.

## Decision (제안)

`StudioContextValue` 를 4 sub-context 로 분해:

```
<StudioConfigProvider>     ← 테마/언어/세팅
  <SessionStateProvider>   ← 프로젝트/세션
    <WritingStateProvider> ← 원고/씬/에피소드 + AI
      <UIStateProvider>    ← 모달/패널/탭
        {children}
      </UIStateProvider>
    </WritingStateProvider>
  </SessionStateProvider>
</StudioConfigProvider>
```

각 sub-context 는 자기 도메인 hook 만 노출:
- `useStudioConfig()` / `useSessionState()` / `useWritingState()` / `useUIState()`

기존 `useStudio()` 는 deprecated 마킹 + 4 sub-hook 으로 점진 마이그레이션.

## Consequences

### 장점
- 도메인 경계 명확화 → 신입 onboarding 진입장벽 ↓
- 리렌더 격리 (UI state 변경 → Writing 컨슈머 리렌더 X)
- 단위 테스트 mock 보일러플레이트 ↓ (도메인별)

### 비용
- 마이그레이션 영향 범위: 100+ 컨슈머 파일 (`useStudio()` 호출처 전수 변경).
- Provider tree depth 증가 (4 layer) — 성능 영향 미미하나 React DevTools 노이즈 ↑.
- 한 컴포넌트가 여러 도메인 필요 시 hook 호출 수 증가.

## Migration Plan (Phase 4)

1. **Phase 4-1 (구조 추가)**: 4 sub-context + provider 추가. 기존 `StudioContext` 와 병존.
2. **Phase 4-2 (점진 마이그레이션)**: 신규 코드는 sub-hook 사용. 기존 코드는 그대로.
3. **Phase 4-3 (전수 변환)**: 100+ 컨슈머 파일 자동 codemod (`useStudio()` → 4 분리 hook).
4. **Phase 4-4 (제거)**: 기존 `StudioContext` 폐기. ADR-0007 → Accepted.

## Status: Proposed (시공 보류)

이 ADR 은 priority 2 검출 시점에 작성. 시공은 별도 일정 (Phase 4) 으로 분리:
- 영향 범위: 100+ 파일.
- 회귀 리스크: 기존 테스트 3,900+ 케이스 재실행 + Studio 페이지 수동 검증.
- 시공 트리거: claude3 "신입 onboarding 평균 시간" 측정 후 의사결정.
