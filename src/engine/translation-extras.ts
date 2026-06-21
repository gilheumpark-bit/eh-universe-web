import type { AppLanguage } from '@/lib/studio-types';
import type {
  GlossaryEntry,
  TranslatedEpisode,
  TranslatedSegment,
  TranslationCharacterRegister,
  TranslationTarget,
  TranslatorProfile,
} from './translation';
import type { TranslationMode } from './scoring/bands';
import { splitSentences } from './translation-sentences';
import {
  buildRetryHintFromViolations,
  buildVoiceRulesFromProject,
  detectVoiceViolations,
  extractDialogueLines,
  type VoiceRule,
  type VoiceViolation,
} from './translation-voice-guard';

export {
  buildRetryHintFromViolations,
  buildVoiceRulesFromProject,
  detectVoiceViolations,
  extractDialogueLines,
};
export type { VoiceRule, VoiceViolation };

function langName(lang: TranslationTarget): string {
  const names: Record<TranslationTarget, string> = { EN: 'English', JP: 'Japanese', CN: 'Chinese', KO: 'Korean' };
  return names[lang];
}

function round3(v: number): number { return Math.round(v * 1000) / 1000; }

// BAND_LABELS + bandLabel + BAND_META — engine/scoring/bands.ts 로 이전 (2026-05-09).
export { bandLabel, BAND_META } from './scoring/bands';

/** 모드 설명 — 4개 언어 네이티브 */
const MODE_DESCRIPTIONS: Record<AppLanguage, Record<TranslationMode, { title: string; desc: string }>> = {
  KO: {
    fidelity: { title: 'MODE 1 — 원문 보존', desc: '원문의 구조, 문장 형식, 리듬을 최대한 유지하며 번역합니다.' },
    experience: { title: 'MODE 2 — 독자 경험', desc: '감정선을 보존하되, 타겟 독자의 몰입을 위해 리듬 재구성과 문화 적응을 허용합니다. 무근거 보강과 번역자 세공은 차단됩니다.' },
  },
  EN: {
    fidelity: { title: 'MODE 1 — Source Preservation', desc: 'Preserves the original structure, sentence form, and rhythm.' },
    experience: { title: 'MODE 2 — Reader Experience', desc: 'Preserves emotional arc while allowing rhythm restructuring and cultural adaptation. Groundless additions and translator literary polish are blocked.' },
  },
  JP: {
    fidelity: { title: 'MODE 1 — 原文保存', desc: '原文の構造、文形式、リズムを最大限維持して翻訳します。' },
    experience: { title: 'MODE 2 — 読者体験', desc: '感情線を保存しつつ、ターゲット読者の没入のためにリズム再構成と文化適応を許容します。根拠なき補強と翻訳者文学的磨きは遮断されます。' },
  },
  CN: {
    fidelity: { title: 'MODE 1 — 原文保留', desc: '最大限度保留原文的结构、句式与节奏进行翻译。' },
    experience: { title: 'MODE 2 — 读者体验', desc: '保留情感弧，同时允许重构节奏与文化适应以提升目标读者沉浸感。无据增补与译者文学润色被阻断。' },
  },
};

/** 모드 설명 — 4개 언어 지원 */
export function modeDescription(mode: TranslationMode, language: AppLanguage): { title: string; desc: string } {
  const L = MODE_DESCRIPTIONS[language] ?? MODE_DESCRIPTIONS.EN;
  return L[mode];
}

// ============================================================
// PART 11 — 정적 검증 어댑터 (기존 엔진 연결)
// ============================================================

import { validateAITone, validateSentenceVariation } from '@/engine/validator';
import { calculateEOSScore } from '@/engine/scoring';
import { extractNamesFromText } from '@/engine/continuity-tracker';

/** 번역 결과 정적 검증 — AI 채점 보완 (폴백 역할) */
export interface StaticValidationResult {
  aiToneScore: number;           // 번역투 정적 감지 (0-100, 낮을수록 좋음)
  sentenceVariationIssues: number; // 문장 길이 단조로움 감지 (이슈 수)
  emotionOvershoot: number;      // 감정 과잉 감지 (0-100)
  extractedNames: string[];      // 자동 추출된 고유명사
}

