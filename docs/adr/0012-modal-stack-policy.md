# ADR-0012: Modal Stack Policy (Single ↔ Nested)

**Status:** Accepted (Single-Modal current, Nested-Modal Deferred)
**Date:** 2026-06-08
**Loop:** 루프 3 / P18
**Owner:** mid-engineer

## Context

`src/lib/modals/modal-manager.tsx` 는 5 영역 (Studio / Code Studio / Translation Studio / Network / Codex / Global) 공용 ModalContext. 현재 정책은 **단일 modal** — `openModal('a')` 호출 시 다른 modal 이미 열려있으면 dev console.warn + ignored, force 시 `replaceModal()` 사용.

`keyboard-manager.ts` 는 `pushKeyboardModal(id)` / `popKeyboardModal(id)` 다중 modal 스택 API 를 이미 노출. 하지만 modal-manager 의 ModalState 자체는 단일 `id`만 보유 → 사실상 dead API.

루프 3 P18 finding: **nested modal 시도 시 z-index 충돌·ESC 우선순위·backdrop click 전파**가 미명세.

## Decision

### Phase 1 (현재 1.x — Single Modal)

**유지.** 다음 가정 위반은 명시적 거부.

- ModalState 는 `id: ModalId | null` 단일.
- `openModal(b)` 가 이미 열린 modal `a` 있으면 → dev console.warn + ignore (force 는 `replaceModal`).
- ESC 키 → 가장 최근 (= 단일) modal 닫기.
- backdrop click → modal 닫기 (modal 자체가 click handler 부여 시).
- z-index 단일: `--z-modal` (1000).

### Phase 2 (proposed 2.x — Nested Modal) - **Deferred**

활성화 전 본 ADR 확장 필수. 미리 정의해두는 정책:

| 항목 | Phase 2 정책 |
|------|-------------|
| z-index | `modal-{depth}: 1000 + depth*10` — depth 0=base 1000, depth 1=1010, ... |
| ESC | 가장 최근 (top-of-stack) modal 만 닫기. dispatch event `noa:modal-pop`. |
| backdrop click | 같은 depth 의 backdrop click 만 그 modal 닫기. 하위 modal backdrop 은 inert. |
| 등록 | `modalStack: { id, payload, depth }[]` (현재는 length=1 가정). |
| keyboard | `pushKeyboardModal(id)` / `popKeyboardModal(id)` 가 modal stack 과 동기. |
| keyboard suppress | 기존 setKeyboardModalState(boolean) → stack length>0 시 true. |
| outer modal data freeze | inner modal 의 mutation 이 outer modal state 와 충돌하지 않도록 outer 는 read-only display 권장. |

### 현재 강제 정책 (Phase 1 defense)

코드 변경 없음 (modal-manager.tsx 가 이미 단일 modal 가드 보유):

```ts
// modal-manager.tsx:200-208
if (stateRef.current.id !== null && stateRef.current.id !== id) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn(`[modal-manager] openModal("${id}") ignored — "${stateRef.current.id}" already open. Use replaceModal to force.`);
  }
  return;
}
```

이 가드가 곧 ADR-0012 Phase 1 의 enforcement. `pushKeyboardModal` 은 keyboard-only 용도 (input element 가 modal-like 동작할 때 단축키 suppress 토큰) 로만 사용.

### 향후 확장 시그널

다음 케이스 발견 시 Phase 2 활성화 검토:
- Confirm modal 이 다른 modal 위에 떠야 하는 케이스 (예: settings modal 안에서 delete confirm).
- Settings modal 안에서 API 키 modal (현재는 replaceModal 로 1개씩 처리).

**임시 회피 패턴:** outer modal 안에 inner section 으로 합치거나, replaceModal → 이전 modal 컨텍스트 useRef 로 저장 → 닫을 때 원복.

## Consequences

**Positive:**
- 단일 modal 정책으로 UX 단순. ESC/backdrop 동작 일관.
- z-index 충돌 0.
- nested race condition (useEffect cleanup 등) 회피.

**Negative:**
- 일부 워크플로우 (settings → confirm) 가 inline 패턴 강제 → 다소 답답.

**Mitigation:**
- 사용자가 "back 으로 settings 복귀" 요청하는 케이스 발견 시 Phase 2 검토.

## Verification

```bash
# 단일 modal 가드 동작 확인 — dev 모드 console.warn.
openModal('studio:settings');
openModal('studio:api-keys');  // ignored, console.warn 발생.

# replaceModal 로 force 시 정상 전환.
replaceModal('studio:api-keys');
```

## References

- `src/lib/modals/modal-manager.tsx:13-21` — Phase 1 정책 명시 주석
- `src/lib/keyboard/keyboard-manager.ts:261-266` — push/pop API (deferred use)
- ADR-0009 (Observability) — modal lifecycle logging hook
