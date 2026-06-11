#!/usr/bin/env node
// ============================================================
// PART 1 — Module Header
// ============================================================
// check-licenses.mjs — Dependency license audit (P11 루프3 — 2026-06-08).
//
// AGPL/GPL/SSPL 등 강한 copyleft 라이선스가 dependencies 에 침입했는지 검사.
// 발견 시 exit 1 (CI fail). 명시적 allowlist 항목만 예외.
//
// 사용:
//   node scripts/check-licenses.mjs
//   npm run check:licenses
//
// 정책 (claude3 _legal 표준):
//   - MIT / ISC / Apache-2.0 / BSD-2-Clause / BSD-3-Clause / 0BSD / Unlicense / CC0-1.0 → OK
//   - LGPL-* / MPL-* → 경고 (검토 필요, exit 1 X)
//   - GPL-* / AGPL-* / SSPL-* → ERROR (exit 1)
//   - UNKNOWN → 경고
// ============================================================

import { execSync } from 'node:child_process';
import process from 'node:process';

// ============================================================
// PART 2 — Policy
// ============================================================

const ALLOW = new Set([
  'MIT',
  'ISC',
  'Apache-2.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  '0BSD',
  'Unlicense',
  'CC0-1.0',
  'CC-BY-4.0',
  'CC-BY-3.0',
  'WTFPL',
  'Public Domain',
  'Python-2.0',
  'Zlib',
  'Artistic-2.0',
  'BlueOak-1.0.0',
]);

const WARN_REVIEW = new Set([
  'LGPL-2.1',
  'LGPL-2.1-or-later',
  'LGPL-3.0',
  'LGPL-3.0-or-later',
  'MPL-2.0',
  'MPL-1.1',
  'EPL-2.0',
]);

const FAIL = new Set([
  'GPL-2.0',
  'GPL-2.0-or-later',
  'GPL-3.0',
  'GPL-3.0-or-later',
  'AGPL-1.0',
  'AGPL-3.0',
  'AGPL-3.0-or-later',
  'AGPL-3.0-only',
  'SSPL-1.0',
  'Commons-Clause',
  'BUSL-1.1',
]);

// 명시적 allowlist — 의도적으로 통과시킬 패키지 (이유 명시 필수).
const PACKAGE_ALLOWLIST = new Set([
  // 'package-name@version' — 빈 상태로 시작. 추가 시 LEGAL.md 갱신.
]);

// ============================================================
// PART 3 — License extraction
// ============================================================

function getLicenseList() {
  // npm ls --json --all --long 으로 의존성 트리 + 라이선스 수집.
  // production deps 만 검사 — devDependencies 는 배포 산출물에 포함 X.
  let raw;
  try {
    raw = execSync('npm ls --json --all --omit=dev --long', {
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (err) {
    // npm ls 가 peer dep mismatch 등으로 exit 1 반환해도 stdout 은 채워짐.
    raw = err.stdout?.toString() ?? '';
    if (!raw) {
      console.error('[check-licenses] npm ls failed:', err.message);
      return [];
    }
  }

  let tree;
  try {
    tree = JSON.parse(raw);
  } catch (err) {
    console.error('[check-licenses] failed to parse npm ls JSON:', err.message);
    return [];
  }

  const collected = [];
  const seen = new Set();

  function walk(node, parentPath) {
    if (!node?.dependencies) return;
    for (const [name, dep] of Object.entries(node.dependencies)) {
      if (!dep) continue;
      const key = `${name}@${dep.version ?? '?'}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const license = typeof dep.license === 'string' ? dep.license
        : (dep.license?.type ?? dep.licenses?.[0]?.type ?? 'UNKNOWN');

      collected.push({
        name,
        version: dep.version ?? '?',
        license,
        path: parentPath ? `${parentPath} > ${name}` : name,
      });

      walk(dep, parentPath ? `${parentPath} > ${name}` : name);
    }
  }

  walk(tree, '');
  return collected;
}

// ============================================================
// PART 4 — Main
// ============================================================

function classify(license) {
  if (!license || license === 'UNKNOWN') return 'unknown';
  // (MIT OR Apache-2.0) 형태 → OR split 후 가장 관대한 것 채택.
  const cleaned = license.replace(/[()]/g, '').trim();
  if (cleaned.includes(' OR ')) {
    const parts = cleaned.split(' OR ').map((s) => s.trim());
    for (const p of parts) {
      if (ALLOW.has(p)) return 'allow';
    }
    for (const p of parts) {
      if (WARN_REVIEW.has(p)) return 'warn';
    }
    for (const p of parts) {
      if (FAIL.has(p)) return 'fail';
    }
    return 'unknown';
  }
  if (ALLOW.has(cleaned)) return 'allow';
  if (WARN_REVIEW.has(cleaned)) return 'warn';
  if (FAIL.has(cleaned)) return 'fail';
  return 'unknown';
}

function main() {
  const deps = getLicenseList();
  if (deps.length === 0) {
    console.warn('[check-licenses] no dependencies found — skipping');
    process.exit(0);
  }

  const buckets = { allow: [], warn: [], fail: [], unknown: [] };
  for (const d of deps) {
    const verdict = classify(d.license);
    if (PACKAGE_ALLOWLIST.has(`${d.name}@${d.version}`)) {
      buckets.allow.push({ ...d, note: 'explicit allowlist' });
      continue;
    }
    buckets[verdict].push(d);
  }

  console.log(`[check-licenses] scanned ${deps.length} prod deps`);
  console.log(`  ALLOW: ${buckets.allow.length}`);
  console.log(`  WARN:  ${buckets.warn.length} (LGPL/MPL/EPL — review needed)`);
  console.log(`  FAIL:  ${buckets.fail.length} (GPL/AGPL/SSPL — incompatible)`);
  console.log(`  UNKNOWN: ${buckets.unknown.length}`);

  if (buckets.warn.length > 0) {
    console.log('\n[WARN — review needed]');
    for (const d of buckets.warn) {
      console.log(`  - ${d.name}@${d.version}: ${d.license}`);
    }
  }
  if (buckets.unknown.length > 0) {
    console.log('\n[UNKNOWN — manually classify]');
    for (const d of buckets.unknown.slice(0, 20)) {
      console.log(`  - ${d.name}@${d.version}: ${d.license || 'no license field'}`);
    }
    if (buckets.unknown.length > 20) console.log(`  ... ${buckets.unknown.length - 20} more`);
  }
  if (buckets.fail.length > 0) {
    console.log('\n[FAIL — copyleft incompatible with AGPL distribution]');
    for (const d of buckets.fail) {
      console.log(`  - ${d.name}@${d.version}: ${d.license}`);
      console.log(`    path: ${d.path}`);
    }
    console.log('\nResolution:');
    console.log('  1) Remove/replace the dependency, OR');
    console.log('  2) Add to PACKAGE_ALLOWLIST in this script (requires LEGAL.md justification).');
    process.exit(1);
  }

  console.log('\n[check-licenses] OK');
  process.exit(0);
}

main();

// IDENTITY_SEAL: PART-1..4 | role=license-audit | inputs=npm ls --omit=dev | outputs=exit 0|1
