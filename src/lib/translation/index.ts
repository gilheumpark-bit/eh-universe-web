// ============================================================
// General Translation Module — Sandboxed Entry Point
// ============================================================
// 소설 특화 파이프라인과 완전 분리.
// 사용처에서 dynamic import로 필요할 때만 로드:
//   const mod = await import('@/lib/translation');

// ── Domain & Prompt ──
export { GENERAL_DOMAIN_PRESETS, GENERAL_DOMAIN_LIST, type GeneralDomain, type DomainPreset } from './general-domains';
export { buildGeneralPrompt, type GeneralTranslationParams } from './general-prompt';

// ── Passthrough (수식/코드/인용 보호) ──
export { applyPassthrough, restorePassthrough, type PassthroughResult } from './passthrough';

// ── Scoring ──
export { buildGeneralScoringPrompt, getGeneralScoreSchema, parseGeneralScore, type GeneralScoreAxes, type GeneralScoreResult } from './general-scoring';

// ── Editable Segments (문장 단위 편집) ──
export { createSegments, editSegment, confirmSegment, rejectSegment, mergeSegments, segmentStats, type TranslationSegment, type SegmentEdit } from './editable-segment';

// ── Segment Operations (부분 재번역, 재채점, 코멘트) ──
export { buildPartialRetranslatePrompt, buildSegmentScorePrompt, parseSegmentScore, addComment, getEditSummary } from './segment-operations';

// ── Glossary Auto-Extraction ──
export { buildGlossaryExtractionPrompt, parseGlossaryCandidates, extractTermsRuleBased, type GlossaryCandidate } from './glossary-extractor';

// ── Glossary Manager (real-time injection) ──
export { GlossaryManager, getGlossaryManager, type GlossaryEntry as GlossaryManagerEntry, type GlossarySnapshot } from './glossary-manager';

// ── Translation Memory (TM) ──
export { loadTM, saveTM, addToTM, addBatchToTM, searchTM, exportTM, importTM, tmStats, type TMEntry, type TMMatch } from './translation-memory';

// ── Multi-Language Batch ──
export { initMultiLangProgress, updateLangProgress, overallProgress, allDone, getOutputFileName, type TargetLanguage, type MultiLangBatchConfig, type MultiLangProgress, type MultiLangResult } from './multi-lang-batch';

// ── Publishing Metadata ──
export { buildMetadataPrompt, parseMetadataResponse, toEpubMetadataXml, type PublishMetadata } from './publish-metadata';

// ── EPUB Export ──
export { buildEpubFiles, type EpubChapter } from './epub-export';

// ── CAT Tool Compatibility (XLIFF/TMX/TBX) ──
export { exportXLIFF, exportTMX, exportTBX, importXLIFF, importTMX, importTBX } from './xliff';

// ── 41-band Quality Classification (2026-04-25) ──
// README.ko.md "2-모드 × 41-밴드" 약속 지원. 호출처: AuditPanel + 향후 runChunkedTranslate 통합.
export { scoreToBand, bandModeColor, bandPassed, allBands, BAND_COUNT, type BandResult, type BandMode } from './bands';

// ── Auto-Regeneration Loop (2026-04-25) ──
// README.ko.md "자동 재창조 — 점수 < 0.70 → temperature 상승 + 재생성 (최대 2회)" 약속 지원.
// 호출 예시:
//   const result = await translateWithAutoRegen(
//     (temp) => requestTranslation({ ...payload, temperature: temp }),
//     (text) => scoreTextWithLLM(text),
//   );
export { translateWithAutoRegen, type AutoRegenOptions, type AutoRegenAttempt, type AutoRegenResult } from './regeneration-loop';
