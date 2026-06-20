#!/usr/bin/env node
// ============================================================
// PART 1 — Release Evidence Intake Contract
// ============================================================
// Role:    Validate external/staging/live evidence artifacts required to
//          move Loreguard from Day 0 PASS / Release HOLD toward release PASS.
// Banned:  Network calls, provider calls, or claiming release readiness without
//          actual evidence files under docs/release-evidence.
// Input:   docs/release-evidence/*.json plus optional --write path.
// Output:  JSON/Markdown release evidence status report.
// Depends: Node built-ins only.
// ============================================================

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(SCRIPT_DIR, '..');
const EVIDENCE_ROOT_REL = 'docs/release-evidence';
const EVIDENCE_ROOT = join(ROOT, EVIDENCE_ROOT_REL);
const EVIDENCE_ARTIFACT_ROOT_REL = 'docs/release-evidence/artifacts';
const EVIDENCE_ARTIFACT_ROOT = join(ROOT, 'docs', 'release-evidence', 'artifacts');
const STATUS_KIND = 'loreguard.release-evidence-status.v1';
const EVIDENCE_KIND = 'loreguard.release-evidence.v1';

const VALID_ENVIRONMENTS = new Set([
  'staging',
  'production',
  'external-ci',
  'external-provider',
  'legal-review',
  'disabled-attestation',
]);

const PASS_STATUS = 'PASS';
const VALID_CHECK_STATUSES = new Set([PASS_STATUS, 'HOLD', 'FAIL', 'BLOCK']);

const REQUIRED_EVIDENCE = [
  {
    id: 'T0-deployed-destructive-workflow',
    gate: 'T0',
    title: 'Deployed/staging destructive workflow replay for real project payloads',
    requiredArtifactTypes: ['staging-destructive-workflow-replay'],
    allowedEnvironments: ['staging', 'production'],
    nextAction: 'Attach deployed/staging destructive workflow replay evidence for real project payloads.',
  },
  {
    id: 'T1-live-external-registry',
    gate: 'T1',
    title: 'Live external registry replay for creative process certificate lookup',
    requiredArtifactTypes: ['external-registry-replay'],
    allowedEnvironments: ['staging', 'production', 'external-provider'],
    nextAction: 'Attach live external registry replay evidence for creative process certificate lookup.',
  },
  {
    id: 'T2-live-stripe-billing',
    gate: 'T2',
    title: 'Live Stripe checkout/webhook/claim propagation replay',
    requiredArtifactTypes: ['live-stripe-replay', 'paid-session-e2e'],
    allowedEnvironments: ['staging', 'production', 'external-provider'],
    nextAction: 'Attach live Stripe replay and paid-session e2e evidence for checkout/webhook/claim propagation.',
    nextActionKo: 'Stripe 체크아웃, 웹훅, 유료 권한 반영, 확인서 크레딧 지급이 실제 테스트 경로에서 이어졌다는 증거를 첨부한다.',
  },
  {
    id: 'T3-deployed-adversarial-http',
    gate: 'T3',
    title: 'Deployed/staging adversarial HTTP replay against LLM-facing API routes',
    requiredArtifactTypes: ['deployed-adversarial-http-replay'],
    allowedEnvironments: ['staging', 'production'],
    nextAction: 'Run deployed/staging adversarial HTTP replay against LLM-facing API routes.',
  },
  {
    id: 'T4-deployed-load-replay',
    gate: 'T4',
    title: 'Deployed multi-worker/load replay for collaborative writing and process-record issuance',
    requiredArtifactTypes: ['deployed-multi-worker-load-replay'],
    allowedEnvironments: ['staging', 'production'],
    nextAction: 'Run deployed multi-worker/load replay for collaborative writing and process-record issuance paths.',
  },
  {
    id: 'T5-live-destructive-rehearsal',
    gate: 'T5',
    title: 'Live/staging destructive workflow rehearsal with backup export and verified restore',
    requiredArtifactTypes: ['destructive-workflow-rehearsal', 'backup-restore-verification'],
    allowedEnvironments: ['staging', 'production'],
    nextAction: 'Run live/staging destructive workflow rehearsal with backup export and verified restore evidence.',
  },
  {
    id: 'T6-live-release-gate-ci',
    gate: 'T6',
    title: 'Live GitHub Actions release-gate run evidence',
    requiredArtifactTypes: ['github-actions-release-gate-run'],
    allowedEnvironments: ['external-ci'],
    nextAction: 'Attach live GitHub Actions release-gate run evidence before treating gates as deploy blockers.',
  },
  {
    id: 'T7-live-browser-recovery',
    gate: 'T7',
    title: 'Live/staging browser kill/reload replay against the writing IDE surface',
    requiredArtifactTypes: ['live-browser-kill-reload-replay'],
    allowedEnvironments: ['staging', 'production'],
    nextAction: 'Attach live/staging browser kill/reload evidence against the writing IDE surface.',
  },
  {
    id: 'T8-live-observability',
    gate: 'T8',
    title: 'Live alert routing and SLO evidence',
    requiredArtifactTypes: ['alert-routing-evidence', 'slo-evidence'],
    allowedEnvironments: ['staging', 'production'],
    nextAction: 'Attach live alert routing and SLO evidence from staging/production.',
  },
  {
    id: 'T9-qualified-legal-regulatory',
    gate: 'T9',
    title: 'Qualified legal/regulatory review and jurisdiction-specific release notes',
    requiredArtifactTypes: ['legal-regulatory-signoff', 'jurisdiction-release-notes'],
    allowedEnvironments: ['legal-review'],
    nextAction: 'Attach qualified legal review/sign-off and jurisdiction-specific release notes before public launch.',
  },
  {
    id: 'T10-agent-runner-containment',
    gate: 'T10',
    title: 'Agent runner disabled attestation or active runner denial traces',
    requiredArtifactTypes: ['agent-runner-disabled-attestation'],
    alternativeArtifactGroups: [['active-agent-runner-denial-trace']],
    allowedEnvironments: ['disabled-attestation', 'staging', 'production'],
    nextAction: 'Keep agent-search disabled or attach full runner denial traces before reintroducing agent tool execution.',
  },
  {
    id: 'T11-signed-c2pa-external-chain',
    gate: 'T11',
    title: 'Signed C2PA Manifest Store and external provenance chain evidence',
    requiredArtifactTypes: ['signed-c2pa-manifest-store', 'external-provenance-chain'],
    allowedEnvironments: ['staging', 'production', 'external-provider'],
    nextAction: 'Attach signed C2PA Manifest Store and external provenance-chain evidence.',
    nextActionKo: '서명된 C2PA 매니페스트 저장소와 외부 출처 체인 조회가 통과했다는 증거를 첨부한다.',
  },
  {
    id: 'T12-live-ai-supply-chain',
    gate: 'T12',
    title: 'Live provider attestation, live model-output eval, CI run artifact, and CI-signed provenance',
    requiredArtifactTypes: [
      'provider-model-attestation',
      'live-model-output-eval',
      'ci-run-artifact',
      'ci-signed-provenance',
    ],
    allowedEnvironments: ['external-provider', 'external-ci', 'staging', 'production'],
    nextAction: 'Attach live provider model attestation, live model-output eval, actual CI run artifact, and CI-signed provenance.',
  },
  {
    id: 'T13-vector-memory-isolation',
    gate: 'T13',
    title: 'Live vector DB tenant-isolation/stale-invalidation replay or disabled external-memory attestation',
    requiredArtifactTypes: ['external-memory-disabled-attestation'],
    alternativeArtifactGroups: [['vector-db-tenant-isolation-replay', 'stale-vector-invalidation-replay']],
    allowedEnvironments: ['disabled-attestation', 'staging', 'production', 'external-provider'],
    nextAction: 'Attach live vector DB tenant-isolation and stale-invalidation replay if external memory/RAG is introduced.',
  },
  {
    id: 'T14-legal-review-compliance',
    gate: 'T14',
    title: 'Legal-review sign-off for compliance policy and export language',
    requiredArtifactTypes: ['legal-review-signoff'],
    allowedEnvironments: ['legal-review'],
    nextAction: 'Add legal-review sign-off to docs/compliance.yml.',
  },
  {
    id: 'T15-live-author-session',
    gate: 'T15',
    title: 'Live/staging author-session run artifact from a deployed writing session',
    requiredArtifactTypes: ['live-author-session-run-artifact'],
    allowedEnvironments: ['staging', 'production'],
    nextAction: 'Attach live/staging author-session run artifact from a deployed writing session.',
  },
];

