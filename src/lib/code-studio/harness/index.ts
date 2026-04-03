// ============================================================
// Code Studio Harness — 적대적 AI 코드 검증 엔진
// ============================================================
// 3-Gate Backend + Frontend Gate + Adversarial Core + Headless First
// lazy import: const harness = await import('@/lib/code-studio/harness');

// Build-Test Loop (Backend 3-Gate)
export { runHarnessLoop, errorsToPrompt, type HarnessResult, type HarnessConfig, type ParsedError } from './build-test-loop';

// AST Hollow Scanner (Gate 1 Backend)
export { scanForHollowCode, scanProjectForHollowCode, type HollowCodeFinding } from '../pipeline/ast-hollow-scanner';

// Frontend Gate 1: 5-State + Dead DOM
export { runFrontendGate1, scan5States, scanDeadDOM, type FrontendGateFinding } from '../pipeline/frontend-gate1';

// Frontend Gate 2: Design Token Linter
export { runFrontendGate2, scanDesignTokens, type DesignTokenFinding } from '../pipeline/frontend-gate2';

// Adversarial Core (Spy + Fuzz + Mutation)
export { analyzeSpyPatterns, generateFuzzInputs, extractFunctionParams, analyzeFuzzVulnerabilities, generateMutations, buildHarnessFeedback, type HarnessFeedback, type GateResult, type SpyReport, type FuzzResult } from './adversarial-core';

// Headless First Strategy (뼈대→검증→디자인→검증)
export { runHeadlessFirst, buildSkeletonPrompt, buildDesignPrompt, type HeadlessFirstConfig, type HeadlessFirstResult } from './headless-first';
