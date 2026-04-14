// ============================================================
// PART 1 — Types (translation.ts chunkBySentences 패턴 차용)
// ============================================================

/**
 * MigrationAudit: 코드 마이그레이션 시 함수 손실 감지
 * translation.ts의 청크 비교 패턴에서 영감:
 * - 원본/번역문 청크 비교 → 원본/마이그레이션 함수 시그니처 비교
 */

export interface FunctionSignature {
  name: string;
  params: string;
  returnType: string;
  lineNumber: number;
  isExported: boolean;
  isAsync: boolean;
}

export interface FunctionMatch {
  original: FunctionSignature;
  migrated: FunctionSignature;
  confidence: number;  // 0-100
  nameMatch: boolean;
  paramMatch: boolean;
}

export interface MigrationAuditResult {
  matched: FunctionMatch[];
  lostFunctions: FunctionSignature[];
  newFunctions: FunctionSignature[];
  matchRate: number;       // 0-100
  summary: string;
}

// ============================================================
// PART 2 — Function Signature Extraction
// ============================================================

const _FUNC_PATTERNS = [
  // function declarations
  /^(\s*)(export\s+)?(async\s+)?function\s+(\w+)\s*\(([^)]*)\)(?:\s*:\s*([^\s{]+))?\s*\{/,
  // arrow functions assigned to const/let/var
  /^(\s*)(export\s+)?(const|let|var)\s+(\w+)\s*=\s*(async\s+)?\(([^)]*)\)(?:\s*:\s*([^\s=]+))?\s*=>/,
  // class methods
  /^(\s*)(public|private|protected|static|async|\s)*\s*(\w+)\s*\(([^)]*)\)(?:\s*:\s*([^\s{]+))?\s*\{/,
];

export function extractSignatures(code: string): FunctionSignature[] {
  const lines = code.split('\n');
  const signatures: FunctionSignature[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Pattern 1: function declaration
    const funcMatch = line.match(
      /^(\s*)(export\s+)?(async\s+)?function\s+(\w+)\s*\(([^)]*)\)(?:\s*:\s*([^\s{]+))?/,
    );
    if (funcMatch) {
      const name = funcMatch[4];
      if (!seen.has(name)) {
        seen.add(name);
        signatures.push({
          name,
          params: (funcMatch[5] ?? '').trim(),
          returnType: (funcMatch[6] ?? 'void').trim(),
          lineNumber: i + 1,
          isExported: !!funcMatch[2],
          isAsync: !!funcMatch[3],
        });
      }
      continue;
    }

    // Pattern 2: arrow function
    const arrowMatch = line.match(
      /^(\s*)(export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(async\s+)?\(([^)]*)\)(?:\s*:\s*([^\s=]+))?\s*=>/,
    );
    if (arrowMatch) {
      const name = arrowMatch[3];
      if (!seen.has(name)) {
        seen.add(name);
        signatures.push({
          name,
          params: (arrowMatch[5] ?? '').trim(),
          returnType: (arrowMatch[6] ?? 'void').trim(),
          lineNumber: i + 1,
          isExported: !!arrowMatch[2],
          isAsync: !!arrowMatch[4],
        });
      }
      continue;
    }

    // Pattern 3: class method (skip constructors)
    const methodMatch = line.match(
      /^\s+(?:public\s+|private\s+|protected\s+|static\s+)*(async\s+)?(\w+)\s*\(([^)]*)\)(?:\s*:\s*([^\s{]+))?\s*\{/,
    );
    if (methodMatch && methodMatch[2] !== 'constructor' && methodMatch[2] !== 'if' && methodMatch[2] !== 'for' && methodMatch[2] !== 'while') {
      const name = methodMatch[2];
      if (!seen.has(name)) {
        seen.add(name);
        signatures.push({
          name,
          params: (methodMatch[3] ?? '').trim(),
          returnType: (methodMatch[4] ?? 'void').trim(),
          lineNumber: i + 1,
          isExported: false,
          isAsync: !!methodMatch[1],
        });
      }
    }
  }

  return signatures;
}

// ============================================================
// PART 3 — Matching Engine
// ============================================================

function normalizeParams(params: string): string {
  return params
    .replace(/\s+/g, ' ')
    .replace(/:\s*[^,)]+/g, '')  // strip type annotations
    .trim();
}

function computeSimilarity(a: string, b: string): number {
  if (a === b) return 100;
  const la = a.toLowerCase();
  const lb = b.toLowerCase();
  if (la === lb) return 95;

  // Levenshtein-based similarity for short strings
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 100;

  let distance = 0;
  const matrix: number[][] = [];
  for (let i = 0; i <= a.length; i++) {
    matrix[i] = [i];
    for (let j = 1; j <= b.length; j++) {
      if (i === 0) { matrix[i][j] = j; continue; }
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
  }
  distance = matrix[a.length][b.length];

  return Math.round((1 - distance / maxLen) * 100);
}

function matchFunctions(
  origSigs: FunctionSignature[],
  migratedSigs: FunctionSignature[],
): { matches: FunctionMatch[]; unmatchedOrig: FunctionSignature[]; unmatchedMig: FunctionSignature[] } {
  const matches: FunctionMatch[] = [];
  const usedMigrated = new Set<number>();
  const matchedOriginal = new Set<number>();

  // Pass 1: exact name match
  for (let i = 0; i < origSigs.length; i++) {
    for (let j = 0; j < migratedSigs.length; j++) {
      if (usedMigrated.has(j)) continue;
      if (origSigs[i].name === migratedSigs[j].name) {
        const paramMatch =
          normalizeParams(origSigs[i].params) === normalizeParams(migratedSigs[j].params);
        matches.push({
          original: origSigs[i],
          migrated: migratedSigs[j],
          confidence: paramMatch ? 100 : 80,
          nameMatch: true,
          paramMatch,
        });
        usedMigrated.add(j);
        matchedOriginal.add(i);
        break;
      }
    }
  }

  // Pass 2: fuzzy name match for remaining
  for (let i = 0; i < origSigs.length; i++) {
    if (matchedOriginal.has(i)) continue;
    let bestJ = -1;
    let bestScore = 0;

    for (let j = 0; j < migratedSigs.length; j++) {
      if (usedMigrated.has(j)) continue;
      const sim = computeSimilarity(origSigs[i].name, migratedSigs[j].name);
      if (sim >= 60 && sim > bestScore) {
        bestScore = sim;
        bestJ = j;
      }
    }

    if (bestJ >= 0) {
      const paramMatch =
        normalizeParams(origSigs[i].params) === normalizeParams(migratedSigs[bestJ].params);
      matches.push({
        original: origSigs[i],
        migrated: migratedSigs[bestJ],
        confidence: Math.round(bestScore * (paramMatch ? 1 : 0.8)),
        nameMatch: false,
        paramMatch,
      });
      usedMigrated.add(bestJ);
      matchedOriginal.add(i);
    }
  }

  const unmatchedOrig = origSigs.filter((_, i) => !matchedOriginal.has(i));
  const unmatchedMig = migratedSigs.filter((_, j) => !usedMigrated.has(j));

  return { matches, unmatchedOrig, unmatchedMig };
}

// ============================================================
// PART 4 — Public API
// ============================================================

export function auditMigration(
  original: string,
  migrated: string,
): MigrationAuditResult {
  const origSigs = extractSignatures(original);
  const migratedSigs = extractSignatures(migrated);

  if (origSigs.length === 0 && migratedSigs.length === 0) {
    return {
      matched: [],
      lostFunctions: [],
      newFunctions: [],
      matchRate: 100,
      summary: 'No functions found in either file.',
    };
  }

  const { matches, unmatchedOrig, unmatchedMig } = matchFunctions(origSigs, migratedSigs);

  const matchRate = origSigs.length > 0
    ? Math.round((matches.length / origSigs.length) * 100)
    : 100;

  const parts: string[] = [
    `Original: ${origSigs.length} functions, Migrated: ${migratedSigs.length} functions.`,
    `Matched: ${matches.length} (${matchRate}%)`,
  ];
  if (unmatchedOrig.length > 0) {
    parts.push(`Lost: ${unmatchedOrig.map((f) => f.name).join(', ')}`);
  }
  if (unmatchedMig.length > 0) {
    parts.push(`New: ${unmatchedMig.map((f) => f.name).join(', ')}`);
  }

  return {
    matched: matches,
    lostFunctions: unmatchedOrig,
    newFunctions: unmatchedMig,
    matchRate,
    summary: parts.join(' | '),
  };
}

// IDENTITY_SEAL: migration-audit | role=MigrationLossDetector | inputs=original+migrated | outputs=MigrationAuditResult
