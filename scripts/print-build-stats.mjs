#!/usr/bin/env node
/**
 * .next 산출물 기준 청크 크기 요약 (빌드 성공 후 실행).
 * 사용: npm run build && npm run build:report
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const staticDir = path.join(root, ".next", "static");

function walkJsFiles(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walkJsFiles(p, acc);
    else if (name.endsWith(".js")) acc.push(p);
  }
  return acc;
}

function formatKb(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

const chunks = walkJsFiles(staticDir)
  .map((f) => ({ file: path.relative(root, f), bytes: fs.statSync(f).size }))
  .sort((a, b) => b.bytes - a.bytes);

const out = [];
out.push("=== EH Universe — build chunk report ===");
out.push(`Generated: ${new Date().toISOString()}`);
out.push(`Root: ${root}`);
out.push("");

if (chunks.length === 0) {
  out.push("No .js files under .next/static — run `npm run build` first.");
} else {
  out.push("Top 40 client chunks (by size):");
  out.push("");
  chunks.slice(0, 40).forEach((c, i) => {
    out.push(`${String(i + 1).padStart(2, " ")}  ${formatKb(c.bytes).padStart(10, " ")}  ${c.file}`);
  });
  const total = chunks.reduce((s, c) => s + c.bytes, 0);
  out.push("");
  out.push(`Total .js under .next/static: ${chunks.length} files, ${formatKb(total)}`);
}

const reportPath = path.join(root, "build-performance-report.txt");
fs.writeFileSync(reportPath, out.join("\n"), "utf8");
console.log(out.join("\n"));
console.log("");
console.log(`Wrote ${path.relative(root, reportPath)}`);
