export interface Evidence {
    type: 'lint' | 'ast' | 'fuzz' | 'perf' | 'security' | 'deep-verify';
    source: string;
    data: Record<string, unknown>;
    score: number;
    findings: string[];
}
export interface AgentOpinion {
    agentId: string;
    model: string;
    verdict: 'approve' | 'reject' | 'fix-required';
    confidence: number;
    evidence: Evidence[];
    critiques: string[];
    suggestedFixes: string[];
}
export interface ArenaResult {
    code: string;
    opinions: AgentOpinion[];
    consensus: 'approved' | 'rejected' | 'fixed';
    finalCode: string;
    rounds: number;
    evidenceScore: number;
    teamLeadVerdict: string;
}
export declare function collectEvidence(code: string, fileName: string): Promise<Evidence[]>;
export declare function getAgentOpinion(code: string, evidence: Evidence[], agentRole: 'attacker' | 'defender' | 'judge'): Promise<AgentOpinion | null>;
export declare function runArena(code: string, fileName: string, onProgress?: (phase: string, detail: string) => void): Promise<ArenaResult>;
