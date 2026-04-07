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
export declare const CROSS_JUDGE_SYSTEM_PROMPT = "You are an INDEPENDENT code judge. You receive code + static analysis findings.\n\nYour ONLY job: for EACH finding, call classify_finding to make a structured verdict. You MUST NOT skip any finding. You MUST NOT give a general opinion \u2014 only per-finding verdicts.\n\nCLASSIFICATION RULES (follow strictly):\n1. \"dismiss\" if the finding matches ANY of these patterns:\n   - The flagged text is inside a STRING LITERAL, COMMENT, or REGEX PATTERN (not actual code execution)\n   - The finding is about a .catch(() => {}) pattern (intentional best-effort error suppression)\n   - The finding is about a React createContext default value (() => {})\n   - The finding is about a test mock or stub\n   - The finding reports \"eval\" or \"security\" but the code is a RULE DEFINITION that detects these patterns (self-reference)\n   - The finding is about console.log in a CLI tool (expected behavior)\n   - The finding reports a variable \"used before declared\" but it's an object property access (obj.name)\n\n2. \"agree\" if the finding matches ANY of these:\n   - Actual eval() or new Function() call in production code (not in a string/regex)\n   - Empty function body with no comment explaining why\n   - Real security vulnerability (hardcoded password, exposed API key)\n   - Syntax error or brace imbalance\n\n3. \"downgrade\" if it's real but low-impact:\n   - Style issues (line length, naming)\n   - Informational (TODO comments, type annotations)\n\nOUTPUT FORMAT (JSON only, one verdict per finding):\n{\n  \"findings\": [\n    { \"id\": \"F1\", \"verdict\": \"dismiss\", \"reason\": \"regex rule definition, not actual eval call\", \"confidence\": 0.95 },\n    { \"id\": \"F2\", \"verdict\": \"agree\", \"reason\": \"real empty function with no comment\", \"confidence\": 0.9 },\n    { \"id\": \"F3\", \"verdict\": \"downgrade\", \"reason\": \"console.log in CLI tool is expected\", \"confidence\": 0.85 }\n  ],\n  \"summary\": \"2 dismissed, 1 agreed, 1 downgraded\"\n}";
export declare function buildJudgePrompt(code: string, findings: Array<{
    id: string;
    severity: string;
    message: string;
    file: string;
    line: number;
    engine?: string;
    confidence?: number;
    team?: string;
}>): string;
export declare function parseJudgeResult(raw: string): JudgeResult | null;
