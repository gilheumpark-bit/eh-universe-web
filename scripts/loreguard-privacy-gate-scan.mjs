#!/usr/bin/env node
// ============================================================
// PART 1 — Privacy Release Gate Contract
// ============================================================
// Role:    Validate release-adjacent privacy boundaries for Loreguard.
// Banned:  Network calls, env reads, or treating this as legal sign-off.
// Input:   Repository source/config files.
// Output:  JSON/Markdown privacy gate report.
// Depends: Node built-ins only.
// ============================================================

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(SCRIPT_DIR, '..');
const KIND = 'loreguard.privacy-release-gate.v1';
const SOURCE_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.json', '.yml', '.yaml']);
const SCAN_ROOTS = ['src', 'scripts', '.github/workflows'];
const ROOT_FILES = ['next.config.ts', 'package.json'];
const SKIP_DIRS = new Set(['.git', '.next', '.jest-cache', 'coverage', 'dist', 'node_modules']);

const SECRET_LITERAL_PATTERNS = [
  { id: 'openai-secret-key', regex: /\bsk-[A-Za-z0-9_-]{20,}\b/ },
  { id: 'stripe-secret-key', regex: /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}\b/ },
  { id: 'github-token', regex: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}\b/ },
  { id: 'google-api-key', regex: /\bAIza[0-9A-Za-z_-]{30,}\b/ },
  { id: 'private-key-block', regex: /-----BEGIN (?:RSA |EC |OPENSSH |)PRIVATE KEY-----/ },
];

const REQUIRED_CSP_CONNECT_HOSTS = [
  'https://api.deepseek.com',
  'https://dashscope-intl.aliyuncs.com',
  'https://api.minimax.io',
  'https://api.moonshot.ai',
];

const PUBLIC_CERT_FORBIDDEN_FIELDS = [
  '원고 전문',
  '프롬프트 전문',
  '출처 원문',
  '작업 영수증 원문',
  '비공개 플롯',
  '작가 개인 메모',
  '민감 출처 원문',
  '계약 전용 메모',
  'authorUid',
  'projectId',
  'body',
  'prompt',
  'manuscript',
];

const PUBLIC_CERT_REQUIRED_PRIVATE_FIELDS = [
  '원고 전문',
  '프롬프트 전문',
  '작가 개인 메모',
];

// ============================================================
// PART 2 — File Helpers
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

function readText(relFile) {
  return readFileSync(join(ROOT, relFile), 'utf8');
}

function readJson(relFile) {
  return JSON.parse(readText(relFile));
}

function* walkFiles(absDir) {
  if (!existsSync(absDir)) return;
  for (const entry of readdirSync(absDir)) {
    const absPath = join(absDir, entry);
    const stats = statSync(absPath);
    if (stats.isDirectory()) {
      if (!SKIP_DIRS.has(entry)) yield* walkFiles(absPath);
      continue;
    }
    if (stats.isFile() && SOURCE_EXTS.has(extname(entry).toLowerCase())) yield absPath;
  }
}

function isTestPath(relFile) {
  return relFile.includes('/__tests__/') || /\.test\./.test(relFile) || /\.spec\./.test(relFile);
}

function sourceFiles() {
  const files = [];
  for (const root of SCAN_ROOTS) {
    for (const absPath of walkFiles(join(ROOT, root))) {
      const relFile = relPath(absPath);
      if (!isTestPath(relFile)) files.push(relFile);
    }
  }
  for (const relFile of ROOT_FILES) {
    if (existsSync(join(ROOT, relFile))) files.push(relFile);
  }
  return [...new Set(files)].sort((a, b) => a.localeCompare(b));
}

function extractBraceBlockAfter(text, anchor) {
  const anchorIndex = text.indexOf(anchor);
  if (anchorIndex === -1) return '';
  const start = text.indexOf('{', anchorIndex);
  if (start === -1) return '';
  let depth = 0;
  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    if (char === '{') depth += 1;
    if (char === '}') depth -= 1;
    if (depth === 0) return text.slice(start, index + 1);
  }
  return '';
}