/** CJK 문자 비율로 한국어 텍스트 여부 추정 */
function isLikelyKorean(text: string): boolean {
  const sample = text.slice(0, 500);
  const koreanChars = (sample.match(/[가-힣]/g) || []).length;
  return koreanChars / Math.max(1, sample.length) > 0.15;
}

/**
 * 번역 텍스트에 대한 정적(비AI) 검증.
 * AI 채점이 실패하거나 불안정할 때 폴백으로 사용.
 *
 * 언어 감지 분기:
 * - 원문(sourceText)은 한국어로 가정 → 인명 추출 + 감정 점수 유효
 * - 번역문(translatedText)은 영어일 수 있음 → validateAITone은 한국어만 유효, 영어면 스킵
 * - sentenceVariation, emotionOvershoot은 언어 무관하게 작동
 */
export function staticValidate(
  sourceText: string,
  translatedText: string,
  knownNames: Set<string> = new Set(),
): StaticValidationResult {
  const translatedIsKorean = isLikelyKorean(translatedText);

  // 번역투 감지: 한국어 번역문에만 적용 (영어면 0)
  const aiToneScore = translatedIsKorean ? validateAITone(translatedText).score : 0;

  // 문장 길이 변동성: 언어 무관
  const variationIssues = validateSentenceVariation(translatedText);

  // 감정 과잉: 원문(KO) 기준으로 비교 — EOS는 한국어 감정 키워드 기반이라 원문에서만 정확
  // 번역문이 영어면 EOS 비교가 무의미 → 원문 내부 감정 밀도만 참고값으로 제공
  const sourceEOS = calculateEOSScore(sourceText);
  const translatedEOS = translatedIsKorean ? calculateEOSScore(translatedText) : sourceEOS;
  const emotionOvershoot = Math.max(0, translatedEOS - sourceEOS);

  // 인명 추출: 원문(한국어)에서만 작동
  const names = extractNamesFromText(sourceText, knownNames);

  return {
    aiToneScore,
    sentenceVariationIssues: variationIssues.length,
    emotionOvershoot,
    extractedNames: Array.from(names),
  };
}

// ============================================================
// PART 12 — 컨텍스트 브릿지 자동 생성
// ============================================================

/**
 * 이전 화 번역 결과에서 다음 화를 위한 컨텍스트 브릿지를 자동 생성.
 * - 마지막 3문장 (장면 분위기/상태 유지)
 * - 등장 인물명
 * - 용어집 스냅샷
 */
export function buildAutoBridge(
  prevResult: TranslatedEpisode | null | undefined,
  glossary: GlossaryEntry[],
): string {
  if (!prevResult?.translatedText?.trim()) return '';

  const lines: string[] = [];

  // 마지막 3문장 추출
  const sentences = splitSentences(prevResult.translatedText);
  const tail = sentences.slice(-3);
  if (tail.length > 0) {
    lines.push(`[Last scene from Episode ${prevResult.episode}]`);
    lines.push(tail.join(' '));
  }

  // 등장 인물: 용어집에서 인물 태그 + locked 항목(인물인 경우가 많음)
  const characters = (glossary ?? []).filter(g =>
    g.context?.includes('인물') || g.context?.includes('character') ||
    g.context?.includes('이름') || g.context?.includes('name') ||
    g.context?.includes('NAME')
  );
  // 태그된 인물이 없으면 locked 항목 중 2~4글자 한국어를 인물 후보로
  const charEntries = characters.length > 0
    ? characters
    : (glossary ?? []).filter(g => g.locked && /^[가-힣]{2,4}$/.test(g.source));
  if (charEntries.length > 0) {
    lines.push(`[Active characters] ${charEntries.map(c => `${c.source}→${c.target}`).join(', ')}`);
  }

  // 번역 모드/밴드 (일관성 유지)
  lines.push(`[Prev translation: MODE=${prevResult.mode}, band=${prevResult.band.toFixed(3)}]`);

  return lines.join('\n');
}

