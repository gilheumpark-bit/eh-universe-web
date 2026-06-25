// ============================================================
// C2PA-ready Manifest Verify — local round-trip contract check
// ============================================================
//
// This verifier checks Loreguard's C2PA-ready JSON payload against
// the submission package evidence already produced by Loreguard.
// It does not validate a signed C2PA Manifest Store, certificate
// chain, copyright ownership, direct authorship, or legal compliance.
// ============================================================

import type { ArtifactDescriptor } from './submission-package';

export type C2paReadyVerifyIssueReason =
  | 'missing-c2pa-ready-manifest'
  | 'invalid-c2pa-ready-json'
  | 'invalid-c2pa-ready-kind'
  | 'invalid-c2pa-compatibility'
  | 'official-manifest-store-claim'
  | 'missing-asset-hash'
  | 'asset-hash-mismatch'
  | 'certificate-id-mismatch'
  | 'process-record-hash-mismatch'
  | 'repository-receipt-mismatch';

export interface C2paReadyVerifyIssue {
  reason: C2paReadyVerifyIssueReason;
  field?: string;
  expected?: string | boolean | null;
  actual?: string | boolean | null;
}

export interface C2paReadyVerifyInput {
  artifacts: readonly ArtifactDescriptor[];
  certificateId: string;
  manuscriptHash: string;
  timelineHash: string;
  sourceSummaryHash: string;
  manifestStoreUri?: string | null;
}

export interface C2paReadyVerifyResult {
  valid: boolean;
  checkedFields: number;
  issues: C2paReadyVerifyIssue[];
  limitation: string;
}

type JsonObject = Record<string, unknown>;

const MANIFEST_ID = 'c2pa-ready-manifest';
const MANIFEST_KIND = 'loreguard.c2pa-ready-manifest.v1';
const C2PA_TARGET_SPEC = 'C2PA 2.4';
const C2PA_LEVEL = 'json-assertion-payload';
const SHA256_ALG = 'sha256';
const SHA256_HEX = /^[a-f0-9]{64}$/i;
const LIMITATION =
  'C2PA-ready JSON round-trip only. This does not validate a signed C2PA Manifest Store, certificate chain, copyright ownership, direct authorship, or legal compliance.';

