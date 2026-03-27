// ============================================================
// PART 1 — Types & Constants
// ============================================================

import type { AppLanguage } from '@/lib/studio-types';

/** 번역 대상 언어 */
export type TranslationTarget = 'EN' | 'JP' | 'CN' | 'KO';

/**
 * 번역 모드: 두 가지 접근
 * MODE1 — 원문 보존형: 원문 구조와 형식을 최대한 유지하며 번역
 * MODE2 — 독자 경험형: 타겟 독자가 같은 감정을 느끼도록 재창조
 */
export type TranslationMode = 'fidelity' | 'experience';

/** 용어집 항목 */
export interface GlossaryEntry {
  source: string;       // 원문 용어 (e.g. "민아")
  target: string;       // 번역 용어 (e.g. "Mina")
  context?: string;     // 맥락 힌트 (e.g. "주인공 이름")
  locked: boolean;      // true면 절대 변경 불가
}

/** 번역 설정 */
export interface TranslationConfig {
  mode: TranslationMode;          // 사용자 선택: 원문 보존 vs 독자 경험
  targetLang: TranslationTarget;
  band: number;                   // 0.480 ~ 0.520, 모드 내 미세 조정
  glossary: GlossaryEntry[];
  scoreThreshold: number;         // 기본 0.70 — 이 미만이면 재창조
  maxRecreate: number;            // 재창조 최대 횟수 (기본 2)
  contextBridge: string;          // 이전 화 요약 (문맥 연결용)
}

/** 3문장 청크 */
export interface TranslationChunk {
  index: number;
  sourceText: string;
  translatedText: string;
  score: number;
  attempt: number;
  passed: boolean;
}

/** MODE1 채점 — 원문 보존형 */
export interface FidelityScoreDetail {
  overall: number;
  translationese: number;    // 번역투 (낮을수록 좋음)
  fidelity: number;          // 원문 충실도
  naturalness: number;       // 자연스러움
  consistency: number;       // 용어 일관성
}

/** MODE2 채점 — 독자 경험형 */
export interface ExperienceScoreDetail {
  overall: number;
  immersion: number;         // 독자 몰입도 — 멈추지 않고 읽히는가
  emotionResonance: number;  // 감정 재현도 — 원문이 주는 감정이 살아있는가
  culturalFit: number;       // 문화 적합도 — 타겟 독자에게 어색함이 없는가
  consistency: number;       // 일관성 — 인명/용어/시점/톤
}

/** 통합 채점 결과 (모드에 따라 내부 구조 다름) */
export type ChunkScoreDetail = FidelityScoreDetail | ExperienceScoreDetail;

/** 타입 가드 */
export function isFidelityScore(s: ChunkScoreDetail): s is FidelityScoreDetail {
  return 'translationese' in s;
}
export function isExperienceScore(s: ChunkScoreDetail): s is ExperienceScoreDetail {
  return 'immersion' in s;
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
  mode: TranslationMode;
  band: number;
  sourceText: string;
  translatedText: string;
  chunks: TranslationChunk[];
  avgScore: number;
  glossarySnapshot: GlossaryEntry[];
  timestamp: number;
}

// Band 상수 (양쪽 모드 공통)
const BAND_MIN = 0.480;
const BAND_MAX = 0.520;
const BAND_DEFAULT = 0.500;
const BAND_STEP = 0.001;

// ============================================================
// PART 2 — Band 클램핑 & 기본 설정
// ============================================================

export function clampBand(value: number): number {
  const clamped = Math.max(BAND_MIN, Math.min(BAND_MAX, value));
  return Math.round(clamped * 1000) / 1000;
}

export function getDefaultConfig(mode: TranslationMode = 'fidelity'): TranslationConfig {
  return {
    mode,
    targetLang: 'EN',
    band: BAND_DEFAULT,
    glossary: [],
    scoreThreshold: 0.70,
    maxRecreate: 2,
    contextBridge: '',
  };
}

// ============================================================
// PART 3 — MODE1: 원문 보존형 프롬프트
// ============================================================

/**
 * MODE1 — 원문 보존형
 * 기준: 원문 구조와 형식을 얼마나 유지하느냐
 * Band: 0.480(자연스러움 보정) ~ 0.520(직역)
 */
