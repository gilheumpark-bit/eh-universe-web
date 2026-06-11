# 08 · 신규 Surface 디자인 시스템 spec (Design System v8.0 정합)

> 검토 권고 #4. chat→form 융합이 추가하는 **신규 UI surface**를 기존 Design System v8.0에 매핑.
> 근거(실 토큰 grep, 2026-06-06): `src/app/globals.css` `--sp-xs:4px`~`--sp-xl:32px` · `--z-dropdown:100`/`--z-overlay:300`/`--z-modal:400`/`--z-tooltip:600` · `bg-bg-primary`/`text-text-primary`/`border-border` · `focus-visible:ring-2 ring-accent-blue`. 린트: `src/lib/code-studio/core/design-linter.ts` `runDesignLint` 16룰.
> 상태: 설계·대기. 신규 컴포넌트 착수 시 본 spec + `runDesignLint` 통과 필수.

---

## 0. 적용 규칙 (전 surface 공통 — 위반 시 린트 fail)

| 규칙 | 강제 | 금지 |
|---|---|---|
| 시맨틱 토큰 | `bg-bg-primary`·`text-text-primary`·`border-border`·`text-text-secondary` | raw Tailwind 색 (`bg-gray-800` 등) |
| z-index | `var(--z-overlay/modal/tooltip)` | 숫자 하드코딩 (`z-[999]`) |
| 간격 | 4px 배수 `--sp-xs(4)`~`--sp-xl(32)` | 비4배수 (`p-[13px]`) |
| 터치 타겟 | 최소 44px (버튼·핀·드롭다운) | 44px 미만 클릭 요소 |
| 포커스 | `focus-visible:ring-2 ring-accent-blue` | `outline:none` 단독 |
| 상태 표시 | **색 + 아이콘 + 텍스트 중 2+ 조합** | 색만으로 의미 전달 |

→ 신규 surface는 별도 디자인 X. **기존 토큰·프리미티브(`ui/Tooltip`·`ui/Dropdown`·`ui/Accordion`·`ui/ProgressBar`) 재사용**, 재구현 금지.

---

## 1. chat→form split-view (세계관/캐릭/씬시트 공통 진입)

```
┌─ 좌: 채팅(brainstorm) ──┬─ 우: entry-draft 양식 ──┐
│ ChatPanel 재사용        │ WorldFact/Character 폼  │
│ [양식 채우기] 버튼      │ 필드 + Violation 핀     │
└─────────────────────────┴─────────────────────────┘
```
- 레이아웃: CSS grid 2열, gap `var(--sp-md)`(16px). 모바일(`useIsMobileQuery`) → 세로 스택 + 탭 전환(채팅↔양식).
- 패널 배경 `bg-bg-secondary`, 경계 `border-border`. 분할 핸들 44px 히트영역.
- 우 양식 = `OSDesktop` 인앱 윈도우 옵션(`window.open` 금지 — 00 PART4 정합). split 기본.
- 포커스 순서: 채팅 입력 → [양식 채우기] → 양식 필드(탭 순서 = 폼 섹션 순). `useFocusTrap` 적용(모바일 오버레이 시).

## 2. 액션 버튼 4-state ([양식 채우기] / [canon 커밋])

`AuditExportButton.tsx` 패턴 차용(참조만, 절대금지8 — 재구현). idle/working/success/error:

| state | 아이콘(lucide) | 색 토큰 | 텍스트 |
|---|---|---|---|
| idle | `FileText` / `Lock` | `text-text-primary` | "양식 채우기" / "canon 커밋" |
| working | `Loader2`(animate-spin) | `text-accent-blue` | "채우는 중…" |
| success | `CheckCircle2` | `text-success` | "초안 생성" / "확정됨" |
| error | `AlertCircle` | `text-danger` | err.slice(0,120) |

- 색 + 아이콘 + 텍스트 3조합(규칙 충족). 높이 44px, `focus-visible:ring-2 ring-accent-blue`.
- [canon 커밋] = M4 origin USER 승격 트리거(신규 lockHistory X) — 클릭 = 사람 확정.

