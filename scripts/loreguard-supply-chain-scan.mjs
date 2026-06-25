#!/usr/bin/env node
// ============================================================
// PART 1 — Loreguard AI Supply Chain Hash Baseline
// ============================================================
// Role:    Hash release-relevant AI source, prompt, and lockfile inputs.
// Banned:  Network calls, package installs, or claims of runtime model attestation.
// Input:   Current repository files plus optional --write path.
// Output:  JSON manifest for docs/ai-supply-chain.yml.
// Depends: Node built-ins only.
// ============================================================

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(SCRIPT_DIR, '..');

const GROUPS = [
  {
    id: 'model-source-files',
    files: [
      'src/services/geminiStructuredTaskService.ts',
      'src/services/geminiService.ts',
      'src/lib/ai-providers.ts',
      'src/lib/dgx-models.ts',
      'src/services/sparkService.ts',
    ],
  },
  {
    id: 'prompt-source-files',
    files: [
      'src/lib/ai/writing-agent-registry.ts',
      'src/lib/ai/creative-domain-prompts/ko.ts',
      'src/lib/ai/creative-domain-prompts/en.ts',
      'src/lib/ai/creative-domain-prompts/ja.ts',
      'src/lib/ai/creative-domain-prompts/zh.ts',
      'src/lib/ai/creative-domain-prompts/index.ts',
    ],
  },
  {
    id: 'build-lockfiles',
    files: ['package-lock.json', 'package.json'],
  },
];

const MODEL_REFERENCE_FILES = [
  'src/app/api/analyze-chapter/route.ts',
  'src/app/api/chat/route.ts',
  'src/app/api/complete/route.ts',
  'src/app/api/gemini-structured/route.ts',
  'src/app/api/structured-generate/route.ts',
  'src/app/api/translate/route.ts',
  'src/lib/ai-providers.ts',
  'src/lib/dgx-models.ts',
  'src/lib/multi-key-manager.ts',
  'src/lib/token-utils.ts',
  'src/services/aiProviders.ts',
  'src/services/aiProvidersStructured.ts',
  'src/services/geminiService.ts',
  'src/services/geminiStructuredTaskService.ts',
  'src/services/sparkService.ts',
];

