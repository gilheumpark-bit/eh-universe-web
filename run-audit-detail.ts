import * as fs from 'fs';
import * as path from 'path';
import { runProjectAudit } from './src/lib/code-studio/audit/audit-engine';
import type { AuditFile } from './src/lib/code-studio/audit/audit-types';

const SRC_DIR = path.resolve(__dirname, 'src');
const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.css', '.json', '.md']);
const EXCLUDE = new Set(['node_modules', '.next', '.git', 'dist', 'coverage', '__tests__']);
function collect(dir: string, files: AuditFile[] = []): AuditFile[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (EXCLUDE.has(e.name)) continue;
    const fp = path.join(dir, e.name);
    if (e.isDirectory()) collect(fp, files);
    else if (EXTENSIONS.has(path.extname(e.name))) {
      try {
        files.push({
          path: path.relative(SRC_DIR, fp).replace(/\\/g, '/'),
          content: fs.readFileSync(fp, 'utf-8'),
          language: ({ ts: 'typescript', tsx: 'tsx', js: 'javascript', css: 'css', json: 'json', md: 'markdown' } as Record<string, string>)[path.extname(e.name).slice(1)] ?? 'plaintext',
        });
      } catch { /* skip */ }
    }
  }
  return files;
}
const files = collect(SRC_DIR);

// Add root-level files
const ROOT_FILES = ['package.json', 'package-lock.json', 'README.md', 'CHANGELOG.md', 'tsconfig.json'];
for (const name of ROOT_FILES) {
  const fp = path.resolve(__dirname, name);
  if (fs.existsSync(fp)) {
    files.push({
      path: name,
      content: fs.readFileSync(fp, 'utf-8'),
      language: ({ json: 'json', md: 'markdown', ts: 'typescript' } as Record<string, string>)[path.extname(name).slice(1)] ?? 'plaintext',
    });
  }
}
const report = runProjectAudit({ files, language: 'ko', projectName: 'eh-universe-web' });

// Print UX Quality detail
const ux = report.areas.find(a => a.area === 'ux-quality');
console.log('=== UX Quality ===');
console.log(`Score: ${ux?.score} Grade: ${ux?.grade}`);
console.log(`Checks: ${ux?.checks} Passed: ${ux?.passed}`);
console.log('Metrics:', JSON.stringify(ux?.metrics));
console.log('Findings:');
for (const f of ux?.findings ?? []) {
  console.log(`  [${f.severity}] ${f.message} (${f.rule})`);
}

// Print Operations detail
const ops = report.areas.find(a => a.area === 'operations');
console.log('\n=== Operations ===');
console.log(`Score: ${ops?.score} Grade: ${ops?.grade}`);
console.log(`Checks: ${ops?.checks} Passed: ${ops?.passed}`);
console.log('Metrics:', JSON.stringify(ops?.metrics));
console.log('Findings:');
for (const f of ops?.findings ?? []) {
  console.log(`  [${f.severity}] ${f.message} (${f.rule})`);
}

// Print Dependencies detail
const deps = report.areas.find(a => a.area === 'dependencies');
console.log('\n=== Dependencies ===');
console.log(`Score: ${deps?.score} Grade: ${deps?.grade}`);
console.log(`Checks: ${deps?.checks} Passed: ${deps?.passed}`);
console.log('Findings:');
for (const f of deps?.findings ?? []) {
  console.log(`  [${f.severity}] ${f.message} (${f.rule})`);
}
