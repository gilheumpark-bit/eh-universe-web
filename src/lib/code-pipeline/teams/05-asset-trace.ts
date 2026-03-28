// ============================================================
// Team 05: Asset-Trace — Dependency Graph & Circular Detection
// ============================================================

import type { TeamResult, Finding, Suggestion, PipelineContext } from "../types";

// ── Import/Export Parsing ──

interface ImportInfo {
  line: number;
  source: string;        // module path
  names: string[];       // imported names
  isDefault: boolean;
  isExternal: boolean;   // starts with non-relative path
}

interface ExportInfo {
  line: number;
  name: string;
  isDefault: boolean;
  isReExport: boolean;
}

function parseImports(code: string): ImportInfo[] {
  const lines = code.split("\n");
  const imports: ImportInfo[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // ES import
    const esMatch = line.match(/^import\s+(?:(?:(\w+)(?:\s*,\s*)?)?(?:\{([^}]+)\})?\s+from\s+)?["']([^"']+)["']/);
    if (esMatch) {
      const defaultName = esMatch[1];
      const namedStr = esMatch[2];
      const source = esMatch[3];
      const names: string[] = [];
      if (defaultName) names.push(defaultName);
      if (namedStr) {
        names.push(...namedStr.split(",").map((n) => {
          const parts = n.trim().split(/\s+as\s+/);
          return parts[parts.length - 1].trim();
        }).filter(Boolean));
      }
      const isExternal = !source.startsWith(".") && !source.startsWith("/") && !source.startsWith("@/");
      imports.push({ line: i + 1, source, names, isDefault: !!defaultName, isExternal });
      continue;
    }

    // Side-effect import
    const sideEffect = line.match(/^import\s+["']([^"']+)["']/);
    if (sideEffect) {
      imports.push({ line: i + 1, source: sideEffect[1], names: [], isDefault: false, isExternal: !sideEffect[1].startsWith(".") });
      continue;
    }

    // Dynamic import
    const dynamicMatch = line.match(/(?:import|require)\s*\(\s*["']([^"']+)["']\s*\)/);
    if (dynamicMatch) {
      imports.push({ line: i + 1, source: dynamicMatch[1], names: ["*dynamic*"], isDefault: false, isExternal: !dynamicMatch[1].startsWith(".") });
      continue;
    }

    // CommonJS require
    const cjsMatch = line.match(/(?:const|let|var)\s+(?:(\w+)|\{([^}]+)\})\s*=\s*require\s*\(\s*["']([^"']+)["']\s*\)/);
    if (cjsMatch) {
      const defaultName = cjsMatch[1];
      const namedStr = cjsMatch[2];
      const source = cjsMatch[3];
      const names: string[] = [];
      if (defaultName) names.push(defaultName);
      if (namedStr) names.push(...namedStr.split(",").map((n) => n.trim()).filter(Boolean));
      imports.push({ line: i + 1, source, names, isDefault: !!defaultName, isExternal: !source.startsWith(".") });
    }
  }

  return imports;
}

function parseExports(code: string): ExportInfo[] {
  const lines = code.split("\n");
  const exports: ExportInfo[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Named export
    const namedMatch = line.match(/^export\s+(?:const|let|var|function|class|interface|type|enum)\s+(\w+)/);
    if (namedMatch) {
      exports.push({ line: i + 1, name: namedMatch[1], isDefault: false, isReExport: false });
      continue;
    }

    // Default export
    if (/^export\s+default\b/.test(line)) {
      const nameMatch = line.match(/export\s+default\s+(?:function|class)\s+(\w+)/);
      exports.push({ line: i + 1, name: nameMatch?.[1] ?? "default", isDefault: true, isReExport: false });
      continue;
    }

    // Re-export
    if (/^export\s+\{/.test(line) && /from\s+["']/.test(line)) {
      const names = line.match(/\{([^}]+)\}/)?.[1]?.split(",").map((n) => n.trim().split(/\s+as\s+/).pop()?.trim() ?? "") ?? [];
      for (const name of names) {
        if (name) exports.push({ line: i + 1, name, isDefault: false, isReExport: true });
      }
    }
  }

  return exports;
}

// ── Dependency Graph ──

interface DepGraph {
  internal: Map<string, string[]>;  // module → [dependencies]
  external: Set<string>;
  circular: string[][];             // detected cycles
}

// ── Path Alias Resolution ──

function resolvePathAlias(source: string): string {
  // Resolve @/ paths to src/ for accurate tracking
  if (source.startsWith("@/")) {
    return "src/" + source.slice(2);
  }
  // Resolve ~/ paths (used in some setups)
  if (source.startsWith("~/")) {
    return "src/" + source.slice(2);
  }
  return source;
}

// ── Circular Dependency Detection (DFS-based) ──

function detectCircularDeps(adjacency: Map<string, string[]>): string[][] {
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const recStack = new Set<string>();
  const path: string[] = [];

  function dfs(node: string): void {
    visited.add(node);
    recStack.add(node);
    path.push(node);

    const neighbors = adjacency.get(node) ?? [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        dfs(neighbor);
      } else if (recStack.has(neighbor)) {
        // Found a cycle — extract cycle from path
        const cycleStart = path.indexOf(neighbor);
        if (cycleStart !== -1) {
          const cycle = path.slice(cycleStart).concat(neighbor);
          cycles.push(cycle);
        }
      }
    }

    path.pop();
    recStack.delete(node);
  }

  for (const node of adjacency.keys()) {
    if (!visited.has(node)) {
      dfs(node);
    }
  }

  return cycles;
}