const MODEL_LITERAL_RE = /['"`]((?:openai\/gpt|qwen\/qwen|gemini|gpt|claude|llama|mistral|deepseek|qwen|local-model)[A-Za-z0-9._/+-]*)['"`]/gi;
const EVAL_SUITE_FILE = 'docs/evals/loreguard-offline-eval-cases-2026-06-12.json';
const NON_MODEL_IDS = new Set([
  'gemini',
  'openai',
  'claude',
  'groq',
  'mistral',
  'ollama',
  'lmstudio',
  'gemini-structured',
  'geminiService',
]);

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

function sha256File(relFile) {
  const absPath = join(ROOT, relFile);
  if (!existsSync(absPath)) return null;
  return createHash('sha256').update(readFileSync(absPath)).digest('hex');
}

function sha256Text(text) {
  return createHash('sha256').update(text).digest('hex');
}

function readJsonFile(relFile) {
  const absPath = join(ROOT, relFile);
  if (!existsSync(absPath)) return null;
  return JSON.parse(readFileSync(absPath, 'utf8'));
}

function readTextFile(relFile) {
  const absPath = join(ROOT, relFile);
  if (!existsSync(absPath)) return null;
  return readFileSync(absPath, 'utf8');
}

function isLikelyModelId(value) {
  if (NON_MODEL_IDS.has(value)) return false;
  if (/^[a-z]+$/.test(value)) return false;
  return (
    value === 'local-model' ||
    /\d/.test(value) ||
    /latest|preview|nano|mini|flash|pro|sonnet|haiku|opus|versatile|instant|medium|large|small/i.test(value)
  );
}

function extractModelReferences() {
  const references = [];
  const seen = new Set();
  for (const relFile of MODEL_REFERENCE_FILES) {
    const absPath = join(ROOT, relFile);
    if (!existsSync(absPath)) continue;
    const lines = readFileSync(absPath, 'utf8').split(/\r?\n/);
    lines.forEach((line, lineIndex) => {
      MODEL_LITERAL_RE.lastIndex = 0;
      let match;
      while ((match = MODEL_LITERAL_RE.exec(line)) !== null) {
        const modelId = match[1];
        if (!isLikelyModelId(modelId)) continue;
        const key = `${relFile}:${lineIndex + 1}:${modelId}`;
        if (seen.has(key)) continue;
        seen.add(key);
        references.push({
          modelId,
          path: relFile,
          line: lineIndex + 1,
        });
      }
    });
  }
  return references.sort((a, b) => a.modelId.localeCompare(b.modelId) || a.path.localeCompare(b.path) || a.line - b.line);
}

function packageNameFromLockPath(lockPath) {
  const segments = lockPath.split('node_modules/');
  const packagePath = segments[segments.length - 1] || lockPath;
  const parts = packagePath.split('/').filter(Boolean);
  if (!parts.length) return packagePath;
  if (parts[0].startsWith('@')) return [parts[0], parts[1]].filter(Boolean).join('/');
  return parts[0];
}

function buildSbomFromPackageLock() {
  const lock = readJsonFile('package-lock.json');
  const packageJson = readJsonFile('package.json');
  if (!lock || typeof lock !== 'object' || !lock.packages || typeof lock.packages !== 'object') {
    return {
      status: 'HOLD_MISSING_LOCKFILE',
      format: 'spdx-lite-json',
      source: 'package-lock.json',
      limitation: 'package-lock.json could not be parsed; SBOM evidence is not attached.',
      packages: [],
    };
  }

  const packages = Object.entries(lock.packages)
    .filter(([lockPath, meta]) =>
      lockPath.startsWith('node_modules/') &&
      meta &&
      typeof meta === 'object' &&
      typeof meta.version === 'string',
    )
    .map(([lockPath, meta]) => ({
      spdxId: `SPDXRef-Package-${sha256Text(lockPath).slice(0, 16)}`,
      name: packageNameFromLockPath(lockPath),
      version: meta.version,
      lockPath,
      license: typeof meta.license === 'string' ? meta.license : 'NOASSERTION',
      resolved: typeof meta.resolved === 'string' ? meta.resolved : null,
      integrity: typeof meta.integrity === 'string' ? meta.integrity : null,
      dev: Boolean(meta.dev),
      optional: Boolean(meta.optional),
    }))
    .sort((a, b) => a.name.localeCompare(b.name) || a.lockPath.localeCompare(b.lockPath));

  return {
    status: 'LOCKFILE_SBOM_ATTACHED',
    format: 'spdx-lite-json',
    source: 'package-lock.json',
    lockfileVersion: lock.lockfileVersion ?? null,
    rootPackage: {
      name: lock.name ?? packageJson?.name ?? null,
      version: lock.version ?? packageJson?.version ?? null,
      license: packageJson?.license ?? 'NOASSERTION',
    },
    packageCount: packages.length,
    directDependencyCount: Object.keys(packageJson?.dependencies ?? {}).length,
    devDependencyCount: Object.keys(packageJson?.devDependencies ?? {}).length,
    packageHash: sha256Text(
      packages
        .map((pkg) => `${pkg.lockPath}:${pkg.name}:${pkg.version}:${pkg.integrity ?? ''}`)
        .join('\n'),
    ),
    packages,
    limitation:
      'Lockfile-derived SBOM evidence only. Licenses and resolved URLs are copied from package-lock/package metadata and are not a live registry attestation.',
  };
}

function buildLocalBuildProvenance(input) {
  const materials = input.groups.flatMap((group) =>
    group.files.map((file) => ({
      uri: `git+file://${file.path}`,
      digest: file.sha256 ? { sha256: file.sha256 } : {},
    })),
  );
  const buildLockGroup = input.groups.find((group) => group.id === 'build-lockfiles');

  return {
    status: 'LOCAL_BUILD_PROVENANCE_ATTACHED',
    predicateType: 'https://slsa.dev/provenance/v1-lite',
    subject: [
      {
        name: 'eh-universe-web',
        digest: buildLockGroup?.groupHash ? { sha256: buildLockGroup.groupHash } : {},
      },
    ],
    builder: {
      id: 'loreguard-local-supply-chain-scan',
      version: '1',
    },
    buildType: 'https://nextjs.org/build/local',
    invocation: {
      command: 'npm run build',
      parameters: {
        framework: 'next',
        source: 'workspace',
      },
    },
    materials,
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
    },
    generatedAt: input.generatedAt,
    sbom: {
      status: input.sbom.status,
      source: input.sbom.source,
      packageCount: input.sbom.packageCount ?? 0,
      packageHash: input.sbom.packageHash ?? null,
    },
    limitation:
      'Local unsigned provenance evidence. It records repository inputs and build intent, but it is not a CI-signed SLSA attestation.',
  };
}

function evalTargetText(target) {
  if (target === 'prompt-source-files') {
    const group = GROUPS.find((item) => item.id === 'prompt-source-files');
    return (group?.files ?? [])
      .map((file) => {
        const text = readTextFile(file);
        return text === null ? '' : `\n/* ${file} */\n${text}`;
      })
      .join('\n');
  }
  return readTextFile(target) ?? '';
}

