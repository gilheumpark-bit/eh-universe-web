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

// Config
export { loadMergedConfig, saveGlobalConfig, addKey, removeKey, getKeyForRole, type CSConfig, type KeyConfig } from './core/config';

// Commands (lazy — import at call site, listed here for discoverability)
// import { runInit } from './commands/init';
// import { runGenerate } from './commands/generate';
// import { runVerify } from './commands/verify';
// import { runAudit } from './commands/audit';

// IDENTITY_SEAL: role=barrel-export | inputs=none | outputs=all-public-APIs