// ── Dependency Graph Traversal (BFS for transitive deps) ──

function findAllTransitiveDeps(adjacency: Map<string, string[]>, startNode: string): Set<string> {
  const visited = new Set<string>();
  const queue: string[] = [startNode];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);

    const neighbors = adjacency.get(current) ?? [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        queue.push(neighbor);
      }
    }
  }

  visited.delete(startNode); // exclude self
  return visited;
}

// ── Bundle Impact Analysis ──

const COMMON_PACKAGE_SIZES_KB: Record<string, number> = {
  react: 40,
  "react-dom": 120,
  lodash: 72,
  moment: 290,
  axios: 14,
  express: 55,
  "date-fns": 30,
  underscore: 25,
  jquery: 90,
  d3: 240,
  "three": 150,
  "next": 80,
  vue: 63,
  angular: 170,
  rxjs: 45,
  "styled-components": 35,
  emotion: 20,
  "tailwindcss": 15,
  zod: 12,
  "framer-motion": 110,
  "@tanstack/react-query": 38,
  swr: 10,
  "react-router": 22,
  "react-router-dom": 25,
  dayjs: 7,
  luxon: 22,
  immer: 8,
  zustand: 5,
  redux: 10,
  "@reduxjs/toolkit": 35,
};

interface BundleImpact {
  totalEstimatedKB: number;
  packages: { name: string; estimatedKB: number; known: boolean }[];
  heavyPackages: string[];   // packages > 50KB
}

function analyzeBundleImpact(externalDeps: Set<string>): BundleImpact {
  const DEFAULT_UNKNOWN_KB = 20;
  const packages: BundleImpact["packages"] = [];
  let totalEstimatedKB = 0;
  const heavyPackages: string[] = [];

  for (const dep of externalDeps) {
    const knownSize = COMMON_PACKAGE_SIZES_KB[dep];
    const estimatedKB = knownSize ?? DEFAULT_UNKNOWN_KB;
    const known = knownSize !== undefined;
    packages.push({ name: dep, estimatedKB, known });
    totalEstimatedKB += estimatedKB;
    if (estimatedKB > 50) {
      heavyPackages.push(`${dep} (~${estimatedKB}KB)`);
    }
  }

  return { totalEstimatedKB, packages, heavyPackages };
}

// ── Unused Dependencies Detection ──

function findUnusedDependencies(code: string, imports: ImportInfo[]): Finding[] {
  const findings: Finding[] = [];

  // Look for package.json dependencies declared in code comments or embedded JSON
  const pkgJsonMatch = code.match(/"dependencies"\s*:\s*\{([^}]+)\}/);
  if (pkgJsonMatch) {
    const declaredDeps = pkgJsonMatch[1]
      .split(",")
      .map((d) => d.trim().match(/"([^"]+)"/)?.[1])
      .filter(Boolean) as string[];

    const importedExternal = new Set(
      imports.filter((i) => i.isExternal).map((i) => {
        // Normalize scoped packages: @scope/pkg -> @scope/pkg
        const parts = i.source.split("/");
        return i.source.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
      })
    );

    for (const dep of declaredDeps) {
      if (!importedExternal.has(dep)) {
        findings.push({
          severity: "minor",
          message: `package.json에 선언된 '${dep}'가 코드에서 import 되지 않음`,
          rule: "UNUSED_DEPENDENCY",
        });
      }
    }
  }

  return findings;
}

function buildDependencyGraph(imports: ImportInfo[]): DepGraph {
  const internal = new Map<string, string[]>();
  const external = new Set<string>();

  for (const imp of imports) {
    if (imp.isExternal) {
      external.add(imp.source);
    } else {
      const current = "current_file";
      const resolved = resolvePathAlias(imp.source);
      const deps = internal.get(current) ?? [];
      deps.push(resolved);
      internal.set(current, deps);
    }
  }

  // Detect circular dependencies using DFS
  const circular = detectCircularDeps(internal);

  return { internal, external, circular };
}

// ── Unused Import Detection ──

