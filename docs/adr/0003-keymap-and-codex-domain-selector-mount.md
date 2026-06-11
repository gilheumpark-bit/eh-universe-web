# 0003. 4-way 키 표준 + CodexDomainSelector 단일 마운트

- Status: Accepted
- Date: 2026-06-07
- Deciders: 프로젝트 오너
- Supersedes: 없음 (신규)

## Context

채팅 버전 5 영역(Studio / Code Studio / Translation Studio / Network / Codex) 정찰 결과:

- **팔레트 3중 등록**: `useCmdPalette` + `useStudioKeyboard` + 직접 `window.keydown` 핸들러가 동일 키(Ctrl+P 등)를 분산 등록 → 우선순위 암묵적, 디버깅 난항
- **Ctrl+P 충돌**: 브라우저 인쇄 vs 명령 팔레트 — 명시적 표준 없이 영역별 다른 동작
- **CodexDomainSelector 분산 마운트**: 현재 `SettingsView.tsx` Advanced 섹션(L364) + `app/codex/page.tsx` 헤더 등 다중 위치에서 마운트 가능성. localStorage 동일 키 사용 시 race
- **언어 자동 선택 부재**: AppLanguage(KO/EN/JP/CN) ↔ AgentLanguage(ko/en/ja/zh) 변환은 `lang-normalize.ts`로 통합됐으나, Codex 도메인 기본값이 현재 작품 언어로 자동 선택되지 않음

채팅 버전 Claude Code 수준 격차 해소 Batch 1의 6 rank 중 **rank 2 · 4 · 8 · 14 · 15 모두 키 바인딩 또는 CodexDomainSelector 마운트 위치에 의존**. 본격 시공 전 표준 확정 필요.

## Decision

### 1) 4-way 키 표준

| 키 | 영역 | 기능 |
|---|---|---|
| `Ctrl+P` | **Novel Studio** (`/studio`) | 명령 팔레트 (탭 전환 · AI 액션 · 검색) |
| `Ctrl+K` | **Code Studio** (`/code-studio`) | Quick Access 8버튼 그리드 (자주 쓰는 액션 즉시 진입) |
| `Ctrl+Shift+P` | **Code Studio** (`/code-studio`) | 기존 Command Palette (전체 명령 검색·실행, fuzzy) — 유지 |
| `Cmd+Shift+K` (mac) / `Ctrl+Shift+K` (win) | **글로벌** | Codex 진입 — 어디서나 호출 가능. 작품 언어 → 도메인 자동 선택 |

**브라우저 Ctrl+P (인쇄) 처리**:
- Studio 페이지에서만 `preventDefault` (명령 팔레트 우선)
- 그 외 페이지에서는 브라우저 기본 동작 유지
- Studio 내 인쇄는 `Ctrl+Alt+P` 또는 팔레트 액션 `print-current-tab`으로 대체

**Translation Studio (`/translation-studio`) 키**: rank 4에서 `Cmd+K` 도입 예정. Code Studio `Ctrl+K`와 영역 분리되어 충돌 없음 (같은 페이지 동시 존재 불가). 단축키 등록 시 `pathname`으로 영역 가드.

### 2) CodexDomainSelector 단일 마운트

**최종 마운트 위치 2곳만 허용**:

1. **`app/codex/page.tsx` 헤더** (Codex 페이지 진입 시 항상 표시 — 주 마운트)
2. **`components/studio/SettingsView.tsx` Advanced 섹션** (기존 위치 — 영구 설정용)

**금지**:
- Studio 본문 영역, Translation Studio 본문, Network 본문 등 그 외 위치에 추가 마운트 금지
- 같은 localStorage 키 (`codex_domain_v1`) 동시 쓰기 race 방지 — 두 마운트 간 동기화는 `storage` 이벤트로 자동

**rank 14 시공 순서**:
- (a) `SettingsView.tsx`는 기존 위치 유지
- (b) `app/codex/page.tsx`에 헤더 마운트 신규 추가 — 사용자가 Codex 페이지에서 즉시 변경 가능

### 3) 도메인 ↔ 언어 매핑 (rank 15 자동 선택용)

`useDomainAutoSelect()` hook 신설 (or `CodexDomainSelector` 내부 로직):

