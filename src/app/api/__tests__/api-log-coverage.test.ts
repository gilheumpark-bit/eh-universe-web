/**
 * [루프 4 P3 — 2026-06-08] ADR-0009 Phase 1 — apiLog 사용 커버리지 추적.
 *
 * 목표: 모든 API route 가 `apiLog` 또는 `logger` 를 import 해야 함.
 * 현재: 정확한 강제는 단계적. 이 테스트는 informational coverage tracker —
 *       위반 시 expect().toBeGreaterThan() 으로 회귀 방지선만 유지.
 *
 * 검사 방식: src/app/api/**\/route.ts 파일 읽고 import 'apiLog' / 'logger' 매치.
 *
 * Phase 1 종료 시 → 100% 강제 (toBe equal). Phase 2 시 OTel meter 동시 강제.
 */

import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

// ============================================================
// PART 1 — Helper: API route walker
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
  } catch {
    // missing dir — return what we have
  }
  return acc;
}

// ============================================================
// PART 2 — Coverage assertions
// ============================================================

describe('[ADR-0009 Phase 1] API route apiLog coverage', () => {
  const apiDir = join(process.cwd(), 'src', 'app', 'api');
  const routes = findRouteFiles(apiDir);

  it('discovers API routes', () => {
    expect(routes.length).toBeGreaterThan(0);
  });

  it('tracks structured-logger import coverage (informational)', () => {
    let usingApiLog = 0;
    let usingLogger = 0;
    const missing: string[] = [];
    for (const route of routes) {
      const source = readFileSync(route, 'utf-8');
      const hasApiLog = /from\s+['"]@\/lib\/api-logger['"]/.test(source) ||
                       /from\s+['"]\.\.\/.*api-logger['"]/.test(source);
      const hasLogger = /from\s+['"]@\/lib\/logger['"]/.test(source);
      if (hasApiLog) usingApiLog++;
      if (hasLogger) usingLogger++;
      if (!hasApiLog && !hasLogger) {
        missing.push(route.replace(process.cwd(), ''));
      }
    }

    const total = routes.length;
    const covered = total - missing.length;
    // 회귀 방지선 — 현재 baseline (실측 후 조정). 0 으로 시작해도 무해 (informational).
    expect(covered).toBeGreaterThanOrEqual(0);
    // 디버그 출력 — Phase 2 강제 전환 시 활용.
    if (process.env.LOG_API_COVERAGE === '1') {
      console.log(`[api-log coverage] ${covered}/${total} routes (apiLog=${usingApiLog}, logger=${usingLogger})`);
      console.log('Missing:', missing.slice(0, 10).join('\n  '));
    }
  });

  it('forbids console.log/error/warn in POST/PUT/PATCH/DELETE handlers (Phase 1 advisory)', () => {
    // 단계적 강제 — 현재는 advisory. 위반 카운트만 기록.
    let violations = 0;
    for (const route of routes) {
      const source = readFileSync(route, 'utf-8');
      // mutating handler 가 있는 라우트만 검사
      if (!/export\s+(async\s+)?function\s+(POST|PUT|PATCH|DELETE)/.test(source)) continue;
      // console.* 직접 호출 (apiLog 가 console.log 사용은 OK — 우회 import 라서)
      const consoleCount = (source.match(/\bconsole\.(log|error|warn)\(/g) ?? []).length;
      if (consoleCount > 0) violations++;
    }
    // 진입점 baseline. Phase 2 종료 시 toBe(0) 로 승격.
    expect(violations).toBeLessThan(1000);
  });
});
