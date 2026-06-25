#!/usr/bin/env node
// ============================================================
// PART 1 - Release Disabled Attestation Generator
// ============================================================
// Role:    Produce scanner-ready release evidence only for features that
//          are intentionally disabled in the current product surface.
// Banned:  Network calls, legal claims, provider claims, or PASS evidence
//          for live/staging systems this script did not inspect.
// Input:   Current repository files.
// Output:  T10/T13 disabled-attestation evidence JSON plus text artifacts.
// Depends: Node built-ins only.
// ============================================================

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(SCRIPT_DIR, '..');
const ARTIFACT_ROOT_REL = 'docs/release-evidence/artifacts';
const EVIDENCE_ROOT = join(ROOT, 'docs', 'release-evidence');
const ARTIFACT_ROOT = join(ROOT, 'docs', 'release-evidence', 'artifacts');
const EVIDENCE_KIND = 'loreguard.release-evidence.v1';

const SOURCE_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs']);
const SKIP_DIRS = new Set(['.git', '.next', '.jest-cache', 'coverage', 'dist', 'node_modules']);

const AGENT_ROUTE_CHECKS = [
  {
    file: 'src/app/api/agent-search/route.ts',
    required: ['agent_search_disabled', '{ status: 503 }'],
  },
  {
    file: 'src/app/api/agent-search/status/route.ts',
    required: ['agent_search_disabled', '{ status: 503 }'],
  },
  {
    file: 'src/app/api/network-agent/search/route.ts',
    required: ['surface_removed', '{ status: 410 }'],
  },
  {
    file: 'src/app/api/network-agent/ingest/route.ts',
    required: ['surface_removed', '{ status: 410 }'],
  },
];

const CREATIVE_RAG_SCAN_ROOTS = [
  'src/app/api/chat',
  'src/app/api/complete',
  'src/app/api/gemini-structured',
  'src/app/api/structured-generate',
  'src/app/studio',
  'src/components/loreguard',
  'src/components/studio',
  'src/engine/auto-pipeline.ts',
  'src/engine/context-builder.ts',
  'src/engine/detail-pass.ts',
  'src/engine/director.ts',
  'src/engine/pipeline.ts',
  'src/engine/proactive-suggestions.ts',
  'src/engine/story-context.ts',
  'src/engine/validator.ts',
  'src/hooks',
  'src/services/geminiService.ts',
  'src/services/geminiStructuredTaskService.ts',
];

