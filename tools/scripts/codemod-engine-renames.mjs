#!/usr/bin/env node
/**
 * tools/scripts/codemod-engine-renames.mjs
 *
 * Engine internals were renamed during B-2:
 *   detector-registry.ts -> registry.ts
 *   rule-catalog.ts      -> catalog.ts
 *   (also: core/types -> types, core/scope-policy -> scope-policy)
 *
 * Detector files (228) and pipeline files reference the old names.
 * This codemod rewrites those references in-place.
 *
 * Also: stubs out renderer-only paths that snuck into engine files:
 *   @/lib/ai-providers -> ../_stubs/ai-providers
 *   @/lib/logger       -> ../_stubs/logger
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const RULES = [
  // import path renames
  [/from\s+(['"])\.\.\/detector-registry\1/g,    "from $1../registry$1"],
  [/from\s+(['"])\.\/detector-registry\1/g,      "from $1./registry$1"],
  [/from\s+(['"])\.\.\/rule-catalog\1/g,         "from $1../catalog$1"],
  [/from\s+(['"])\.\/rule-catalog\1/g,           "from $1./catalog$1"],
  [/from\s+(['"])\.\.\/core\/types\1/g,          "from $1../types$1"],
  [/from\s+(['"])\.\.\/core\/scope-policy\1/g,   "from $1../scope-policy$1"],
  [/from\s+(['"])\.\.\/core\/autofix-policy\1/g, "from $1../autofix-policy$1"],

  // renderer-only modules → local stubs
  [/from\s+(['"])@\/lib\/ai-providers\1/g, "from $1../_stubs/ai-providers$1"],
  [/from\s+(['"])@\/lib\/logger\1/g,       "from $1../_stubs/logger$1"],
];

function listTracked() {
  const out = execSync('git ls-files packages/quill-engine "*.ts"', { encoding: 'utf8' });
  return out
    .trim()
    .split(/\r?\n/)
    .filter((p) => p && p.endsWith('.ts'));
}

let touched = 0;
let count = 0;

for (const file of listTracked()) {
  const before = readFileSync(file, 'utf8');
  let after = before;
  let local = 0;
  for (const [re, replacement] of RULES) {
    const next = after.replace(re, replacement);
    if (next !== after) local += 1;
    after = next;
  }
  if (after !== before) {
    writeFileSync(file, after);
    touched += 1;
    count += local;
    console.log(`  ✓ ${file}`);
  }
}

console.log(`\nDone. Touched ${touched} file(s).`);
