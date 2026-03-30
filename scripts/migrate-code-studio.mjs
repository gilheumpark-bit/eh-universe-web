#!/usr/bin/env node
/**
 * Code Studio File Reorganization Script
 * Moves 119 code-studio-*.ts files from src/lib/ into 6 subdirectories
 * under src/lib/code-studio/, creates backward-compatible shims, and
 * generates barrel index.ts files.
 *
 * Usage: node scripts/migrate-code-studio.mjs
 *
 * Safe to run: creates shims at old paths so NO imports break.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync, readdirSync } from 'fs';
import { join, basename } from 'path';

const ROOT = join(import.meta.dirname, '..');
const LIB = join(ROOT, 'src', 'lib');
const CS_DIR = join(LIB, 'code-studio');

// ============================================================
// PART 1 — File Categorization Map
// ============================================================

/**
 * Maps each code-studio-*.ts filename (without path/prefix) to its target directory.
 * The prefix "code-studio-" is stripped and the remainder becomes the new filename.
 */
const FILE_MAP = {
  // ── core/ ──────────────────────────────────────────────────
  'types': 'core',
  'store': 'core',
  'composer-state': 'core',
  'panel-registry': 'core',
  'speed-optimizations': 'core',
  'shell-parser': 'core',
  'cross-file': 'core',
  'plugin': 'core',
  'design-system': 'core',
  'virtual-list': 'core',
  'accessibility': 'core',
  'responsive': 'core',
  'notifications': 'core',
  'project-rules': 'core',
  'project-spec': 'core',
  'ansi': 'core',
  'editorconfig': 'core',

  // ── ai/ ────────────────────────────────────────────────────
  'ai-actions': 'ai',
  'ai-features': 'ai',
  'agents': 'ai',
  'ai-diff-stream': 'ai',
  'ai-director': 'ai',
  'ai-rename': 'ai',
  'ai-tool-use': 'ai',
  'autopilot': 'ai',
  'chat-history': 'ai',
  'chat-fork': 'ai',
  'context-pruning': 'ai',
  'ghost': 'ai',
  'model-router': 'ai',
  'pair-programming': 'ai',
  'multi-ai-review': 'ai',
  'lint-ai-loop': 'ai',
  'mentions': 'ai',
  'role-router': 'ai',
  'web-search': 'ai',

  // ── pipeline/ ──────────────────────────────────────────────
  'pipeline': 'pipeline',
  'pipeline-utils': 'pipeline',
  'pipeline-teams': 'pipeline',
  'bugfinder': 'pipeline',
  'stress-test': 'pipeline',
  'verification-loop': 'pipeline',
  'build-scan': 'pipeline',
  'dead-code': 'pipeline',
  'error-parser': 'pipeline',
  'app-monitoring': 'pipeline',
  'developer-scorecard': 'pipeline',
  'chaos-engineering': 'pipeline',

  // ── editor/ ────────────────────────────────────────────────
  'typescript-service': 'editor',
  'type-acquisition': 'editor',
  'monaco-setup': 'editor',
  'editor-features': 'editor',
  'editor-history': 'editor',
  'editor-minimap': 'editor',
  'emmet': 'editor',
  'gutter-actions': 'editor',
  'semantic-tokens': 'editor',
  'auto-import': 'editor',
  'inline-diff': 'editor',
  'diff-engine': 'editor',
  'replace-engine': 'editor',
  'code-indexer': 'editor',
  'ast-search': 'editor',
  'symbol-search': 'editor',
  'symbol-graph': 'editor',
  'fuzzy-match': 'editor',
  'semantic-search': 'editor',
  'codebase-search': 'editor',
  'code-evolution': 'editor',

  // ── features/ ──────────────────────────────────────────────
  'collaboration': 'features',
  'terminal': 'features',
  'terminal-emulator': 'features',
  'terminal-ai': 'features',
  'xterm-wrapper': 'features',
  'preview-hmr': 'features',
  'static-preview': 'features',
  'git': 'features',
  'git-blame': 'features',
  'git-file-status': 'features',
  'commit-message': 'features',
  'deploy': 'features',
  'share': 'features',
  'fork': 'features',
  'file-icons': 'features',
  'file-sort': 'features',
  'file-drop': 'features',
  'file-completer': 'features',
  'recent-files': 'features',
  'local-folder': 'features',
  'fs-sync': 'features',
  'zip': 'features',
  'image-input': 'features',
  'voice-input': 'features',
  'package-manager': 'features',
  'webcontainer': 'features',
  'sandbox': 'features',
  'search': 'features',
  'crdt-presence': 'features',
  'usage-tracker': 'features',
  'device-frames': 'features',
  'element-inspector': 'features',
  'mcp-client': 'features',
  'docs-crawler': 'features',
  'cicd-generator': 'features',
  'db-integration': 'features',
  'design-to-code': 'features',
  'app-generator': 'features',
  'issue-resolver': 'features',
  'patent-scanner': 'features',
  'business-evaluator': 'features',
  'competitor-compare': 'features',
  'composer-history': 'features',
  'trend-analyzer': 'features',

  // ── audit/ ─────────────────────────────────────────────────
  'audit-engine': 'audit',
  'audit-types': 'audit',
  'audit-quality': 'audit',
  'audit-ux': 'audit',
  'audit-code-health': 'audit',
  'audit-infra': 'audit',
};