// ============================================================
// PART 13 — 장르 프리셋 번역 스타일 주입
// ============================================================

import { GENRE_PRESETS } from '@/engine/genre-presets';

/**
 * 장르 프리셋에서 번역 톤/문체 지시문을 생성.
 * - pacing → 문장 리듬 가이드
 * - tensionBase → 번역 강도 가이드
 * - emotionFocus → 감정 표현 우선순위
 * - rules → 장르별 번역 금지/권장 사항
 */
export function buildGenreTranslationDirective(
  genre: string,
  targetLang: TranslationTarget,
): string {
  const preset = GENRE_PRESETS[genre];
  if (!preset) return '';

  const lang = langName(targetLang);
  const pacingGuide = PACING_TO_TRANSLATION[preset.pacing] ?? 'Maintain the source text pacing.';
  const tensionGuide = preset.tensionBase >= 0.7
    ? 'High-tension genre: use vivid sensory language, favor shorter punchy sentences in action scenes.'
    : preset.tensionBase <= 0.4
    ? 'Low-tension genre: allow softer, more reflective translation. Emotional beats can be gentle.'
    : 'Medium-tension genre: balance between intensity and breathing room.';

  return `[Genre Translation Style — ${genre}]
Pacing: ${pacingGuide}
Tension: ${tensionGuide}
Emotional focus for ${lang} readers: ${preset.emotionFocus}
Genre-specific rules:
${preset.rules}
Adapt these rules to translation: the translated text must feel like native ${lang} ${genre.toLowerCase()} fiction.`;
}

/** Pacing 값 → 번역 리듬 가이드 매핑 */
const PACING_TO_TRANSLATION: Record<string, string> = {
  slow_burn_with_spikes: 'Preserve slow, building rhythm. Sentences should breathe. Spike moments get abrupt, short sentences.',
  fast_spikes: 'Keep rapid pacing. Short sentences, active verbs. Action sequences must feel fast even in translation.',
  epic_waves: 'Wave-like rhythm: build slowly, crest intensely, trough for reflection. Mirror this in sentence length variation.',
  steady_rise_with_reversals: 'Steady escalation with sharp turns. Each reversal moment needs maximum clarity and impact.',
  slow_build_to_spike: 'Extended atmospheric buildup. Long, creeping sentences → sudden short impact. The contrast IS the genre.',
  layered_accumulation: 'Layer upon layer of meaning. Each sentence adds another dimension. Maintain this density in translation.',
};

// ============================================================
// PART 14 — 캐릭터 레지스터 번역 일관성
// ============================================================

/**
 * 캐릭터별 화체 프로필 → 번역 시 대사 레지스터 가이드.
 * social-register.ts의 5축을 번역 컨텍스트에 맞게 변환.
 */
export function buildCharacterRegisterDirective(
  registers: TranslationCharacterRegister[],
  targetLang: TranslationTarget,
): string {
  if (registers.length === 0) return '';

  const lang = langName(targetLang);
  const lines = registers.map(r => {
    const parts: string[] = [`${r.name}:`];
    parts.push(`speech=${REGISTER_TO_SPEECH[r.relation] ?? r.relation}`);
    parts.push(`age=${r.age}`);
    if (r.profession) parts.push(`role=${r.profession}`);
    parts.push(`profanity=${r.profanity}`);
    return `  ${parts.join(', ')}`;
  });

  return `[Character Speech Register — maintain consistency in ${lang}]
Each character MUST maintain their speech register throughout the translation.
Violations to watch: formal character using casual speech, teen using elder vocabulary, profanity mismatch.
${lines.join('\n')}`;
}

/** 관계 거리 → 번역 대사 스타일 매핑 */
const REGISTER_TO_SPEECH: Record<string, string> = {
  stranger: 'distant/cautious',
  formal: 'polite/measured',
  colleague: 'professional/neutral',
  friend: 'casual/warm',
  intimate: 'familiar/unguarded',
  hostile: 'cold/clipped',
};

