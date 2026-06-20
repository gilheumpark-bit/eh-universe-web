// ============================================================
// NOA Audit — Chain Integrity Verification
// Source: NOA v42.6/v43 (Streaming Verification)
// ============================================================

import type { AuditEntry, AuditVerification } from "../types";
import { canonicalJson, computeHash } from "./chain";
import { verifyHmac } from "./hmac";

/**
 * 감사 체인 전체의 무결성을 검증한다.
 * 1. 해시 체인 연속성 (prevHash === 이전 entry의 hash)
 * 2. 해시 재계산 (entry 데이터로 해시 재생성 후 비교)
 * 3. HMAC 서명 검증
 *
 * @param entries - 감사 엔트리 배열
 * @param secret - HMAC 비밀 키
 * @returns 검증 결과
 *
 * Phase 2: v43 스트리밍 검증 (O(1) 메모리) 적용 완료
 *
 * 전체 배열 검증(verifyChainIntegrity)과 함께 스트리밍 검증기
 * (createStreamingVerifier)를 제공한다.
 */
export async function verifyChainIntegrity(
  entries: readonly AuditEntry[],
  secret: string
): Promise<AuditVerification> {
  if (entries.length === 0) {
    return { valid: true };
  }

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];

    // 체인 연속성 검증
    if (i > 0 && entry.prevHash !== entries[i - 1].hash) {
      return {
        valid: false,
        brokenAt: i,
        reason: "CHAIN_LINK_MISMATCH",
      };
    }

    // 해시 재계산 검증
    const payload = canonicalJson({
      id: entry.id,
      timestamp: entry.timestamp,
      layer: entry.layer,
      input: entry.input,
      output: entry.output,
      verdict: entry.verdict,
      prevHash: entry.prevHash,
    });
    const recalcHash = await computeHash(payload);
    if (recalcHash !== entry.hash) {
      return {
        valid: false,
        brokenAt: i,
        reason: "HASH_MISMATCH",
      };
    }

    // HMAC 서명 검증
    const sigValid = await verifyHmac(entry.hash, entry.hmacSignature, secret);
    if (!sigValid) {
      return {
        valid: false,
        brokenAt: i,
        reason: "SIGNATURE_MISMATCH",
      };
    }
  }

  return { valid: true };
}

// ── v43 Streaming Verification (O(1) memory) ──

export interface StreamingVerifier {
  /** Feed one entry at a time. Returns verification result for that entry. */
  next(entry: AuditEntry): Promise<AuditVerification>;
  /** Current index (number of entries verified so far). */
  readonly index: number;
}

/**
 * O(1) 메모리 스트리밍 검증기를 생성한다.
 * 한 번에 하나의 엔트리만 보유하므로 전체 체인을 메모리에 올리지 않는다.
 *
 * @param secret - HMAC 비밀 키
 * @returns StreamingVerifier 인스턴스
 */
export function createStreamingVerifier(secret: string): StreamingVerifier {
  let prevHash: string | null = null;
  let _index = 0;

  return {
    get index() {
      return _index;
    },
    async next(entry: AuditEntry): Promise<AuditVerification> {
      const i = _index++;

      // 체인 연속성: 첫 엔트리가 아닌 경우 prevHash 확인
      if (prevHash !== null && entry.prevHash !== prevHash) {
        return { valid: false, brokenAt: i, reason: "CHAIN_LINK_MISMATCH" };
      }

      // 해시 재계산
      const payload = canonicalJson({
        id: entry.id,
        timestamp: entry.timestamp,
        layer: entry.layer,
        input: entry.input,
        output: entry.output,
        verdict: entry.verdict,
        prevHash: entry.prevHash,
      });
      const recalcHash = await computeHash(payload);
      if (recalcHash !== entry.hash) {
        return { valid: false, brokenAt: i, reason: "HASH_MISMATCH" };
      }

      // HMAC 검증
      const sigValid = await verifyHmac(entry.hash, entry.hmacSignature, secret);
      if (!sigValid) {
        return { valid: false, brokenAt: i, reason: "SIGNATURE_MISMATCH" };
      }

      prevHash = entry.hash;
      return { valid: true };
    },
  };
}
