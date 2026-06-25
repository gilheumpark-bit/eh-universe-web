// ============================================================
// Submission Package Verify — 출고 패키지 hash manifest 대조
// ============================================================
//
// digital-signature 아티팩트의 artifactHashes 와 실제 아티팩트 콘텐츠를 대조한다.
// 네트워크/스토리지 의존 0. 이 검증은 패키지 내부 변조 탐지용이며,
// 저작권·직접 작성·법적 준수를 보증하지 않는다.
// ============================================================

import type { ArtifactDescriptor } from './submission-package';
import { computeSha256Hex } from './source-recorder';

export type SubmissionPackageVerifyIssueReason =
  | 'missing-digital-signature'
  | 'duplicate-artifact-id'
  | 'invalid-digital-signature-json'
  | 'invalid-signature-kind'
  | 'missing-artifact-hash'
  | 'hash-mismatch'
  | 'unknown-hash-entry';

export interface SubmissionPackageVerifyIssue {
  reason: SubmissionPackageVerifyIssueReason;
  artifactId?: string;
  expectedHash?: string;
  actualHash?: string;
}

export interface SubmissionPackageVerifyResult {
  valid: boolean;
  checkedCount: number;
  issues: SubmissionPackageVerifyIssue[];
  limitation: string;
}

interface DigitalSignaturePayload {
  kind?: unknown;
  artifactHashes?: unknown;
}

const SIGNATURE_KIND = 'loreguard.digital-signature.v1';
const HEX_64 = /^[a-f0-9]{64}$/;

function parseSignature(content: string): DigitalSignaturePayload | null {
  try {
    const parsed: unknown = JSON.parse(content);
    return parsed && typeof parsed === 'object' ? (parsed as DigitalSignaturePayload) : null;
  } catch {
    return null;
  }
}

function normalizeArtifactHashes(value: unknown): Record<string, string> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const out: Record<string, string> = {};
  for (const [key, hash] of Object.entries(value as Record<string, unknown>)) {
    if (typeof hash === 'string') out[key] = hash;
  }
  return out;
}

export async function verifySubmissionPackageArtifacts(
  artifacts: readonly ArtifactDescriptor[],
): Promise<SubmissionPackageVerifyResult> {
  const issues: SubmissionPackageVerifyIssue[] = [];
  const signature = artifacts.find((artifact) => artifact.id === 'digital-signature');
  if (!signature) {
    return {
      valid: false,
      checkedCount: 0,
      issues: [{ reason: 'missing-digital-signature' }],
      limitation: 'Hash manifest check only. This does not determine copyright ownership, direct authorship, or legal compliance.',
    };
  }

  const payload = parseSignature(signature.content);
  if (!payload) {
    return {
      valid: false,
      checkedCount: 0,
      issues: [{ reason: 'invalid-digital-signature-json', artifactId: signature.id }],
      limitation: 'Hash manifest check only. This does not determine copyright ownership, direct authorship, or legal compliance.',
    };
  }

  if (payload.kind !== SIGNATURE_KIND) {
    issues.push({ reason: 'invalid-signature-kind', artifactId: signature.id });
  }

  // [fix] contract-mismatch: producer(serializeDigitalSignature)는 artifactHashes 필드를
  // 쓰지 않는다(content-level manuscriptHash 등만 기록). 필드 부재는 정상 출고물이므로
  // 실패로 보지 않고 per-artifact hash 대조를 건너뛴다. 필드가 *존재하지만* 형식이 깨진
  // 경우(객체 아님)만 invalid-digital-signature-json 으로 보고한다.
  const hasArtifactHashesField = payload.artifactHashes !== undefined;
  const artifactHashes = normalizeArtifactHashes(payload.artifactHashes);
  if (hasArtifactHashesField && !artifactHashes) {
    issues.push({ reason: 'invalid-digital-signature-json', artifactId: signature.id });
  }

  const dataArtifacts = artifacts.filter((artifact) => artifact.id !== 'digital-signature');
  const seen = new Set<string>();
  const duplicateIds = new Set<string>();
  for (const artifact of dataArtifacts) {
    if (seen.has(artifact.id)) duplicateIds.add(artifact.id);
    seen.add(artifact.id);
  }
  for (const artifactId of duplicateIds) {
    issues.push({ reason: 'duplicate-artifact-id', artifactId });
  }

  let checkedCount = 0;
  if (artifactHashes) {
    const dataIds = new Set<string>(dataArtifacts.map((artifact) => artifact.id));
    for (const artifact of dataArtifacts) {
      const expectedHash = artifactHashes[artifact.id];
      if (!expectedHash || !HEX_64.test(expectedHash)) {
        issues.push({ reason: 'missing-artifact-hash', artifactId: artifact.id });
        continue;
      }
      const actualHash = await computeSha256Hex(artifact.content);
      checkedCount += 1;
      if (actualHash !== expectedHash) {
        issues.push({ reason: 'hash-mismatch', artifactId: artifact.id, expectedHash, actualHash });
      }
    }
    for (const artifactId of Object.keys(artifactHashes)) {
      if (!dataIds.has(artifactId)) {
        issues.push({ reason: 'unknown-hash-entry', artifactId });
      }
    }
  }

  return {
    valid: issues.length === 0,
    checkedCount,
    issues,
    limitation: 'Hash manifest check only. This does not determine copyright ownership, direct authorship, or legal compliance.',
  };
}