// ============================================================
// PART 15 — 번역 오류 패턴 학습 (EMA 프로필)
// ============================================================

const TRANSLATOR_EMA_ALPHA = 0.3;

/** 번역 프로필에서 AI 프롬프트 힌트를 생성 — 반복 오류 자동 교정 */
export function buildTranslatorProfileHint(profile: TranslatorProfile): string {
  if (profile.episodeCount < 3) return ''; // 3화 미만 → 학습 데이터 부족

  const hints: string[] = [];

  // 상위 3개 반복 오류
  const topErrors = Object.entries(profile.commonErrors)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([kind]) => kind);

  if (topErrors.length > 0) {
    hints.push(`[Translator Pattern Correction] Recurring errors in past translations: ${topErrors.join(', ')}. Actively avoid these patterns.`);
  }

  // 용어 일관성이 낮으면 경고
  if (profile.termConsistencyRate < 0.85) {
    hints.push('[Terminology Alert] Past translations showed terminology inconsistency. Double-check all glossary terms.');
  }

  // 톤 정합이 낮으면 경고
  if (profile.toneAlignmentRate < 0.80) {
    hints.push('[Tone Alignment Alert] Past translations had tone drift. Match the source text tone precisely.');
  }

  return hints.join('\n');
}

/** 번역 완료 후 프로필 업데이트 (EMA) */
export function updateTranslatorProfile(
  profile: TranslatorProfile,
  score: number,
  termConsistency: number,
  toneAlignment: number,
  errors: string[],
): TranslatorProfile {
  const p = { ...profile };
  p.episodeCount += 1;
  p.updatedAt = Date.now();

  const isFirst = p.episodeCount === 1;
  const alpha = TRANSLATOR_EMA_ALPHA;

  p.avgScore = isFirst ? score : alpha * score + (1 - alpha) * p.avgScore;
  p.termConsistencyRate = isFirst ? termConsistency : alpha * termConsistency + (1 - alpha) * p.termConsistencyRate;
  p.toneAlignmentRate = isFirst ? toneAlignment : alpha * toneAlignment + (1 - alpha) * p.toneAlignmentRate;

  // 오류 누적 (디케이 없음 — 반복 패턴 추적)
  for (const err of errors) {
    p.commonErrors[err] = (p.commonErrors[err] || 0) + 1;
  }

  return p;
}

/** 빈 번역 프로필 생성 */
export function createEmptyTranslatorProfile(id: string = 'default'): TranslatorProfile {
  return {
    id,
    episodeCount: 0,
    avgScore: 0,
    termConsistencyRate: 1,
    toneAlignmentRate: 1,
    commonErrors: {},
    updatedAt: Date.now(),
  };
}

// ============================================================
// PART 16 — 토큰 예산 보정 (CJK 청크 크기 자동 조정)
// ============================================================

import { estimateTokens } from '@/lib/token-utils';

/**
 * 원문 토큰 수 기반으로 청크 크기 자동 결정.
 * CJK 텍스트는 토큰 밀도가 높아 3문장이 이미 400+ 토큰일 수 있음.
 * 번역 시 출력 예산(~2048 토큰)을 초과하지 않도록 청크 크기를 조절.
 */
export function adaptiveChunkSize(
  text: string,
  baseChunkSize: number = 3,
  maxTokensPerChunk: number = 800,
): number {
  // 샘플: 처음 10문장의 평균 토큰 수 추정
  const sampleSentences = splitSentences(text.slice(0, 3000));
  if (sampleSentences.length === 0) return baseChunkSize;

  const sampleTokens = sampleSentences.slice(0, 10).map(s => estimateTokens(s));
  const avgTokensPerSentence = sampleTokens.reduce((a, b) => a + b, 0) / sampleTokens.length;

  if (avgTokensPerSentence <= 0) return baseChunkSize;

  // 청크당 최대 토큰을 넘지 않는 문장 수
  const optimal = Math.max(1, Math.floor(maxTokensPerChunk / avgTokensPerSentence));
  return Math.min(optimal, baseChunkSize);
}