const CREATIVE_RAG_PATTERNS = [
  { id: 'rag-service-import', regex: /from ['"]@?\/?services\/ragService['"]|from ['"]\.\.?\/.*ragService['"]/ },
  { id: 'rag-search-call', regex: /\bragSearch\s*\(/ },
  { id: 'rag-context-builder', regex: /\bbuildRAGTranslationContext\s*\(/ },
  { id: 'rag-url-constant', regex: /\bSPARK_RAG_URL\b/ },
];

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

function readText(relFile) {
  return readFileSync(join(ROOT, relFile), 'utf8');
}

function pathExists(relFile) {
  return existsSync(join(ROOT, relFile));
}

function* walkFiles(absPath) {
  if (!existsSync(absPath)) return;
  const stats = statSync(absPath);
  if (stats.isFile()) {
    if (SOURCE_EXTS.has(extname(absPath))) yield absPath;
    return;
  }
  for (const entry of readdirSync(absPath)) {
    if (SKIP_DIRS.has(entry)) continue;
    const child = join(absPath, entry);
    const childStats = statSync(child);
    if (childStats.isDirectory()) {
      yield* walkFiles(child);
    } else if (childStats.isFile() && SOURCE_EXTS.has(extname(child))) {
      yield child;
    }
  }
}

function isTestFile(relFile) {
  return relFile.includes('/__tests__/') || /\.test\./.test(relFile) || /\.spec\./.test(relFile);
}

function checkAgentRunnerDisabled() {
  const checks = AGENT_ROUTE_CHECKS.map((item) => {
    if (!pathExists(item.file)) {
      return { file: item.file, ok: false, missing: ['file'], matched: [] };
    }
    const text = readText(item.file);
    const missing = item.required.filter((needle) => !text.includes(needle));
    return {
      file: item.file,
      ok: missing.length === 0,
      missing,
      matched: item.required.filter((needle) => text.includes(needle)),
    };
  });

  return {
    ok: checks.every((check) => check.ok),
    checks,
  };
}

function scanCreativeRagUsage() {
  const findings = [];
  for (const root of CREATIVE_RAG_SCAN_ROOTS) {
    const absRoot = join(ROOT, root);
    for (const absFile of walkFiles(absRoot)) {
      const relFile = relPath(absFile);
      if (isTestFile(relFile)) continue;
      const lines = readFileSync(absFile, 'utf8').split(/\r?\n/);
      lines.forEach((line, index) => {
        for (const pattern of CREATIVE_RAG_PATTERNS) {
          pattern.regex.lastIndex = 0;
          if (!pattern.regex.test(line)) continue;
          findings.push({
            pattern: pattern.id,
            file: relFile,
            line: index + 1,
            snippet: line.trim().slice(0, 180),
          });
        }
      });
    }
  }
  return findings;
}

function checkExternalMemoryDisabled() {
  const ragService = pathExists('src/services/ragService.ts') ? readText('src/services/ragService.ts') : '';
  const docs = pathExists('AGENTS.md') ? readText('AGENTS.md') : '';
  const findings = scanCreativeRagUsage();
  const translationOnlyClaim = [
    'Translation Studio',
    'Loreguard Studio',
    '자동 주입하지 않는다',
  ].every((needle) => ragService.includes(needle));
  const productBoundaryClaim = docs.includes('창작 RAG 제거') && docs.includes('번역 보강용 레거시 경로로만 남긴다');

  return {
    ok: translationOnlyClaim && productBoundaryClaim && findings.length === 0,
    checks: {
      translationOnlyClaim,
      productBoundaryClaim,
      creativeRagFindingCount: findings.length,
    },
    findings,
  };
}

function writeTextArtifact(fileName, payload) {
  mkdirSync(ARTIFACT_ROOT, { recursive: true });
  const content = `${JSON.stringify(payload, null, 2)}\n`;
  const absPath = join(ARTIFACT_ROOT, fileName);
  writeFileSync(absPath, content, 'utf8');
  return {
    path: `${ARTIFACT_ROOT_REL}/${fileName}`,
    sha256: sha256Text(content),
  };
}

function writeEvidence(fileName, payload) {
  mkdirSync(EVIDENCE_ROOT, { recursive: true });
  const absPath = join(EVIDENCE_ROOT, fileName);
  writeFileSync(absPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  return relPath(absPath);
}

function evidencePayload(input) {
  return {
    kind: EVIDENCE_KIND,
    gate: input.gate,
    requirementId: input.requirementId,
    environment: 'disabled-attestation',
    artifactType: input.artifactType,
    generatedAt: input.generatedAt,
    source: 'local-script://scripts/loreguard-release-disabled-attestations.mjs',
    summary: input.summary,
    checks: [
      {
        id: input.checkId,
        status: 'PASS',
        evidence: input.evidence,
      },
    ],
    hashes: [input.hash],
    limitations: [
      'Disabled-state attestation only. This does not replace staging, legal, provider, payment, or production evidence.',
      'This evidence does not claim legal substitution, ownership determination, or complete protection.',
    ],
  };
}

function main() {
  const generatedAt = formatKst(new Date());
  const agentRunner = checkAgentRunnerDisabled();
  const memory = checkExternalMemoryDisabled();
  const failures = [];
  if (!agentRunner.ok) failures.push({ id: 'agent-runner-disabled', details: agentRunner.checks });
  if (!memory.ok) failures.push({ id: 'external-memory-disabled', details: memory });
  if (failures.length > 0) {
    process.stderr.write(`${JSON.stringify({
      kind: 'loreguard.disabled-attestation-result.v1',
      status: 'FAIL',
      generatedAt,
      failures,
    }, null, 2)}\n`);
    process.exitCode = 1;
    return;
  }

  const t10Hash = writeTextArtifact('t10-agent-runner-disabled-attestation.txt', {
    kind: 'loreguard.disabled-attestation-artifact.v1',
    gate: 'T10',
    generatedAt,
    inspectedFiles: agentRunner.checks,
    conclusion: 'Retired agent-search and network-agent compatibility routes return disabled or removed responses and expose no active runner surface.',
  });
  const t13Hash = writeTextArtifact('t13-external-memory-disabled-attestation.txt', {
    kind: 'loreguard.disabled-attestation-artifact.v1',
    gate: 'T13',
    generatedAt,
    inspectedRoots: CREATIVE_RAG_SCAN_ROOTS,
    checks: memory.checks,
    findings: memory.findings,
    conclusion: 'Loreguard Studio creative/writing paths do not import or call the legacy RAG client. RAG remains translation-only legacy support.',
  });

  const written = [
    writeEvidence('t10-agent-runner-disabled-attestation.json', evidencePayload({
      gate: 'T10',
      requirementId: 'T10-agent-runner-containment',
      artifactType: 'agent-runner-disabled-attestation',
      generatedAt,
      checkId: 'agent-runner-disabled-attestation-real-run-check',
      evidence: 'Static repository inspection confirmed retired agent-search/network-agent routes return disabled or removed responses; attached artifact records inspected files.',
      hash: t10Hash,
      summary: 'Agent runner surfaces remain disabled in the current Loreguard product.',
    })),
    writeEvidence('t13-external-memory-disabled-attestation.json', evidencePayload({
      gate: 'T13',
      requirementId: 'T13-vector-memory-isolation',
      artifactType: 'external-memory-disabled-attestation',
      generatedAt,
      checkId: 'external-memory-disabled-attestation-real-run-check',
      evidence: 'Static repository inspection confirmed creative/writing paths do not import or call the legacy RAG client; attached artifact records scanned roots.',
      hash: t13Hash,
      summary: 'External memory/vector RAG is disabled for creative writing paths; legacy RAG remains translation-only support.',
    })),
  ];

  process.stdout.write(`${JSON.stringify({
    kind: 'loreguard.disabled-attestation-result.v1',
    status: 'PASS',
    generatedAt,
    written,
    nextCommand: 'npm run gate:evidence -- --write docs/gates/release-evidence-status-2026-06-12.json',
  }, null, 2)}\n`);
}

main();
