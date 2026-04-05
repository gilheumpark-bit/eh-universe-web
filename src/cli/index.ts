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

// Core — Advanced
export { recordFix, recordAcceptance, findSimilarFixes, getTopPatterns, getStats, type FixPattern } from './core/fix-memory';
export { scanProjectStyle, saveProfile, loadProfile, recordSuggestionResult, buildStyleDirective, type StyleProfile } from './core/style-learning';
export { evaluateBadges, evaluateChallenges, generateShareCard, generateReadmeBadge, BADGES, CHALLENGES } from './core/badges';
export { checkPatentPatterns, PATENT_PATTERNS, type PatentCheckResult } from './core/patent-db';
export { checkDeprecations, formatDeprecationReport, type DeprecationFinding } from './core/deprecation-checker';
export { runEnhancedPipeline, type ASTFinding, type EnhancedPipelineResult } from './core/ast-bridge';
export { runFullDataFlowAnalysis, trackNullFlow, trackCrossFileFlow, trackTaintFlow, type FlowChain, type DataFlowResult } from './core/data-flow';

// Adapters
export { storeGet, storeSet, storeDelete, storeKeys, readFileTree, cacheGet, cacheSet, type CLIFileNode } from './adapters/fs-adapter';
export { getLocalModelConfig, isLocalModelAvailable, streamLocalChat, streamWithFallback } from './adapters/local-model';
export { runFullASTAnalysis, analyzeWithTypeScript, analyzeWithTsMorph, analyzeWithAcorn, analyzeWithBabel } from './adapters/ast-engine';
export { runFullLintAnalysis, runESLint, checkPrettier, runJSCPD, runMadge } from './adapters/lint-engine';
export { runFullSecurityAnalysis, runNpmAudit, runLockfileLint, runRetireJS, runSnyk } from './adapters/security-engine';
export { runFullPerfAnalysis, runAutocannon, runTinybench, runC8, measureMemoryGrowth } from './adapters/perf-engine';
export { runFullTestAnalysis, runVitest, runFastCheck, runStryker } from './adapters/test-engine';
export { runInSandbox, runProjectInSandbox, fuzzInSandbox, type SandboxConfig, type SandboxResult } from './adapters/sandbox';
export { runFullLSPAnalysis, getDiagnostics, findReferences, buildCallGraph, findCircularDeps } from './adapters/lsp-adapter';
export { isGitRepo, getCurrentBranch, getStatus, blame, diff, diffStat, autoStash, autoCommit, autoBranch, getRecentHistory, getFileHotspots } from './adapters/git-deep';
export { runTasksParallel, runParallelVerify, type WorkerTask, type WorkerResult } from './adapters/worker-pool';

// Terminal Compatibility
export { detectTerminal, icons, colors, box, spinnerFrames, compatProgressBar, compatDivider, printHeader, printScore, printSection, type TerminalCapabilities } from './core/terminal-compat';

// TUI
export { progressBar, progressLine, ProgressTimer, Spinner } from './tui/progress';
export { computeDiff, formatDiff, printDiffSummary } from './tui/diff-preview';

// Commands (lazy — import at call site)
// runInit, runGenerate, runVerify, runAudit, runVibe, runStress,
// runBench, runPlayground, runIpScan, runCompliance, runExplain,
// runSprint, runServe, runReport, runApply, runUndo, runConfig,
// runLearn, runSuggest, runBookmark, runPreset

// IDENTITY_SEAL: role=barrel-export | inputs=none | outputs=all-public-APIs
