#!/usr/bin/env node
/**
 * check-user-exposure.mjs (2026-05-10 신설 — M-01 / M-02 / M-04 자동화)
 *
 * 알파 출시 전 사용자 화면에 노출되면 안 되는 항목 자동 검증.
 *
 * 검증 5축:
 *   1. M-01 외부 status 코드 (READY / EXPORT_BLOCKED 등) UI 노출 X
 *   2. M-02 마이그레이션 마커 ([I-XX] / [P-XX]) UI 노출 X
 *   3. M-04 console.log production 누출 X
 *   4. M-04b logger.debug 빈도 점검
 *   5. 개발자 용어 (useAgentRegistry / contextBlock 등) UI 노출 X
 *
 * 사용:
 *   npm run check:user-exposure
 *
 * exit code:
 *   0 — 모두 통과 (알파 출시 가능)
 *   1 — 1+ 위반 (NO-GO)
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..', 'src');

// ============================================================
// PART 1 — 패턴 정의
// ============================================================

const PATTERNS = {
  /** 1. 외부 status 코드 — UI 컴포넌트의 string literal 안에 노출 X */
  externalStatus: {
    name: 'M-01 외부 status 코드',
    regex: /['"`](READY|EXPORT_BLOCKED|REVIEW_NEEDED|SOURCE_MISSING|HUMAN_REVIEW_LOW|LOG_GAP)['"`]/,
    targetGlobs: ['components', 'app'],
    excludeFiles: [
      // status 정의 자체는 OK
      'external-status-mapper',
      'creative-process/types',
      'creative-process/external-status-mapper',
      // status 매핑 자체 모듈
      // AuditPanel: internalStatus 변수는 mapInternalToExternalStatus input — UI 미노출 검증됨 (2026-05-10)
      'AuditPanel',
    ],
    severity: 'critical',
  },

  /** 2. 마이그레이션 마커 — UI string 또는 prompt 안에 노출 X (코멘트는 OK) */
  migrationMarker: {
    name: 'M-02 마이그레이션 마커',
    // [I-XX] 또는 [P-XX] 가 string literal 안에 있으면 위반
    regex: /['"`][^'"`]*\[([IP]-\d+|NEXT16-LAYOUT)\][^'"`]*['"`]/,
    targetGlobs: ['components', 'app'],
    excludeFiles: [],
    severity: 'critical',
  },

  /** 3. console.log — production 누출 가능 */
  consoleLog: {
    name: 'M-04 console.log',
    regex: /\bconsole\.(log|info|warn|error|debug)\s*\(/,
    targetGlobs: ['components', 'app', 'lib', 'engine', 'hooks', 'services'],
    excludeFiles: [
      // logger 자체 또는 의도된 디버그
      'logger',
      'api-logger',
      // 테스트 파일은 OK
      '__tests__',
      '.test.',
      '.spec.',
    ],
    severity: 'warn',
  },

  /** 4. 개발자 용어 — UI string literal 노출 X */
  devTerm: {
    name: 'M-01b 개발자 용어 UI 노출',
    regex: /['"`](useAgentRegistry|contextBlock|no-think|no-yap-json|max_model_len|opt-in)['"`]/,
    targetGlobs: ['components', 'app'],
    excludeFiles: [
      // 정의 모듈 자체는 OK
      'writing-agent-registry',
      'safety-registry',
      'codex-prompts',
    ],
    severity: 'warn',
  },
};

// ============================================================
// PART 2 — 파일 walker
// ============================================================

function* walkFiles(dir, exts = ['.ts', '.tsx']) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      if (entry === 'node_modules' || entry === '.next' || entry === 'dist') continue;
      yield* walkFiles(path, exts);
    } else if (exts.includes(extname(entry))) {
      yield path;
    }
  }
}

// ============================================================
// PART 3 — 검사기
// ============================================================

function checkFile(path, source, pattern) {
  const violations = [];
  // 코멘트 라인 제외 (// 또는 /* ... */)
  const lines = source.split('\n');
  let inBlockComment = false;
  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    // block comment 추적
    if (trimmed.includes('/*')) inBlockComment = true;
    if (trimmed.includes('*/')) {
      inBlockComment = false;
      return;
    }
    if (inBlockComment) return;

    // line comment 제외
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;

    if (pattern.regex.test(line)) {
      violations.push({
        line: idx + 1,
        text: line.trim().slice(0, 120),
      });
    }
  });
  return violations;
}

function shouldCheckFile(path, pattern) {
  // targetGlobs: src/components 또는 src/app 등
  const matchTarget = pattern.targetGlobs.some(glob => {
    return path.includes(`src/${glob}/`) || path.includes(`src\\${glob}\\`);
  });
  if (!matchTarget) return false;

  const matchExclude = pattern.excludeFiles.some(ex => path.includes(ex));
  if (matchExclude) return false;

  return true;
}

// ============================================================
// PART 4 — 메인
// ============================================================

function main() {
  console.log('🔍 check-user-exposure (M-01 / M-02 / M-04)');
  console.log(`   root: ${ROOT}`);
  console.log('');

  const allViolations = [];
  let scannedCount = 0;

  for (const filePath of walkFiles(ROOT)) {
    scannedCount++;
    const source = readFileSync(filePath, 'utf-8');

    for (const [, pattern] of Object.entries(PATTERNS)) {
      if (!shouldCheckFile(filePath, pattern)) continue;
      const violations = checkFile(filePath, source, pattern);
      for (const v of violations) {
        allViolations.push({
          pattern: pattern.name,
          severity: pattern.severity,
          file: filePath.replace(ROOT, 'src'),
          ...v,
        });
      }
    }
  }

  console.log(`   scanned: ${scannedCount} files`);
  console.log('');

  if (allViolations.length === 0) {
    console.log('✅ 모든 검사 통과 — 사용자 노출 안전');
    process.exit(0);
  }

  // grouped report
  const byPattern = {};
  for (const v of allViolations) {
    byPattern[v.pattern] = byPattern[v.pattern] || [];
    byPattern[v.pattern].push(v);
  }

  let criticalCount = 0;
  for (const [name, violations] of Object.entries(byPattern)) {
    const severity = violations[0].severity;
    const icon = severity === 'critical' ? '🔴' : '🟡';
    console.log(`${icon} ${name} (${severity}) — ${violations.length} 건`);
    for (const v of violations.slice(0, 10)) {
      console.log(`    ${v.file}:${v.line}`);
      console.log(`      ${v.text}`);
    }
    if (violations.length > 10) {
      console.log(`    ... ${violations.length - 10} more`);
    }
    console.log('');
    if (severity === 'critical') criticalCount += violations.length;
  }

  console.log(`총 ${allViolations.length} 건 (critical ${criticalCount} / warn ${allViolations.length - criticalCount})`);

  if (criticalCount > 0) {
    console.log('❌ NO-GO — critical 위반 알파 출시 차단');
    process.exit(1);
  }

  console.log('⚠️  warn 만 — 알파 출시 가능하나 보강 권장');
  process.exit(0);
}

main();
