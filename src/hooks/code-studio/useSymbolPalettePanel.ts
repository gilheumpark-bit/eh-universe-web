// ============================================================
// Code Studio — Symbol Palette Sub-hook
// Derives symbols from active file content via regex patterns.
// ============================================================

import { useMemo } from "react";
import type { SymbolEntry } from "@/components/code-studio/SymbolPalette";

const SYMBOL_PATTERNS: Array<{ re: RegExp; kind: SymbolEntry["kind"] }> = [
  { re: /(?:export\s+)?(?:async\s+)?function\s+(\w+)/g, kind: "function" },
  { re: /(?:export\s+)?class\s+(\w+)/g, kind: "class" },
  { re: /(?:export\s+)?interface\s+(\w+)/g, kind: "interface" },
  { re: /(?:export\s+)?type\s+(\w+)\s*=/g, kind: "type" },
  { re: /(?:export\s+)?enum\s+(\w+)/g, kind: "enum" },
  { re: /(?:export\s+)?const\s+(\w+)\s*[=:]/g, kind: "const" },
  { re: /(?:export\s+)?(?:let|var)\s+(\w+)\s*[=:]/g, kind: "variable" },
  { re: /(\w+)\s*\([^)]*\)\s*\{/g, kind: "function" },
  { re: /def\s+(\w+)\s*\(/g, kind: "function" },
  { re: /class\s+(\w+)\s*[:(]/g, kind: "class" },
];

function extractSymbols(content: string, fileName: string): SymbolEntry[] {
  if (!content) return [];
  const symbols: SymbolEntry[] = [];
  const seen = new Set<string>();

  for (const { re, kind } of SYMBOL_PATTERNS) {
    const regex = new RegExp(re.source, re.flags);
    let match: RegExpExecArray | null;
    while ((match = regex.exec(content)) !== null) {
      const name = match[1];
      const key = `${kind}:${name}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const lineIdx = content.substring(0, match.index).split("\n").length;
      symbols.push({ name, kind, file: fileName, line: lineIdx });
    }
  }

  return symbols.sort((a, b) => (a.line ?? 0) - (b.line ?? 0));
}

/** Memoized symbol list derived from active file content. */
export function useSymbolPalettePanel(activeFileContent: string | null, activeFileName: string | null) {
  const symbols = useMemo(() => {
    if (!activeFileContent || !activeFileName) return [];
    return extractSymbols(activeFileContent, activeFileName);
  }, [activeFileContent, activeFileName]);

  return { symbols };
}
