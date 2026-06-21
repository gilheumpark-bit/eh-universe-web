#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';

const args = new Set(process.argv.slice(2));
const warnOnly = args.has('--warn-only');

const TARGET_FILES = [
  '.env.local',
  '.env.development.local',
  '.env.production.local',
  '.env.test.local',
];

const CHECKOUT_PRICE_KEYS = [
  'STRIPE_PRICE_ID_STARTER',
  'STRIPE_PRICE_ID_STUDIO',
  'STRIPE_PRICE_ID_MID',
  'STRIPE_PRICE_ID_PRO',
  'STRIPE_PRICE_ID_INDIE',
  'NEXT_PUBLIC_STRIPE_PRICE_ID',
];

const PAYMENT_LIVE_REQUIRED_KEYS = [
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'VERTEX_AI_CREDENTIALS',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
];

const RULES = [
  {
    id: 'gcp-private-key',
    severity: 'CRITICAL',
    reason: 'GCP or Firebase service-account private key marker',
    matchLine: (line) => /-----BEGIN [A-Z ]*PRIVATE KEY-----|\\n-----BEGIN [A-Z ]*PRIVATE KEY-----|private_key/i.test(line),
  },
  {
    id: 'vercel-oidc-jwt',
    severity: 'CRITICAL',
    reason: 'Vercel/OIDC-style JWT token stored in a local env file',
    matchLine: (line, name) => /OIDC|VERCEL/i.test(name) && /=\s*["']?eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/.test(line),
  },
  {
    id: 'server-api-secret',
    severity: 'HIGH',
    reason: 'server-side provider key or webhook secret',
    matchLine: (_line, name) => /(^|_)(SECRET|PRIVATE_KEY|SERVICE_ACCOUNT|WEBHOOK_SECRET|STRIPE_SECRET_KEY|OPENAI_API_KEY|ANTHROPIC_API_KEY|GEMINI_API_KEY|DEEPSEEK_API_KEY|QWEN_API_KEY|MINIMAX_API_KEY|KIMI_API_KEY)($|_)/i.test(name),
  },
  {
    id: 'private-network-address',
    severity: 'MEDIUM',
    reason: 'private network address in a local env file',
    matchLine: (line) => /(^|[=:/\s"'])10\.\d{1,3}\.\d{1,3}\.\d{1,3}($|[^\d])|(^|[=:/\s"'])172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}($|[^\d])|(^|[=:/\s"'])192\.168\.\d{1,3}\.\d{1,3}($|[^\d])/.test(line),
  },
  {
    id: 'public-firebase-key',
    severity: 'INFO',
    reason: 'public Firebase key present; keep rules and authorized domains tight',
    matchLine: (_line, name) => /^NEXT_PUBLIC_FIREBASE_API_KEY$/i.test(name),
  },
];

function envNameFromLine(line) {
  const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/.exec(line.trim());
  return match?.[1] ?? '(unknown)';
}

function stripOptionalQuotes(value) {
  const trimmed = value.trim();
  const quote = trimmed[0];
  if ((quote === '"' || quote === "'") && trimmed.endsWith(quote)) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function parseEnvFile(text) {
  const values = new Map();
  const linesByName = new Map();
  const lines = text.split(/\r?\n/);

  for (const [index, rawLine] of lines.entries()) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const line = trimmed.startsWith('export ') ? trimmed.slice('export '.length).trimStart() : trimmed;
    const match = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;

    const name = match[1];
    const rawValue = match[2] ?? '';
    values.set(name, stripOptionalQuotes(rawValue));
    linesByName.set(name, index + 1);
  }

  return { lines, values, linesByName };
}

function hasValue(values, name) {
  return Boolean(values.get(name)?.trim());
}

function hasAnyValue(values, names) {
  return names.some((name) => hasValue(values, name));
}

function isTruthy(value) {
  return /^(1|true|yes|on)$/i.test(value?.trim() ?? '');
}

function isCheckoutEnabled(values) {
  return values.get('FEATURE_STRIPE_CHECKOUT')?.trim().toLowerCase() === 'on';
}

function describeMissing(values, names) {
  return names.filter((name) => !hasValue(values, name));
}

function addOperationalFinding({ file, line, name, id, severity, reason }) {
  findings.push({
    file,
    line,
    name,
    id,
    severity,
    reason,
  });
}

function scanOperationalLocks(file, parsed) {
  const { values, linesByName } = parsed;
  const checkoutEnabled = isCheckoutEnabled(values);
  const paymentLive = isTruthy(values.get('NEXT_PUBLIC_PAYMENT_LIVE'));

  if (checkoutEnabled) {
    const missing = describeMissing(values, ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET']);
    if (!hasAnyValue(values, CHECKOUT_PRICE_KEYS)) {
      missing.push(`one of ${CHECKOUT_PRICE_KEYS.join('|')}`);
    }
    if (missing.length > 0) {
      addOperationalFinding({
        file,
        line: linesByName.get('FEATURE_STRIPE_CHECKOUT') ?? 0,
        name: 'FEATURE_STRIPE_CHECKOUT',
        id: 'checkout-env-incomplete',
        severity: 'HIGH',
        reason: `checkout is enabled but missing ${missing.join(', ')}`,
      });
    }
  }

  if (paymentLive) {
    const missing = [];
    if (!checkoutEnabled) missing.push('FEATURE_STRIPE_CHECKOUT=on');
    missing.push(...describeMissing(values, PAYMENT_LIVE_REQUIRED_KEYS));
    if (!hasAnyValue(values, CHECKOUT_PRICE_KEYS)) {
      missing.push(`one of ${CHECKOUT_PRICE_KEYS.join('|')}`);
    }
    if (missing.length > 0) {
      addOperationalFinding({
        file,
        line: linesByName.get('NEXT_PUBLIC_PAYMENT_LIVE') ?? 0,
        name: 'NEXT_PUBLIC_PAYMENT_LIVE',
        id: 'payment-live-env-incomplete',
        severity: 'CRITICAL',
        reason: `payment live is enabled but missing ${missing.join(', ')}`,
      });
    }
  }
}

const findings = [];

for (const file of TARGET_FILES) {
  if (!existsSync(file)) continue;
  const text = readFileSync(file, 'utf8');
  const parsed = parseEnvFile(text);

  for (const [index, line] of parsed.lines.entries()) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    const name = envNameFromLine(line);
    for (const rule of RULES) {
      if (!rule.matchLine(line, name)) continue;
      findings.push({
        file,
        line: index + 1,
        name,
        id: rule.id,
        severity: rule.severity,
        reason: rule.reason,
      });
    }
  }

  scanOperationalLocks(file, parsed);
}

const severityRank = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, INFO: 1 };
findings.sort((a, b) => (severityRank[b.severity] ?? 0) - (severityRank[a.severity] ?? 0));

if (findings.length === 0) {
  console.log('[local-secret-scan] PASS: no local env secret markers found.');
  process.exit(0);
}

console.log('[local-secret-scan] Findings. Secret values are intentionally not printed.');
for (const finding of findings) {
  const location = finding.line > 0 ? `${finding.file}:${finding.line}` : finding.file;
  console.log(
    `- ${finding.severity} ${finding.id} ${location} ${finding.name} — ${finding.reason}`,
  );
}

const blocking = findings.some((finding) => finding.severity === 'CRITICAL' || finding.severity === 'HIGH');
if (blocking && !warnOnly) {
  console.error('[local-secret-scan] FAIL: move blocking secrets to the deployment secret store and rotate exposed keys.');
  process.exit(1);
}

if (blocking) {
  console.log('[local-secret-scan] WARN-ONLY: blocking findings were reported without failing the process.');
} else {
  console.log('[local-secret-scan] PASS: no blocking local env findings.');
}