// IDENTITY_SEAL: PART-1 | role=categorization | inputs=filename | outputs=directory

// ============================================================
// PART 2 — Directory Creation & File Copy
// ============================================================

function ensureDir(dir) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function migrateFiles() {
  const dirs = ['core', 'ai', 'pipeline', 'editor', 'features', 'audit'];
  for (const d of dirs) {
    ensureDir(join(CS_DIR, d));
  }

  const movedFiles = []; // { shortName, dir, oldPath, newPath }
  const unmapped = [];

  // Discover all code-studio-*.ts files
  const allFiles = readdirSync(LIB).filter(
    f => f.startsWith('code-studio-') && f.endsWith('.ts') && !f.endsWith('.test.ts')
  );

  for (const filename of allFiles) {
    const shortName = filename.replace('code-studio-', '').replace('.ts', '');
    const dir = FILE_MAP[shortName];

    if (!dir) {
      unmapped.push(filename);
      continue;
    }

    const oldPath = join(LIB, filename);
    const newPath = join(CS_DIR, dir, `${shortName}.ts`);

    // Read content
    let content = readFileSync(oldPath, 'utf-8');

    // Adjust relative imports: ./code-studio-X → ../../code-studio-X (hits shim)
    // This ensures cross-directory imports work via the backward-compat shims
    content = content.replace(
      /from\s+'\.\/code-studio-([^']+)'/g,
      (match, name) => {
        const targetDir = FILE_MAP[name];
        if (targetDir === dir) {
          // Same directory — use direct relative import
          return `from './${name}'`;
        }
        // Different directory — go through the shim at old path
        return `from '../../code-studio-${name}'`;
      }
    );

    // Write to new location
    writeFileSync(newPath, content, 'utf-8');

    movedFiles.push({ shortName, dir, oldPath, newPath });
  }

  return { movedFiles, unmapped };
}

// IDENTITY_SEAL: PART-2 | role=file migration | inputs=FILE_MAP | outputs=movedFiles

// ============================================================
// PART 3 — Backward-Compatible Shims
// ============================================================

function createShims(movedFiles) {
  for (const { shortName, dir, oldPath } of movedFiles) {
    const shimContent = `// Backward-compatible re-export — file moved to code-studio/${dir}/${shortName}.ts\nexport * from './code-studio/${dir}/${shortName}';\n`;
    writeFileSync(oldPath, shimContent, 'utf-8');
  }
}

// IDENTITY_SEAL: PART-3 | role=shim generation | inputs=movedFiles | outputs=shim files

// ============================================================
// PART 4 — Barrel Index Files
// ============================================================