function extractStringArray(block, propertyName) {
  const match = new RegExp(`${propertyName}:\\s*\\[([\\s\\S]*?)\\]`).exec(block);
  if (!match) return [];
  return [...match[1].matchAll(/'([^']+)'/g)].map((item) => item[1]);
}

function pass(id, summary, detail = '') {
  return { id, status: 'PASS', summary, detail };
}

function hold(id, summary, detail = '') {
  return { id, status: 'HOLD', summary, detail };
}

function fail(id, summary, detail = '') {
  return { id, status: 'FAIL', summary, detail };
}

// ============================================================
// PART 3 — Gate Checks
// ============================================================

function scanSecretLiterals(files) {
  const findings = [];
  for (const relFile of files) {
    const lines = readText(relFile).split(/\r?\n/);
    lines.forEach((line, lineIndex) => {
      for (const pattern of SECRET_LITERAL_PATTERNS) {
        pattern.regex.lastIndex = 0;
        if (!pattern.regex.test(line)) continue;
        findings.push({
          pattern: pattern.id,
          file: relFile,
          line: lineIndex + 1,
          snippet: line.trim().slice(0, 120),
        });
      }
    });
  }
  if (findings.length > 0) {
    return fail('secret-literal-scan', 'Potential secret literals are present in repository files.', findings);
  }
  return pass('secret-literal-scan', 'No common provider/API secret literals found in scanned production files.');
}

function scanRiskySecretLogging(files) {
  const findings = [];
  const loggerPattern = /console\.(?:log|info|debug)|apiLog\s*\(|logger\.(?:info|warn|error|debug)\s*\(/;
  const sensitiveValuePattern =
    /process\.env|apiKey\s*[:=,})]|secret\s*[:=,})]|authorization\s*[:=,})]|bearer\s*[:=,})]|token\s*[:=]/i;
  for (const relFile of files) {
    const lines = readText(relFile).split(/\r?\n/);
    lines.forEach((line, lineIndex) => {
      const loggerMatch = loggerPattern.exec(line);
      if (!loggerMatch) return;
      const loggerSlice = line.slice(loggerMatch.index);
      if (!sensitiveValuePattern.test(loggerSlice)) return;
      findings.push({
        file: relFile,
        line: lineIndex + 1,
        snippet: line.trim().slice(0, 120),
      });
    });
  }
  if (findings.length > 0) {
    return hold('secret-log-scan', 'Review logging statements that mention secret-bearing identifiers.', findings);
  }
  return pass('secret-log-scan', 'No direct secret-bearing logger lines found in scanned production files.');
}

function checkCsp() {
  const text = readText('next.config.ts');
  const missingHosts = REQUIRED_CSP_CONNECT_HOSTS.filter((host) => !text.includes(host));
  const requiredDirectives = [
    "object-src 'none'",
    "base-uri 'self'",
    'Content-Security-Policy',
    'X-Frame-Options',
    'Strict-Transport-Security',
  ];
  const missingDirectives = requiredDirectives.filter((needle) => !text.includes(needle));
  if (missingHosts.length || missingDirectives.length) {
    return fail('csp-connect-src', 'CSP is missing provider hosts or baseline security directives.', {
      missingHosts,
      missingDirectives,
    });
  }
  return pass('csp-connect-src', 'CSP includes current provider hosts and baseline security directives.');
}

function checkCertificatePublicBoundary() {
  const text = readText('src/lib/creative-process/certificate-output-profile.ts');
  const block = extractBraceBlockAfter(text, "'reader-public-card':");
  const exposed = extractStringArray(block, 'exposedFieldsKo');
  const privateFields = extractStringArray(block, 'privateFieldsKo');
  const leaked = exposed.filter((field) =>
    PUBLIC_CERT_FORBIDDEN_FIELDS.some((forbidden) => field.toLowerCase().includes(forbidden.toLowerCase())),
  );
  const missingPrivate = PUBLIC_CERT_REQUIRED_PRIVATE_FIELDS.filter((field) => !privateFields.includes(field));
  if (!block || leaked.length || missingPrivate.length) {
    return fail('public-certificate-boundary', 'Reader public card field boundary is unsafe or incomplete.', {
      leaked,
      missingPrivate,
      exposed,
      privateFields,
    });
  }
  return pass('public-certificate-boundary', 'Reader public card exposes metadata only and keeps sensitive fields private.');
}