function buildFidelityDirective(band: number): string {
  const b = clampBand(band);
  const delta = b - BAND_DEFAULT;

  if (delta <= -0.012) {
    return `[MODE1:Fidelity ${b.toFixed(3)}] Naturalization allowed.
- Sentence restructuring allowed when it improves target language flow.
- Idiomatic equivalents preferred over literal translation.
- PRESERVE: character names, place names, glossary-locked terms.
- PRESERVE: intentional repetition, emotional tone, narrative rhythm.
- DO NOT add emotions, explanations, or information not in the source.`;
  }
  if (delta <= -0.004) {
    return `[MODE1:Fidelity ${b.toFixed(3)}] Slight naturalization.
- Minor sentence reordering allowed only when source syntax creates awkward target language.
- Prefer source structure; adjust only where grammar demands it.
- Keep source idioms if comprehensible; adapt only truly opaque ones.
- PRESERVE: sentence length pattern, paragraph breaks, intentional repetition.
- DO NOT add emotions, explanations, or information not in the source.`;
  }
  if (delta <= 0.004) {
    return `[MODE1:Fidelity ${b.toFixed(3)}] Source-faithful (default).
- Maintain original sentence structure as closely as target language allows.
- Translate sentence-by-sentence. Do not merge or split unless grammatically impossible.
- Keep the original paragraph breaks exactly.
- Preserve intentional repetition — do NOT replace with synonyms.
- Preserve emotional distance — do NOT add feelings the author didn't write.
- Minimal pronoun insertion only where target language requires an explicit subject.
- DO NOT add emotions, explanations, or information not in the source.`;
  }
  if (delta <= 0.012) {
    return `[MODE1:Fidelity ${b.toFixed(3)}] Source-strict.
- Mirror source sentence structure even at minor cost to fluency.
- Avoid pronoun substitution — repeat names as in the source when possible.
- Keep sentence length ratios close to original (short→short, long→long).
- Translate idioms literally unless completely incomprehensible.
- PRESERVE: all repetition, all paragraph breaks, all sentence boundaries.
- DO NOT add emotions, explanations, or information not in the source.`;
  }
  return `[MODE1:Fidelity ${b.toFixed(3)}] Near-literal.
- Translate word-by-word where possible, phrase-by-phrase otherwise.
- Maintain source sentence order even if target reads slightly unusual.
- Keep all repetition verbatim.
- Sacrifice target language naturalness to preserve source texture.
- DO NOT add emotions, explanations, or information not in the source.`;
}

// ============================================================
// PART 4 — MODE2: 독자 경험형 프롬프트
// ============================================================

/**
 * MODE2 — 독자 경험형
 * 기준: 타겟 독자가 원문 독자와 같은 감정/몰입을 느끼는가
 * Band: 0.480(적극 재창조) ~ 0.520(보수적 재현)
 */
function buildExperienceDirective(band: number, targetLang: TranslationTarget): string {
  const b = clampBand(band);
  const delta = b - BAND_DEFAULT;
  const lang = langName(targetLang);

  if (delta <= -0.012) {
    return `[MODE2:Experience ${b.toFixed(3)}] Full cultural recreation.
- You are not translating — you are REWRITING this scene for ${lang} readers.
- Restructure sentences, paragraphs, and pacing to match ${lang} fiction conventions.
- Replace culturally opaque references with equivalents that produce the same emotional effect.
- Dialogue must sound like real ${lang} speech — natural contractions, rhythm, subtext.
- If 3 Korean sentences create one feeling, use 2 ${lang} sentences if that achieves the same feeling better.
- The reader must NEVER feel they are reading a translation.
- PRESERVE: the emotional arc, the tension, the atmosphere, the character's inner state.
- PRESERVE: glossary-locked terms exactly.
- DO NOT add new plot, new information, or new emotions not implied by the source.`;
  }
  if (delta <= -0.004) {
    return `[MODE2:Experience ${b.toFixed(3)}] Active adaptation.
- Prioritize how the scene FEELS to a ${lang} reader over how it was structured in Korean.
- Merge or split sentences when the emotional rhythm demands it.
- Adapt cultural references that would confuse or distract the target reader.
- Dialogue must sound natural and alive — not translated.
- PRESERVE: emotional tone, narrative tension, character voice, atmosphere.
- PRESERVE: glossary-locked terms exactly.
- DO NOT add new information or emotions beyond what the source implies.`;
  }
  if (delta <= 0.004) {
    return `[MODE2:Experience ${b.toFixed(3)}] Balanced recreation (default).
- Translate for emotional equivalence: the ${lang} reader should feel what the Korean reader felt.
- Follow source structure when it works in ${lang}; deviate when it doesn't serve the feeling.
- Keep the author's rhythm where possible, but ${lang} reading rhythm takes priority.
- Cultural references: keep if universally understood, adapt if they'd break immersion.
- Dialogue: natural ${lang} speech, not literal translation.
- PRESERVE: emotional arc, character voice, narrative atmosphere, tension.
- PRESERVE: glossary-locked terms exactly.
- DO NOT invent new emotions, plot points, or information.`;
  }
  if (delta <= 0.012) {
    return `[MODE2:Experience ${b.toFixed(3)}] Conservative recreation.
- Stay closer to source structure while ensuring the emotional impact carries through.
- Restructure only when the source structure actively harms the reading experience in ${lang}.
- Cultural references: prefer keeping with minimal context clues over full adaptation.
- Dialogue: natural but closer to source phrasing.
- PRESERVE: emotional arc, source structure where possible, character voice.
- PRESERVE: glossary-locked terms exactly.
- DO NOT add new information.`;
  }
  return `[MODE2:Experience ${b.toFixed(3)}] Minimal recreation.
- Follow source structure closely but ensure basic emotional readability.
- Restructure only when absolutely necessary for comprehension.
- Keep most cultural references intact.
- PRESERVE: source structure, emotional arc, all glossary terms.
- DO NOT add new information.`;
}