function evaluateOfflineCase(testCase) {
  const target = typeof testCase.target === 'string' ? testCase.target : '';
  const assertion = typeof testCase.assertion === 'string' ? testCase.assertion : '';
  const terms = Array.isArray(testCase.terms)
    ? testCase.terms.filter((term) => typeof term === 'string' && term.length > 0)
    : [];
  const targetText = target ? evalTargetText(target) : '';
  const matchedTerms = terms.filter((term) => targetText.includes(term));
  const missingTerms = terms.filter((term) => !targetText.includes(term));

  let passed = false;
  let reason = 'unsupported-assertion';
  if (!target || !targetText) {
    reason = 'missing-target';
  } else if (!terms.length) {
    reason = 'missing-terms';
  } else if (assertion === 'require-all') {
    passed = missingTerms.length === 0;
    reason = passed ? 'passed' : 'required-term-missing';
  } else if (assertion === 'require-any') {
    passed = matchedTerms.length > 0;
    reason = passed ? 'passed' : 'no-required-term-found';
  } else if (assertion === 'forbid-any') {
    passed = matchedTerms.length === 0;
    reason = passed ? 'passed' : 'forbidden-term-found';
  }

  return {
    id: testCase.id ?? 'unknown-case',
    severity: testCase.severity ?? 'medium',
    target,
    assertion,
    passed,
    reason,
    matchedTerms,
    missingTerms: passed ? [] : missingTerms,
    targetHash: targetText ? sha256Text(targetText) : null,
  };
}

function buildOfflineEvalDiff() {
  const suiteRaw = readTextFile(EVAL_SUITE_FILE);
  if (!suiteRaw) {
    return {
      status: 'HOLD_MISSING_EVAL_SUITE',
      suitePath: EVAL_SUITE_FILE,
      caseCount: 0,
      passedCount: 0,
      failedCount: 0,
      criticalFailedCount: 0,
      results: [],
      limitation: 'Offline eval suite file is missing.',
    };
  }

  const suite = JSON.parse(suiteRaw);
  const cases = Array.isArray(suite.cases) ? suite.cases : [];
  const results = cases.map(evaluateOfflineCase);
  const failed = results.filter((result) => !result.passed);
  const criticalFailed = failed.filter((result) => result.severity === 'critical');

  return {
    status: cases.length > 0 && failed.length === 0
      ? 'OFFLINE_EVAL_DIFF_ATTACHED'
      : 'HOLD_OFFLINE_EVAL_FAILED',
    suite: {
      id: suite.id ?? null,
      version: suite.version ?? null,
      kind: suite.kind ?? null,
      path: EVAL_SUITE_FILE,
      sha256: sha256Text(suiteRaw),
    },
    caseCount: cases.length,
    passedCount: results.length - failed.length,
    failedCount: failed.length,
    criticalFailedCount: criticalFailed.length,
    results,
    limitation:
      'Deterministic offline prompt/source contract eval only. It does not execute live provider model outputs or compare provider-side behavior.',
  };
}

function buildManifest() {
  const generatedAt = formatKst(new Date());
  const groups = GROUPS.map((group) => {
    const files = group.files.map((file) => ({
      path: file,
      sha256: sha256File(file),
    }));
    const missing = files.filter((file) => !file.sha256).map((file) => file.path);
    const groupHash = missing.length
      ? null
      : sha256Text(files.map((file) => `${file.path}:${file.sha256}`).join('\n'));
    return { id: group.id, groupHash, missing, files };
  });
  const missing = groups.flatMap((group) => group.missing.map((file) => `${group.id}:${file}`));
  const sbom = buildSbomFromPackageLock();
  const buildProvenance = buildLocalBuildProvenance({ groups, generatedAt, sbom });
  const offlineEvalDiff = buildOfflineEvalDiff();
  const evalFailed = offlineEvalDiff.status !== 'OFFLINE_EVAL_DIFF_ATTACHED';

  return {
    kind: 'loreguard.ai-supply-chain-baseline.v1',
    generatedAt,
    verdict: missing.length ? 'HOLD_MISSING_FILES' : evalFailed ? 'HOLD_EVAL_DIFF_FAILED' : 'PARTIAL',
    limitation:
      'Hashes, source-level runtimeModelBom, lockfile SBOM, local build provenance, and offline eval diff cover repository inputs only. Live provider model versions, live model-output eval, and CI-signed provenance remain separate release evidence.',
    groups,
    runtimeModelBom: {
      status: 'SOURCE_BOM_PARTIAL',
      limitation: 'Extracted from source literals only; it does not attest live provider routing, deployed environment overrides, endpoint model hashes, or provider-side version aliases.',
      references: extractModelReferences(),
    },
    sbom,
    buildProvenance,
    offlineEvalDiff,
    missing,
  };
}

function main() {
  const writeIndex = process.argv.indexOf('--write');
  const outPath = writeIndex === -1 ? null : process.argv[writeIndex + 1];
  const manifest = buildManifest();
  const json = `${JSON.stringify(manifest, null, 2)}\n`;
  if (outPath) {
    const absOut = join(ROOT, outPath);
    mkdirSync(dirname(absOut), { recursive: true });
    writeFileSync(absOut, json, 'utf8');
  }
  process.stdout.write(json);
  if (manifest.missing.length || manifest.verdict.startsWith('HOLD_')) process.exitCode = 1;
}

main();
