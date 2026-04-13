#!/usr/bin/env node
/**
 * Codemod: rewrite renderer imports to @eh/quill-engine / @eh/quill-cli
 *
 * Handles these source patterns:
 *   @/lib/code-studio/audit/*       → @eh/quill-engine/audit/*
 *   @/lib/code-studio/pipeline/*    → @eh/quill-engine/pipeline/*
 *   @/lib/code-studio/core/scope-policy → @eh/quill-engine/scope-policy
 *   @/lib/code-studio/ai/ari-engine     → @eh/quill-engine/ari-engine
 *   @/cli/core/quill-engine         → @eh/quill-engine/engine
 *   @/cli/core/detector-registry    → @eh/quill-engine/registry
 *   @/cli/core/rule-catalog         → @eh/quill-engine/catalog
 *   @/cli/core/deep-verify          → @eh/quill-engine/deep-verify
 *   @/cli/core/good-pattern-catalog → @eh/quill-engine/good-pattern-catalog
 *   @/cli/core/detectors/*          → @eh/quill-engine/detectors/*
 *
 * Run from repo root:
 *   node tools/scripts/codemod-quill-imports.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

// ============================================================
// PART 1 — Path rewrite rules
// ============================================================

const RULES = [
  // lib/code-studio/audit/*
  [/from\s+(['"])@\/lib\/code-studio\/audit\/([^'"]+)\1/g, "from $1@eh/quill-engine/audit/$2$1"],
  [/from\s+(['"])@\/lib\/code-studio\/audit\1/g,            "from $1@eh/quill-engine/audit$1"],

  // lib/code-studio/pipeline/*
  [/from\s+(['"])@\/lib\/code-studio\/pipeline\/([^'"]+)\1/g, "from $1@eh/quill-engine/pipeline/$2$1"],
  [/from\s+(['"])@\/lib\/code-studio\/pipeline\1/g,           "from $1@eh/quill-engine/pipeline$1"],

  // scope-policy + ari-engine
  [/from\s+(['"])@\/lib\/code-studio\/core\/scope-policy\1/g, "from $1@eh/quill-engine/scope-policy$1"],
  [/from\s+(['"])@\/lib\/code-studio\/ai\/ari-engine\1/g,     "from $1@eh/quill-engine/ari-engine$1"],

  // engine support files (moved in B-4)
  [/from\s+(['"])@\/lib\/code-studio\/core\/autofix-policy\1/g,        "from $1@eh/quill-engine/autofix-policy$1"],
  [/from\s+(['"])@\/lib\/code-studio\/core\/types\1/g,                 "from $1@eh/quill-engine/types$1"],
  [/from\s+(['"])@\/lib\/code-studio\/features\/patent-scanner\1/g,    "from $1@eh/quill-engine/patent-scanner$1"],
  [/from\s+(['"])@\/lib\/code-studio\/ai\/quality-rules-from-catalog\1/g, "from $1@eh/quill-engine/quality-rules-from-catalog$1"],

  // cli/core/* engine files
  [/from\s+(['"])@\/cli\/core\/quill-engine\1/g,         "from $1@eh/quill-engine/engine$1"],
  [/from\s+(['"])@\/cli\/core\/detector-registry\1/g,    "from $1@eh/quill-engine/registry$1"],
  [/from\s+(['"])@\/cli\/core\/rule-catalog\1/g,         "from $1@eh/quill-engine/catalog$1"],
  [/from\s+(['"])@\/cli\/core\/deep-verify\1/g,          "from $1@eh/quill-engine/deep-verify$1"],
  [/from\s+(['"])@\/cli\/core\/good-pattern-catalog\1/g, "from $1@eh/quill-engine/good-pattern-catalog$1"],
  [/from\s+(['"])@\/cli\/core\/detectors\/([^'"]+)\1/g,  "from $1@eh/quill-engine/detectors/$2$1"],
];

// ============================================================
// PART 2 — Find candidate files (tracked .ts/.tsx)
// ============================================================

function listTrackedFiles() {
  const out = execSync('git ls-files apps/desktop/renderer "*.ts" "*.tsx"', { encoding: 'utf8' });
  return out
    .trim()
    .split(/\r?\n/)
    .filter((p) => p && (p.endsWith('.ts') || p.endsWith('.tsx')));
}

// ============================================================
// PART 3 — Apply rules and report
// ============================================================

function applyRules(content) {
  let next = content;
  let changed = false;
  for (const [pattern, replacement] of RULES) {
    const before = next;
    next = next.replace(pattern, replacement);
    if (next !== before) changed = true;
  }
  return { next, changed };
}

const files = listTrackedFiles();
let touched = 0;
let totalReplacements = 0;

for (const file of files) {
  let content;
  try {
    content = readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  const { next, changed } = applyRules(content);
  if (changed) {
    writeFileSync(file, next);
    touched += 1;
    // crude count of replacements: difference in @eh occurrences
    const before = (content.match(/@eh\/quill-/g) ?? []).length;
    const after = (next.match(/@eh\/quill-/g) ?? []).length;
    totalReplacements += after - before;
    console.log(`  ✓ ${file}`);
  }
}

console.log(`\nDone. Touched ${touched} file(s), ${totalReplacements} import(s) rewritten.`);