function isObject(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function objectField(parent: JsonObject, key: string): JsonObject | null {
  const value = parent[key];
  return isObject(value) ? value : null;
}

function stringField(parent: JsonObject | null, key: string): string | null {
  if (!parent) return null;
  const value = parent[key];
  return typeof value === 'string' ? value : null;
}

function booleanField(parent: JsonObject | null, key: string): boolean | null {
  if (!parent) return null;
  const value = parent[key];
  return typeof value === 'boolean' ? value : null;
}

function parseManifest(content: string): JsonObject | null {
  try {
    const parsed: unknown = JSON.parse(content);
    return isObject(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function issue(
  reason: C2paReadyVerifyIssueReason,
  field: string,
  expected?: string | boolean | null,
  actual?: string | boolean | null,
): C2paReadyVerifyIssue {
  return { reason, field, expected, actual };
}

function normalizeHash(value: string | null): string | null {
  if (!value || !SHA256_HEX.test(value)) return null;
  return value.toLowerCase();
}

function checkEqual(
  issues: C2paReadyVerifyIssue[],
  reason: C2paReadyVerifyIssueReason,
  field: string,
  expected: string | boolean | null,
  actual: string | boolean | null,
): number {
  if (actual !== expected) issues.push(issue(reason, field, expected, actual));
  return 1;
}

export function verifyC2paReadyRoundTrip(input: C2paReadyVerifyInput): C2paReadyVerifyResult {
  const artifact = input.artifacts.find((item) => item.id === MANIFEST_ID);
  if (!artifact) {
    return {
      valid: false,
      checkedFields: 0,
      issues: [{ reason: 'missing-c2pa-ready-manifest', field: MANIFEST_ID }],
      limitation: LIMITATION,
    };
  }

  const manifest = parseManifest(artifact.content);
  if (!manifest) {
    return {
      valid: false,
      checkedFields: 0,
      issues: [{ reason: 'invalid-c2pa-ready-json', field: MANIFEST_ID }],
      limitation: LIMITATION,
    };
  }

  const issues: C2paReadyVerifyIssue[] = [];
  let checkedFields = 0;

  checkedFields += checkEqual(
    issues,
    'invalid-c2pa-ready-kind',
    'kind',
    MANIFEST_KIND,
    stringField(manifest, 'kind'),
  );

  const compatibility = objectField(manifest, 'compatibility');
  checkedFields += checkEqual(
    issues,
    'invalid-c2pa-compatibility',
    'compatibility.targetSpec',
    C2PA_TARGET_SPEC,
    stringField(compatibility, 'targetSpec'),
  );
  checkedFields += checkEqual(
    issues,
    'invalid-c2pa-compatibility',
    'compatibility.level',
    C2PA_LEVEL,
    stringField(compatibility, 'level'),
  );
  checkedFields += checkEqual(
    issues,
    'official-manifest-store-claim',
    'compatibility.officialC2paManifestStore',
    false,
    booleanField(compatibility, 'officialC2paManifestStore'),
  );

  const asset = objectField(manifest, 'asset');
  const assetHash = objectField(asset ?? {}, 'hash');
  const assetHashAlg = stringField(assetHash, 'alg');
  const assetHashValue = normalizeHash(stringField(assetHash, 'value'));
  checkedFields += 1;
  if (assetHashAlg !== SHA256_ALG || !assetHashValue) {
    issues.push(issue('missing-asset-hash', 'asset.hash', SHA256_ALG, assetHashAlg));
  } else if (assetHashValue !== input.manuscriptHash.toLowerCase()) {
    issues.push(issue('asset-hash-mismatch', 'asset.hash.value', input.manuscriptHash, assetHashValue));
  }

  const assertions = objectField(manifest, 'assertions');
  const metadata = objectField(assertions ?? {}, 'metadata');
  const processRecord = objectField(assertions ?? {}, 'loreguardProcessRecord');
  const repositoryReceipt = objectField(manifest, 'repositoryReceipt');

  checkedFields += checkEqual(
    issues,
    'certificate-id-mismatch',
    'assertions.metadata.certificateId',
    input.certificateId,
    stringField(metadata, 'certificateId'),
  );
  checkedFields += checkEqual(
    issues,
    'certificate-id-mismatch',
    'repositoryReceipt.certificateId',
    input.certificateId,
    stringField(repositoryReceipt, 'certificateId'),
  );
  checkedFields += checkEqual(
    issues,
    'process-record-hash-mismatch',
    'assertions.loreguardProcessRecord.manuscriptHash',
    input.manuscriptHash,
    stringField(processRecord, 'manuscriptHash'),
  );
  checkedFields += checkEqual(
    issues,
    'process-record-hash-mismatch',
    'assertions.loreguardProcessRecord.timelineHash',
    input.timelineHash,
    stringField(processRecord, 'timelineHash'),
  );
  checkedFields += checkEqual(
    issues,
    'process-record-hash-mismatch',
    'assertions.loreguardProcessRecord.sourceSummaryHash',
    input.sourceSummaryHash,
    stringField(processRecord, 'sourceSummaryHash'),
  );

  if (input.manifestStoreUri) {
    checkedFields += checkEqual(
      issues,
      'repository-receipt-mismatch',
      'repositoryReceipt.manifestStoreUri',
      input.manifestStoreUri,
      stringField(repositoryReceipt, 'manifestStoreUri'),
    );
  }

  return {
    valid: issues.length === 0,
    checkedFields,
    issues,
    limitation: LIMITATION,
  };
}
