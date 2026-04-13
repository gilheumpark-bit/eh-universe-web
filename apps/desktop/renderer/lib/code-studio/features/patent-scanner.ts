/**
 * Patent-related scanning for commercial compliance.
 * Scans source code for known patent-encumbered patterns and license risks.
 */
import type { FileNode } from "@/lib/code-studio/core/types";

// Known patent-sensitive keywords and algorithm names
const PATENT_KEYWORDS: string[] = [
  "RSA", "AES", "DES", "Diffie-Hellman", "elliptic curve",
  "LZW", "GIF compression", "MP3 decoding",
  "HEVC", "H.265", "H.264", "AAC",
  "MPEG", "JPEG 2000", "WebP",
  "FAT32", "exFAT",
  "PageRank", "MapReduce",
  "shadow DOM", "virtual DOM patent",
];

const RISKY_LICENSE_PATTERNS = [
  /AGPL/i, /GPL-3/i, /SSPL/i, /BSL/i, /BUSL/i,
  /Commons\s*Clause/i, /Server\s*Side\s*Public/i,
];

export function listPatentKeywords(): string[] {
  return [...PATENT_KEYWORDS];
}

export function scanForPatentRisk(source: string): { hits: number; matched: string[] } {
  const matched: string[] = [];
  const lower = source.toLowerCase();
  for (const kw of PATENT_KEYWORDS) {
    if (lower.includes(kw.toLowerCase())) {
      matched.push(kw);
    }
  }
  return { hits: matched.length, matched };
}

export interface IPReport {
  licenses: Array<{ file: string; license: string; risk: "high" | "medium" | "low" }>;
  patterns: Array<{ file: string; keyword: string; line: number }>;
  score: number;
  grade: string;
  summary: string;
  recommendations: string[];
}

function scanFileContent(filePath: string, content: string): {
  patents: Array<{ file: string; keyword: string; line: number }>;
  licenses: Array<{ file: string; license: string; risk: "high" | "medium" | "low" }>;
} {
  const patents: Array<{ file: string; keyword: string; line: number }> = [];
  const licenses: Array<{ file: string; license: string; risk: "high" | "medium" | "low" }> = [];

  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const kw of PATENT_KEYWORDS) {
      if (line.toLowerCase().includes(kw.toLowerCase())) {
        patents.push({ file: filePath, keyword: kw, line: i + 1 });
      }
    }
    for (const re of RISKY_LICENSE_PATTERNS) {
      const m = line.match(re);
      if (m) {
        licenses.push({ file: filePath, license: m[0], risk: "high" });
      }
    }
  }

  return { patents, licenses };
}

function collectFileContents(nodes: FileNode[]): Array<{ path: string; content: string }> {
  const results: Array<{ path: string; content: string }> = [];
  for (const node of nodes) {
    if (node.type === "file" && node.content) {
      results.push({ path: node.path ?? node.name, content: node.content });
    }
    if (node.children) {
      results.push(...collectFileContents(node.children));
    }
  }
  return results;
}

export function scanProject(files: FileNode[]): IPReport {
  const allFiles = collectFileContents(files);
  const allPatterns: IPReport["patterns"] = [];
  const allLicenses: IPReport["licenses"] = [];

  for (const f of allFiles) {
    const result = scanFileContent(f.path, f.content);
    allPatterns.push(...result.patents);
    allLicenses.push(...result.licenses);
  }

  const highRiskCount = allLicenses.filter((l) => l.risk === "high").length;
  const patentHits = allPatterns.length;

  // Score: 100 = clean, deduct per finding
  const rawScore = Math.max(0, 100 - highRiskCount * 20 - patentHits * 5);
  const grade =
    rawScore >= 90 ? "A" :
    rawScore >= 70 ? "B" :
    rawScore >= 50 ? "C" : "D";

  const recommendations: string[] = [];
  if (highRiskCount > 0) recommendations.push(`${highRiskCount} high-risk license(s) detected — review AGPL/GPL dependencies.`);
  if (patentHits > 0) recommendations.push(`${patentHits} patent-sensitive pattern(s) found — verify commercial use rights.`);
  if (recommendations.length === 0) recommendations.push("No IP risks detected.");

  return {
    licenses: allLicenses,
    patterns: allPatterns,
    score: rawScore,
    grade,
    summary: `Scanned ${allFiles.length} files: ${patentHits} patent patterns, ${highRiskCount} license risks.`,
    recommendations,
  };
}
