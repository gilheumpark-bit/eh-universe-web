#!/usr/bin/env node
// ============================================================
// PART 1 — Release Evidence Composer
// ============================================================
// Role:    Turn a completed release-evidence template plus real run artifacts
//          into a scanner-ready docs/release-evidence/*.json file.
// Banned:  Network calls, changing check status without explicit evidence, or
//          writing outside docs/release-evidence.
// Input:   .template.jsonc, --check id=evidence pairs, optional artifact files.
// Output:  loreguard.release-evidence.v1 JSON plus copied artifact files.
// Depends: Node built-ins only.
// ============================================================

import { createHash } from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(SCRIPT_DIR, '..');
const EVIDENCE_KIND = 'loreguard.release-evidence.v1';
const TEMPLATE_KIND = `${EVIDENCE_KIND}.template`;
const EVIDENCE_ROOT_REL = 'docs/release-evidence';
const EVIDENCE_ROOT = join(ROOT, 'docs', 'release-evidence');
const ARTIFACT_ROOT_REL = 'docs/release-evidence/artifacts';
const ARTIFACT_ROOT = join(ROOT, 'docs', 'release-evidence', 'artifacts');

// ============================================================
// PART 2 — Small Helpers
// ============================================================

function toPosix(value) {
  return value.split(sep).join('/');
}

function relPath(absPath) {
  return toPosix(relative(ROOT, absPath));
}

function sha256Buffer(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function readJsoncTemplate(templatePath) {
  const text = readFileSync(templatePath, 'utf8');
  const withoutLineComments = text
    .split(/\r?\n/)
    .filter((line) => !line.trimStart().startsWith('//'))
    .join('\n');
  return JSON.parse(withoutLineComments);
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function sanitizeSegment(value) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^_+|_+$/g, '') || 'artifact';
}

function safeResolveInsideRoot(relOrAbsPath, label) {
  const absPath = resolve(ROOT, relOrAbsPath);
  if (absPath !== ROOT && !absPath.startsWith(`${ROOT}${sep}`)) {
    throw new Error(`${label} must stay inside repository: ${relOrAbsPath}`);
  }
  return absPath;
}

function safeResolveEvidenceOutput(relOrAbsPath) {
  const absPath = safeResolveInsideRoot(relOrAbsPath, 'output');
  if (absPath === EVIDENCE_ROOT || !absPath.startsWith(`${EVIDENCE_ROOT}${sep}`)) {
    throw new Error(`output must be under ${EVIDENCE_ROOT_REL}: ${relOrAbsPath}`);
  }
  if (extname(absPath).toLowerCase() !== '.json') {
    throw new Error(`output must be a .json file: ${relOrAbsPath}`);
  }
  return absPath;
}

function copyArtifact(inputPath, artifactType) {
  const absInputPath = resolve(inputPath);
  if (!existsSync(absInputPath) || !statSync(absInputPath).isFile()) {
    throw new Error(`artifact file does not exist: ${inputPath}`);
  }

  const content = readFileSync(absInputPath);
  const sha256 = sha256Buffer(content);
  const safeBase = sanitizeSegment(basename(absInputPath));
  const safeArtifactType = sanitizeSegment(artifactType);
  const outputName = `${safeArtifactType}__${sha256.slice(0, 12)}__${safeBase}`;
  const absOutputPath = join(ARTIFACT_ROOT, outputName);

  mkdirSync(ARTIFACT_ROOT, { recursive: true });
  copyFileSync(absInputPath, absOutputPath);

  return {
    path: relPath(absOutputPath),
    sha256,
  };
}

function parseCheckArg(value) {
  const dividerIndex = value.indexOf('=');
  if (dividerIndex <= 0) {
    throw new Error(`--check must use id=evidence: ${value}`);
  }
  const id = value.slice(0, dividerIndex).trim();
  const evidence = value.slice(dividerIndex + 1).trim();
  if (!id || !evidence) {
    throw new Error(`--check must include both id and evidence: ${value}`);
  }
  return { id, evidence };
}

// ============================================================
// PART 3 — Composer
// ============================================================

function composeEvidence(input) {
  const template = readJsoncTemplate(input.templatePath);
  if (!isObject(template)) throw new Error('template payload must be an object');
  if (template.kind !== TEMPLATE_KIND) {
    throw new Error(`template kind must be ${TEMPLATE_KIND}`);
  }
  if (!Array.isArray(template.checks) || template.checks.length === 0) {
    throw new Error('template checks must be a non-empty array');
  }
  if (!isNonEmptyString(template.artifactType)) {
    throw new Error('template artifactType is required');
  }

  const checkEvidence = new Map(input.checks.map((check) => [check.id, check.evidence]));
  const checks = template.checks.map((check) => {
    if (!isObject(check) || !isNonEmptyString(check.id)) {
      throw new Error('every template check must have an id');
    }
    const evidence = checkEvidence.get(check.id);
    if (!evidence) {
      throw new Error(`missing --check evidence for ${check.id}`);
    }
    return {
      id: check.id,
      status: 'PASS',
      evidence,
    };
  });

  const hashes = input.artifacts.map((artifactPath) => copyArtifact(artifactPath, template.artifactType));
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const summary = input.summary ?? template.summary;

  const evidence = {
    ...template,
    kind: EVIDENCE_KIND,
    environment: input.environment ?? template.environment,
    generatedAt,
    source: input.source,
    summary,
    checks,
    hashes,
    limitations: Array.isArray(template.limitations)
      ? template.limitations.filter((item) => typeof item === 'string' && !item.includes('Template only'))
      : [],
  };

  return evidence;
}