function checkVerifyRouteMetaOnly() {
  const text = readText('src/app/api/cp/verify/[id]/route.ts');
  const block = extractBraceBlockAfter(text, 'function registryMeta');
  const forbidden = ['authorUid', 'projectId', 'manuscript', 'prompt', 'body', 'sourceText', 'content'];
  const present = forbidden.filter((needle) => block.includes(needle));
  if (!block || present.length > 0) {
    return fail('verify-route-meta-only', 'External lookup route may expose sensitive registry fields.', present);
  }
  if (!block.includes('cert_hash') || !block.includes('chain_tip_hash')) {
    return hold('verify-route-meta-only', 'External lookup route does not expose expected hash metadata.', block.slice(0, 400));
  }
  return pass('verify-route-meta-only', 'External lookup route returns registry metadata without manuscript or author-private fields.');
}

function checkStripeWebhookBoundary() {
  const file = 'src/app/api/stripe/webhook/route.ts';
  if (!existsSync(join(ROOT, file))) return hold('stripe-webhook-boundary', 'Stripe webhook route is missing.');
  const text = readText(file);
  const required = [
    'STRIPE_WEBHOOK_SECRET',
    'req.text()',
    'stripe.webhooks.constructEvent',
    'markEventProcessed',
    'stripe-signature',
  ];
  const missing = required.filter((needle) => !text.includes(needle));
  if (missing.length > 0) {
    return fail('stripe-webhook-boundary', 'Stripe webhook route is missing raw-body signature or idempotency controls.', missing);
  }
  return pass('stripe-webhook-boundary', 'Stripe webhook uses raw body signature verification and event idempotency.');
}

function checkRegistryWriteBoundary() {
  const text = readText('src/app/api/cp/register/route.ts');
  const required = [
    'CP_REGISTRY_HMAC_SECRET',
    'firestoreCreateDocument',
    'documentId: input.certId',
    'privacy_note_ko',
    'certHash',
    'chainTipHash',
  ];
  const missing = required.filter((needle) => !text.includes(needle));
  const forbidden = ['manuscriptText', 'promptText', 'sourceText', 'rawContent'].filter((needle) => text.includes(needle));
  if (missing.length || forbidden.length) {
    return fail('registry-write-boundary', 'Registry write route is missing write-once metadata controls or contains raw-content fields.', {
      missing,
      forbidden,
    });
  }
  return pass('registry-write-boundary', 'Registry write route stores metadata/hash fields with HMAC and write-once document ids.');
}

function checkPackageGateScripts() {
  const pkg = readJson('package.json');
  const scripts = pkg.scripts ?? {};
  const required = ['gate:baseline', 'gate:evidence', 'gate:privacy', 'gate:release'];
  const missing = required.filter((name) => typeof scripts[name] !== 'string');
  if (missing.length > 0) {
    return hold('package-gate-scripts', 'Package gate scripts are incomplete.', missing);
  }
  return pass('package-gate-scripts', 'Package scripts expose baseline, evidence, privacy, and release gates.');
}

function buildReport(files = sourceFiles()) {
  const checks = [
    scanSecretLiterals(files),
    scanRiskySecretLogging(files),
    checkCsp(),
    checkCertificatePublicBoundary(),
    checkVerifyRouteMetaOnly(),
    checkStripeWebhookBoundary(),
    checkRegistryWriteBoundary(),
    checkPackageGateScripts(),
  ];
  const failCount = checks.filter((check) => check.status === 'FAIL').length;
  const holdCount = checks.filter((check) => check.status === 'HOLD').length;
  return {
    kind: KIND,
    generatedAt: formatKst(new Date()),
    verdict: failCount > 0 ? 'HOLD' : holdCount > 0 ? 'HOLD' : 'PASS',
    counts: {
      scannedFileCount: files.length,
      passCount: checks.filter((check) => check.status === 'PASS').length,
      holdCount,
      failCount,
    },
    checks,
    limitation:
      'Static privacy gate only. It does not replace hosted secrets review, legal review, Stripe dashboard review, or live registry replay evidence.',
  };
}