```ts
function defaultDomainForLanguage(lang: AppLanguage): CodexDomain {
  switch (lang) {
    case 'KO': return 'korean-webnovel';
    case 'EN': return 'western-fantasy';
    case 'JP': return 'japanese-light-novel';
    case 'CN': return 'chinese-xianxia';
    default:   return 'korean-webnovel';
  }
}
```

사용자가 명시 override 한 도메인은 localStorage 우선. override 없을 때만 작품 언어 기반 자동 선택.

## Rationale

- **Ctrl+P vs Ctrl+K 분리**: Novel Studio 작가는 익숙한 텍스트 에디터 패턴(VS Code 식 Ctrl+P) 선호. Code Studio 개발자는 Ctrl+K (Linear/Vercel 식) 선호. 두 사용자 그룹의 기존 근육 기억 보존.
- **Ctrl+Shift+P 유지**: Code Studio 기존 사용자가 이미 익숙. 변경 시 회귀 비용 큼. `Ctrl+K`는 추가 단축키로 병행.
- **글로벌 Cmd+Shift+K**: Codex는 어디서나 즉시 참조해야 할 백과 — 단일 키로 어디서나 진입.
- **CodexDomainSelector 2곳 한정**: 작가는 Codex 진입 즉시 도메인 확인·변경 가능 (헤더), 영구 변경은 Settings (드물게). 그 외 마운트는 race 위험 + UX 분산.
- **언어 기반 auto-select**: 작품 언어를 KO로 시작하면 한국 웹소설 도메인 기본 — 작가 의도와 가장 일치. override는 명시적 사용자 선택만.

## Consequences

**긍정**:
- rank 2 · 4 · 8 · 14 · 15 시공 시 키·마운트 결정 충돌 0
- 사용자 근육 기억 보존 (Ctrl+Shift+P 유지)
- Codex 글로벌 진입으로 작가 워크플로우 단축

**부정/트레이드오프**:
- Studio Ctrl+P가 브라우저 인쇄 가로채기 → 인쇄가 필요한 작가에게 Ctrl+Alt+P 학습 비용 발생 (mitigation: 첫 진입 시 toast 안내)
- 4-way 표준 = 키 4개 외움 비용 (mitigation: 각 영역 진입 시 키 힌트 표시)
- Translation Studio Cmd+K vs Code Studio Ctrl+K 영역 분리 의존 — 향후 두 영역 통합 시 재검토 필요

## Alternatives

1. **Ctrl+P 단일 글로벌 팔레트** — 기각: Code Studio 사용자 기존 Ctrl+Shift+P 근육 기억 충돌. 영역별 컨텍스트 분리가 더 명료.
2. **모든 영역 Ctrl+K 통일** — 기각: Novel Studio 작가는 VS Code 식 Ctrl+P가 자연스러움. 영역별 UX 정체성 보존.
3. **CodexDomainSelector를 모든 페이지 헤더에 마운트** — 기각: 작가의 99% 동선에서 불필요한 UI 차지. Codex 페이지 + Settings 2곳이면 충분.
4. **언어 auto-select 없이 사용자 항상 명시 선택** — 기각: 작가가 KO 작품 작성 중 EN 도메인 prompt 받는 사고 빈발. 기본값이 작품 언어에 맞아야 함.

## Implementation Notes (rank 별 적용)

- **rank 2** (Studio Ctrl+P): `useCmdPalette` + `useStudioKeyboard` 통합. SharedSurgery-1·2 산출물 기반.
- **rank 4** (Translation Cmd+K): `TranslatorShell.tsx` 단축키 등록 시 `pathname === '/translation-studio'` 가드.
- **rank 8** (Code Studio Ctrl+K): `Ctrl+Shift+P`와 별도. Quick Access 그리드는 8개 자주 쓰는 액션만.
- **rank 14** (Codex Selector 헤더): `app/codex/page.tsx`에 신규 헤더, SettingsView Advanced는 유지.
- **rank 15** (Cmd+Shift+K + auto-select): 글로벌 단축키 등록은 `app/layout.tsx` 또는 `RootLayout`. `defaultDomainForLanguage()` 헬퍼 신설.
