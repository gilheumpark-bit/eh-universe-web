/**
 * One-off: reads panel-registry.ts and emits CSV rows for inventory.
 * Run: node apps/desktop/scripts/gen-panel-inventory-csv.cjs
 */
const fs = require("node:fs");
const path = require("node:path");

/** Run from repo root: `node apps/desktop/scripts/gen-panel-inventory-csv.cjs` */
const root = path.join(process.cwd(), "apps/desktop");
const regPath = path.join(root, "renderer/lib/code-studio/core/panel-registry.ts");
const s = fs.readFileSync(regPath, "utf8");

const rows = [];
for (const line of s.split("\n")) {
  if (!line.trim().startsWith("{ id:")) continue;
  const id = line.match(/id: "([^"]+)"/)?.[1];
  const group = line.match(/group: "([^"]+)"/)?.[1];
  const status = line.match(/status: "([^"]+)"/)?.[1];
  if (!id || !group || !status) continue;
  const essential = line.includes("isEssential: true");
  rows.push({ id, group, status, essential });
}

const header =
  "id,group,status,essential,map_connected,panel_import_hint,verified_date,bottleneck_summary,improve_status,qa_status,last_functional_pass,notes";
const lines = [header];
for (const r of rows) {
  lines.push(
    [
      r.id,
      r.group,
      r.status,
      r.essential ? "yes" : "no",
      "yes",
      "see PanelImports.tsx + right-panel-branch.tsx",
      "",
      "",
      "pending",
      "pending",
      "",
      "",
    ].join(","),
  );
}

const out = path.join(root, "renderer/lib/code-studio/panel-performance-inventory.csv");
fs.writeFileSync(out, lines.join("\n") + "\n", "utf8");
console.log("Wrote", out, "rows", rows.length);
