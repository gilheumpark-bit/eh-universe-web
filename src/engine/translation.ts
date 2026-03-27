// ============================================================
// PART 1 — Types & Constants
// ============================================================

import type { AppLanguage } from '@/lib/studio-types';

/** 번역 대상 언어 */
export type TranslationTarget = 'EN' | 'JP' | 'CN' | 'KO';

/** 용어집 항목 */
export interface GlossaryEntry {
  source: string;       // 원문 용어 (e.g. "민아")
  target: string;       // 번역 용어 (e.g. "Mina")
  context?: string;     // 맥락 힌트 (e.g. "주인공 이름")
  locked: boolean;      // true면 절대 변경 불가
}

/** 번역 설정 */
export interface TranslationConfig {
  targetLang: TranslationTarget;
  fidelity: number;               // 0.480 ~ 0.520, default 0.500
  glossary: GlossaryEntry[];
  scoreThreshold: number;          // 기본 0.70 — 이 미만이면 재창조
  maxRecreate: number;             // 재창조 최대 횟수 (기본 2)
  contextBridge: string;           // 이전 화 요약 (문맥 연결용)
}

/** 3문장 청크 */
export interface TranslationChunk {
  index: number;
  sourceText: string;              // 원문 3문장
  translatedText: string;          // 번역 결과
  score: number;                   // 채점 결과 (0~1)
  attempt: number;                 // 시도 횟수
  passed: boolean;
}

/** 채점 결과 상세 */
export interface ChunkScoreDetail {
  overall: number;                 // 종합 (0~1)
  translationese: number;          // 번역투 점수 (낮을수록 좋음, 0~1)
  fidelity: number;                // 원문 충실도 (0~1)
  naturalness: number;             // 자연스러움 (0~1)
  consistency: number;             // 용어 일관성 (0~1)
}

/** 번역 진행 상태 */
export interface TranslationProgress {
  totalChunks: number;
  completedChunks: number;
  currentChunk: number;
  recreateCount: number;
  status: 'idle' | 'translating' | 'scoring' | 'recreating' | 'done' | 'error';
  error?: string;
}

/** 에피소드 번역 결과 */
export interface TranslatedEpisode {
  episode: number;
  sourceLang: AppLanguage;
  targetLang: TranslationTarget;
  fidelity: number;
  sourceText: string;
  translatedText: string;
  chunks: TranslationChunk[];
  avgScore: number;
  glossarySnapshot: GlossaryEntry[];
  timestamp: number;
}

// Fidelity Band 상수
const FIDELITY_MIN = 0.480;
const FIDELITY_MAX = 0.520;
const FIDELITY_DEFAULT = 0.500;
const FIDELITY_STEP = 0.001;

// ============================================================
// PART 2 — Fidelity Band → 프롬프트 변환
// ============================================================

export function clampFidelity(value: number): number {
  const clamped = Math.max(FIDELITY_MIN, Math.min(FIDELITY_MAX, value));
  return Math.round(clamped * 1000) / 1000;
}

export function getDefaultConfig(): TranslationConfig {
  return {
    targetLang: 'EN',
    fidelity: FIDELITY_DEFAULT,
    glossary: [],
    scoreThreshold: 0.70,
    maxRecreate: 2,
    contextBridge: '',
  };
}

/**
 * Fidelity 값(0.480~0.520)을 번역 프롬프트 지시문으로 변환.
 * 0.001 단위 41단계의 미세 조정을 자연어 지시로 매핑.
 */
