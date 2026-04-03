// ============================================================
// Code Studio Harness — AI 코딩 자동 루프
// ============================================================
// 에이전트 → 빌드 → 에러 → 수정 → 재빌드 (자동)
// lazy import: const harness = await import('@/lib/code-studio/harness');

export { runHarnessLoop, errorsToPrompt, type HarnessResult, type HarnessConfig, type ParsedError } from './build-test-loop';
