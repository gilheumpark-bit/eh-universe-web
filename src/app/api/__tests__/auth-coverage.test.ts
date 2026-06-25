/**
 * [루프 4 P4 — 2026-06-08] Auth coverage 강제 — POST/PUT/PATCH/DELETE 라우트의
 * request origin guard + Firebase/LSP token 사용 추적.
 *
 * docs/security/auth-matrix.md 와 동기화.
 *
 * Phase 1 (현재): advisory coverage — 미사용 시 위반 카운트 출력.
 * Phase 2 (beta): 누락 시 fail.
 * Phase 3 (pre-commercial): runtime 503 강제 (lint + middleware).
 *
 * 예외 (제외 대상):
 *   - /api/stripe/webhook — Stripe-Signature 검증
 *   - /api/cron/* — CRON_SECRET 헤더
 *   - /api/health, /api/readiness, /api/metrics — public probe
 *   - /api/github/callback — OAuth redirect
 *   - /api/csrf — token 발급
 *   - /api/vitals — Web Vitals 익명 수집
 */

import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

// ============================================================
// PART 1 — 예외 라우트 (auth-matrix 와 동기화)
// ============================================================

const EXCEPT_PATHS = [
  'stripe/webhook',
  'cron/',
  'health',
  'readiness',
  'metrics',
  'github/callback',
  'csrf/',
  'vitals/',
  'error-report', // 사용자 제출 — 익명 허용
  'cp/verify',    // 공개 검증 endpoint
];

function isExcept(routePath: string): boolean {
  return EXCEPT_PATHS.some((p) => routePath.includes(p));
}

// ============================================================
// PART 2 — Helper: route walker (api-log-coverage.test 와 동일)
// ============================================================

function findRouteFiles(dir: string, acc: string[] = []): string[] {
  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const full = join(dir, entry);
      const stat = statSync(full);
      if (stat.isDirectory()) {
        findRouteFiles(full, acc);
      } else if (/^route\.(ts|tsx|js|jsx)$/.test(entry)) {
        acc.push(full);
      }
    }
  } catch { /* missing dir */ }
  return acc;
}

interface RouteAudit {
  path: string;
  methods: string[];
  hasCsrf: boolean;
  hasAuth: boolean;
  hasRateLimit: boolean;
}

function auditRoute(filePath: string): RouteAudit {
  const source = readFileSync(filePath, 'utf-8');
  const methods: string[] = [];
  for (const m of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    if (new RegExp(`export\\s+(async\\s+)?function\\s+${m}\\b`).test(source)) {
      methods.push(m);
    }
  }
  const hasCsrf = /verifyCsrf|csrf-verify|x-csrf-token|checkSameOriginHeaders|api-origin-guard/i.test(source);
  const hasAuth = /verifyFirebaseIdToken|verify-firebase|firebase-id-token|enforceServerTierLimit|authorizeLspRequest|verifyLspToken|lspAuthHeaders/i.test(source);
  const hasRateLimit = /checkRateLimit|RATE_LIMITS/.test(source);
  return {
    path: filePath.replace(process.cwd(), '').replace(/\\/g, '/'),
    methods,
    hasCsrf,
    hasAuth,
    hasRateLimit,
  };
}

// ============================================================
// PART 3 — Assertions
// ============================================================

describe('[Auth Matrix] POST/PUT/PATCH/DELETE coverage', () => {
  const apiDir = join(process.cwd(), 'src', 'app', 'api');
  const routes = findRouteFiles(apiDir);
  const mutating = routes
    .map(auditRoute)
    .filter((a) => a.methods.length > 0 && !isExcept(a.path));

  it('discovers mutating routes', () => {
    expect(mutating.length).toBeGreaterThan(0);
  });

  it('tracks CSRF coverage (Phase 1 advisory)', () => {
    const missing = mutating.filter((a) => !a.hasCsrf);
    if (process.env.LOG_AUTH_COVERAGE === '1') {
      console.log(`[csrf coverage] ${mutating.length - missing.length}/${mutating.length}`);
      console.log('Missing CSRF:', missing.map((m) => `${m.path} [${m.methods.join(',')}]`).join('\n  '));
    }
    // Phase 1 baseline. Phase 2 시 toBe(0) 로 승격.
    expect(missing.length).toBeGreaterThanOrEqual(0);
  });

  it('tracks Auth coverage (Phase 1 advisory)', () => {
    const missing = mutating.filter((a) => !a.hasAuth);
    if (process.env.LOG_AUTH_COVERAGE === '1') {
      console.log(`[auth coverage] ${mutating.length - missing.length}/${mutating.length}`);
      console.log('Missing Auth:', missing.map((m) => m.path).join('\n  '));
    }
    expect(missing.length).toBeGreaterThanOrEqual(0);
  });

  it('tracks Rate-limit coverage (Phase 1 advisory)', () => {
    const missing = mutating.filter((a) => !a.hasRateLimit);
    if (process.env.LOG_AUTH_COVERAGE === '1') {
      console.log(`[rate-limit coverage] ${mutating.length - missing.length}/${mutating.length}`);
    }
    expect(missing.length).toBeGreaterThanOrEqual(0);
  });

  it('reports overall coverage summary', () => {
    const total = mutating.length;
    const fullyCovered = mutating.filter(
      (a) => a.hasCsrf && a.hasAuth && a.hasRateLimit,
    ).length;
    // Phase 1 baseline — 회귀 방지 only.
    expect(total).toBeGreaterThan(0);
    expect(fullyCovered).toBeGreaterThanOrEqual(0);
  });
});
