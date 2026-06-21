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
export { exportXLIFF, exportTMX, exportTBX, importXLIFF, importTMX, importTBX, exportDualXLIFF, type DualXliffSegment } from './xliff';

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

// ── Source Integrity (2026-05-08) — 1원칙: 원문 잘라먹기 방지 ──
// LLM 이 prompt 를 어겼을 때 결정론적으로 잡아내는 안전망. 단락 수 / 단어 비율 / 누락 의심 검출.
// 호출 예시:
//   const report = runIntegrityCheck({ source, translation, srcLang: 'ko', tgtLang: 'en' });
//   if (report.status === 'fail') { triggerRetranslate(); }
export {
  runIntegrityCheck,
  verifyParagraphCount,
  verifyWordRatio,
  detectMissingSegments,
  summarizeIntegrity,
  type IntegrityReport,
  type IntegrityIssue,
  type IntegrityStatus,
  type IntegrityCheckInput,
  type SupportedLang,
} from './source-integrity';

// ── Dual Pipeline (2026-05-08) — 시장 분석 4차: Source-faithful + Market-ready 동시 출력 ──
// Stage 1~3 공유 + Stage 4~5 분기 병렬 호출. 비용 1.4x.
// 호출 예시:
//   const result = await runDualTranslation({ text, from, to, translateFn });
//   // result.faithful + result.market 두 결과 동시 반환
export {
  runDualTranslation,
  type DualPipelineParams,
  type DualPipelineResult,
  type TranslateFn,
} from './dual-pipeline';

// ── Phase 2 Modules (2026-05-08) ──
// 호칭 매트릭스 (Market track) — 캐릭터 관계 → 한국식 호칭 자동
export {
  suggestHonorific,
  buildHonorificHint,
  type CharacterRelation,
  type HonorificSuggestion,
  type RelationDistance,
  type AgeRelation,
  type Gender,
} from './honorifics';

// 회차 자동 분할 (Market track) — 5,500자 단위
export {
  splitIntoChapters,
  summarizeSplit,
  type ChapterSplit,
  type SplitOptions,
} from './chapter-splitter';

// 한국 웹소설 장르 매트릭스 (Market track) — 8 장르 클리셰·어휘
export {
  getKoreanGenreProfile,
  listKoreanGenres,
  buildGenreHint,
  type KoreanGenreId,
  type KoreanGenreProfile,
} from './korean-genre-matrix';

// 세그먼트 채택 시스템 — 번역가 워크플로
export {
  buildSegments,
  setSegmentAction,
  finalizeSegments,
  summarizeAdoption,
  type AdoptionAction,
  type TranslationSegmentAdoption,
} from './segment-adoption';

// 작가 sign-off — Faithful archive + Market publish 분리 승인
// [Z1a-4 2026-06-11] validateSignoffReadiness — 기계 검증 조건 분리 readiness
export {
  chapterSignoffStatus,
  summarizeSignoff,
  toggleSignoff,
  isReadyForPublish,
  validateSignoffReadiness,
  type SignoffStatus,
  type SignoffSummary,
  type SignoffCondition,
  type SignoffConditionId,
  type SignoffReadiness,
  type SignoffReadinessInput,
} from './author-signoff';

// Glossary dual mapping helpers
export { pickGlossaryTarget, buildGlossaryText } from './glossary-manager';

// [1 — 2026-05-09] 언어 코드 정규화 유틸 (DRY) — 4개 모듈 중복 통합
export { normalizeLang, type SupportedLang as NormalizedLang } from './lang-utils';

// ── C 출판·인프라 (2026-05-08) ──
export {
  buildDocxBundle,
  docxBundleToFiles,
  type DocxChapterInput,
  type DocxBuildOptions,
  type DocxBundle,
} from './docx-export';
export {
  detectSchemaVersion,
  migrateChaptersToV2,
  autoMigrateLocalStorage,
  type ChapterSchemaVersion,
  type MigrationResult,
} from './schema-migration';
export {
  studioEpisodesToChapters,
  chaptersToStudioEpisodes,
  syncStoryBible,
  type StudioEpisodeMinimal,
  type BridgeImportResult,
  type StoryBibleSyncInput,
  type StoryBibleSyncOutput,
} from './studio-bridge';
export {
  TRANSLATE_WORKFLOW_COMMAND,
  VALIDATE_WORKFLOW_COMMAND,
  PACKAGE_WORKFLOW_COMMAND,
  ALL_TRANSLATION_WORKFLOW_COMMANDS,
  buildTranslationCommandHelpText,
  type TranslationCommandSpec,
} from './command-spec';

// ── Phase 4 (2026-05-08) — NCG/NCT pipeline ──
// IR 보고서 §"NCG/NCT" 본질 매핑.
// NCG = 번역 전 게이트 (canon/glossary/IP guard) — block/warn/pass
// NCT = 번역 후 검증 (integrity/glossary 일관성) — publish/review/reject
export {
  runNCG,
  runNCT,
  type NCGInput,
  type NCGReport,
  type NCGViolation,
  type NCTInput,
  type NCTReport,
  type GateDecision,
} from './ncg-nct';

// ── Z1a (2026-06-11) — 번역 잔여 5건 (claude2 정합) ──
// (1) 4버전 누진 현지화: dual-pipeline improveLevel (직접 import — 순환 회피)
// (3) Catastrophic 게이트 — 결정론적 차단 + 사유
export {
  runCatastrophicCheck,
  DEFAULT_CATASTROPHIC_THRESHOLDS,
  type CatastrophicCheckInput,
  type CatastrophicReport,
  type CatastrophicReason,
  type CatastrophicThresholds,
  type TranslationQaAudit,
} from './ncg-nct';
// (5) 어색한 표현/영문 습관 린트 — KO→EN additive 경고
export {
  lintTranslationese,
  type TranslationeseHit,
  type TranslationeseKind,
  type TranslationeseLintResult,
} from './translationese-lint';

// ── 번역 위험 보고 — 대상 언어를 모르는 사용자를 위한 한국어 요약 카드 ──
export {
  buildTranslationRiskReport,
  type BuildTranslationRiskReportInput,
  type TranslationBackSummary,
  type TranslationGlossaryMiss,
  type TranslationRiskCard,
  type TranslationRiskCardId,
  type TranslationRiskLevel,
  type TranslationRiskReport,
  type TranslationRiskStatus,
} from './risk-report';
