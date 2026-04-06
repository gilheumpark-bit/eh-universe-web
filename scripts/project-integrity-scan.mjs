#!/usr/bin/env node
/**
 * eh-universe-web — 프로젝트 무결성 스캔
 * 미배선: PANEL_REGISTRY ↔ panelPropsMap, 아이콘 ↔ LUCIDE_MAP
 * 미구현: TODO/FIXME, not implemented 패턴
 * 미연결: PanelImports.ts export ↔ PanelImports 사용처 (경고 수준)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const FAIL_ON_UNWIRED = process.argv.includes("--fail-on-unwired");

// ============================================================
// PART 1 — FS helpers
// ============================================================

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function walkSrcFiles(baseRel, out) {
  const base = path.join(ROOT, baseRel);
  if (!fs.existsSync(base)) return;
  const skipDir = (n) =>
    n === "node_modules" ||
    n === ".next" ||
    n === "dist" ||
    n === ".git" ||
    n === "coverage";

  function walk(dir) {
    for (const name of fs.readdirSync(dir)) {
      const p = path.join(dir, name);
      const st = fs.statSync(p);
      if (st.isDirectory()) {
        if (skipDir(name)) continue;
        walk(p);
      } else if (/\.(ts|tsx)$/.test(name) && !name.endsWith(".d.ts")) {
        out.push(p);
      }
    }
  }
  walk(base);
}

// ============================================================
// PART 2 — Panel registry vs right-panel renderer (미배선)
// ============================================================

function extractRegistryPanelIds() {
  const text = read("src/lib/code-studio/core/panel-registry.ts");
  const rows = text.split("\n");
  const inArray = [];
  let inside = false;
  for (const line of rows) {
    if (line.includes("export const PANEL_REGISTRY")) inside = true;
    if (inside && line.includes("] as const")) break;
    if (inside && /id:\s*"/.test(line)) {
      const m = line.match(/id:\s*"([^"]+)"/);
      if (m) inArray.push(m[1]);
    }
  }
  return inArray;
}

function extractPanelStatusById() {
  const text = read("src/lib/code-studio/core/panel-registry.ts");
  const map = new Map();
  for (const line of text.split("\n")) {
    const idm = line.match(/id:\s*"([^"]+)"/);
    const st = line.match(/status:\s*"([^"]+)"/);
    if (idm && st) map.set(idm[1], st[1]);
  }
  return map;
}

function extractRendererKeys() {
  const text = read("src/components/code-studio/CodeStudioPanelManager.tsx");
  const keys = new Set();
  const re = /^\s+"([a-z0-9-]+)":\s*\(\)\s*=>/gm;
  let m;
  while ((m = re.exec(text)) !== null) keys.add(m[1]);
  return keys;
}

function extractLucideMapKeys() {
  const text = read("src/components/code-studio/CodeStudioPanelManager.tsx");
  const block = text.match(/const LUCIDE_MAP[^=]*=\s*\{([^}]+)\}/s);
  if (!block) return new Set();
  const keys = new Set();
  const re = /\b([A-Z][a-zA-Z0-9]*)\b/g;
  let m;
  while ((m = re.exec(block[1])) !== null) keys.add(m[1]);
  return keys;
}

function extractRegistryIcons() {
  const text = read("src/lib/code-studio/core/panel-registry.ts");
  const icons = new Map();
  for (const line of text.split("\n")) {
    const idm = line.match(/id:\s*"([^"]+)"/);
    const ic = line.match(/icon:\s*"([^"]+)"/);
    if (idm && ic) icons.set(idm[1], ic[1]);
  }
  return icons;
}

// ============================================================
// PART 3 — Stub / TODO scan (미구현)
// ============================================================

function isRealTodoFixmeComment(line) {
  const t = line.trim();
  if (/^\/{2,}/.test(t)) {
    const after = t.replace(/^\/+\s*/, "");
    if (/^(TODO|FIXME)\b/i.test(after)) return "TODO/FIXME line comment";
    if (/\b(TODO|FIXME)\b/i.test(after) && !/regex:|pattern:\s*[/]|\.test\s*\(\s*[/]/.test(line))
      return "TODO/FIXME in // comment";
  }
  if (/^\*/.test(t) || /^\/{2}\s*\*/.test(t)) {
    if (/\b(TODO|FIXME)\b/i.test(t)) return "TODO/FIXME block comment";
  }
  return null;
}

function scanImplementationSignals(files) {
  const hits = [];
  for (const abs of files) {
    const rel = path.relative(ROOT, abs).replace(/\\/g, "/");
    if (rel.includes("__tests__") || rel.endsWith(".test.ts") || rel.endsWith(".test.tsx"))
      continue;
    if (rel.startsWith("src/cli/")) continue;
    let content;
    try {
      content = fs.readFileSync(abs, "utf8");
    } catch {
      continue;
    }
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes("@ts-expect-error") || line.includes("@ts-ignore")) continue;

      const todoKind = isRealTodoFixmeComment(line);
      if (todoKind) {
        hits.push({ file: rel, line: i + 1, rule: todoKind, text: line.trim().slice(0, 140) });
        continue;
      }

      if (/throw\s+new\s+Error\s*\(\s*['"`][^'"`]*not\s+implemented/i.test(line)) {
        hits.push({ file: rel, line: i + 1, rule: "throw not implemented", text: line.trim().slice(0, 140) });
        continue;
      }
      if (/\bnotImplemented\b|\bNOT_IMPLEMENTED\b/.test(line)) {
        hits.push({ file: rel, line: i + 1, rule: "NotImplemented symbol", text: line.trim().slice(0, 140) });
      }
    }
  }
  return hits;
}

