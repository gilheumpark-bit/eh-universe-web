#!/usr/bin/env node
/**
 * Loreguard current-surface integrity scan.
 *
 * Checks that the current product routes exist and that removed public
 * surfaces do not reappear as source directories or live imports.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const FAIL_ON_UNWIRED = process.argv.includes('--fail-on-unwired');

const ACTIVE_ROUTE_FILES = [
  'src/app/page.tsx',
  'src/app/studio/page.tsx',
  'src/app/translation-studio/page.tsx',
  'src/app/docs/page.tsx',
  'src/app/pricing/page.tsx',
  'src/app/status/page.tsx',
  'src/app/terms/page.tsx',
  'src/app/privacy/page.tsx',
  'src/app/copyright/page.tsx',
  'src/app/ai-disclosure/page.tsx',
];

const REMOVED_SOURCE_PATHS = [
  'src/app/code-studio',
  'src/app/codex',
  'src/app/network',
  'src/app/archive',
  'src/app/reference',
  'src/app/reports',
  'src/app/rulebook',
  'src/app/tools',
  'src/components/code-studio',
  'src/components/network',
  'src/components/tools',
  'src/lib/code-studio',
  'src/lib/network',
  'src/lib/tools',
  'src/data/reports',
];

const ALLOWED_REMOVED_SURFACE_FILES = new Set([
  'src/proxy.ts',
]);

const REMOVED_TEXT_PATTERNS = [
  { id: 'removed-route', regex: /['"`]\/(?:code-studio|codex|network|archive|reference|reports|rulebook|tools)(?:\/|['"`?#\s])/ },
  { id: 'removed-import', regex: /@\/components\/(?:code-studio|network|tools)\b|@\/lib\/(?:code-studio|network|tools)(?:\/|['"`])|@\/lib\/articles\b/ },
  { id: 'removed-flag', regex: /\b(?:CODE_STUDIO|NETWORK_COMMUNITY|MULTI_FILE_AGENT)\b/ },
  { id: 'removed-data', regex: /\b(?:articles-core|articles-reports|tool-links|ToolNav|useNetworkAgent|network-agent-client)\b/ },
];

function toRel(absPath) {
  return path.relative(ROOT, absPath).replace(/\\/g, '/');
}

function existsRel(relPath) {
  return fs.existsSync(path.join(ROOT, relPath));
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const absPath = path.join(dir, name);
    const stat = fs.statSync(absPath);
    if (stat.isDirectory()) {
      if (['node_modules', '.next', 'dist', '.git', 'coverage'].includes(name)) continue;
      walk(absPath, out);
      continue;
    }
    if (/\.(ts|tsx|js|jsx|mjs)$/.test(name) && !name.endsWith('.d.ts')) out.push(absPath);
  }
  return out;
}

function isCommentLine(line) {
  const trimmed = line.trim();
  return trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*') || trimmed.startsWith('{/*');
}

function scanRemovedText(files) {
  const hits = [];
  for (const absPath of files) {
    const rel = toRel(absPath);
    if (rel.includes('/__tests__/') || /\.test\./.test(rel) || /\.spec\./.test(rel)) continue;
    if (ALLOWED_REMOVED_SURFACE_FILES.has(rel)) continue;
    const lines = fs.readFileSync(absPath, 'utf8').split(/\r?\n/);
    lines.forEach((line, index) => {
      if (isCommentLine(line)) return;
      for (const pattern of REMOVED_TEXT_PATTERNS) {
        pattern.regex.lastIndex = 0;
        if (!pattern.regex.test(line)) continue;
        hits.push({
          file: rel,
          line: index + 1,
          rule: pattern.id,
          text: line.trim().slice(0, 160),
        });
      }
    });
  }
  return hits;
}

function main() {
  console.log('=== Loreguard current-surface integrity scan ===\n');

  const missingActiveRoutes = ACTIVE_ROUTE_FILES.filter((rel) => !existsRel(rel));
  const resurrectedPaths = REMOVED_SOURCE_PATHS.filter((rel) => existsRel(rel));
  const files = walk(SRC);
  const removedTextHits = scanRemovedText(files);

  console.log('## Active route files');
  if (missingActiveRoutes.length === 0) console.log('   OK — current public route files are present.\n');
  else {
    for (const rel of missingActiveRoutes) console.log(`   MISSING ${rel}`);
    console.log('');
  }

  console.log('## Removed source paths');
  if (resurrectedPaths.length === 0) console.log('   OK — removed public surface directories are absent.\n');
  else {
    for (const rel of resurrectedPaths) console.log(`   PRESENT ${rel}`);
    console.log('');
  }

  console.log('## Removed-surface live references');
  if (removedTextHits.length === 0) console.log('   OK — no live references outside the proxy guard.\n');
  else {
    for (const hit of removedTextHits.slice(0, 40)) {
      console.log(`   ${hit.file}:${hit.line} [${hit.rule}] ${hit.text}`);
    }
    if (removedTextHits.length > 40) console.log(`   ... and ${removedTextHits.length - 40} more`);
    console.log('');
  }

  const issueCount = missingActiveRoutes.length + resurrectedPaths.length + removedTextHits.length;
  console.log('---');
  console.log(`Summary: ${issueCount === 0 ? 'PASS' : 'HOLD'} (${issueCount} issue(s))`);

  if (FAIL_ON_UNWIRED && issueCount > 0) process.exit(1);
  process.exit(0);
}

main();
