#!/usr/bin/env node
/**
 * bundle-report — .next 빌드 산출물을 파싱해 라우트별 First Load JS 크기를 추정.
 *
 * 사용: npm run bundle:report (next build + 이 스크립트)
 *
 * 출력: docs/bundle-report.md
 *   - Route | Chunks | Raw | Brotli est
 *   - 500 KB 초과 시 경고
 *
 * 전략:
 *   Next.js 16 (turbopack) 은 `app-build-manifest.json` 대신
 *   `.next/server/app/<route>/page_client-reference-manifest.js` 파일에
 *   `"entryJSFiles"` 객체가 들어있다. 그 배열에서 라우트별 청크를 추출해
 *   `.next/<path>` 파일 크기를 합산한다.
 */

// ============================================================
// PART 1 — Imports & Config
// ============================================================
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const nextDir = path.join(root, '.next');
const serverAppDir = path.join(nextDir, 'server', 'app');
const docsDir = path.join(root, 'docs');

/** 리포트 대상 라우트 — `dir` 은 `.next/server/app/<dir>/page_client-reference-manifest.js`
 *  위치를 가리킨다. 루트(`/`) 는 dir 이 빈 문자열. entryKey 는 manifest 내부
 *  `entryJSFiles` 키 suffix — `[project]/src/app/<entryKey>` 형식에서 뒤쪽만 비교. */
const TARGET_ROUTES = [
  { label: '/', dir: '', entryKey: 'page' },
  { label: '/studio', dir: 'studio', entryKey: 'studio/page' },
  { label: '/code-studio', dir: 'code-studio', entryKey: 'code-studio/page' },
  {
    label: '/translation-studio',
    dir: 'translation-studio',
    entryKey: 'translation-studio/page',
  },
  { label: '/network', dir: 'network', entryKey: 'network/page' },
  { label: '/archive', dir: 'archive', entryKey: 'archive/page' },
  { label: '/codex', dir: 'codex', entryKey: 'codex/page' },
];

/** 500 KB = ⚠️ 임계치 (raw). */
const FIRST_LOAD_WARN_KB = 500;

// ============================================================
// PART 2 — Manifest Extraction
// ============================================================

/**
 * page_client-reference-manifest.js 에서 entryJSFiles 블록을 파싱.
 *
 * [C] 파일 없으면 null 반환 — 호출부에서 스킵.
 * [G] JSON.parse 한 번만 — 수동 정규식보다 안정적.
 * [K] globalThis 대입식에서 우변 JSON 만 떼어냄.
 */
function readEntryJSFiles(routeDir, entryKey) {
  const manifestPath = routeDir
    ? path.join(serverAppDir, ...routeDir.split('/'), 'page_client-reference-manifest.js')
    : path.join(serverAppDir, 'page_client-reference-manifest.js');
  if (!fs.existsSync(manifestPath)) return null;

  const source = fs.readFileSync(manifestPath, 'utf8');
  // globalThis.__RSC_MANIFEST["/route/page"] = {...}; 에서 {...} 부분만 추출.
  const match = source.match(/= (\{[\s\S]*\});?\s*$/);
  if (!match || !match[1]) return null;

  try {
    const manifest = JSON.parse(match[1]);
    const entryMap = manifest && manifest.entryJSFiles;
    if (!entryMap || typeof entryMap !== 'object') return null;

    // entryJSFiles 키는 "[project]/src/app/<entryKey>" 형식. 해당 라우트 매칭.
    const suffix = `/src/app/${entryKey}`;
    for (const [key, chunks] of Object.entries(entryMap)) {
      if (key.endsWith(suffix) && Array.isArray(chunks)) {
        return chunks.filter((c) => typeof c === 'string');
      }
    }
    return null;
  } catch {
    return null;
  }
}

// ============================================================
// PART 3 — Size Accumulation
// ============================================================

/** 청크 경로 → raw bytes. 없으면 0. */
function chunkBytes(relPath) {
  const abs = path.join(nextDir, relPath);
  if (!fs.existsSync(abs)) return 0;
  try {
    return fs.statSync(abs).size;
  } catch {
    return 0;
  }
}

/** Brotli 압축 추정 — 캐시 없이 파일 단위 실측. */
function brotliBytes(relPath) {
  const abs = path.join(nextDir, relPath);
  if (!fs.existsSync(abs)) return 0;
  try {
    const buf = fs.readFileSync(abs);
    return zlib.brotliCompressSync(buf, {
      params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 4 }, // 속도/정확도 균형
    }).length;
  } catch {
    return 0;
  }
}

function formatKb(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

// ============================================================
// PART 4 — Report Rendering
// ============================================================

function buildReport(rows) {
  const lines = [];
  lines.push('# Bundle Report');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Source: \`.next/server/app/*/page_client-reference-manifest.js\``);
  lines.push(`Warn threshold: First Load JS > ${FIRST_LOAD_WARN_KB} KB`);
  lines.push('');
  lines.push('| Route | Chunks | First Load JS | Brotli est | Flag |');
  lines.push('|-------|--------|---------------|------------|------|');

  for (const r of rows) {
    const flag = r.missing
      ? 'missing manifest'
      : r.rawKb > FIRST_LOAD_WARN_KB
        ? '⚠️ over threshold'
        : 'ok';
    lines.push(
      `| \`${r.label}\` | ${r.chunkCount} | ${formatKb(r.rawBytes)} | ${formatKb(r.brBytes)} | ${flag} |`,
    );
  }
  lines.push('');
  const warn = rows.filter((r) => !r.missing && r.rawKb > FIRST_LOAD_WARN_KB);
  if (warn.length > 0) {
    lines.push(`## Flagged Routes (${warn.length})`);
    lines.push('');
    for (const r of warn) {
      lines.push(`- \`${r.label}\` — ${formatKb(r.rawBytes)} (brotli ${formatKb(r.brBytes)})`);
    }
    lines.push('');
  } else {
    lines.push('All routes under threshold.');
    lines.push('');
  }
  return lines.join('\n');
}

// ============================================================
// PART 5 — Main
// ============================================================

function main() {
  if (!fs.existsSync(nextDir)) {
    console.error('[bundle-report] .next not found — run `next build` first.');
    process.exit(1);
  }

  const rows = [];
  for (const { label, dir, entryKey } of TARGET_ROUTES) {
    const chunks = readEntryJSFiles(dir, entryKey);
    if (!chunks) {
      rows.push({
        label,
        chunkCount: 0,
        rawBytes: 0,
        brBytes: 0,
        rawKb: 0,
        missing: true,
      });
      continue;
    }
    let rawBytes = 0;
    let brBytes = 0;
    for (const c of chunks) {
      rawBytes += chunkBytes(c);
      brBytes += brotliBytes(c);
    }
    rows.push({
      label,
      chunkCount: chunks.length,
      rawBytes,
      brBytes,
      rawKb: rawBytes / 1024,
      missing: false,
    });
  }

  if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });
  const outPath = path.join(docsDir, 'bundle-report.md');
  const report = buildReport(rows);
  fs.writeFileSync(outPath, report, 'utf8');

  console.log(report);
  console.log('');
  console.log(`Wrote ${path.relative(root, outPath)}`);
}

main();

// IDENTITY_SEAL: PART-1~5 | role=bundle-report | target=Next16-turbopack | source=client-reference-manifest
