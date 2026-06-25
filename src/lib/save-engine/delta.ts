// ============================================================
// PART 1 — JSON Patch (RFC 6902) via fast-json-patch (Spec Part 3)
// ============================================================
//
// Tiptap 스냅샷 diff 방식: editor.getJSON() 이 출력하는 plain object를
// 직전 스냅샷과 비교해 JSON Patch 배열을 생성.
// 신규 CRDT 의존성 대신 library 하나(~3KB) 채택 (Spec 12.4).

import * as jsonpatch from 'fast-json-patch';
import type { JsonPatchOp, DeltaPayload } from './types';
import { canonicalJson, sha256 } from './hash';
import { logger } from '@/lib/logger';

// ============================================================
// PART 2 — Deep clone (순환참조·함수 방어)
// ============================================================

/**
 * JSON 직렬화 가능 값만 복제. 함수/순환참조는 제거.
 * fast-json-patch가 내부에서 compare 시 원본 object를 수정할 수 있어서 복제 필수.
 */
export function safeDeepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value ?? null)) as T;
}

// ============================================================
// PART 3 — compare / apply (Spec 3.3.2)
// ============================================================

/**
 * prev → next 변경 ops. no-op이면 빈 배열.
 * fast-json-patch.compare는 최소 JSON Patch를 생성.
 */
export function computePatch(prev: unknown, next: unknown): JsonPatchOp[] {
  const prevSafe = safeDeepClone(prev);
  const nextSafe = safeDeepClone(next);
  const ops = jsonpatch.compare(prevSafe as object, nextSafe as object);
  return ops as JsonPatchOp[];
}

/**
 * base 객체에 ops를 적용한 결과 반환. base는 변경하지 않음 (복사 후 적용).
 */
export function applyPatch<T>(base: T, ops: JsonPatchOp[]): T {
  if (!ops.length) return safeDeepClone(base);
  const cloned = safeDeepClone(base);
  // applyPatch는 in-place로 document 수정 + newDocument 반환.
  const result = jsonpatch.applyPatch(cloned as object, ops as jsonpatch.Operation[]);
  return result.newDocument as T;
}

// ============================================================
// PART 4 — DeltaPayload builder (Spec 3.3.2)
// ============================================================

export interface BuildDeltaInput {
  projectId: string;
  prev: unknown;
  next: unknown;
  target: DeltaPayload['target'];
  targetId?: string;
}

export interface BuildDeltaResult {
  /** ops 비어 있으면 null (no-op skip, Spec 3.3.3) */
  payload: DeltaPayload | null;
  ops: JsonPatchOp[];
}

/**
 * Delta 1건 조립. ops 0개면 payload=null 반환(호출자가 append 생략).
 * baseContentHash 는 prev canonical JSON의 SHA-256.
 */
export async function buildDelta(input: BuildDeltaInput): Promise<BuildDeltaResult> {
  const ops = computePatch(input.prev, input.next);
  if (ops.length === 0) return { payload: null, ops: [] };
  const baseContentHash = await sha256(canonicalJson(input.prev));
  return {
    ops,
    payload: {
      projectId: input.projectId,
      ops,
      target: input.target,
      targetId: input.targetId,
      baseContentHash,
    },
  };
}

// ============================================================
// PART 5 — Replay (delta 시퀀스 → 최종 상태)
// ============================================================

/**
 * 초기 base에 delta 시퀀스를 순서대로 적용.
 * 각 delta의 baseContentHash 검증은 호출자(recovery)에서 수행.
 */
export function replayDeltas<T>(base: T, deltas: DeltaPayload[]): T {
  let current: T = safeDeepClone(base);
  for (let i = 0; i < deltas.length; i++) {
    const d = deltas[i];
    // [H4 fix] applyPatch(fast-json-patch)는 base에 없는 path의 replace/remove에서
    // JsonPatchError를 throw한다. 과거에는 이 throw가 호출자(recovery.ts tryFullRecovery:283,
    // tryDegradedRecovery:400/434)까지 전파되어 손상 delta 1건이 전체 부팅 복구를 크래시시켰다.
    // 이제 개별 delta 적용 실패는 해당 delta만 skip + 로깅하고, 직전까지 적용된 current를
    // 유지한 채 나머지 delta 재생을 계속한다. 결과 타입/시그니처(T)는 그대로 유지.
    try {
      current = applyPatch(current, d.ops);
    } catch (err) {
      logger.warn({
        component: 'save-engine:delta',
        event: 'replay_delta_apply_failed',
        meta: { index: i, projectId: d.projectId, target: d.target, opCount: d.ops.length },
        error: err,
      });
      // current는 직전 성공 상태를 그대로 유지 → 나머지 delta로 재생 계속.
    }
  }
  return current;
}