// ============================================================
// PART 17 — 번역 출력 검증 (용어집 실검증 + locked 강제)
// ============================================================

/** 용어집 검증 결과 */
export interface GlossaryVerification {
  passed: boolean;
  missingLocked: GlossaryEntry[];    // locked인데 번역문에 없는 항목
  missingOptional: GlossaryEntry[];  // 비locked인데 없는 항목 (경고용)
  totalChecked: number;
}

/**
 * 번역문에서 용어집 항목의 실제 존재 여부를 검증.
 * - locked 항목: 반드시 존재해야 함 (미존재 = FAIL)
 * - 비locked 항목: 원문에 해당 용어가 있으면 번역문에도 있어야 함 (경고)
 */
export function verifyGlossary(
  sourceText: string,
  translatedText: string,
  glossary: GlossaryEntry[],
): GlossaryVerification {
  const missingLocked: GlossaryEntry[] = [];
  const missingOptional: GlossaryEntry[] = [];
  let totalChecked = 0;

  for (const entry of glossary) {
    // 원문에 해당 용어가 포함된 경우만 체크
    if (!sourceText.includes(entry.source)) continue;
    totalChecked++;

    const targetExists = translatedText.includes(entry.target);
    if (!targetExists) {
      if (entry.locked) {
        missingLocked.push(entry);
      } else {
        missingOptional.push(entry);
      }
    }
  }

  return {
    passed: missingLocked.length === 0,
    missingLocked,
    missingOptional,
    totalChecked,
  };
}

// ============================================================
// PART 18 — 길이 비율 & 문장 수 정합 검증
// ============================================================

/** 길이/문장 검증 결과 */
export interface LengthVerification {
  passed: boolean;
  sourceLengthChars: number;
  translatedLengthChars: number;
  lengthRatio: number;              // 번역/원문 비율
  expectedRatioMin: number;
  expectedRatioMax: number;
  sourceSentenceCount: number;
  translatedSentenceCount: number;
  sentenceCountDelta: number;       // 양수=번역이 더 많음, 음수=번역이 적음
  issues: string[];
}

/** 언어쌍별 예상 길이 확장 비율 */
const LENGTH_RATIO_RANGES: Record<TranslationTarget, { min: number; max: number }> = {
  EN: { min: 1.10, max: 1.60 },  // KO→EN: 보통 1.2~1.4x
  JP: { min: 0.85, max: 1.20 },  // KO→JP: 비슷하거나 약간 짧음
  CN: { min: 0.80, max: 1.15 },  // KO→CN: 한자 압축으로 짧을 수 있음
  KO: { min: 0.90, max: 1.10 },  // KO→KO: 거의 동일
};

/**
 * 번역 길이 비율 + 문장 수 정합 검증.
 * - 길이가 예상 범위를 벗어나면 콘텐츠 손실/과잉 의심
 * - 문장 수 차이가 크면 병합/분할 과잉 의심
 */
export function verifyLength(
  sourceText: string,
  translatedText: string,
  targetLang: TranslationTarget,
  mode: TranslationMode,
): LengthVerification {
  const issues: string[] = [];
  const range = LENGTH_RATIO_RANGES[targetLang];

  const srcLen = sourceText.length;
  const tgtLen = translatedText.length;
  const ratio = srcLen > 0 ? tgtLen / srcLen : 1;

  // 길이 비율 검증
  if (ratio < range.min) {
    issues.push(`length_too_short: ratio=${ratio.toFixed(2)} < expected_min=${range.min}`);
  }
  if (ratio > range.max) {
    issues.push(`length_too_long: ratio=${ratio.toFixed(2)} > expected_max=${range.max}`);
  }

  // 문장 수 정합 (MODE1은 엄격, MODE2는 관대)
  const srcSentences = countSentences(sourceText);
  const tgtSentences = countSentences(translatedText);
  const delta = tgtSentences - srcSentences;
  const tolerance = mode === 'fidelity' ? 2 : Math.max(3, Math.ceil(srcSentences * 0.3));

  if (Math.abs(delta) > tolerance) {
    issues.push(`sentence_count_mismatch: source=${srcSentences}, translated=${tgtSentences}, delta=${delta}`);
  }

  return {
    passed: issues.length === 0,
    sourceLengthChars: srcLen,
    translatedLengthChars: tgtLen,
    lengthRatio: round3(ratio),
    expectedRatioMin: range.min,
    expectedRatioMax: range.max,
    sourceSentenceCount: srcSentences,
    translatedSentenceCount: tgtSentences,
    sentenceCountDelta: delta,
    issues,
  };
}

