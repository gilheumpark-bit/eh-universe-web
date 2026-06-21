# 0002. Provider Initialization Contract

- Status: Accepted
- Date: 2026-06-08
- Deciders: 프로젝트 오너
- Supersedes: 없음 (신규)
- Related: `src/app/layout.tsx`

## Context

루프 2 P17 — `layout.tsx` 가 7 provider 를 마운트하지만 마운트 순서·의존성·실패 모드가 코드로만 표현됨. 신규 provider 추가 시 순서 잘못으로 (예: UserRole 이 Auth 위에 마운트) 런타임 null guard 통과/탈락이 미묘하게 변동될 수 있음.

본 ADR 은 현재 마운트 순서를 명세화하고, 의존성·실패 모드를 문서화한다.

## Decision

### 1) Provider 마운트 순서 (outer → inner)

```
<AuthProvider>                  // L1 — Firebase Auth state
  <LangProvider>                // L2 — i18n (4 lang) — ErrorReporter / 안내 메시지에 사용
    <UnifiedSettingsProvider>   // L3 — global settings (theme/font/api keys hint)
      <UserRoleProvider>        // L4 — depends on Auth (writer/translator/dev role)
        <Children>              // page content
      </UserRoleProvider>
    </UnifiedSettingsProvider>
  </LangProvider>
</AuthProvider>

// 사이드 effect 컴포넌트 (Provider 외부):
<ErrorReporterInit />            // S1 — i18n 가 있어야 사용자 메시지 번역
<WebFeaturesInit />              // S2 — Service Worker 등록 (Auth/Lang 무관)
<A11yCheckInit />                // S3 — dev only, axe-core 주입
```

### 2) 의존성 명세

| Provider | depends on | reason |
|---|---|---|
| AuthProvider | (none) | Firebase SDK 직접 호출. 가장 outer. |
| LangProvider | (none) | cookie + accept-language SSR. |
| UnifiedSettingsProvider | LangProvider | 설정 라벨이 i18n 사용. |
| UserRoleProvider | AuthProvider | 사용자 role 은 Auth user claims 기반. |
| ErrorReporterInit | LangProvider | 에러 메시지 사용자 표시는 4 언어. |
| WebFeaturesInit | (none) | Service Worker / Web APIs — Auth 무관. |
| A11yCheckInit | (none, dev only) | axe-core 주입은 환경 무관. |

### 3) 실패 모드

| 컴포넌트 | 실패 시 동작 | 정당화 |
|---|---|---|
| AuthProvider | Firebase init 실패 → `user = null` 유지, 게이트 차단 | 인증 없이도 공개 페이지 접근 가능 |
| LangProvider | cookie/header 모두 없음 → `ko` 폴백 | 80%+ 사용자가 한국어, 안전한 기본값 |
| UnifiedSettingsProvider | localStorage 차단 → defaults | private mode 사용자 차단 회피 |
| UserRoleProvider | claims 없음 → `writer` 기본 | 신규 사용자 가장 흔한 시나리오 |
| ErrorReporterInit | Sentry SDK 실패 → silent | observability 1 채널 손실, 사용자 영향 0 |
| WebFeaturesInit | SW 등록 실패 → degraded online-only | 오프라인 캐시만 손실 |
| A11yCheckInit | dev only — production 영향 0 | axe-core dynamic import |

### 4) 신규 Provider 추가 시 체크리스트

1. 본 ADR 의 의존성 표에 추가
2. layout.tsx 의 nesting 위치 결정 (의존성 outer 에)
3. 실패 모드 명시 (graceful degrade vs. 게이트 차단)
4. 단위 테스트 — 의존 provider 미마운트 시 throw 또는 fallback 동작 확인

### 5) 비결정 사항 (현재는 단순화 유지)

- Provider 마운트 순서 type-level 강제 (Brand type 또는 `SafeProviderOrder`) — 현재 단순 7 provider 에서는 ADR + 코드 리뷰로 충분. provider 가 12+ 가 되면 재검토.
- ModalProvider 는 page-level 마운트 (StudioShell 등 표면별 Shell 내부) — layout.tsx 외부.
- GradeProvider 는 창작/검증 표면별로 필요할 때 page-level 마운트 — global 아님.

## Consequences

### Positive
- Provider 순서·의존성·실패 모드 단일 참조 문서
- 신규 provider 추가 시 ADR 업데이트만으로 의도 전달
- production incident 시 "어느 provider 실패가 어떤 사용자 영향" 명확

### Negative
- ADR 유지 보수 비용 (provider 추가 시 본 문서 함께 수정)

### Mitigation
- layout.tsx 헤더 코멘트에 본 ADR 링크 추가 (별도 commit)
- 신규 provider 추가 PR template 에 ADR 갱신 체크박스