function fidelityToDirective(fidelity: number): string {
  const f = clampFidelity(fidelity);
  const delta = f - FIDELITY_DEFAULT; // -0.020 ~ +0.020

  // 5구간 분할
  if (delta <= -0.012) {
    // 0.480~0.488: 로컬라이징 허용 최대
    return `[Fidelity ${f.toFixed(3)}] Localization-forward.
- Sentence restructuring allowed when it improves English flow.
- Idiomatic English equivalents preferred over literal translation.
- Cultural references may be adapted for target audience comprehension.
- PRESERVE: character names, place names, glossary-locked terms.
- PRESERVE: intentional repetition, emotional tone, narrative rhythm.
- DO NOT add emotions, explanations, or information not in the source.`;
  }
  if (delta <= -0.004) {
    // 0.489~0.496: 약간의 자연스러움 보정
    return `[Fidelity ${f.toFixed(3)}] Slight naturalization.
- Minor sentence reordering allowed only when Korean syntax creates awkward English.
- Prefer source structure; adjust only where English grammar demands it.
- Keep Korean idioms if comprehensible; adapt only truly opaque ones.
- PRESERVE: sentence length pattern, paragraph breaks, intentional repetition.
- DO NOT add emotions, explanations, or information not in the source.`;
  }
  if (delta <= 0.004) {
    // 0.497~0.504: 기본값 — 원문 구조 최대 유지
    return `[Fidelity ${f.toFixed(3)}] Source-faithful default.
- Maintain original sentence structure as closely as English allows.
- Translate sentence-by-sentence. Do not merge or split sentences unless grammatically impossible.
- Keep the original paragraph breaks exactly.
- Preserve intentional repetition — do NOT replace with synonyms.
- Preserve emotional distance — do NOT add feelings the author didn't write.
- Minimal pronoun insertion only where English requires an explicit subject.
- DO NOT add emotions, explanations, or information not in the source.`;
  }
  if (delta <= 0.012) {
    // 0.505~0.512: 원문 고수 강화
    return `[Fidelity ${f.toFixed(3)}] Source-strict.
- Mirror source sentence structure even at minor cost to English fluency.
- Avoid pronoun substitution — repeat names as in the source when possible.
- Keep sentence length ratios close to original (short→short, long→long).
- Translate idioms literally unless completely incomprehensible.
- PRESERVE: all repetition, all paragraph breaks, all sentence boundaries.
- DO NOT add emotions, explanations, or information not in the source.`;
  }
  // 0.513~0.520: 직역에 가까움
  return `[Fidelity ${f.toFixed(3)}] Near-literal.
- Translate word-by-word where possible, phrase-by-phrase otherwise.
- Maintain Korean sentence order even if English reads slightly unusual.
- Keep all repetition verbatim.
- Do not adapt idioms — translate literally with brief inline gloss if opaque.
- Sacrifice English naturalness to preserve source texture.
- DO NOT add emotions, explanations, or information not in the source.`;
}

// ============================================================
// PART 3 — 3문장 청킹
// ============================================================

/**
 * 원문을 3문장 단위로 분할.
 * 한국어 문장 종결 패턴(. ! ? 다. 요. 죠. 까. 네.)으로 분리.
 */
export function chunkBySentences(text: string, chunkSize: number = 3): string[] {
  // 한국어 문장 종결 패턴 — 마침표/물음표/느낌표 뒤 공백 또는 줄바꿈
  const sentencePattern = /(?<=[.!?。]\s)|(?<=[다요죠까네음임됨함]\.\s)|(?<=\n\n)/g;
  const sentences = text.split(sentencePattern).filter(s => s.trim().length > 0);

  const chunks: string[] = [];
  for (let i = 0; i < sentences.length; i += chunkSize) {
    const chunk = sentences.slice(i, i + chunkSize).join('');
    if (chunk.trim().length > 0) {
      chunks.push(chunk.trim());
    }
  }

  // 빈 결과 방지 — 청킹 실패 시 원문 통째로
  if (chunks.length === 0 && text.trim().length > 0) {
    chunks.push(text.trim());
  }

  return chunks;
}

// ============================================================
// PART 4 — 번역 시스템 프롬프트 빌더
// ============================================================

/**
 * 번역용 시스템 프롬프트 생성.
 * Fidelity Band + Glossary + Style Rules + Context Bridge 통합.
 */
