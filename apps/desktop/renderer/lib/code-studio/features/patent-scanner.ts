/**
 * Patent-related scanning hooks (placeholder for commercial compliance tooling).
 */
import type { FileNode } from "@/lib/code-studio/core/types";

export function listPatentKeywords(): string[] {
  return [];
}

export function scanForPatentRisk(_source: string): { hits: number } {
  return { hits: 0 };
}

export interface IPReport {
  licenses: unknown[];
  patterns: unknown[];
  score: number;
  grade: string;
  summary: string;
  recommendations: string[];
}

/** Compatibility with @eh/quill-engine patent scanner name */
export function scanProject(_files: FileNode[]): IPReport {
  return {
    licenses: [],
    patterns: [],
    score: 100,
    grade: "A",
    summary: "",
    recommendations: [],
  };
}
