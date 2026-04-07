#!/usr/bin/env node
/**
 * tools/scripts/codemod-relative-self-imports.mjs
 *
 * The first codemod over-rewrote intra-package imports inside
 * packages/quill-engine: relative paths became `@eh/quill-engine/X`,
 * which TS rejects as a self-reference.
 *
 * This codemod converts those back to relative paths.
 *
 *   from packages/quill-engine/src/pipeline/foo.ts
 *   `@eh/quill-engine/audit/audit-engine` -> `../audit/audit-engine`
 *   `@eh/quill-engine/types`              -> `../types`
 */

import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';

const ROOT = 'packages/quill-engine/src';

function listTracked() {
  const out = execSync('git ls-files packages/quill-engine "*.ts"', { encoding: 'utf8' });
  return out
    .trim()
    .split(/\r?\n/)
    .filter((p) => p && p.endsWith('.ts'));
}

function relativizeOne(fromFile, importPath) {
  // strip the @eh/quill-engine prefix → 'audit/audit-engine' or '' (just root)
  const subpath = importPath.replace(/^@eh\/quill-engine\/?/, '');
  const targetAbs = path.join(ROOT, subpath || 'index');
  const fromDir = path.dirname(fromFile);
  let rel = path.relative(fromDir, targetAbs).replace(/\\/g, '/');
  if (!rel.startsWith('.')) rel = './' + rel;
  return rel;
}

const files = listTracked().filter((f) => f.startsWith('packages/quill-engine/src/'));

let touched = 0;
let count = 0;

for (const file of files) {
  const before = readFileSync(file, 'utf8');
  const after = before.replace(
    /from\s+(['"])(@eh\/quill-engine(?:\/[\w./-]+)?)\1/g,
    (_match, q, importPath) => {
      const rel = relativizeOne(file, importPath);
      count += 1;
      return `from ${q}${rel}${q}`;
    },
  );
  if (after !== before) {
    writeFileSync(file, after);
    touched += 1;
    console.log(`  ✓ ${file}`);
  }
}

console.log(`\nDone. Touched ${touched} file(s), ${count} import(s) relativized.`);
