/**
 * EH Universe Web — 내장 16영역 프로젝트 감사 실행기
 * 
 * 사용법: npx tsx run-audit.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { runProjectAudit, formatAuditReport } from './src/lib/code-studio/audit/audit-engine';
import type { AuditFile } from './src/lib/code-studio/audit/audit-types';

// ── File Collection ──
const SRC_DIR = path.resolve(__dirname, 'src');
const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.css', '.json', '.md']);
const EXCLUDE_DIRS = new Set(['node_modules', '.next', '.git', 'dist', 'coverage', '__tests__']);

function collectFiles(dir: string, files: AuditFile[] = []): AuditFile[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (EXCLUDE_DIRS.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectFiles(fullPath, files);
    } else if (EXTENSIONS.has(path.extname(entry.name))) {
      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const ext = path.extname(entry.name).slice(1);
        const langMap: Record<string, string> = {
          ts: 'typescript', tsx: 'tsx', js: 'javascript',
          jsx: 'jsx', css: 'css', json: 'json', md: 'markdown',
        };
        files.push({
          path: path.relative(SRC_DIR, fullPath).replace(/\\/g, '/'),
          content,
          language: langMap[ext] ?? 'plaintext',
        });
      } catch { /* skip unreadable */ }
    }
  }
  return files;
}

// ── Main ──
console.log('═'.repeat(52));
console.log('  EH Universe Web — 내장 16영역 프로젝트 감사');
console.log('═'.repeat(52));
console.log('');

console.log('📂 소스 파일 수집 중...');
const files = collectFiles(SRC_DIR);

// Add root-level files (package.json, README, etc.) for dependency audit
const ROOT_FILES = ['package.json', 'package-lock.json', 'README.md', 'CHANGELOG.md', 'tsconfig.json'];
for (const name of ROOT_FILES) {
  const fp = path.resolve(__dirname, name);
  if (fs.existsSync(fp)) {
    const ext = path.extname(name).slice(1);
    files.push({
      path: name,
      content: fs.readFileSync(fp, 'utf-8'),
      language: ({ json: 'json', md: 'markdown', ts: 'typescript' } as Record<string, string>)[ext] ?? 'plaintext',
    });
  }
}

// Add e2e test files for test coverage audit
const E2E_DIR = path.resolve(__dirname, 'e2e');
if (fs.existsSync(E2E_DIR)) {
  for (const entry of fs.readdirSync(E2E_DIR)) {
    const fp = path.join(E2E_DIR, entry);
    if (fs.statSync(fp).isFile() && /\.(ts|tsx|js)$/.test(entry)) {
      files.push({
        path: `e2e/${entry}`,
        content: fs.readFileSync(fp, 'utf-8'),
        language: 'typescript',
      });
    }
  }
}
// Add playwright config if exists
const playwrightConfig = path.resolve(__dirname, 'playwright.config.ts');
if (fs.existsSync(playwrightConfig)) {
  files.push({ path: 'playwright.config.ts', content: fs.readFileSync(playwrightConfig, 'utf-8'), language: 'typescript' });
}

console.log(`   ${files.length}개 파일 수집 완료`);
console.log('');

console.log('🔍 감사 진행 중...');
const report = runProjectAudit(
  { files, language: 'ko', projectName: 'eh-universe-web' },
  (area, index, total) => {
    process.stdout.write(`\r   [${index}/${total}] ${area}...                    `);
  },
);
console.log('\r   감사 완료!                                           ');
console.log('');

// ── Output ──
const formatted = formatAuditReport(report, 'ko');
console.log(formatted);

// Save to file
const outPath = path.resolve(__dirname, 'audit-report.txt');
fs.writeFileSync(outPath, formatted, 'utf-8');
console.log('');
console.log(`📝 보고서 저장됨: ${outPath}`);