// ============================================================
// PART 4 — PanelImports: exported names vs lazy usage (미연결 힌트)
// ============================================================

function extractPanelImportExports() {
  const text = read("src/components/code-studio/PanelImports.ts");
  const exported = new Set();
  const re = /export\s+(?:function|const|class)\s+([A-Za-z0-9_]+)/g;
  let m;
  while ((m = re.exec(text)) !== null) exported.add(m[1]);
  return exported;
}

function countImportUsage(componentName, searchFiles) {
  let n = 0;
  const needle = new RegExp(`\\b${componentName}\\b`);
  for (const abs of searchFiles) {
    if (abs.replace(/\\/g, "/").endsWith("PanelImports.ts")) continue;
    try {
      const t = fs.readFileSync(abs, "utf8");
      if (needle.test(t)) n++;
    } catch {
      /* skip */
    }
  }
  return n;
}

// ============================================================
// PART 5 — Report & exit
// ============================================================

function main() {
  console.log("=== eh-universe-web / project-integrity-scan ===\n");
  console.log(`ROOT: ${ROOT}\n`);

  const registryIds = extractRegistryPanelIds();
  const statusById = extractPanelStatusById();
  const rendererKeys = extractRendererKeys();
  const lucideKeys = extractLucideMapKeys();
  const iconByPanel = extractRegistryIcons();

  const registrySet = new Set(registryIds);
  const unwired = registryIds.filter((id) => !rendererKeys.has(id));
  const orphanRenderers = [...rendererKeys].filter((k) => !registrySet.has(k));

  console.log("## 1) 미배선 — PANEL_REGISTRY → panelPropsMap");
  console.log(`   레지스트리 패널 수: ${registryIds.length}`);
  console.log(`   panelPropsMap 키 수: ${rendererKeys.size}`);
  if (unwired.length === 0) {
    console.log("   ✓ 모든 레지스트리 ID에 렌더러가 연결됨.\n");
  } else {
    console.log(`   ✗ 렌더러 없음 (${unwired.length}):`);
    for (const id of unwired) {
      const st = statusById.get(id) ?? "?";
      console.log(`      - ${id}  (status=${st})`);
    }
    console.log("");
  }

  console.log("## 2) 미배선 — Activity Bar 아이콘 (LUCIDE_MAP)");
  const missingLucide = [];
  for (const [pid, icon] of iconByPanel) {
    if (!lucideKeys.has(icon)) missingLucide.push({ pid, icon });
  }
  if (missingLucide.length === 0) {
    console.log("   ✓ 모든 레지스트리 icon 문자열이 LUCIDE_MAP에 존재.\n");
  } else {
    console.log(`   △ 고급 패널에서 아이콘 폴백 가능 (${missingLucide.length}):`);
    for (const { pid, icon } of missingLucide.slice(0, 24)) {
      console.log(`      - panel=${pid} icon="${icon}"`);
    }
    if (missingLucide.length > 24) console.log(`      ... 외 ${missingLucide.length - 24}건`);
    console.log("");
  }

  if (orphanRenderers.length > 0) {
    console.log("## (참고) panelPropsMap 전용 키 (레지스트리에 없음)");
    for (const k of orphanRenderers) console.log(`   - ${k}`);
    console.log("");
  }

  const srcFiles = [];
  walkSrcFiles("src", srcFiles);
  const stubHits = scanImplementationSignals(srcFiles);
  console.log("## 3) 미구현 힌트 — TODO / FIXME / not-implemented (src/cli 제외)");
  console.log(`   대상 파일 수: ${srcFiles.filter((f) => !f.replace(/\\/g, "/").includes("/cli/")).length}, 히트: ${stubHits.length}`);
  for (const h of stubHits.slice(0, 40)) {
    console.log(`   ${h.file}:${h.line} [${h.rule}] ${h.text}`);
  }
  if (stubHits.length > 40) console.log(`   ... 외 ${stubHits.length - 40}건\n`);
  else console.log("");

  console.log("## 4) 미연결 힌트 — PanelImports export가 다른 파일에서 미사용");
  const exports = extractPanelImportExports();
  const unusedExports = [];
  for (const name of exports) {
    if (name === "default") continue;
    const c = countImportUsage(name, srcFiles);
    if (c === 0) unusedExports.push(name);
  }
  unusedExports.sort();
  if (unusedExports.length === 0) {
    console.log("   ✓ (휴리스틱) 미사용 export 없음.\n");
  } else {
    console.log(`   △ ${unusedExports.length}개 export가 PanelImports.ts 밖에서 참조되지 않음:`);
    console.log(`      ${unusedExports.slice(0, 30).join(", ")}${unusedExports.length > 30 ? " ..." : ""}\n`);
  }

  console.log("---");
  console.log(
    `요약: 미배선(렌더러) ${unwired.length}건, LUCIDE 누락 ${missingLucide.length}건, 구현힌트 ${stubHits.length}건(src/cli 제외), PanelImports 미참조 ${unusedExports.length}건`,
  );
  if (FAIL_ON_UNWIRED && unwired.length > 0) {
    console.log("(종료 코드 1: --fail-on-unwired)");
    process.exit(1);
  }
  process.exit(0);
}

main();