// ============================================================
// PART 4 — Self Test
// ============================================================

function requireSelfTest(condition, message) {
  if (!condition) throw new Error(`[self-test] ${message}`);
}

function runSelfTest() {
  const secretReport = scanSecretLiterals(['scripts/loreguard-privacy-gate-scan.mjs']);
  requireSelfTest(secretReport.status === 'PASS', 'scanner source should not contain a fake literal that trips itself');

  const cspCheck = checkCsp();
  requireSelfTest(['PASS', 'FAIL'].includes(cspCheck.status), 'CSP check should return a normalized status');

  const publicBoundary = checkCertificatePublicBoundary();
  requireSelfTest(publicBoundary.status === 'PASS', 'public certificate field boundary should pass current profile');

  const verifyRoute = checkVerifyRouteMetaOnly();
  requireSelfTest(verifyRoute.status === 'PASS', 'verify registry metadata boundary should pass');

  return {
    kind: 'loreguard.privacy-release-gate-self-test.v1',
    status: 'PASS',
    checks: [
      'secret scanner does not trip on its own source',
      'CSP checker returns normalized status',
      'public certificate boundary passes',
      'verify route metadata boundary passes',
    ],
  };
}

// ============================================================
// PART 5 — Rendering and CLI
// ============================================================

function mdTable(headers, rows) {
  const head = `| ${headers.join(' | ')} |`;
  const sepLine = `| ${headers.map(() => '---').join(' | ')} |`;
  const body = rows.map((row) => `| ${row.map((cell) => String(cell).replace(/\|/g, '\\|')).join(' | ')} |`);
  return [head, sepLine, ...body].join('\n');
}

function renderMarkdown(report) {
  return `# Loreguard Privacy Release Gate

Generated: ${report.generatedAt}

## Verdict

- Privacy gate verdict: **${report.verdict}**
- Files scanned: ${report.counts.scannedFileCount}
- PASS/HOLD/FAIL: ${report.counts.passCount}/${report.counts.holdCount}/${report.counts.failCount}

## Checks

${mdTable(['Status', 'Check', 'Summary'], report.checks.map((check) => [check.status, check.id, check.summary]))}

## Limitation

${report.limitation}
`;
}

function parseArgs(argv) {
  const args = { json: false, writePath: '', failOnHold: false, selfTest: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--json') args.json = true;
    if (arg === '--fail-on-hold') args.failOnHold = true;
    if (arg === '--self-test') args.selfTest = true;
    if (arg === '--write') {
      const next = argv[index + 1];
      if (!next) throw new Error('--write requires a path');
      args.writePath = next;
      index += 1;
    }
  }
  return args;
}

function safeWrite(relFile, content) {
  const absPath = resolve(ROOT, relFile);
  if (absPath !== ROOT && !absPath.startsWith(`${ROOT}${sep}`)) {
    throw new Error(`Refusing to write outside repository: ${relFile}`);
  }
  mkdirSync(dirname(absPath), { recursive: true });
  writeFileSync(absPath, content, 'utf8');
}

const args = parseArgs(process.argv.slice(2));
if (args.selfTest) {
  process.stdout.write(`${JSON.stringify(runSelfTest(), null, 2)}\n`);
  process.exit(0);
}

const report = buildReport();
const output = args.json ? `${JSON.stringify(report, null, 2)}\n` : renderMarkdown(report);
if (args.writePath) safeWrite(args.writePath, output);
process.stdout.write(output);
if (args.failOnHold && report.verdict !== 'PASS') process.exitCode = 1;
