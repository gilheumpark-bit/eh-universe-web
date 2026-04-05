// ============================================================
// CS Quill 🦔 — CLI Module Index
// ============================================================

// Core
export { resolveAlias, getAllAliases, getAliasesForCommand } from './core/alias';
export { createLoopGuard, type LoopGuardConfig, type LoopGuardState, type StopReason } from './core/loop-guard';

// AI
export { PLANNER_SYSTEM_PROMPT, buildPlannerPrompt, parsePlanResult, buildExecutionWaves, type SealContract, type PlanResult } from './ai/planner';
export { TEAM_LEAD_SYSTEM_PROMPT, buildTeamLeadPrompt, parseVerdict, type AgentFinding, type TeamLeadVerdict } from './ai/team-lead';
export { CROSS_JUDGE_SYSTEM_PROMPT, buildJudgePrompt, parseJudgeResult, type JudgeFinding, type JudgeResult } from './ai/cross-judge';

// Formatters
export { formatReceipt, toJSON, toSARIF, computeReceiptHash, chainReceipt, type ReceiptData } from './formatters/receipt';

// IDENTITY_SEAL: role=barrel-export | inputs=none | outputs=all-public-APIs
