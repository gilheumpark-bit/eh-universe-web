/**
 * Flatten studio translation trees and report parity vs EN (same-criteria for all locales).
 * Run: npx tsx scripts/i18n-translation-audit.ts
 */
import ko from '../renderer/lib/translations-ko';
import en from '../renderer/lib/translations-en';
import ja from '../renderer/lib/translations-ja';
import zh from '../renderer/lib/translations-zh';
import * as fs from 'fs';
import * as path from 'path';

function flatten(obj: unknown, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      const p = prefix ? `${prefix}.${k}` : k;
      if (typeof v === 'string') out[p] = v;
      else Object.assign(out, flatten(v, p));
    }
  }
  return out;
}

/** Heuristic: likely English UI leak when locale string equals EN and looks Latin-heavy */
function looksLikeEnglishLeak(localeVal: string, enVal: string): boolean {
  if (!localeVal || localeVal !== enVal) return false;
  const t = localeVal.trim();
  if (!t) return false;
  // Shared tokens (API names, units) — still flag if identical to EN
  const latin = (t.match(/[A-Za-z]/g) || []).length;
  const cjk = (t.match(/[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/g) || []).length;
  return latin >= 3 && cjk === 0;
}

const K = flatten(ko);
const E = flatten(en);
const J = flatten(ja);
const C = flatten(zh);
const keys = new Set([...Object.keys(K), ...Object.keys(E), ...Object.keys(J), ...Object.keys(C)]);

const koLeak: string[] = [];
const jpUntranslated: string[] = [];
const cnUntranslated: string[] = [];
const missingJp: string[] = [];
const missingCn: string[] = [];

for (const k of keys) {
  if (looksLikeEnglishLeak(K[k] ?? '', E[k] ?? '')) koLeak.push(k);
  if (K[k] && J[k] === undefined) missingJp.push(k);
  if (K[k] && C[k] === undefined) missingCn.push(k);
  if (E[k] && J[k] === E[k] && looksLikeEnglishLeak(J[k], E[k])) jpUntranslated.push(k);
  if (E[k] && C[k] === E[k] && looksLikeEnglishLeak(C[k], E[k])) cnUntranslated.push(k);
}

const report = [
  `Total leaf keys (union): ${keys.size}`,
  `KO mode — value identical to EN & Latin-heavy (suspected leak): ${koLeak.length}`,
  `JP — missing keys vs KO: ${missingJp.length}`,
  `CN — missing keys vs KO: ${missingCn.length}`,
  `JP — same as EN (Latin-heavy): ${jpUntranslated.length}`,
  `CN — same as EN (Latin-heavy): ${cnUntranslated.length}`,
  '',
  '=== KO suspected English (first 80) ===',
  ...koLeak.slice(0, 80).map((k) => `${k}\t${K[k]}`),
  '',
  '=== JP == EN samples (first 80) ===',
  ...jpUntranslated.slice(0, 80).map((k) => `${k}\t${J[k]}`),
  '',
  '=== CN == EN samples (first 80) ===',
  ...cnUntranslated.slice(0, 80).map((k) => `${k}\t${C[k]}`),
  '',
  '=== Missing JP (first 40) ===',
  ...missingJp.slice(0, 40),
  '',
  '=== Missing CN (first 40) ===',
  ...missingCn.slice(0, 40),
].join('\n');

const outPath = path.join(process.cwd(), 'scripts', 'i18n-audit-report.txt');
fs.writeFileSync(outPath, report, 'utf8');
console.log(report.slice(0, 4000));
console.log(`\n… full report: ${outPath}`);