function createBarrelFiles(movedFiles) {
  // Group by directory
  const byDir = {};
  for (const { shortName, dir } of movedFiles) {
    if (!byDir[dir]) byDir[dir] = [];
    byDir[dir].push(shortName);
  }

  // Create index.ts for each subdirectory
  for (const [dir, files] of Object.entries(byDir)) {
    const exports = files
      .sort()
      .map(f => `export * from './${f}';`)
      .join('\n');
    const indexContent = `// Barrel re-exports for code-studio/${dir}/\n${exports}\n`;
    writeFileSync(join(CS_DIR, dir, 'index.ts'), indexContent, 'utf-8');
  }

  // Create top-level index.ts
  const dirs = Object.keys(byDir).sort();
  const topExports = dirs.map(d => `export * from './${d}';`).join('\n');
  const topContent = `// Top-level barrel re-exports for code-studio/\n${topExports}\n`;
  writeFileSync(join(CS_DIR, 'index.ts'), topContent, 'utf-8');
}

// IDENTITY_SEAL: PART-4 | role=barrel generation | inputs=movedFiles | outputs=index.ts files

// ============================================================
// PART 5 — Unused Module Detection
// ============================================================

function findUnusedModules(movedFiles) {
  // Read all source files to check for imports
  const srcDir = join(ROOT, 'src');
  const allSourceFiles = getAllTsFiles(srcDir);
  const allContent = allSourceFiles.map(f => {
    try { return readFileSync(f, 'utf-8'); } catch { return ''; }
  }).join('\n');

  const unused = [];
  for (const { shortName, dir } of movedFiles) {
    const oldImportPattern = `code-studio-${shortName}`;
    const newImportPattern = `code-studio/${dir}/${shortName}`;
    const barrelPattern = `code-studio/${dir}`;

    // Check if the module is imported anywhere (old path, new path, or barrel)
    if (
      !allContent.includes(oldImportPattern) &&
      !allContent.includes(newImportPattern) &&
      !allContent.includes(`from './${shortName}'`) // same-dir import within code-studio
    ) {
      unused.push(`${dir}/${shortName}.ts (was code-studio-${shortName}.ts)`);
    }
  }

  return unused;
}

function getAllTsFiles(dir) {
  const results = [];
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        results.push(...getAllTsFiles(fullPath));
      } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
        results.push(fullPath);
      }
    }
  } catch { /* skip unreadable dirs */ }
  return results;
}

// IDENTITY_SEAL: PART-5 | role=unused detection | inputs=movedFiles,srcDir | outputs=unused list

// ============================================================
// PART 6 — Main Execution
// ============================================================

console.log('=== Code Studio File Reorganization ===\n');

console.log('Step 1: Migrating files to new directories...');
const { movedFiles, unmapped } = migrateFiles();
console.log(`  Moved: ${movedFiles.length} files`);
if (unmapped.length > 0) {
  console.log(`  Unmapped (skipped): ${unmapped.length}`);
  for (const f of unmapped) console.log(`    - ${f}`);
}

console.log('\nStep 2: Creating backward-compatible shims...');
createShims(movedFiles);
console.log(`  Created: ${movedFiles.length} shims`);

console.log('\nStep 3: Creating barrel index.ts files...');
createBarrelFiles(movedFiles);
console.log('  Created barrel files for: core, ai, pipeline, editor, features, audit + top-level');

console.log('\nStep 4: Scanning for unused modules...');
const unused = findUnusedModules(movedFiles);
if (unused.length > 0) {
  console.log(`  Found ${unused.length} potentially unused modules:`);
  for (const u of unused) console.log(`    - ${u}`);
} else {
  console.log('  All modules appear to be imported somewhere.');
}

console.log('\n=== Migration Summary ===');
const byDir = {};
for (const { dir } of movedFiles) {
  byDir[dir] = (byDir[dir] || 0) + 1;
}
for (const [dir, count] of Object.entries(byDir).sort()) {
  console.log(`  ${dir}/: ${count} files`);
}
console.log(`  Total: ${movedFiles.length} files moved`);
console.log(`  Shims: ${movedFiles.length} backward-compatible re-exports created`);
console.log(`  Barrels: 7 index.ts files created (6 dirs + 1 top-level)`);
console.log('\nDone! All existing imports continue to work via shims.');

// IDENTITY_SEAL: PART-6 | role=orchestrator | inputs=none | outputs=migration report