## 3. QA 감사원 패널 (A/B/C/D 비수렴 list)

`_공통-3기둥` 기둥②. 각 감사원 **독립 컬럼**(서로 안 봄 = black box 보존, UI도 분리):

- `ui/Accordion` 4섹션(A 정합 / B 외부독자 / C 반증 / D 구조). 각 섹션 헤더에 감사원 라벨 + 발견 수 배지.
- 발견 항목 = list row: severity 아이콘 + 텍스트 + 근거 entryId 링크. **점수 합산 표시 금지**(기둥② "list 대조만") — 겹침(2+ 감사원)만 강조 색.
- 배경 `bg-bg-secondary`, 행 hover `bg-bg-hover`. 패널 z = `var(--z-overlay)`(사이드), 모달 아님.
- 정직 라벨 항상 노출: "같은 모델 사각 — 발견·권고만, 확정은 작가"(anti-sycophancy, 과claim 차단).

## 4. Violation 핀 (필드별 severity)

폼 필드 우측 인라인 핀. severity = **색 + 아이콘 + 텍스트**(색만 금지):

| severity | 아이콘 | 색 토큰 | 동작 |
|---|---|---|---|
| block (C1-lock) | `ShieldAlert` | `text-danger` | 하드 블록(사람 unlock 전 커밋 불가) |
| high (C2-merge) | `AlertTriangle` | `text-warning` | penalty 플래그 + 사람 확인 |
| warn (C3-contradiction) | `Info` | `text-text-secondary` | 권고(LLM 판정 `[확인 필요]`) |

- 핀 = 44px 히트영역, hover → `ui/Tooltip`(z=`var(--z-tooltip)`) 메시지+근거.
- "떡밥(intentional)" 마킹 시 핀 음소거(재플래그 X) — 사람이 종료.

## 5. worldgraph 인덱스 뷰 (derived — 손편집 0)

00 PART3 파생 뷰 5종. **밀도 높음 → 위계·접힘 필수**:
- 인벤토리 표: `ui/` 테이블 토큰, 행 hover, 정렬 헤더 44px. 카운트 배지(드리프트 0 = 파일수 일치).
- 노출 타임라인: 스포일러 view 분기(독자/편집자/작가) = `creative-process` view 개념 재사용. 색=classification(Public/Internal/Restricted/Confidential) + 아이콘 + 라벨.
- 정합 대시보드: open Violation 집계(derived) — `ui/ProgressBar` 재사용(자체 구현 X).
- changelog: M4 `editedBy[]` origin 전이 피드.

## 6. 부담 모드 selector (AUTO / GUIDED / FULL)

`UserRoleContext` 분기(explorer→AUTO / writer→GUIDED·FULL). `ui/Dropdown` 또는 segmented control:
- 3옵션 라벨 + 설명 툴팁(질문 수·천장). 선택 = 인터뷰 깊이 결정.
- 44px 터치, `focus-visible:ring`. 현재 모드 = 색 + 체크 아이콘 + 텍스트.

---

## 7. a11y (Lighthouse A11y 96-100 유지)

- 모든 상태 = 색 + (아이콘|텍스트) — 색맹 안전. 색 단독 의미 전달 0건.
- 모달/오버레이 = `useFocusTrap` + `aria-modal` + ESC 닫기. split 핸들 = `role=separator` + 키보드 이동.
- 핀/배지 = `aria-label`(severity + 메시지). Violation list = `role=list`.
- 키 내비: 채팅↔양식 `Ctrl+\`(기존 분할뷰 단축키 정합), 필드 탭 순서 = 폼 순서.

## 8. 검증

1. `runDesignLint(code)` 16룰 → 0 위반 (신규 컴포넌트 CI 게이트).
2. raw Tailwind 색 grep 0 / `z-\[` 하드코딩 0 / 비4배수 간격 0.
3. 상태 표시 = 2+ 조합 수동 체크(색만 = fail).
4. Lighthouse A11y 측정 — `/studio` 100 유지(신규 패널 mount 후 재측정).
