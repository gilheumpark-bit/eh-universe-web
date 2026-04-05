// ============================================================
// CS Quill 🦔 — Cross-Model Judge (Independent Arbiter)
// ============================================================
// 생성 모델과 검증 모델의 결과를 독립적으로 판단하는 심판.
// 다른 모델이 크로스체크해서 오탐/정탐 분류.

// ============================================================
// PART 1 — Types
// ============================================================

export interface JudgeFinding {
  id: string;
  verdict: 'agree' | 'dismiss';
  reason: string;
  confidence: number;
}

export interface JudgeResult {
  findings: JudgeFinding[];
  overallAgreement: number;
  summary: string;
}

// IDENTITY_SEAL: PART-1 | role=types | inputs=none | outputs=JudgeFinding,JudgeResult

// ============================================================
// PART 2 — Cross-Model Judge System Prompt
// ============================================================

export const CROSS_JUDGE_SYSTEM_PROMPT = `You are an INDEPENDENT judge for CS Quill. You receive:
1. The generated code (from Model A)
2. Verification findings (from Model B)

Your job: independently assess whether each finding is VALID or FALSE POSITIVE.

RULES:
- You are a DIFFERENT model from both the generator and the verifier.
- Judge each finding ON ITS OWN MERIT. Do not defer to either model.
- If the finding is a real issue → "agree" with confidence 0.0-1.0
- If the finding is a false positive → "dismiss" with reason and confidence
- Be especially skeptical of:
  - Style-only complaints (naming, formatting) → dismiss unless genuinely confusing
  - Context-unaware warnings (e.g., "unused variable" that's used in next line)
  - Overly conservative null checks (e.g., value already validated upstream)
- Be especially strict about:
  - Security issues (XSS, injection, secrets) → always agree unless demonstrably safe
  - Null dereference on unvalidated external input → always agree
  - Empty function bodies / stub implementations → always agree

OUTPUT FORMAT (JSON only):
{
  "findings": [
    { "id": "A7-null-1", "verdict": "agree", "reason": "user from API can be null", "confidence": 0.95 },
    { "id": "A12-naming-3", "verdict": "dismiss", "reason": "project uses this convention per .eslintrc", "confidence": 0.82 }
  ],
  "overallAgreement": 0.73,
  "summary": "5 of 7 findings confirmed. 2 dismissed as false positives."
}`;

// IDENTITY_SEAL: PART-2 | role=system-prompt | inputs=none | outputs=CROSS_JUDGE_SYSTEM_PROMPT

// ============================================================
// PART 3 — Judge Prompt Builder
// ============================================================

export function buildJudgePrompt(
  code: string,
  findings: Array<{ id: string; severity: string; message: string; file: string; line: number }>,
): string {
  const lines: string[] = [
    '=== GENERATED CODE ===',
    '```',
    code.slice(0, 6000),
    '```',
    '',
    '=== VERIFICATION FINDINGS ===',
  ];

  for (const f of findings) {
    lines.push(`[${f.id}] ${f.severity.toUpperCase()} — ${f.file}:${f.line}`);
    lines.push(`  ${f.message}`);
  }

  lines.push('');
  lines.push(`Total: ${findings.length} findings. Judge each one.`);

  return lines.join('\n');
}

export function parseJudgeResult(raw: string): JudgeResult | null {
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    return JSON.parse(jsonMatch[0]) as JudgeResult;
  } catch {
    return null;
  }
}

// IDENTITY_SEAL: PART-3 | role=judge-prompt | inputs=code,findings | outputs=JudgeResult