const REQUIRED_ARTIFACT_CHECK_IDS = {
  'live-stripe-replay': [
    'stripe-checkout-completed-event',
    'stripe-webhook-signature-verified',
    'subscription-entitlement-upserted',
    'release-credit-purchase-grant-applied',
  ],
  'paid-session-e2e': [
    'paid-session-access-granted',
    'release-credit-debit-recorded',
    'client-claim-refresh-observed',
  ],
  'signed-c2pa-manifest-store': [
    'c2pa-manifest-store-signed',
    'c2pa-manifest-store-verifier-pass',
    'c2pa-asset-hash-binding',
  ],
  'external-provenance-chain': [
    'external-chain-pointer-recorded',
    'external-chain-roundtrip-lookup',
  ],
};

const ARTIFACT_LABEL_KO = {
  'live-stripe-replay': 'Stripe 실제 결제·웹훅 재현 증거',
  'paid-session-e2e': '유료 세션 권한 반영 전체 흐름 증거',
  'signed-c2pa-manifest-store': '서명된 C2PA 매니페스트 저장소 증거',
  'external-provenance-chain': '외부 출처 체인 조회 증거',
};

const CORE_COMMERCIAL_BLOCKER_IDS = new Set([
  'T2-live-stripe-billing',
  'T11-signed-c2pa-external-chain',
]);

const SECRET_MARKER_PATTERNS = [
  { id: 'private-key', regex: /-----BEGIN [A-Z ]*PRIVATE KEY-----|\\n-----BEGIN [A-Z ]*PRIVATE KEY-----|private_key/i },
  { id: 'openai-secret-key', regex: /\bsk-[A-Za-z0-9_-]{20,}\b/ },
  { id: 'stripe-secret-key', regex: /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}\b/ },
  { id: 'github-token', regex: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}\b/ },
  { id: 'google-api-key', regex: /\bAIza[0-9A-Za-z_-]{30,}\b/ },
  { id: 'bearer-token', regex: /\bBearer\s+[A-Za-z0-9._~+/=-]{24,}\b/i },
  { id: 'webhook-secret', regex: /\bwhsec_[A-Za-z0-9]{20,}\b/ },
];

// ============================================================
// PART 2 — Filesystem and JSON Helpers
// ============================================================
// Role:    Read evidence files from the repository and normalize paths.
// Banned:  Traversing outside ROOT or reading non-JSON evidence payloads.
// Input:   Relative or absolute paths.
// Output:  Parsed file records with sha256 digests.
// Depends: PART 1 constants.
// ============================================================

function toPosix(value) {
  return value.split(sep).join('/');
}

function relPath(absPath) {
  return toPosix(relative(ROOT, absPath));
}

function formatKst(date) {
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  return `${formatter.format(date).replace(' ', 'T')}+09:00`;
}

function sha256Text(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

function sha256Buffer(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function* walkJsonFiles(dir) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir)) {
    const absPath = join(dir, entry);
    const stats = statSync(absPath);
    if (stats.isDirectory()) {
      yield* walkJsonFiles(absPath);
      continue;
    }
    if (stats.isFile() && extname(entry).toLowerCase() === '.json') {
      yield absPath;
    }
  }
}