// ============================================================
// PART 5 — 통합 시스템 프롬프트 빌더
// ============================================================

export function buildTranslationSystemPrompt(config: TranslationConfig): string {
  const parts: string[] = [];
  const lang = langName(config.targetLang);
  const isMode1 = config.mode === 'fidelity';

  // 역할 정의 (모드별 분기)
  if (isMode1) {
    parts.push(`You are a professional literary translator specializing in Korean fiction.
Your task: translate Korean novel text into ${lang} while preserving the source text's structure and form.
You translate ONLY the text given. Output ONLY the translated text, nothing else.`);
  } else {
    parts.push(`You are a literary author who reimagines Korean fiction for ${lang} readers.
Your task: recreate Korean novel text so that ${lang} readers experience the same emotions and immersion as the original Korean readers.
This is not word-for-word translation — it is emotional and cultural recreation.
Output ONLY the recreated text, nothing else.`);
  }

  // 모드별 Band 지시문
  if (isMode1) {
    parts.push(buildFidelityDirective(config.band));
  } else {
    parts.push(buildExperienceDirective(config.band, config.targetLang));
  }

  // 공통 규칙
  if (isMode1) {
    parts.push(`[Novel Translation Rules — Source Preservation]
- Short sentences stay short. Do not combine short sentences into complex ones.
- Intentional repetition is a stylistic choice — keep it. Do not replace with synonyms.
- If the source has no emotion words, the translation has no emotion words.
- Physical/sensory descriptions must retain their precision (sounds, textures, movements).
- Dialogue must sound like natural spoken ${lang}, not written prose.
- Maintain tense consistency (follow the source tense).
- Do not add transition words, hedging, or filler not present in the source.
- Paragraph breaks must match the source exactly.`);
  } else {
    parts.push(`[Novel Recreation Rules — Reader Experience]
- The reader's emotional journey matters more than sentence-level accuracy.
- If the source creates unease through repetition, create unease — but use whatever ${lang} technique works best.
- If the source builds tension through short choppy sentences, build tension — even if it takes different sentence shapes.
- Sensory details (sounds, textures, temperatures) are the soul of immersion — translate the SENSATION, not just the word.
- Dialogue is character — each person must sound distinct and alive in ${lang}.
- Pacing: match the source's emotional pacing, not its word count.
- Do NOT explain what the source implies. If the original is ambiguous, stay ambiguous.
- Do NOT add emotions the author chose not to write. Restraint is a choice — respect it.`);
  }

  // 번역투 금지 (공통, 표현만 모드에 맞게)
  parts.push(`[Anti-Translationese Rules]
- No unnatural passive voice inherited from Korean grammar.
- No excessive subject repetition — use pronouns where ${lang} naturally would.
- No stiff formal register unless the source is formally written.
- No "translation smell": awkward collocations, unnatural word order, robotic rhythm.
- The result must read as if originally written in ${lang}.`);

  // 용어집
  if (config.glossary.length > 0) {
    const glossaryLines = config.glossary.map(g => {
      const lock = g.locked ? ' [LOCKED]' : '';
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
// PART 6 — 3문장 청킹
// ============================================================

export function chunkBySentences(text: string, chunkSize: number = 3): string[] {
  const sentencePattern = /(?<=[.!?。]\s)|(?<=[다요죠까네음임됨함]\.\s)|(?<=\n\n)/g;
  const sentences = text.split(sentencePattern).filter(s => s.trim().length > 0);

  const chunks: string[] = [];
  for (let i = 0; i < sentences.length; i += chunkSize) {
    const chunk = sentences.slice(i, i + chunkSize).join('');
    if (chunk.trim().length > 0) {
      chunks.push(chunk.trim());
    }
  }

  if (chunks.length === 0 && text.trim().length > 0) {
    chunks.push(text.trim());
  }

  return chunks;
}

// ============================================================
// PART 7 — 채점 프롬프트 (모드별 분기)
// ============================================================

export function buildScoringPrompt(
  sourceText: string,
  translatedText: string,
  config: TranslationConfig
): string {
  const lang = langName(config.targetLang);

  if (config.mode === 'fidelity') {
    return buildFidelityScoringPrompt(sourceText, translatedText, config, lang);
  }
  return buildExperienceScoringPrompt(sourceText, translatedText, config, lang);
}

function buildFidelityScoringPrompt(
  sourceText: string, translatedText: string,
  config: TranslationConfig, lang: string
): string {
  return `You are a translation quality judge for Korean→${lang} fiction (SOURCE PRESERVATION mode).

Score on 4 axes (0.00 to 1.00):

1. **translationese** (LOWER is better): Does it smell like a translation?
   0.00 = reads like native ${lang} prose. 1.00 = obviously machine-translated.

2. **fidelity** (HIGHER is better): Does it preserve source meaning and structure?
   Band level: ${config.band.toFixed(3)}.

3. **naturalness** (HIGHER is better): Does it flow as natural ${lang} prose?

4. **consistency** (HIGHER is better): Are glossary terms used correctly?
   ${config.glossary.length > 0 ? config.glossary.map(g => `"${g.source}"→"${g.target}"`).join(', ') : 'No glossary — score 1.00.'}

Respond ONLY with JSON:
{"translationese": 0.00, "fidelity": 0.00, "naturalness": 0.00, "consistency": 0.00}

--- SOURCE ---
${sourceText}

--- TRANSLATION ---
${translatedText}`;
}

function buildExperienceScoringPrompt(
  sourceText: string, translatedText: string,
  config: TranslationConfig, lang: string
): string {
  return `You are a literary quality judge for Korean→${lang} fiction (READER EXPERIENCE mode).
The goal is NOT literal accuracy — it is whether the ${lang} reader feels what the Korean reader felt.

Score on 4 axes (0.00 to 1.00):

1. **immersion** (HIGHER is better): Can a ${lang} reader read this without pausing?
   Does every sentence flow naturally? Would they ever think "this feels translated"?
   0.00 = constantly breaks immersion. 1.00 = reads like original ${lang} fiction.

2. **emotionResonance** (HIGHER is better): Does the translation produce the same emotional effect?
   If the source is cold and detached, is the translation cold and detached?
   If the source builds unease, does the translation build unease?
   0.00 = emotional tone completely lost. 1.00 = identical emotional impact.

3. **culturalFit** (HIGHER is better): Are there moments where a ${lang} reader would be confused or distracted by cultural context?
   0.00 = full of unexplained cultural references. 1.00 = perfectly adapted for ${lang} readers.

4. **consistency** (HIGHER is better): Are character names, terminology, tone, and point of view consistent?
   ${config.glossary.length > 0 ? config.glossary.map(g => `"${g.source}"→"${g.target}"`).join(', ') : 'No glossary — score 1.00.'}

Respond ONLY with JSON:
{"immersion": 0.00, "emotionResonance": 0.00, "culturalFit": 0.00, "consistency": 0.00}

--- SOURCE ---
${sourceText}

--- TRANSLATION ---
${translatedText}`;
}

// ============================================================
// PART 8 — 채점 파싱 (모드별)
// ============================================================

export function parseScoreResponse(raw: string, mode: TranslationMode): ChunkScoreDetail {
  if (mode === 'fidelity') return parseFidelityScore(raw);
  return parseExperienceScore(raw);
}

function parseFidelityScore(raw: string): FidelityScoreDetail {
  const fallback: FidelityScoreDetail = {
    overall: 0.5, translationese: 0.5, fidelity: 0.5, naturalness: 0.5, consistency: 1.0,
  };
  try {
    const jsonMatch = raw.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) return fallback;
    const p = JSON.parse(jsonMatch[0]);
    const t = clamp01(p.translationese ?? 0.5);
    const f = clamp01(p.fidelity ?? 0.5);
    const n = clamp01(p.naturalness ?? 0.5);
    const c = clamp01(p.consistency ?? 1.0);
    // 종합: (1-번역투)*0.35 + 충실도*0.30 + 자연스러움*0.25 + 일관성*0.10
    const overall = (1 - t) * 0.35 + f * 0.30 + n * 0.25 + c * 0.10;
    return { overall: round3(overall), translationese: t, fidelity: f, naturalness: n, consistency: c };
  } catch { return fallback; }
}

function parseExperienceScore(raw: string): ExperienceScoreDetail {
  const fallback: ExperienceScoreDetail = {
    overall: 0.5, immersion: 0.5, emotionResonance: 0.5, culturalFit: 0.5, consistency: 1.0,
  };
  try {
    const jsonMatch = raw.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) return fallback;
    const p = JSON.parse(jsonMatch[0]);
    const i = clamp01(p.immersion ?? 0.5);
    const e = clamp01(p.emotionResonance ?? 0.5);
    const cf = clamp01(p.culturalFit ?? 0.5);
    const c = clamp01(p.consistency ?? 1.0);
    // 종합: 몰입도*0.30 + 감정재현*0.30 + 문화적합*0.25 + 일관성*0.15
    const overall = i * 0.30 + e * 0.30 + cf * 0.25 + c * 0.15;
    return { overall: round3(overall), immersion: i, emotionResonance: e, culturalFit: cf, consistency: c };
  } catch { return fallback; }
}

// ============================================================
// PART 9 — 재창조 프롬프트 (모드별)
// ============================================================

export function buildRecreatePrompt(
  sourceText: string,
  failedTranslation: string,
  scoreDetail: ChunkScoreDetail,
  attempt: number,
  mode: TranslationMode
): string {
  const issues: string[] = [];

  if (mode === 'fidelity' && isFidelityScore(scoreDetail)) {
    if (scoreDetail.translationese > 0.4) issues.push('Reads like a translation (번역투). Rewrite to sound native.');
    if (scoreDetail.fidelity < 0.6) issues.push('Strayed too far from source meaning or structure.');
    if (scoreDetail.naturalness < 0.6) issues.push('Unnatural phrasing or rhythm.');
    if (scoreDetail.consistency < 0.8) issues.push('Glossary terms inconsistent.');
  } else if (mode === 'experience' && isExperienceScore(scoreDetail)) {
    if (scoreDetail.immersion < 0.6) issues.push('Reader would pause — not immersive enough. Sounds translated.');
    if (scoreDetail.emotionResonance < 0.6) issues.push('Emotional impact lost. The feeling doesn\'t match the source.');
    if (scoreDetail.culturalFit < 0.6) issues.push('Cultural references confuse the target reader.');
    if (scoreDetail.consistency < 0.8) issues.push('Names, terms, or tone inconsistent.');
  }

  const strategy = attempt === 1
    ? (mode === 'fidelity'
        ? 'Take a completely different structural approach. If literal, try freer. If free, try closer.'
        : 'Forget the previous attempt. Read the source again and ask: what does this scene FEEL like? Then write that feeling in the target language from scratch.')
    : (mode === 'fidelity'
        ? 'Reimagine sentence-by-sentence with fresh word choices and rhythm.'
        : 'Imagine you are the original author, but you write in the target language. Write this scene as YOUR scene.');

  return `The previous translation scored poorly. DO NOT repeat the same approach.

[Issues]
${issues.join('\n')}

[Failed attempt]
${failedTranslation}

[New strategy]
${strategy}

Translate the source again with a DIFFERENT approach. Output ONLY the new translation.

--- SOURCE ---
${sourceText}`;
}

// ============================================================
// PART 10 — 유틸리티
// ============================================================

function langName(lang: TranslationTarget): string {
  const names: Record<TranslationTarget, string> = { EN: 'English', JP: 'Japanese', CN: 'Chinese', KO: 'Korean' };
  return names[lang];
}

function clamp01(v: number): number { return Math.max(0, Math.min(1, v)); }
function round3(v: number): number { return Math.round(v * 1000) / 1000; }

/** Band 값 → 사용자 레이블 (모드별) */
export function bandLabel(band: number, mode: TranslationMode, isKO: boolean): string {
  const b = clampBand(band);
  const delta = b - BAND_DEFAULT;

  if (mode === 'fidelity') {
    if (isKO) {
      if (delta <= -0.012) return '자연스러움 허용';
      if (delta <= -0.004) return '약간의 보정';
      if (delta <= 0.004) return '원문 유지 (기본)';
      if (delta <= 0.012) return '원문 고수';
      return '직역';
    }
    if (delta <= -0.012) return 'Naturalization allowed';
    if (delta <= -0.004) return 'Slight adjustment';
    if (delta <= 0.004) return 'Source-faithful (default)';
    if (delta <= 0.012) return 'Source-strict';
    return 'Near-literal';
  }

  // MODE2: Experience
  if (isKO) {
    if (delta <= -0.012) return '적극 재창조';
    if (delta <= -0.004) return '능동 적응';
    if (delta <= 0.004) return '균형 재현 (기본)';
    if (delta <= 0.012) return '보수적 재현';
    return '최소 재현';
  }
  if (delta <= -0.012) return 'Full recreation';
  if (delta <= -0.004) return 'Active adaptation';
  if (delta <= 0.004) return 'Balanced recreation (default)';
  if (delta <= 0.012) return 'Conservative recreation';
  return 'Minimal recreation';
}

/** Band 메타데이터 */
export const BAND_META = {
  min: BAND_MIN,
  max: BAND_MAX,
  default: BAND_DEFAULT,
  step: BAND_STEP,
  steps: Math.round((BAND_MAX - BAND_MIN) / BAND_STEP) + 1, // 41
} as const;

/** 모드 설명 */
export function modeDescription(mode: TranslationMode, isKO: boolean): { title: string; desc: string } {
  if (mode === 'fidelity') {
    return isKO
      ? { title: 'MODE 1 — 원문 보존', desc: '원문의 구조, 문장 형식, 리듬을 최대한 유지하며 번역합니다.' }
      : { title: 'MODE 1 — Source Preservation', desc: 'Preserves the original structure, sentence form, and rhythm.' };
  }
  return isKO
    ? { title: 'MODE 2 — 독자 경험', desc: '타겟 독자가 원문 독자와 같은 감정과 몰입을 느끼도록 재창조합니다.' }
    : { title: 'MODE 2 — Reader Experience', desc: 'Recreates the text so target readers feel the same emotions and immersion.' };
}

// IDENTITY_SEAL: PART-1  | role=Types | inputs=none | outputs=TranslationMode,TranslationConfig,FidelityScoreDetail,ExperienceScoreDetail
// IDENTITY_SEAL: PART-2  | role=BandUtils | inputs=band(number) | outputs=clamped(number),config
// IDENTITY_SEAL: PART-3  | role=FidelityDirective | inputs=band | outputs=directive(string)
// IDENTITY_SEAL: PART-4  | role=ExperienceDirective | inputs=band,targetLang | outputs=directive(string)
// IDENTITY_SEAL: PART-5  | role=SystemPromptBuilder | inputs=TranslationConfig | outputs=systemPrompt(string)
// IDENTITY_SEAL: PART-6  | role=Chunking | inputs=text,chunkSize | outputs=string[]
// IDENTITY_SEAL: PART-7  | role=ScoringPrompt | inputs=source,translation,config | outputs=scoringPrompt(string)
// IDENTITY_SEAL: PART-8  | role=ScoreParsing | inputs=raw,mode | outputs=ChunkScoreDetail
// IDENTITY_SEAL: PART-9  | role=RecreatePrompt | inputs=source,failed,score,attempt,mode | outputs=recreatePrompt(string)
// IDENTITY_SEAL: PART-10 | role=Utilities | inputs=lang,band,mode | outputs=labels,constants,descriptions