/** 문장 수 카운트 — splitSentences와 동일 알고리즘 (따옴표/줄임표 보호 통일) */
function countSentences(text: string): number {
  return splitSentences(text).length || 1;
}

// ============================================================
// PART 19 — 축별 임계값 + 청크간 일관성 추적
// ============================================================
// hasCriticalAxisFailure + ChunkConsistencyTracker — engine/scoring/consistency-tracker.ts 로 이전 (2026-05-09).
export {
  hasCriticalAxisFailure,
  createConsistencyTracker,
  updateConsistencyTracker,
} from './scoring/consistency-tracker';
export type { ChunkConsistencyTracker } from './scoring/consistency-tracker';

// ============================================================
// PART 20 — Voice Guard 통합 (Phase 4)
// ============================================================

/** Voice Guard 검증 결과 wrapper. */
export interface VoiceGuardedResult<T> {
  result: T;
  voiceViolations: VoiceViolation[];
  needsRetry: boolean;
  retryHint: string;
}

/**
 * 번역 결과에 Voice Guard 검증 추가.
 * violations 중 'error' 1개 이상이면 needsRetry=true.
 * useTranslation 측에서 최대 2회 재번역 루프 제어.
 *
 * 입력 형식 가정:
 * - segments[].translation + segments[].speaker가 있으면 화자별 검증
 * - translatedText만 있고 speaker 매핑 없으면 검증 skip (false positive 방지)
 */
export function applyVoiceGuard<
  T extends {
    translatedText?: string;
    segments?: Array<{ translation?: string; speaker?: string }>;
  }
>(
  result: T,
  opts: {
    rules: VoiceRule[];
    targetLang: AppLanguage;
  },
): VoiceGuardedResult<T> {
  // 빈 입력 가드 — 규칙 없으면 즉시 통과
  if (!opts || !Array.isArray(opts.rules) || opts.rules.length === 0) {
    return { result, voiceViolations: [], needsRetry: false, retryHint: '' };
  }

  // 대사 라인 수집 — segments에 speaker가 매핑된 경우만 검증
  let lines: Array<{ speaker: string; text: string }> = [];
  if (result?.segments && Array.isArray(result.segments)) {
    lines = result.segments
      .filter((s): s is { translation: string; speaker: string } =>
        Boolean(s?.translation && s?.speaker),
      )
      .map(s => ({ speaker: s.speaker, text: s.translation }));
  }
  // translatedText만 있으면 speaker 매핑 부재 → Voice Guard skip (false positive 방지)

  if (lines.length === 0) {
    return { result, voiceViolations: [], needsRetry: false, retryHint: '' };
  }

  const violations = detectVoiceViolations(lines, opts.rules);
  const errorCount = violations.filter(v => v.severity === 'error').length;
  return {
    result,
    voiceViolations: violations,
    needsRetry: errorCount > 0,
    retryHint: errorCount > 0 ? buildRetryHintFromViolations(violations) : '',
  };
}

// ============================================================
// PART 21 — Speaker Inference & Segment Builder
// (Voice Guard 활성화용 화자 자동 추출)
// ============================================================

/**
 * 대사 마커 — 따옴표/꺾쇠/3자 이상 작은따옴표.
 * 모듈 상수 (재컴파일 비용 회피).
 * - 한국어/중국어: " " 「 」
 * - 영어: " "
 * - 일본어: 「 」 『 』 " "
 */