export function buildTranslationSystemPrompt(config: TranslationConfig): string {
  const parts: string[] = [];

  // 역할 정의
  parts.push(`You are a professional literary translator specializing in Korean fiction.
Your task: translate Korean novel text into ${langName(config.targetLang)}.
You translate ONLY the text given. You do not summarize, explain, or add commentary.
Output ONLY the translated text, nothing else.`);

  // Fidelity 지시문
  parts.push(fidelityToDirective(config.fidelity));

  // 소설 문체 규칙 (공통)
  parts.push(`[Novel Translation Rules]
- Short sentences stay short. Do not combine short sentences into complex ones.
- Intentional repetition is a stylistic choice — keep it. Do not replace with synonyms.
- If the source has no emotion words, the translation has no emotion words.
- Physical/sensory descriptions must retain their precision (sounds, textures, movements).
- Dialogue must sound like natural spoken ${langName(config.targetLang)}, not written prose.
- Maintain tense consistency (follow the source tense).
- Do not add transition words, hedging, or filler not present in the source.
- Paragraph breaks must match the source exactly.`);

  // 번역투 금지 규칙
  parts.push(`[Anti-Translationese Rules]
- No unnatural passive voice inherited from Korean grammar.
- No excessive subject repetition ("Mina... Mina... Mina...") — use pronouns where English naturally would.
- No stiff formal register unless the source is formally written.
- No over-literal idiom translation — but check fidelity level before adapting.
- No "translation smell": awkward collocations, unnatural word order, robotic rhythm.
- The result must read as if originally written in ${langName(config.targetLang)}.`);

  // 용어집
  if (config.glossary.length > 0) {
    const glossaryLines = config.glossary.map(g => {
      const lock = g.locked ? ' [LOCKED — never change]' : '';
      const ctx = g.context ? ` (${g.context})` : '';
      return `  "${g.source}" → "${g.target}"${ctx}${lock}`;
    });
    parts.push(`[Glossary — MUST use these translations consistently]
${glossaryLines.join('\n')}`);
  }

  // 문맥 브릿지
  if (config.contextBridge.trim()) {
    parts.push(`[Context from previous chapter — for continuity only, do NOT translate this]
${config.contextBridge}`);
  }

  return parts.join('\n\n');
}

// ============================================================
// PART 5 — 채점 프롬프트 빌더
// ============================================================

/**
 * 3문장 번역 결과를 채점하는 프롬프트 생성.
 * 번역투 감지가 핵심.
 */
export function buildScoringPrompt(
  sourceText: string,
  translatedText: string,
  config: TranslationConfig
): string {
  return `You are a translation quality judge for Korean→${langName(config.targetLang)} fiction translation.

Score the translation below on 4 axes (0.00 to 1.00 each):

1. **translationese** (LOWER is better): Does it smell like a translation?
   - 0.00 = reads like native ${langName(config.targetLang)} prose
   - 1.00 = obviously machine-translated
   Look for: unnatural passive voice, stiff register, awkward collocations, robotic rhythm, over-literal idioms.

2. **fidelity** (HIGHER is better): Does it preserve the source meaning and structure?
   - Check against fidelity level ${config.fidelity.toFixed(3)}.
   - At this level: ${config.fidelity < 0.496 ? 'some restructuring is acceptable' : config.fidelity > 0.504 ? 'structure must closely mirror source' : 'source structure should be maintained with minimal adaptation'}.

3. **naturalness** (HIGHER is better): Does it flow as natural ${langName(config.targetLang)} prose?
   - Would a native reader notice this is translated?
   - Is the sentence rhythm appropriate for literary fiction?

4. **consistency** (HIGHER is better): Are glossary terms used correctly?
   ${config.glossary.length > 0 ? config.glossary.map(g => `"${g.source}" must be "${g.target}"`).join(', ') : 'No glossary provided — score 1.00.'}

Respond in EXACTLY this JSON format, nothing else:
{"translationese": 0.00, "fidelity": 0.00, "naturalness": 0.00, "consistency": 0.00}

--- SOURCE ---
${sourceText}

--- TRANSLATION ---
${translatedText}`;
}

/**
 * 채점 JSON 파싱 → 종합 점수 계산.
 * overall = (1 - translationese) * 0.35 + fidelity * 0.30 + naturalness * 0.25 + consistency * 0.10
 */
export function parseScoreResponse(raw: string): ChunkScoreDetail {
  const fallback: ChunkScoreDetail = {
    overall: 0.5,
    translationese: 0.5,
    fidelity: 0.5,
    naturalness: 0.5,
    consistency: 1.0,
  };

  try {
    // JSON 블록 추출 (코드블록 감싸기 대응)
    const jsonMatch = raw.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) return fallback;

    const parsed = JSON.parse(jsonMatch[0]);
    const t = clampScore(parsed.translationese ?? 0.5);
    const f = clampScore(parsed.fidelity ?? 0.5);
    const n = clampScore(parsed.naturalness ?? 0.5);
    const c = clampScore(parsed.consistency ?? 1.0);

    const overall = (1 - t) * 0.35 + f * 0.30 + n * 0.25 + c * 0.10;

    return {
      overall: Math.round(overall * 1000) / 1000,
      translationese: t,
      fidelity: f,
      naturalness: n,
      consistency: c,
    };
  } catch {
    return fallback;
  }
}

