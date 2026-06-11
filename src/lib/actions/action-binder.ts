// ============================================================
// action-binder — 런타임 binding (ActionDef + 실행 함수 결합)
// ============================================================
// [P10 루프2/중급, 2026-06-08] 수리:
//   기존: action-registry.ts 에 catalog 정의(PART 2) + 런타임 binder(PART 4) 혼재.
//   목표: SRP — catalog 는 동결 정의, binder 는 런타임 결합. 두 관심사 분리.
//   하위 호환: action-registry.ts 가 bindAction/bindActions 를 재-export 유지.
// ============================================================

import {
  ACTION_CATALOG,
  type ActionDef,
  type RegisteredAction,
} from './action-registry';

/** ID 조회 — 미발견 시 null */
export function getActionDef(id: string): ActionDef | null {
  return ACTION_CATALOG[id] ?? null;
}

/**
 * [루프 4 P6 — 2026-06-08] suggest helper — 비슷한 ID top-10 표시.
 * Levenshtein 거리 대용으로 prefix + substring 매칭. 인덱스 작아 빠름.
 */
function suggestSimilarIds(query: string, max = 10): string[] {
  const lowQuery = query.toLowerCase();
  const allIds = Object.keys(ACTION_CATALOG);
  // 1) prefix 우선 → 2) substring 보조 → 3) fallback alphabetical 처음 N개
  const prefix = allIds.filter((id) => id.toLowerCase().startsWith(lowQuery)).slice(0, max);
  if (prefix.length >= max) return prefix;
  const substr = allIds
    .filter((id) => id.toLowerCase().includes(lowQuery) && !prefix.includes(id))
    .slice(0, max - prefix.length);
  return [...prefix, ...substr];
}

/**
 * 등록 헬퍼 — ActionDef + action 함수 결합.
 * 정의에 없는 ID 시도 시 throw (오타·미정의 방어).
 *
 * [루프 4 P6 — 2026-06-08] 에러 메시지 강화:
 *   - 비슷한 ID top-10 자동 suggest (오타 진단)
 *   - 사용 가능한 ID 총 개수 명시
 */
export function bindAction(
  id: string,
  action: () => void | Promise<void>,
): RegisteredAction {
  const def = getActionDef(id);
  if (!def) {
    const suggestions = suggestSimilarIds(id);
    const allCount = Object.keys(ACTION_CATALOG).length;
    const suggestText = suggestions.length > 0
      ? `\n  Did you mean: ${suggestions.join(', ')}?`
      : '\n  No similar IDs found.';
    throw new Error(
      `[action-binder] Unknown action id: "${id}". ` +
      `Add to ACTION_CATALOG first (currently ${allCount} entries).${suggestText}`,
    );
  }
  return { ...def, action };
}

/**
 * 다중 등록 — 객체 형태 {id: action} 일괄 바인딩.
 * 미정의 ID 가 하나라도 있으면 throw — 부분 등록 방지.
 */
export function bindActions(
  bindings: Record<string, () => void | Promise<void>>,
): RegisteredAction[] {
  return Object.entries(bindings).map(([id, action]) => bindAction(id, action));
}

// IDENTITY_SEAL: action-binder | role=runtime binding | inputs=ActionDef id + handler | outputs=RegisteredAction