const DIALOGUE_MARK_REGEX = /"[^"]+"|「[^」]+」|『[^』]+』|'[^']{3,}'/;

/**
 * 4개 언어별 화자 발화 동사 패턴.
 * capture group 1 = 화자명 후보.
 * 모듈 상수 — 매 호출 재컴파일 회피.
 *
 * 패턴 해설:
 * - KO: 이름 + (조사) + 발화동사  →  "민아가 말했다"
 * - EN: 대문자 시작 이름 + 공백 + said/asked  →  "Mina said"
 * - JP: 이름 + (は/が)? + 言った/叫んだ  →  "ミナは言った"
 * - CN: 이름 + 说/问/喊  →  "敏雅说"
 */
const SPEAKER_INFERENCE_PATTERNS: Record<TranslationTarget, RegExp> = {
  // KO: 이름 (한글/영문 1~9글자) + 조사(이/가/는/은/의) + 발화동사.
  //     negative lookbehind 로 capture 마지막 글자가 조사가 아님을 강제 — greedy 매칭이
  //     조사를 삼키지 않게 한다. lookahead 로 조사+발화동사 패턴 확인.
  KO: /([가-힣A-Za-z]{1,9}(?<![이가는은의]))(?=(?:이|가|는|은|의)\s*(?:말했|외쳤|속삭였|물었|대답했|중얼거렸))/,
  EN: /([A-Z][a-zA-Z]{1,15})(?:\s+said|\s+asked|\s+whispered|\s+shouted|\s+replied|\s+murmured)/,
  // JP: は/が 조사를 capture 에서 제외 (lookahead).
  JP: /([一-龠ぁ-んァ-ンA-Za-z]{1,12})(?=(?:は|が)(?:言った|叫んだ|囁いた|尋ねた|答えた|呟いた))/,
  // CN: 발화동사를 capture 에서 제외 (lookahead)
  CN: /([一-龥A-Za-z]{1,10})(?=说|问|喊|低声说|回答|嘟囔)/,
};

/**
 * 원문/번역 한 쌍에서 화자 추론.
 *
 * 알고리즘:
 * 1. sourceText/translation 어느 쪽에도 대사 마커 없음 → 나레이션 (isDialogue=false)
 * 2. 마커 있음 → 원문/번역 양쪽에서 화자 패턴 시도
 *    - 우선 targetLang 패턴으로 translation 검사 (번역문에 화자 표기가 더 명확한 경우)
 *    - sourceText 는 4개 언어 모두 순차 시도 (sourceLang 정보가 시그니처에 없음)
 * 3. characterNames 와 fuzzy 매칭 (정확/포함/역포함)
 * 4. 매칭 실패해도 패턴에서 잡힌 후보 그대로 사용
 *
 * [C] match[1] null 가드 — 정규식 capture group 미존재 시 undefined 반환 안전
 * [C] characterNames 빈 배열도 안전 — find 결과 undefined → fallback to candidate
 * [C] targetLang 가 4개 외 값이면 KO fallback
 */