function clampScore(v: number): number {
  return Math.max(0, Math.min(1, v));
}

// ============================================================
// PART 6 — 재창조 프롬프트 빌더
// ============================================================

/**
 * 채점 미달 시 재창조 프롬프트.
 * 같은 방식 재시도 X — 접근을 바꿔서 다시 번역.
 */
export function buildRecreatePrompt(
  sourceText: string,
  failedTranslation: string,
  scoreDetail: ChunkScoreDetail,
  attempt: number
): string {
  const issues: string[] = [];

  if (scoreDetail.translationese > 0.4) {
    issues.push('The previous attempt reads like a translation (번역투). Rewrite to sound like native prose.');
  }
  if (scoreDetail.fidelity < 0.6) {
    issues.push('The previous attempt strayed too far from the source meaning or structure.');
  }
  if (scoreDetail.naturalness < 0.6) {
    issues.push('The previous attempt has unnatural phrasing or rhythm.');
  }
  if (scoreDetail.consistency < 0.8) {
    issues.push('Glossary terms were not used consistently.');
  }

  // 시도 횟수에 따라 접근 전환
  const strategy = attempt === 1
    ? 'Take a completely different approach to the sentence structure. If the previous was literal, try freer. If it was free, try closer to source.'
    : 'Reimagine how a native author would write this scene from scratch, using the source only as meaning reference.';

  return `The previous translation attempt scored poorly. DO NOT repeat the same approach.

[Issues with previous attempt]
${issues.join('\n')}

[Failed translation]
${failedTranslation}

[Strategy for this attempt]
${strategy}

Now translate the source text again with a DIFFERENT approach. Output ONLY the new translation.

--- SOURCE ---
${sourceText}`;
}

// ============================================================
// PART 7 — 유틸리티
// ============================================================

function langName(lang: TranslationTarget): string {
  const names: Record<TranslationTarget, string> = {
    EN: 'English',
    JP: 'Japanese',
    CN: 'Chinese',
    KO: 'Korean',
  };
  return names[lang];
}

/** Fidelity 값을 사람이 읽을 수 있는 레이블로 변환 */
export function fidelityLabel(fidelity: number, isKO: boolean): string {
  const f = clampFidelity(fidelity);
  const delta = f - FIDELITY_DEFAULT;

  if (isKO) {
    if (delta <= -0.012) return '로컬라이징 허용';
    if (delta <= -0.004) return '자연스러움 보정';
    if (delta <= 0.004) return '원문 유지 (기본)';
    if (delta <= 0.012) return '원문 고수';
    return '직역';
  }
  if (delta <= -0.012) return 'Localization-forward';
  if (delta <= -0.004) return 'Slight naturalization';
  if (delta <= 0.004) return 'Source-faithful (default)';
  if (delta <= 0.012) return 'Source-strict';
  return 'Near-literal';
}

/** Fidelity band 메타데이터 */
export const FIDELITY_BAND = {
  min: FIDELITY_MIN,
  max: FIDELITY_MAX,
  default: FIDELITY_DEFAULT,
  step: FIDELITY_STEP,
  steps: Math.round((FIDELITY_MAX - FIDELITY_MIN) / FIDELITY_STEP) + 1, // 41
} as const;

// IDENTITY_SEAL: PART-1 | role=Types | inputs=none | outputs=TranslationConfig,GlossaryEntry,TranslationChunk,ChunkScoreDetail,TranslationProgress,TranslatedEpisode
// IDENTITY_SEAL: PART-2 | role=FidelityBand | inputs=fidelity(number) | outputs=directive(string)
// IDENTITY_SEAL: PART-3 | role=Chunking | inputs=text,chunkSize | outputs=string[]
// IDENTITY_SEAL: PART-4 | role=TranslationPrompt | inputs=TranslationConfig | outputs=systemPrompt(string)
// IDENTITY_SEAL: PART-5 | role=ScoringPrompt | inputs=source,translation,config | outputs=ChunkScoreDetail
// IDENTITY_SEAL: PART-6 | role=RecreatePrompt | inputs=source,failed,score,attempt | outputs=recreatePrompt(string)
// IDENTITY_SEAL: PART-7 | role=Utilities | inputs=lang,fidelity | outputs=labels,constants
