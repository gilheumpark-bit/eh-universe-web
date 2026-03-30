// ============================================================
// Code Studio — Business Logic Evaluator
// ============================================================

import type { FileNode } from '../../code-studio-types';

// ============================================================
// PART 1 — Types
// ============================================================

export interface BusinessScore {
  overall: number;
  categories: {
    codeQuality: number;
    maintainability: number;
    scalability: number;
    marketReadiness: number;
    trendAlignment: number;
  };
  grade: 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
  summary: string;
  recommendations: string[];
}

export interface RequirementCoverage {
  requirement: string;
  covered: boolean;
  matchedFiles: string[];
  confidence: number;
}

export interface RiskItem {
  area: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  mitigation: string;
}

// IDENTITY_SEAL: PART-1 | role=types | inputs=none | outputs=BusinessScore,RequirementCoverage,RiskItem

// ============================================================
// PART 2 — File Analysis Helpers
// ============================================================

function flattenFiles(nodes: FileNode[], prefix = ''): Array<{ path: string; content: string }> {
  const out: Array<{ path: string; content: string }> = [];
  for (const n of nodes) {
    const p = prefix ? `${prefix}/${n.name}` : n.name;
    if (n.type === 'file' && n.content != null) out.push({ path: p, content: n.content });
    if (n.children) out.push(...flattenFiles(n.children, p));
  }
  return out;
}

function countPatterns(content: string, patterns: RegExp[]): number {
  return patterns.reduce((sum, re) => sum + (content.match(re)?.length ?? 0), 0);
}

// IDENTITY_SEAL: PART-2 | role=helpers | inputs=FileNode[] | outputs=flat files

// ============================================================
// PART 3 — Evaluation Engine
// ============================================================

export function evaluateProject(files: FileNode[]): BusinessScore {
  const flat = flattenFiles(files);
  const allContent = flat.map((f) => f.content).join('\n');
  const totalLines = allContent.split('\n').length;

  // Code quality signals
  const errorHandlers = countPatterns(allContent, [/try\s*\{/g, /\.catch\(/g, /catch\s*\(/g]);
  const typeAnnotations = countPatterns(allContent, [/:\s*(string|number|boolean|Record|Array)/g]);
  const tests = flat.filter((f) => /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(f.path)).length;

  // Maintainability signals
  const avgFileSize = totalLines / Math.max(flat.length, 1);
  const hasReadme = flat.some((f) => /readme/i.test(f.path));
  const hasConfig = flat.some((f) => /tsconfig|eslint|prettier/i.test(f.path));

  // Scalability signals
  const hasRouting = /router|Route|createBrowserRouter/i.test(allContent);
  const hasState = /useState|useReducer|zustand|redux|store/i.test(allContent);
  const hasApi = /fetch\(|axios|api\//i.test(allContent);

  const codeQuality = Math.min(100, Math.round(
    (errorHandlers * 3) + (typeAnnotations * 0.5) + (tests * 10),
  ));
  const maintainability = Math.min(100, Math.round(
    (avgFileSize < 200 ? 40 : avgFileSize < 400 ? 25 : 10) +
    (hasReadme ? 20 : 0) + (hasConfig ? 20 : 0) + (tests > 0 ? 20 : 0),
  ));
  const scalability = Math.min(100, Math.round(
    (hasRouting ? 30 : 0) + (hasState ? 30 : 0) + (hasApi ? 20 : 0) + (flat.length > 5 ? 20 : 10),
  ));
  const marketReadiness = Math.min(100, Math.round((codeQuality + maintainability + scalability) / 3));
  const trendAlignment = Math.min(100, Math.round(
    (typeAnnotations > 0 ? 30 : 0) + (hasRouting ? 25 : 0) + (tests > 0 ? 25 : 0) + 20,
  ));

  const overall = Math.round(
    codeQuality * 0.25 + maintainability * 0.25 + scalability * 0.2 +
    marketReadiness * 0.15 + trendAlignment * 0.15,
  );

  const grade: BusinessScore['grade'] =
    overall >= 90 ? 'S' : overall >= 80 ? 'A' : overall >= 65 ? 'B' :
    overall >= 50 ? 'C' : overall >= 30 ? 'D' : 'F';

  const recommendations: string[] = [];
  if (tests === 0) recommendations.push('Add unit tests to improve reliability');
  if (!hasConfig) recommendations.push('Add linting/formatting config');
  if (errorHandlers < 3) recommendations.push('Increase error handling coverage');
  if (avgFileSize > 300) recommendations.push('Split large files for maintainability');

  return {
    overall,
    categories: { codeQuality, maintainability, scalability, marketReadiness, trendAlignment },
    grade,
    summary: `Project scored ${overall}/100 (Grade ${grade}) across ${flat.length} files, ${totalLines} lines`,
    recommendations,
  };
}

// IDENTITY_SEAL: PART-3 | role=evaluation | inputs=FileNode[] | outputs=BusinessScore

// ============================================================
// PART 4 — Requirements Coverage
// ============================================================

export function checkRequirements(
  requirements: string[],
  files: FileNode[],
): RequirementCoverage[] {
  const flat = flattenFiles(files);
  return requirements.map((req) => {
    const keywords = req.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    const matchedFiles: string[] = [];
    let totalHits = 0;

    for (const f of flat) {
      const lower = f.content.toLowerCase();
      const hits = keywords.filter((kw) => lower.includes(kw)).length;
      if (hits > 0) {
        matchedFiles.push(f.path);
        totalHits += hits;
      }
    }

    const confidence = Math.min(1, totalHits / Math.max(keywords.length, 1));
    return {
      requirement: req,
      covered: confidence > 0.3,
      matchedFiles,
      confidence: Math.round(confidence * 100) / 100,
    };
  });
}

export function assessRisks(files: FileNode[]): RiskItem[] {
  const flat = flattenFiles(files);
  const allContent = flat.map((f) => f.content).join('\n');
  const risks: RiskItem[] = [];

  if (/eval\(/.test(allContent)) {
    risks.push({ area: 'Security', description: 'eval() usage detected', severity: 'critical', mitigation: 'Replace with safe alternatives' });
  }
  if (flat.filter((f) => /\.(test|spec)\./.test(f.path)).length === 0) {
    risks.push({ area: 'Quality', description: 'No test files found', severity: 'high', mitigation: 'Add unit/integration tests' });
  }
  if (flat.some((f) => f.content.split('\n').length > 500)) {
    risks.push({ area: 'Maintainability', description: 'Files exceeding 500 lines', severity: 'medium', mitigation: 'Split large modules' });
  }

  return risks;
}

// IDENTITY_SEAL: PART-4 | role=requirements+risks | inputs=requirements[],FileNode[] | outputs=RequirementCoverage[],RiskItem[]