export function inferSpeakerFromContext(
  sourceText: string,
  translation: string,
  characterNames: string[],
  targetLang: TranslationTarget,
): { speaker?: string; isDialogue: boolean } {
  // [C] sourceText 빈/비문자 가드
  const safeSrc = typeof sourceText === 'string' ? sourceText : '';
  const safeTrans = typeof translation === 'string' ? translation : '';
  if (!safeSrc && !safeTrans) {
    return { isDialogue: false };
  }

  // 1) 대사 마커 검사 — 원문 또는 번역문 둘 중 하나라도 있으면 대사 후보
  const srcHasMark = safeSrc ? DIALOGUE_MARK_REGEX.test(safeSrc) : false;
  const transHasMark = safeTrans ? DIALOGUE_MARK_REGEX.test(safeTrans) : false;
  if (!srcHasMark && !transHasMark) {
    return { isDialogue: false };
  }

  // 2) 화자 패턴 추출 — 우선순위:
  //    a) translation 에 targetLang 패턴 매칭 (번역문에 화자 표기 명확)
  //    b) sourceText 에 4개 언어 모두 순차 매칭 (sourceLang 정보 없음 → 시도)
  const targetPattern =
    SPEAKER_INFERENCE_PATTERNS[targetLang] ?? SPEAKER_INFERENCE_PATTERNS.KO;

  let candidate: string | undefined;
  if (safeTrans) {
    const m = safeTrans.match(targetPattern);
    if (m && m[1] && m[1].trim().length > 0) {
      candidate = m[1].trim();
    }
  }
  if (!candidate && safeSrc) {
    // sourceText 4언어 순차 — 가장 먼저 매칭되는 언어 패턴 사용
    for (const lang of ['KO', 'EN', 'JP', 'CN'] as const) {
      const m = safeSrc.match(SPEAKER_INFERENCE_PATTERNS[lang]);
      if (m && m[1] && m[1].trim().length > 0) {
        candidate = m[1].trim();
        break;
      }
    }
  }

  // [C] candidate 없음 → 대사인 건 확실하지만 화자 미상
  if (!candidate) {
    return { isDialogue: true };
  }

  // 3) characterNames fuzzy 매칭 (배열 빈 경우도 안전)
  let speaker: string | undefined;
  if (Array.isArray(characterNames) && characterNames.length > 0) {
    const matched = characterNames.find(
      name =>
        name === candidate ||
        name.includes(candidate) ||
        candidate.includes(name),
    );
    speaker = matched ?? candidate;
  } else {
    // 캐릭터 목록 없으면 패턴에서 잡힌 후보 그대로
    speaker = candidate;
  }

  return { speaker, isDialogue: true };
}

/**
 * 청크 텍스트 (원문/번역) 를 문장 단위 세그먼트로 분해.
 * 각 세그먼트마다 inferSpeakerFromContext 적용.
 *
 * 정렬 정책: 원문 문장 수와 번역 문장 수가 다를 수 있음 → max 기준 정렬,
 * 빈 문자열 fallback (편집 가능 세그먼트와 동일 정책).
 *
 * [G] 정규식은 모듈 상수 — 매 세그먼트 재컴파일 회피
 * [K] 기존 chunkBySentences 로직과 별도 (segments 는 1문장 단위, chunks 는 N문장 단위)
 */
export function buildSegmentsFromChunk(
  sourceChunkText: string,
  translatedChunkText: string,
  characterNames: string[],
  targetLang: TranslationTarget,
): TranslatedSegment[] {
  // [C] 입력 가드
  const safeSrc = typeof sourceChunkText === 'string' ? sourceChunkText : '';
  const safeTrans =
    typeof translatedChunkText === 'string' ? translatedChunkText : '';
  if (!safeSrc.trim() && !safeTrans.trim()) {
    return [];
  }

  const safeNames = Array.isArray(characterNames) ? characterNames : [];

  // 단순 라인 단위 분리 — 줄바꿈 또는 종결부호+공백
  // (chunkBySentences 의 따옴표 스택 splitter 는 비공개이므로 가벼운 fallback 사용)
  const splitToSentences = (s: string): string[] => {
    if (!s.trim()) return [];
    return s
      .split(/\n+|(?<=[.!?。！？」』])\s+/)
      .map(t => t.trim())
      .filter(Boolean);
  };

  const srcSentences = splitToSentences(safeSrc);
  const transSentences = splitToSentences(safeTrans);
  const maxLen = Math.max(srcSentences.length, transSentences.length);

  const segments: TranslatedSegment[] = [];
  for (let i = 0; i < maxLen; i++) {
    const sourceSentence = srcSentences[i] ?? '';
    const translationSentence = transSentences[i] ?? '';
    const { speaker, isDialogue } = inferSpeakerFromContext(
      sourceSentence,
      translationSentence,
      safeNames,
      targetLang,
    );
    segments.push({
      sourceText: sourceSentence,
      translation: translationSentence,
      speaker,
      isDialogue,
    });
  }
  return segments;
}