function readEvidenceFiles() {
  const files = [];
  for (const absPath of walkJsonFiles(EVIDENCE_ROOT)) {
    const text = readFileSync(absPath, 'utf8');
    const file = relPath(absPath);
    try {
      files.push({
        file,
        sha256: sha256Text(text),
        content: text,
        payload: JSON.parse(text),
        parseError: null,
      });
    } catch (err) {
      files.push({
        file,
        sha256: sha256Text(text),
        content: text,
        payload: null,
        parseError: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return files.sort((a, b) => a.file.localeCompare(b.file));
}

function uniqueSorted(values) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

// ============================================================
// PART 3 — Evidence Validation
// ============================================================
// Role:    Validate one evidence JSON payload without trusting labels.
// Banned:  Counting malformed, failing, or wrong-environment artifacts as PASS.
// Input:   Parsed JSON evidence file.
// Output:  Normalized evidence assessment.
// Depends: PART 1 constants.
// ============================================================

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isIsoLikeDate(value) {
  return isNonEmptyString(value) && !Number.isNaN(Date.parse(value));
}

function requiredCheckIdsForArtifactType(artifactType) {
  return REQUIRED_ARTIFACT_CHECK_IDS[artifactType] ?? [];
}

function artifactLabelKo(artifactType) {
  return ARTIFACT_LABEL_KO[artifactType] ?? artifactType;
}

function scanSecretMarkers(text, fieldLabel) {
  const findings = [];
  if (!text) return findings;
  for (const pattern of SECRET_MARKER_PATTERNS) {
    if (pattern.regex.test(text)) {
      findings.push(`${fieldLabel} contains blocked secret marker: ${pattern.id}`);
    }
  }
  return findings;
}

function validateChecks(value, requiredCheckIds = []) {
  if (!Array.isArray(value) || value.length === 0) {
    return { ok: false, issues: ['checks must be a non-empty array'] };
  }
  const issues = [];
  const passingCheckIds = new Set();
  value.forEach((check, index) => {
    if (!isObject(check)) {
      issues.push(`checks[${index}] must be an object`);
      return;
    }
    if (!isNonEmptyString(check.id)) issues.push(`checks[${index}].id is required`);
    if (!VALID_CHECK_STATUSES.has(check.status)) {
      issues.push(`checks[${index}].status must be PASS/HOLD/FAIL/BLOCK`);
    }
    if (check.status !== PASS_STATUS) {
      issues.push(`checks[${index}] is ${String(check.status || 'missing')}, not PASS`);
    }
    if (!isNonEmptyString(check.evidence)) issues.push(`checks[${index}].evidence is required`);
    if (check.status === PASS_STATUS && isNonEmptyString(check.id)) passingCheckIds.add(check.id);
  });
  for (const requiredCheckId of requiredCheckIds) {
    if (!passingCheckIds.has(requiredCheckId)) {
      issues.push(`checks must include PASS evidence for ${requiredCheckId}`);
    }
  }
  return { ok: issues.length === 0, issues };
}

function safeEvidenceArtifactPath(rawPath) {
  if (!isNonEmptyString(rawPath)) return null;
  if (rawPath.includes('\0')) return null;
  if (rawPath.startsWith('/') || /^[a-zA-Z]:[\\/]/.test(rawPath)) return null;

  const absPath = resolve(ROOT, rawPath);
  if (absPath !== EVIDENCE_ARTIFACT_ROOT && !absPath.startsWith(`${EVIDENCE_ARTIFACT_ROOT}${sep}`)) {
    return null;
  }
  return absPath;
}

function validateHashes(value, options = {}) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return ['hashes must be an array when present'];
  const issues = [];
  const verifyFileHashes = options.verifyFileHashes === true;
  value.forEach((item, index) => {
    if (!isObject(item)) {
      issues.push(`hashes[${index}] must be an object`);
      return;
    }
    if (!isNonEmptyString(item.path)) {
      issues.push(`hashes[${index}].path is required`);
    } else if (verifyFileHashes) {
      const absPath = safeEvidenceArtifactPath(item.path);
      if (!absPath) {
        issues.push(`hashes[${index}].path must be under ${EVIDENCE_ARTIFACT_ROOT_REL}`);
      } else if (!existsSync(absPath) || !statSync(absPath).isFile()) {
        issues.push(`hashes[${index}].path does not exist: ${item.path}`);
      } else {
        const artifactContent = readFileSync(absPath);
        const actualSha256 = sha256Buffer(artifactContent);
        if (actualSha256 !== String(item.sha256 || '').toLowerCase()) {
          issues.push(`hashes[${index}].sha256 does not match file content for ${item.path}`);
        }
        issues.push(...scanSecretMarkers(artifactContent.toString('utf8'), `hashes[${index}].path`));
      }
    }
    if (!/^[a-f0-9]{64}$/i.test(String(item.sha256 || ''))) {
      issues.push(`hashes[${index}].sha256 must be a 64-char sha256 hex digest`);
    }
  });
  return issues;
}

function validateEvidenceFile(fileRecord) {
  if (fileRecord.parseError) {
    return {
      ...fileRecord,
      valid: false,
      gate: null,
      requirementId: null,
      artifactType: null,
      environment: null,
      issues: [`invalid JSON: ${fileRecord.parseError}`],
    };
  }

  const payload = fileRecord.payload;
  const issues = [];
  issues.push(...scanSecretMarkers(fileRecord.content ?? '', fileRecord.file));
  if (!isObject(payload)) issues.push('payload must be an object');
  if (isObject(payload) && payload.kind !== EVIDENCE_KIND) issues.push(`kind must be ${EVIDENCE_KIND}`);
  if (isObject(payload) && !isNonEmptyString(payload.gate)) issues.push('gate is required');
  if (isObject(payload) && !isNonEmptyString(payload.requirementId)) issues.push('requirementId is required');
  if (isObject(payload) && !isNonEmptyString(payload.artifactType)) issues.push('artifactType is required');
  if (isObject(payload) && !VALID_ENVIRONMENTS.has(payload.environment)) {
    issues.push(`environment must be one of ${[...VALID_ENVIRONMENTS].join(', ')}`);
  }
  if (isObject(payload) && !isIsoLikeDate(payload.generatedAt)) issues.push('generatedAt must be an ISO-like date string');
  if (isObject(payload) && !isNonEmptyString(payload.source)) issues.push('source is required');
  if (isObject(payload) && !isNonEmptyString(payload.summary)) issues.push('summary is required');
  if (isObject(payload)) {
    issues.push(...validateChecks(payload.checks, requiredCheckIdsForArtifactType(payload.artifactType)).issues);
  }
  if (isObject(payload)) {
    issues.push(...validateHashes(payload.hashes, { verifyFileHashes: fileRecord.file.startsWith(EVIDENCE_ROOT_REL) }));
  }

  return {
    ...fileRecord,
    valid: issues.length === 0,
    gate: isObject(payload) && isNonEmptyString(payload.gate) ? payload.gate : null,
    requirementId: isObject(payload) && isNonEmptyString(payload.requirementId) ? payload.requirementId : null,
    artifactType: isObject(payload) && isNonEmptyString(payload.artifactType) ? payload.artifactType : null,
    environment: isObject(payload) && isNonEmptyString(payload.environment) ? payload.environment : null,
    source: isObject(payload) && isNonEmptyString(payload.source) ? payload.source : null,
    generatedAt: isObject(payload) && isNonEmptyString(payload.generatedAt) ? payload.generatedAt : null,
    issues,
  };
}

function evidenceMatchesRequirement(evidence, requirement, artifactType) {
  return (
    evidence.valid &&
    evidence.gate === requirement.gate &&
    evidence.requirementId === requirement.id &&
    evidence.artifactType === artifactType &&
    requirement.allowedEnvironments.includes(evidence.environment)
  );
}

function evaluateRequiredArtifactType(requirement, artifactType, evidenceFiles) {
  const matching = evidenceFiles.filter((evidence) => evidenceMatchesRequirement(evidence, requirement, artifactType));
  return {
    artifactType,
    verdict: matching.length > 0 ? 'PASS' : 'HOLD',
    evidenceFiles: matching.map((evidence) => ({
      file: evidence.file,
      sha256: evidence.sha256,
      environment: evidence.environment,
      source: evidence.source,
      generatedAt: evidence.generatedAt,
    })),
    issues: matching.length > 0
      ? []
      : [`missing valid ${artifactType} evidence for ${requirement.id}`],
  };
}

function evaluateArtifactTypeGroup(requirement, artifactTypes, evidenceFiles) {
  const artifactTypeResults = artifactTypes.map((artifactType) =>
    evaluateRequiredArtifactType(requirement, artifactType, evidenceFiles),
  );
  return {
    artifactTypes: artifactTypeResults,
    verdict: artifactTypeResults.every((item) => item.verdict === 'PASS') ? 'PASS' : 'HOLD',
  };
}

function flattenAlternativeArtifactTypes(requirement) {
  return (requirement.alternativeArtifactGroups ?? []).flat();
}

function evaluateAlternativeRequirement(requirement, evidenceFiles) {
  const direct = evaluateArtifactTypeGroup(requirement, requirement.requiredArtifactTypes, evidenceFiles);
  if (direct.verdict === 'PASS') {
    return { mode: 'required', artifactTypes: direct.artifactTypes, verdict: 'PASS' };
  }

  const alternativeGroups = requirement.alternativeArtifactGroups ?? [];
  for (const artifactGroup of alternativeGroups) {
    const alternative = evaluateArtifactTypeGroup(requirement, artifactGroup, evidenceFiles);
    if (alternative.verdict === 'PASS') {
      return { mode: 'alternative-group', artifactTypes: alternative.artifactTypes, verdict: 'PASS' };
    }
  }

  return {
    mode: alternativeGroups.length > 0 ? 'required-or-alternative-group' : 'required',
    artifactTypes: [
      ...direct.artifactTypes,
      ...alternativeGroups.flatMap((artifactGroup) =>
        evaluateArtifactTypeGroup(requirement, artifactGroup, evidenceFiles).artifactTypes,
      ),
    ],
    verdict: 'HOLD',
  };
}

function buildStatusReport(rawEvidenceFiles = readEvidenceFiles()) {
  const evidenceFiles = rawEvidenceFiles.map(validateEvidenceFile);
  const requirements = REQUIRED_EVIDENCE.map((requirement) => {
    const assessment = evaluateAlternativeRequirement(requirement, evidenceFiles);
    return {
      id: requirement.id,
      gate: requirement.gate,
      title: requirement.title,
      verdict: assessment.verdict,
      acceptanceMode: assessment.mode,
      allowedEnvironments: requirement.allowedEnvironments,
      requiredArtifactTypes: requirement.requiredArtifactTypes,
      alternativeArtifactGroups: requirement.alternativeArtifactGroups ?? [],
      alternativeArtifactTypes: flattenAlternativeArtifactTypes(requirement),
      artifactTypes: assessment.artifactTypes,
      nextAction: assessment.verdict === 'PASS' ? 'No release-evidence action required for this gate.' : requirement.nextAction,
      nextActionKo:
        assessment.verdict === 'PASS'
          ? '이 게이트는 추가 release evidence 조치가 필요하지 않다.'
          : requirement.nextActionKo ?? requirement.nextAction,
    };
  });

  const holdRequirements = requirements.filter((requirement) => requirement.verdict !== 'PASS');
  const malformedEvidenceFiles = evidenceFiles.filter((evidence) => !evidence.valid);

  return {
    kind: STATUS_KIND,
    generatedAt: formatKst(new Date()),
    evidenceRoot: EVIDENCE_ROOT_REL,
    verdict: holdRequirements.length === 0 && malformedEvidenceFiles.length === 0 ? 'PASS' : 'HOLD',
    counts: {
      requirementCount: requirements.length,
      passCount: requirements.length - holdRequirements.length,
      holdCount: holdRequirements.length,
      evidenceFileCount: evidenceFiles.length,
      malformedEvidenceFileCount: malformedEvidenceFiles.length,
    },
    requirements,
    evidenceFiles: evidenceFiles.map((evidence) => ({
      file: evidence.file,
      sha256: evidence.sha256,
      valid: evidence.valid,
      gate: evidence.gate,
      requirementId: evidence.requirementId,
      artifactType: evidence.artifactType,
      environment: evidence.environment,
      source: evidence.source,
      generatedAt: evidence.generatedAt,
      issues: evidence.issues,
    })),
    holdActions: holdRequirements.map((requirement) => ({
      id: requirement.id,
      gate: requirement.gate,
      nextAction: requirement.nextAction,
    })),
    limitation:
      'This local scan validates attached release-evidence files only. It does not create live, legal, provider, Stripe, registry, CI, C2PA, or staging evidence.',
  };
}

// ============================================================
// PART 4 — Evidence Template Generation
// ============================================================
// Role:    Generate non-scanned JSONC templates for the remaining external
//          release evidence without creating fake PASS evidence.
// Banned:  Writing completed .json evidence or making placeholders valid.
// Input:   Requirement registry plus optional target directory.
// Output:  .template.jsonc files that humans can complete after real runs.
// Depends: PART 1 requirement registry.
// ============================================================

function templateArtifactTypesForRequirement(requirement) {
  return uniqueSorted([
    ...requirement.requiredArtifactTypes,
    ...flattenAlternativeArtifactTypes(requirement),
  ]);
}

function buildEvidenceTemplatePayload(requirement, artifactType) {
  const requiredCheckIds = requiredCheckIdsForArtifactType(artifactType);
  const checks = requiredCheckIds.length > 0
    ? requiredCheckIds.map((id) => ({
      id,
      status: 'HOLD',
      evidence: 'REPLACE_WITH_SPECIFIC_RUNTIME_TRACE_ARTIFACT_OR_SIGNOFF_EVIDENCE',
    }))
    : [
      {
        id: `${artifactType}-real-run-check`,
        status: 'HOLD',
        evidence: 'REPLACE_WITH_SPECIFIC_RUNTIME_TRACE_ARTIFACT_OR_SIGNOFF_EVIDENCE',
      },
    ];

  return {
    kind: `${EVIDENCE_KIND}.template`,
    gate: requirement.gate,
    requirementId: requirement.id,
    environment: requirement.allowedEnvironments[0],
    artifactType,
    generatedAt: 'REPLACE_WITH_ISO_TIMESTAMP_AFTER_REAL_RUN',
    source: 'REPLACE_WITH_RUN_URL_SIGNOFF_LOCATION_OR_EXTERNAL_ATTESTATION',
    summary: requirement.nextAction,
    checks,
    hashes: [
      {
        path: `${EVIDENCE_ARTIFACT_ROOT_REL}/REPLACE_WITH_ATTACHED_ARTIFACT_FILENAME`,
        sha256: 'REPLACE_WITH_64_CHAR_SHA256_HEX_DIGEST',
      },
    ],
    limitations: [
      'Template only. Do not rename to .json until real external/staging/live evidence has been attached.',
      'This evidence must not claim certification, guarantee, complete defense, or legal substitution.',
    ],
  };
}

function renderEvidenceTemplateJsonc(requirement, artifactType) {
  const payload = buildEvidenceTemplatePayload(requirement, artifactType);
  return [
    '// Loreguard release evidence template.',
    '// This .jsonc file is intentionally ignored by gate:evidence.',
    '// After a real run/sign-off, copy it to docs/release-evidence/*.json,',
    `// change kind to "${EVIDENCE_KIND}", set every check.status to "PASS",`,
    '// replace placeholders, and attach concrete hashes or source links.',
    `// Requirement: ${requirement.id}`,
    `// Artifact type: ${artifactType}`,
    `${JSON.stringify(payload, null, 2)}\n`,
  ].join('\n');
}

function safeResolveInsideRoot(relOrAbsPath) {
  const absPath = resolve(ROOT, relOrAbsPath);
  if (absPath !== ROOT && !absPath.startsWith(`${ROOT}${sep}`)) {
    throw new Error(`Refusing to write outside repository: ${relOrAbsPath}`);
  }
  return absPath;
}

function templateFileName(requirement, artifactType) {
  return `${requirement.id}__${artifactType}.template.jsonc`;
}

function writeEvidenceTemplates(targetDirRel) {
  const targetDir = safeResolveInsideRoot(targetDirRel);
  mkdirSync(targetDir, { recursive: true });

  const written = [];
  for (const requirement of REQUIRED_EVIDENCE) {
    for (const artifactType of templateArtifactTypesForRequirement(requirement)) {
      const fileName = templateFileName(requirement, artifactType);
      const absPath = join(targetDir, fileName);
      writeFileSync(absPath, renderEvidenceTemplateJsonc(requirement, artifactType), 'utf8');
      written.push(relPath(absPath));
    }
  }

  return {
    kind: 'loreguard.release-evidence-template-write.v1',
    generatedAt: formatKst(new Date()),
    targetDir: toPosix(relative(ROOT, targetDir)),
    templateCount: written.length,
    files: written,
    scannerNote: 'Templates use .jsonc and are intentionally ignored by gate:evidence until copied to completed .json evidence files.',
  };
}

// ============================================================
// PART 5 — Internal Self-Test
// ============================================================
// Role:    Prove acceptance logic without writing fixture evidence into
//          docs/release-evidence.
// Banned:  Shelling out, using network, or mutating repository state.
// Input:   In-memory evidence file records.
// Output:  PASS/throw for scanner invariants.
// Depends: PART 3 status model.
// ============================================================

function makeSelfTestEvidence(requirement, artifactType, environment = requirement.allowedEnvironments[0]) {
  const requiredCheckIds = requiredCheckIdsForArtifactType(artifactType);
  const checks = requiredCheckIds.length > 0
    ? requiredCheckIds.map((id) => ({
      id,
      status: PASS_STATUS,
      evidence: `Synthetic self-test evidence for ${id}.`,
    }))
    : [
      {
        id: `${artifactType}-check`,
        status: PASS_STATUS,
        evidence: 'Synthetic self-test evidence.',
      },
    ];
  const payload = {
    kind: EVIDENCE_KIND,
    gate: requirement.gate,
    requirementId: requirement.id,
    environment,
    artifactType,
    generatedAt: '2026-06-12T17:30:00+09:00',
    source: `self-test://${requirement.id}/${artifactType}`,
    summary: `Self-test ${artifactType}`,
    checks,
    hashes: [
      {
        path: `${artifactType}.json`,
        sha256: 'a'.repeat(64),
      },
    ],
  };
  return {
    file: `self-test/${requirement.id}/${artifactType}.json`,
    sha256: sha256Text(JSON.stringify(payload)),
    payload,
    parseError: null,
  };
}

function buildDirectPassSelfTestEvidence() {
  return REQUIRED_EVIDENCE.flatMap((requirement) =>
    requirement.requiredArtifactTypes.map((artifactType) => makeSelfTestEvidence(requirement, artifactType)),
  );
}

function requireSelfTest(condition, message) {
  if (!condition) throw new Error(`[self-test] ${message}`);
}

function runSelfTest() {
  const passReport = buildStatusReport(buildDirectPassSelfTestEvidence());
  requireSelfTest(passReport.verdict === 'PASS', 'direct required evidence should satisfy all requirements');
  requireSelfTest(passReport.counts.holdCount === 0, 'direct required evidence should leave zero HOLD requirements');

  const t13Requirement = REQUIRED_EVIDENCE.find((requirement) => requirement.id === 'T13-vector-memory-isolation');
  requireSelfTest(t13Requirement, 'T13 requirement must exist');
  const partialT13Evidence = buildDirectPassSelfTestEvidence()
    .filter((record) => record.payload.requirementId !== 'T13-vector-memory-isolation')
    .concat(makeSelfTestEvidence(t13Requirement, 'vector-db-tenant-isolation-replay', 'staging'));
  const partialT13Report = buildStatusReport(partialT13Evidence);
  const t13Assessment = partialT13Report.requirements.find((requirement) => requirement.id === 'T13-vector-memory-isolation');
  requireSelfTest(partialT13Report.verdict === 'HOLD', 'single T13 vector alternative must not satisfy release evidence');
  requireSelfTest(t13Assessment?.verdict === 'HOLD', 'T13 should remain HOLD without stale-vector invalidation replay');

  const fullT13AlternativeEvidence = buildDirectPassSelfTestEvidence()
    .filter((record) => record.payload.requirementId !== 'T13-vector-memory-isolation')
    .concat([
      makeSelfTestEvidence(t13Requirement, 'vector-db-tenant-isolation-replay', 'staging'),
      makeSelfTestEvidence(t13Requirement, 'stale-vector-invalidation-replay', 'staging'),
    ]);
  const fullT13AlternativeReport = buildStatusReport(fullT13AlternativeEvidence);
  requireSelfTest(fullT13AlternativeReport.verdict === 'PASS', 'complete T13 alternative group should satisfy release evidence');

  const malformed = makeSelfTestEvidence(REQUIRED_EVIDENCE[0], REQUIRED_EVIDENCE[0].requiredArtifactTypes[0]);
  malformed.payload.checks[0].status = 'FAIL';
  const malformedReport = buildStatusReport([malformed]);
  requireSelfTest(malformedReport.verdict === 'HOLD', 'failing checks must keep release evidence on HOLD');
  requireSelfTest(malformedReport.counts.malformedEvidenceFileCount === 1, 'failing check evidence must be counted as malformed');

  const missingAttachment = makeSelfTestEvidence(REQUIRED_EVIDENCE[0], REQUIRED_EVIDENCE[0].requiredArtifactTypes[0]);
  missingAttachment.file = `${EVIDENCE_ROOT_REL}/self-test-missing-attachment.json`;
  missingAttachment.payload.hashes[0].path = `${EVIDENCE_ARTIFACT_ROOT_REL}/missing-self-test-artifact.json`;
  const missingAttachmentReport = buildStatusReport([missingAttachment]);
  requireSelfTest(
    missingAttachmentReport.counts.malformedEvidenceFileCount === 1,
    'real evidence hash entries must point to existing attached files',
  );

  const secretText = `Bearer ${'a'.repeat(32)}`;
  const secretEvidence = makeSelfTestEvidence(REQUIRED_EVIDENCE[0], REQUIRED_EVIDENCE[0].requiredArtifactTypes[0]);
  secretEvidence.file = `${EVIDENCE_ROOT_REL}/self-test-secret-marker.json`;
  secretEvidence.content = `${JSON.stringify(secretEvidence.payload)}\n${secretText}`;
  const secretEvidenceReport = buildStatusReport([secretEvidence]);
  requireSelfTest(
    secretEvidenceReport.counts.malformedEvidenceFileCount === 1,
    'evidence JSON with secret markers must be rejected',
  );

  const answerPayload = buildAnswerPayload(buildRemainingSummary(buildStatusReport([])));
  requireSelfTest(answerPayload.coreRemainingCount === 2, 'answer payload must report two core commercial blockers');
  requireSelfTest(answerPayload.missingArtifactCount === 4, 'answer payload must report four missing commercial artifacts');
  requireSelfTest(answerPayload.overallHoldCount === 16, 'answer payload must report sixteen overall HOLD requirements');
  requireSelfTest(answerPayload.answerKo.includes('2개'), 'answer payload must keep the Korean one-line count');

  return {
    kind: 'loreguard.release-evidence-self-test.v1',
    status: 'PASS',
    checks: [
      'direct required evidence satisfies all requirements',
      'single T13 alternative remains HOLD',
      'complete T13 alternative group satisfies T13',
      'failing check evidence is rejected',
      'real evidence hash attachments are checked against files',
      'evidence JSON secret markers are rejected',
      'one-line answer payload reports remaining work counts',
    ],
  };
}

// ============================================================
// PART 6 — Rendering and CLI
// ============================================================
// Role:    Persist reports and make HOLD status usable in CI.
// Banned:  Hiding HOLD status behind a successful release claim.
// Input:   Status report plus command-line flags.
// Output:  Markdown/JSON stdout and optional written artifact.
// Depends: PART 3 status model.
// ============================================================

function mdTable(headers, rows) {
  const head = `| ${headers.join(' | ')} |`;
  const sepLine = `| ${headers.map(() => '---').join(' | ')} |`;
  const body = rows.map((row) => `| ${row.map((cell) => String(cell).replace(/\|/g, '\\|')).join(' | ')} |`);
  return [head, sepLine, ...body].join('\n');
}

function renderMarkdown(report) {
  const rows = report.requirements.map((requirement) => [
    requirement.gate,
    requirement.id,
    requirement.verdict,
    requirement.artifactTypes
      .filter((artifact) => artifact.verdict !== 'PASS')
      .map((artifact) => artifact.artifactType)
      .join(', ') || '-',
    requirement.nextAction,
  ]);

  return `# Loreguard Release Evidence Status

Generated: ${report.generatedAt}

## Verdict

- Release evidence verdict: **${report.verdict}**
- Evidence files scanned: ${report.counts.evidenceFileCount}
- Missing/HOLD requirements: ${report.counts.holdCount}
- Malformed evidence files: ${report.counts.malformedEvidenceFileCount}

## Requirements

${mdTable(['Gate', 'Requirement', 'Verdict', 'Missing Artifact Types', 'Next Action'], rows)}

## Limitation

${report.limitation}
`;
}

function buildRemainingSummary(report) {
  const coreRequirements = report.requirements.filter((requirement) =>
    CORE_COMMERCIAL_BLOCKER_IDS.has(requirement.id),
  );
  const coreHoldRequirements = coreRequirements.filter((requirement) => requirement.verdict !== 'PASS');
  const coreRemainingArtifactTypes = coreHoldRequirements.flatMap((requirement) =>
    requirement.artifactTypes
      .filter((artifact) => artifact.verdict !== 'PASS')
      .map((artifact) => ({
        gate: requirement.gate,
        requirementId: requirement.id,
        artifactType: artifact.artifactType,
        artifactLabelKo: artifactLabelKo(artifact.artifactType),
        issues: artifact.issues,
      })),
  );

  return {
    kind: 'loreguard.release-evidence-remaining.v1',
    generatedAt: report.generatedAt,
    evidenceRoot: report.evidenceRoot,
    overall: {
      verdict: report.verdict,
      requirementCount: report.counts.requirementCount,
      passCount: report.counts.passCount,
      holdCount: report.counts.holdCount,
      evidenceFileCount: report.counts.evidenceFileCount,
      malformedEvidenceFileCount: report.counts.malformedEvidenceFileCount,
    },
    coreCommercialBlockers: {
      labelKo: '상용 마지막 큰 덩어리',
      requirementCount: coreRequirements.length,
      remainingCount: coreHoldRequirements.length,
      passCount: coreRequirements.length - coreHoldRequirements.length,
      remainingArtifactTypeCount: coreRemainingArtifactTypes.length,
      requirements: coreRequirements.map((requirement) => ({
        id: requirement.id,
        gate: requirement.gate,
        verdict: requirement.verdict,
        title: requirement.title,
        missingArtifactTypes: requirement.artifactTypes
          .filter((artifact) => artifact.verdict !== 'PASS')
          .map((artifact) => artifact.artifactType),
        missingArtifactTypeLabelsKo: requirement.artifactTypes
          .filter((artifact) => artifact.verdict !== 'PASS')
          .map((artifact) => artifactLabelKo(artifact.artifactType)),
        nextAction: requirement.nextAction,
        nextActionKo: requirement.nextActionKo ?? requirement.nextAction,
      })),
      remainingArtifactTypes: coreRemainingArtifactTypes,
    },
    oneLineKo:
      coreHoldRequirements.length === 0
        ? '상용 핵심 막힘은 0개, 누락 증거 산출물은 0개입니다.'
        : `상용 핵심 막힘은 ${coreHoldRequirements.length}개, 누락 증거 산출물은 ${coreRemainingArtifactTypes.length}개입니다.`,
    nextAnswerKo:
      coreHoldRequirements.length === 0
        ? '핵심 상용 막힘은 증거 기준으로 닫혔고, 전체 release evidence만 별도 확인하면 됩니다.'
        : `핵심 상용 막힘은 ${coreHoldRequirements.length}개 남았습니다. 전체 release evidence HOLD는 ${report.counts.holdCount}개입니다.`,
    limitation:
      '이 요약은 release evidence 스캐너가 확인한 증거만 센다. 완료 판정은 완성된 증거 JSON과 첨부 산출물 해시가 gate:evidence를 통과할 때만 가능하다.',
  };
}

function buildAnswerPayload(summary) {
  const answerKo = `${summary.oneLineKo} 전체 release evidence HOLD는 ${summary.overall.holdCount}개입니다.`;
  return {
    kind: 'loreguard.release-evidence-answer.v1',
    generatedAt: summary.generatedAt,
    answerKo,
    coreRemainingCount: summary.coreCommercialBlockers.remainingCount,
    missingArtifactCount: summary.coreCommercialBlockers.remainingArtifactTypeCount,
    overallHoldCount: summary.overall.holdCount,
    evidenceFileCount: summary.overall.evidenceFileCount,
  };
}

function renderAnswerPayload(answer) {
  return `# Loreguard 남은 작업 한 줄 답변

Generated: ${answer.generatedAt}

${answer.answerKo}

## 숫자

- 상용 핵심 막힘: ${answer.coreRemainingCount}개
- 누락 증거 산출물: ${answer.missingArtifactCount}개
- 전체 release evidence HOLD: ${answer.overallHoldCount}개
- 읽은 증거 파일: ${answer.evidenceFileCount}개
`;
}

function renderRemainingSummary(summary) {
  const rows = summary.coreCommercialBlockers.requirements.map((requirement) => [
    requirement.gate,
    requirement.id,
    requirement.verdict,
    requirement.missingArtifactTypeLabelsKo.join(', ') || '-',
    requirement.nextActionKo,
  ]);

  return `# Loreguard 남은 작업 요약

Generated: ${summary.generatedAt}

## 한 줄 결론

${summary.oneLineKo}

## 남은 수

- 핵심 상용 막힘: **${summary.coreCommercialBlockers.remainingCount}개 남음** / ${summary.coreCommercialBlockers.requirementCount}개
- 핵심 누락 산출물 단위: ${summary.coreCommercialBlockers.remainingArtifactTypeCount}개
- 전체 release evidence HOLD: ${summary.overall.holdCount}개 / ${summary.overall.requirementCount}개
- 읽은 증거 파일: ${summary.overall.evidenceFileCount}개

## 핵심 막힘

${mdTable(['게이트', '요구사항', '판정', '누락 산출물', '다음 행동'], rows)}

## 메모

${summary.nextAnswerKo}

${summary.limitation}
`;
}

function parseArgs(argv) {
  const out = {
    writePath: null,
    json: false,
    answer: false,
    remaining: false,
    failOnHold: false,
    selfTest: false,
    templateRequirementId: null,
    templateArtifactType: null,
    writeTemplatesDir: null,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--write') {
      out.writePath = argv[index + 1] || null;
      index += 1;
    } else if (arg === '--json') {
      out.json = true;
    } else if (arg === '--answer') {
      out.answer = true;
    } else if (arg === '--remaining') {
      out.remaining = true;
    } else if (arg === '--fail-on-hold') {
      out.failOnHold = true;
    } else if (arg === '--self-test') {
      out.selfTest = true;
    } else if (arg === '--template') {
      out.templateRequirementId = argv[index + 1] || null;
      index += 1;
    } else if (arg === '--artifact-type') {
      out.templateArtifactType = argv[index + 1] || null;
      index += 1;
    } else if (arg === '--write-templates') {
      out.writeTemplatesDir = argv[index + 1] || null;
      index += 1;
    }
  }
  return out;
}

function writeOutput(writePath, payload, renderText) {
  if (!writePath) return;
  const absPath = resolve(ROOT, writePath);
  if (!absPath.startsWith(ROOT)) {
    throw new Error(`Refusing to write outside repository: ${writePath}`);
  }
  mkdirSync(dirname(absPath), { recursive: true });
  const content = extname(writePath).toLowerCase() === '.json'
    ? `${JSON.stringify(payload, null, 2)}\n`
    : renderText(payload);
  writeFileSync(absPath, content, 'utf8');
}

const cli = parseArgs(process.argv.slice(2));
if (cli.selfTest) {
  process.stdout.write(`${JSON.stringify(runSelfTest(), null, 2)}\n`);
  process.exit(0);
}

if (cli.writeTemplatesDir) {
  process.stdout.write(`${JSON.stringify(writeEvidenceTemplates(cli.writeTemplatesDir), null, 2)}\n`);
  process.exit(0);
}

if (cli.templateRequirementId) {
  const requirement = REQUIRED_EVIDENCE.find((item) => item.id === cli.templateRequirementId);
  if (!requirement) {
    throw new Error(`Unknown requirement id: ${cli.templateRequirementId}`);
  }
  const artifactTypes = cli.templateArtifactType
    ? [cli.templateArtifactType]
    : templateArtifactTypesForRequirement(requirement);
  const validArtifactTypes = new Set(templateArtifactTypesForRequirement(requirement));
  for (const artifactType of artifactTypes) {
    if (!validArtifactTypes.has(artifactType)) {
      throw new Error(`Invalid artifact type for ${requirement.id}: ${artifactType}`);
    }
  }
  process.stdout.write(artifactTypes.map((artifactType) =>
    renderEvidenceTemplateJsonc(requirement, artifactType),
  ).join('\n'));
  process.exit(0);
}

const report = buildStatusReport();

if (cli.answer) {
  const summary = buildRemainingSummary(report);
  const answerPayload = buildAnswerPayload(summary);
  writeOutput(cli.writePath, answerPayload, renderAnswerPayload);
  process.stdout.write(cli.json ? `${JSON.stringify(answerPayload, null, 2)}\n` : `${answerPayload.answerKo}\n`);
} else if (cli.remaining) {
  const summary = buildRemainingSummary(report);
  writeOutput(cli.writePath, summary, renderRemainingSummary);
  process.stdout.write(cli.json ? `${JSON.stringify(summary, null, 2)}\n` : renderRemainingSummary(summary));
} else if (cli.json) {
  writeOutput(cli.writePath, report, renderMarkdown);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} else {
  writeOutput(cli.writePath, report, renderMarkdown);
  process.stdout.write(renderMarkdown(report));
}

if (cli.failOnHold && report.verdict !== 'PASS') {
  process.exitCode = 1;
}
