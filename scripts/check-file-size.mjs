#!/usr/bin/env node
// ============================================================
// PART 1 — File size guard (신규 기술 부채 스노볼링 차단)
// ============================================================
//
// 목적: src/** 아래 파일이 MAX_LINES 를 초과하지 않도록 강제.
// NOA Rules — 500줄+ 는 PART 분리 필수, 800줄+ 는 위험 구간.
//
// 정책:
//   WARN_THRESHOLD 줄 초과 → console.warn (CI 경고)
//   FAIL_THRESHOLD 줄 초과 → exit 1 (CI 실패)
//
// 예외 (GRANDFATHERED):
//   - 번역 사전 (lib/translations-*.ts) — 대규모 키밸류 사전
//   - 기존 대형 파일 (legacy) — 분리 작업 진행 중
//
// Usage:
//   node scripts/check-file-size.mjs              # src 전체
//   node scripts/check-file-size.mjs --ci         # CI 모드 (fail threshold 적용)
//   node scripts/check-file-size.mjs --all        # grandfathered 포함 전부 표시
// ============================================================

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

// ============================================================
// PART 2 — Config
// ============================================================

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');
const SRC = join(ROOT, 'src');

const WARN_THRESHOLD = 500;  // PART 분리 권장
const FAIL_THRESHOLD = 800;  // 신규 파일 금지선 (CI 모드에서만 fail)

// grandfathered — 분리 작업 진행 중인 기존 대형 파일 (2026-04-19 기준 31건)
// 신규 커밋에서 이들 파일의 신규 생성은 차단하되, 기존 확장은 허용.
// 목표: 리스트를 **점진적으로 축소** (파일 분리 완료 시 제거). 신규 추가는 금지.
const GRANDFATHERED = new Set([
  // 번역 사전 (대규모 키밸류, 분리 불필요)
  'src/lib/translations-ko.ts',
  'src/lib/translations-en.ts',
  'src/lib/translations-ja.ts',
  'src/lib/translations-zh.ts',
  // 분리 예정 (Top 우선)
  'src/components/translator/TranslatorStudioApp.tsx',
  'src/engine/translation.ts',
  'src/app/tools/warp-gate/page.tsx',
  'src/engine/pipeline.ts',
  'src/components/studio/SceneSheet.tsx',
  'src/hooks/useTranslation.ts',
  'src/components/studio/StyleStudioView.tsx',
  'src/components/studio/TranslationPanel.tsx',
  'src/lib/code-studio/pipeline/pipeline.ts',
  'src/components/studio/SettingsView.tsx',
  'src/components/code-studio/CodeStudioShell.tsx',
  // 추가 legacy 800줄+
  'src/lib/ai-providers.ts',
  'src/lib/code-studio/pipeline/pipeline-teams.ts',
  'src/components/studio/ResourceView.tsx',
  'src/components/studio/ItemStudioView.tsx',
  'src/app/studio/StudioShell.tsx',
  'src/components/studio/tabs/VisualTab.tsx',
  'src/lib/code-studio/features/collaboration.ts',
  'src/components/code-studio/DeployPanel.tsx',
  'src/components/code-studio/GitPanel.tsx',
  'src/components/studio/StudioSidebar.tsx',
  'src/components/studio/tabs/WritingTabInline.tsx',
  'src/components/network/NetworkHomeClient.tsx',
  'src/components/studio/ScenePlayer.tsx',
  'src/lib/code-studio/pipeline/bugfinder.ts',
  'src/cli/core/pipeline-bridge.ts',
  'src/components/network/PlanetWizard.tsx',
]);

// ============================================================
// PART 3 — Walker
// ============================================================

/** src 디렉토리 재귀 순회. .ts/.tsx 만 수집. */
function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stats = statSync(path);
    if (stats.isDirectory()) {
      // 테스트 디렉토리는 감시 대상에서 제외 (픽스처 파일이 클 수 있음)
      if (entry === '__tests__' || entry === '__mocks__' || entry === 'node_modules') continue;
      out.push(...walk(path));
      continue;
    }
    if (!stats.isFile()) continue;
    if (!/\.(ts|tsx)$/.test(entry)) continue;
    if (entry.endsWith('.test.ts') || entry.endsWith('.test.tsx')) continue;
    if (entry.endsWith('.d.ts')) continue;
    out.push(path);
  }
  return out;
}

/** 파일 줄 수 계산 (개행 기준). */
function lineCount(path) {
  const buf = readFileSync(path, 'utf8');
  // 마지막 라인 개행 없어도 +1 로 보정
  let count = 0;
  for (const ch of buf) {
    if (ch === '\n') count++;
  }
  if (buf.length > 0 && !buf.endsWith('\n')) count++;
  return count;
}

// ============================================================
// PART 4 — Main
// ============================================================

function main() {
  const args = new Set(process.argv.slice(2));
  const isCI = args.has('--ci');
  const showAll = args.has('--all');

  const files = walk(SRC);
  const results = [];

  for (const abs of files) {
    const rel = relative(ROOT, abs).replace(/\\/g, '/');
    const lines = lineCount(abs);
    if (lines < WARN_THRESHOLD) continue;
    const grandfathered = GRANDFATHERED.has(rel);
    results.push({ file: rel, lines, grandfathered });
  }

  results.sort((a, b) => b.lines - a.lines);

  const warn = results.filter(r => r.lines >= WARN_THRESHOLD && r.lines < FAIL_THRESHOLD);
  const fail = results.filter(r => r.lines >= FAIL_THRESHOLD);
  const newFail = fail.filter(r => !r.grandfathered);

  console.log(`\n[file-size-guard] Scanned ${files.length} files under src/\n`);

  if (warn.length > 0) {
    console.log(`⚠️  WARN (${WARN_THRESHOLD}~${FAIL_THRESHOLD - 1} lines) — PART 분리 권장: ${warn.length} files`);
    for (const r of warn.slice(0, 10)) {
      console.log(`   ${r.lines.toString().padStart(5)} ${r.file}`);
    }
    if (warn.length > 10) console.log(`   ... and ${warn.length - 10} more`);
    console.log();
  }

  if (fail.length > 0) {
    console.log(`🚨 FAIL (${FAIL_THRESHOLD}+ lines) — 위험 구간: ${fail.length} files`);
    for (const r of fail) {
      const tag = r.grandfathered ? ' [grandfathered]' : ' [NEW VIOLATION]';
      console.log(`   ${r.lines.toString().padStart(5)} ${r.file}${tag}`);
    }
    console.log();
  }

  if (showAll && results.length === 0) {
    console.log('✅ All files under 500 lines.\n');
  }

  // CI 모드: 신규 FAIL 있으면 exit 1. grandfathered 는 통과.
  if (isCI && newFail.length > 0) {
    console.error(`❌ ${newFail.length} new file(s) exceed ${FAIL_THRESHOLD} lines. Split into PARTs or extract modules.`);
    process.exit(1);
  }

  // 비CI 모드는 항상 exit 0 (정보 제공용).
  process.exit(0);
}

main();