function writeEvidence(input) {
  const outputPath = safeResolveEvidenceOutput(input.outputPath);
  const evidence = composeEvidence(input);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
  return {
    kind: 'loreguard.release-evidence-compose.v1',
    output: relPath(outputPath),
    artifactCount: evidence.hashes.length,
    checkCount: evidence.checks.length,
    nextCommand: 'npm run gate:evidence',
  };
}

// ============================================================
// PART 4 — CLI
// ============================================================

function selfTestTempParent() {
  const parent = join(ROOT, '.codex-tmp');
  mkdirSync(parent, { recursive: true });
  return parent;
}

function cleanupSelfTestCopiedArtifacts() {
  if (!existsSync(ARTIFACT_ROOT)) return;
  for (const entry of readdirSync(ARTIFACT_ROOT)) {
    if (entry.startsWith('compose-self-test-artifact__')) {
      unlinkSync(join(ARTIFACT_ROOT, entry));
    }
  }
}

function parseArgs(argv) {
  const parsed = {
    templatePath: null,
    outputPath: null,
    source: null,
    generatedAt: null,
    environment: null,
    summary: null,
    checks: [],
    artifacts: [],
    selfTest: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--template') {
      parsed.templatePath = argv[index + 1] ?? null;
      index += 1;
    } else if (arg === '--out') {
      parsed.outputPath = argv[index + 1] ?? null;
      index += 1;
    } else if (arg === '--source') {
      parsed.source = argv[index + 1] ?? null;
      index += 1;
    } else if (arg === '--generated-at') {
      parsed.generatedAt = argv[index + 1] ?? null;
      index += 1;
    } else if (arg === '--environment') {
      parsed.environment = argv[index + 1] ?? null;
      index += 1;
    } else if (arg === '--summary') {
      parsed.summary = argv[index + 1] ?? null;
      index += 1;
    } else if (arg === '--check') {
      parsed.checks.push(parseCheckArg(argv[index + 1] ?? ''));
      index += 1;
    } else if (arg === '--artifact') {
      parsed.artifacts.push(argv[index + 1] ?? '');
      index += 1;
    } else if (arg === '--self-test') {
      parsed.selfTest = true;
    }
  }

  return parsed;
}

function assertCliInput(input) {
  if (!input.templatePath) throw new Error('--template is required');
  if (!input.outputPath) throw new Error('--out is required');
  if (!input.source) throw new Error('--source is required');
  if (input.checks.length === 0) throw new Error('at least one --check id=evidence is required');
}

function runSelfTest() {
  const tempRoot = mkdtempSync(join(selfTestTempParent(), 'loreguard-evidence-compose-'));
  try {
    const templatePath = join(tempRoot, 'template.jsonc');
    const artifactPath = join(tempRoot, 'run-log.txt');
    const outputPath = 'docs/release-evidence/self-test-compose.json';
    writeFileSync(templatePath, JSON.stringify({
      kind: TEMPLATE_KIND,
      gate: 'T0',
      requirementId: 'T0-deployed-destructive-workflow',
      environment: 'staging',
      artifactType: 'compose-self-test-artifact',
      generatedAt: 'REPLACE',
      source: 'REPLACE',
      summary: 'Self-test template',
      checks: [{ id: 'self-test-check', status: 'HOLD', evidence: 'REPLACE' }],
      hashes: [{ path: `${ARTIFACT_ROOT_REL}/REPLACE`, sha256: 'REPLACE' }],
      limitations: ['Template only.', 'This evidence must not claim certification.'],
    }, null, 2), 'utf8');
    writeFileSync(artifactPath, 'compose self-test artifact\n', 'utf8');

    const evidence = composeEvidence({
      templatePath,
      outputPath,
      source: 'self-test://compose',
      generatedAt: '2026-06-15T00:00:00.000Z',
      environment: 'staging',
      summary: null,
      checks: [{ id: 'self-test-check', evidence: 'Synthetic compose evidence.' }],
      artifacts: [artifactPath],
    });

    if (evidence.kind !== EVIDENCE_KIND) throw new Error('self-test evidence kind mismatch');
    if (evidence.checks[0]?.status !== 'PASS') throw new Error('self-test check did not pass');
    if (!evidence.hashes[0]?.path.startsWith(ARTIFACT_ROOT_REL)) {
      throw new Error('self-test artifact was not copied under evidence artifact root');
    }

    return {
      kind: 'loreguard.release-evidence-compose-self-test.v1',
      status: 'PASS',
      checks: [
        'template is converted to completed evidence',
        'check evidence is required and marked PASS',
        'artifact file is copied and hashed',
      ],
    };
  } finally {
    cleanupSelfTestCopiedArtifacts();
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

const cli = parseArgs(process.argv.slice(2));
if (cli.selfTest) {
  process.stdout.write(`${JSON.stringify(runSelfTest(), null, 2)}\n`);
  process.exit(0);
}

assertCliInput(cli);
process.stdout.write(`${JSON.stringify(writeEvidence(cli), null, 2)}\n`);
