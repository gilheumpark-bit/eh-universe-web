// ============================================================
// General Translation Module — Sandboxed Entry Point
// ============================================================
// 소설 특화 파이프라인과 완전 분리.
// 사용처에서 dynamic import로 필요할 때만 로드:
//   const mod = await import('@/lib/translation');
//   mod.buildGeneralPrompt(...)

export { GENERAL_DOMAIN_PRESETS, GENERAL_DOMAIN_LIST, type GeneralDomain, type DomainPreset } from './general-domains';
export { applyPassthrough, restorePassthrough, type PassthroughResult } from './passthrough';
export { buildGeneralPrompt, type GeneralTranslationParams } from './general-prompt';
export {
  buildGeneralScoringPrompt,
  getGeneralScoreSchema,
  parseGeneralScore,
  type GeneralScoreAxes,
  type GeneralScoreResult,
} from './general-scoring';
