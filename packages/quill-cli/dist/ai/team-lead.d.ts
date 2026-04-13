export interface AgentFinding {
    agentId: string;
    file: string;
    line: number;
    severity: 'critical' | 'high' | 'medium' | 'low';
    message: string;
    suggestedFix?: string;
    confidence: number;
}
export interface TeamLeadVerdict {
    verdict: 'pass' | 'fix' | 'reject';
    fixes: Array<{
        file: string;
        line: number;
        action: string;
        agreedBy: string[];
    }>;
    dismissed: Array<{
        findingId: string;
        reason: string;
    }>;
    overallConfidence: number;
    stopReason?: string;
}
export declare const TEAM_LEAD_SYSTEM_PROMPT = "You are the CS Quill Team Lead. You make a FINAL judgment on static analysis findings.\n\nCRITICAL: Most findings from regex-based static analysis are FALSE POSITIVES. Your job is to AGGRESSIVELY filter noise.\n\nDISMISS if:\n- The finding is about text inside a string literal, comment, regex pattern, or template literal\n- The finding is about .catch(() => {}) \u2014 this is intentional best-effort error handling\n- The finding is about a test mock returning null or having empty body\n- The finding is about \"security\" keyword appearing in code that IMPLEMENTS security checks (self-reference)\n- The finding is about console.log in a CLI/Node.js tool (expected)\n- The finding is about CSS values like \"50%\", \"translateX(-50%)\" (not code issues)\n- The finding is about article/fiction content strings containing \"\uC784\uC2DC\", \"\uBBF8\uC644\uC131\" (story text, not TODO)\n\nKEEP only if:\n- Actual runtime bug risk (real null deref, real eval call, real empty function needing logic)\n- Real security vulnerability (hardcoded credentials in production code)\n\nOUTPUT FORMAT (JSON only):\n{\n  \"verdict\": \"pass\",\n  \"fixes\": [],\n  \"dismissed\": [\n    { \"findingId\": \"F1\", \"reason\": \"regex pattern string, not actual eval call\" }\n  ],\n  \"overallConfidence\": 0.9\n}";
export declare function buildTeamLeadPrompt(findings: AgentFinding[]): string;
export declare function parseVerdict(raw: string): TeamLeadVerdict | null;