function findUnusedImports(code: string, imports: ImportInfo[]): Finding[] {
  const findings: Finding[] = [];
  const codeAfterImports = code.split("\n").slice(
    Math.max(...imports.map((i) => i.line), 0)
  ).join("\n");

  for (const imp of imports) {
    for (const name of imp.names) {
      if (name === "*dynamic*") continue;
      // Check if the imported name is used in the rest of the code
      const regex = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`);
      if (!regex.test(codeAfterImports)) {
        findings.push({
          severity: "minor",
          message: `미사용 import: '${name}' from '${imp.source}'`,
          line: imp.line,
          rule: "UNUSED_IMPORT",
        });
      }
    }
  }

  return findings;
}

// ── Unused Export Detection ──

function findUnusedExports(code: string, exports: ExportInfo[]): Finding[] {
  // In a single-file context, we can only flag exports that are never referenced internally
  // This is a conservative check — in a multi-file project, exports may be used elsewhere
  const findings: Finding[] = [];

  for (const exp of exports) {
    if (exp.isDefault || exp.isReExport) continue;
    // Count references excluding the export line itself
    const lines = code.split("\n");
    let refCount = 0;
    for (let i = 0; i < lines.length; i++) {
      if (i + 1 === exp.line) continue;
      if (new RegExp(`\\b${exp.name}\\b`).test(lines[i])) refCount++;
    }
    if (refCount === 0) {
      findings.push({
        severity: "info",
        message: `export '${exp.name}'는 파일 내에서 참조되지 않음 (외부 사용 확인 필요)`,
        line: exp.line,
        rule: "POTENTIALLY_UNUSED_EXPORT",
      });
    }
  }

  return findings;
}

// ── Main ──

export function runAssetTrace(ctx: PipelineContext): TeamResult {
  const start = performance.now();
  const findings: Finding[] = [];
  const suggestions: Suggestion[] = [];

  const imports = parseImports(ctx.code);
  const exports = parseExports(ctx.code);
  const graph = buildDependencyGraph(imports);

  // Unused imports
  findings.push(...findUnusedImports(ctx.code, imports));

  // Unused exports
  findings.push(...findUnusedExports(ctx.code, exports));

  // Unused dependencies (cross-reference imports vs package.json)
  findings.push(...findUnusedDependencies(ctx.code, imports));

  // Circular dependency detection
  if (graph.circular.length > 0) {
    for (const cycle of graph.circular) {
      findings.push({
        severity: "major",
        message: `순환 의존성 발견: ${cycle.join(" → ")}`,
        rule: "CIRCULAR_DEPENDENCY",
      });
    }
    suggestions.push({ type: "refactor", message: `순환 의존성 ${graph.circular.length}건 — 의존 방향 정리 필요` });
  }

  // Transitive dependency analysis
  const transitiveDeps = findAllTransitiveDeps(graph.internal, "current_file");

  // Bundle impact analysis
  const bundleImpact = analyzeBundleImpact(graph.external);

  if (bundleImpact.heavyPackages.length > 0) {
    findings.push({
      severity: "minor",
      message: `대형 패키지 사용: ${bundleImpact.heavyPackages.join(", ")}`,
      rule: "HEAVY_BUNDLE_PACKAGE",
    });
    suggestions.push({
      type: "optimize",
      message: `번들 크기 예상 ~${bundleImpact.totalEstimatedKB}KB — 트리 쉐이킹 또는 대체 라이브러리 검토`,
    });
  }

  if (bundleImpact.totalEstimatedKB > 500) {
    findings.push({
      severity: "major",
      message: `예상 번들 크기 ${bundleImpact.totalEstimatedKB}KB 초과 — 최적화 필요`,
      rule: "BUNDLE_SIZE_WARNING",
    });
  }

  // Path alias resolution info
  const aliasedImports = imports.filter((i) => i.source.startsWith("@/") || i.source.startsWith("~/"));
  if (aliasedImports.length > 0) {
    suggestions.push({
      type: "style",
      message: `경로 별칭 ${aliasedImports.length}건 해석됨 (@/ → src/)`,
    });
  }

  // Metrics
  const internalCount = imports.filter((i) => !i.isExternal).length;
  const externalCount = graph.external.size;
  const totalExports = exports.length;
  const reExports = exports.filter((e) => e.isReExport).length;

  // Suggestions
  if (externalCount > 15) {
    suggestions.push({ type: "optimize", message: `외부 의존성 ${externalCount}개 — 번들 크기 확인 권장` });
  }
  if (imports.some((i) => i.names.includes("*dynamic*"))) {
    suggestions.push({ type: "optimize", message: "동적 import 사용 — 코드 스플리팅 확인" });
  }
  if (transitiveDeps.size > 20) {
    suggestions.push({ type: "refactor", message: `전이 의존성 ${transitiveDeps.size}개 — 모듈 구조 단순화 권장` });
  }

  const score = Math.max(0, 100
    - findings.filter((f) => f.severity === "major").length * 15
    - findings.filter((f) => f.severity === "minor").length * 5
    - findings.filter((f) => f.severity === "info").length * 2
    - graph.circular.length * 20
  );

  return {
    team: "asset-trace",
    status: score >= 80 ? "pass" : score >= 50 ? "warn" : "fail",
    score,
    message: `import: 내부${internalCount}/외부${externalCount} | export: ${totalExports}(re:${reExports}) | 번들: ~${bundleImpact.totalEstimatedKB}KB | 순환: ${graph.circular.length} | ${findings.length}건`,
    findings,
    suggestions,
    durationMs: Math.round(performance.now() - start),
  };
}
