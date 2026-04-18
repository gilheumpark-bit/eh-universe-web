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

/**
 * 축약형 강도 (대사 밖 서술 기준)
 * 건조한 작품/기록체에서는 low가 적합
 */
export type ContractionLevel = 'none' | 'low' | 'normal' | 'high';

/** 캐릭터 화체 프로필 (번역 시 레지스터 일관성용) */
export interface TranslationCharacterRegister {
  name: string;           // 캐릭터명
  relation: string;       // stranger|formal|colleague|friend|intimate|hostile
  age: string;            // teen|young_adult|adult|middle|elder
  profession?: string;    // 직업/역할
  profanity: string;      // none|mild|strong
}

/** 번역 오류 패턴 프로필 (EMA 학습용) */
export interface TranslatorProfile {
  id: string;
  episodeCount: number;
  avgScore: number;
  termConsistencyRate: number;     // 용어 일관성 비율
  toneAlignmentRate: number;       // 톤 정합성 비율
  commonErrors: Record<string, number>; // 오류 종류별 누적 빈도
  updatedAt: number;
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
  // MODE2 세부 제어
  contractionLevel: ContractionLevel;  // 축약형 강도 (기본 'normal')
  // 장르 프리셋 (번역 톤/문체 자동 조절)
  genre?: string;                 // GENRE_PRESETS 키 (e.g. 'ROMANCE', 'WUXIA')
  // 캐릭터 레지스터 (화체 일관성 검증)
  characterRegisters?: TranslationCharacterRegister[];
  // 번역 오류 패턴 학습 프로필
  translatorProfile?: TranslatorProfile;
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

/** MODE2 채점 — 독자 경험형 (6축) */
export interface ExperienceScoreDetail {
  overall: number;
  immersion: number;         // 독자 몰입도 — 멈추지 않고 읽히는가
  emotionResonance: number;  // 감정 재현도 — 원문이 주는 감정이 살아있는가 (과잉도 감점)
  culturalFit: number;       // 문화 적합도 — 타겟 독자에게 어색함이 없는가
  consistency: number;       // 일관성 — 인명/용어/시점/톤
  groundedness: number;      // 무근거 보강 없음 — 모든 요소가 원문에 근거하는가
  voiceInvisibility: number; // 번역자 투명성 — 번역자의 문학적 목소리가 숨어있는가
}

/** 통합 채점 결과 (모드에 따라 내부 구조 다름) */
export type ChunkScoreDetail = FidelityScoreDetail | ExperienceScoreDetail;

/** 타입 가드 */
export function isFidelityScore(s: ChunkScoreDetail): s is FidelityScoreDetail {
  return 'translationese' in s;
}
export function isExperienceScore(s: ChunkScoreDetail): s is ExperienceScoreDetail {
  return 'immersion' in s && 'groundedness' in s;
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
    contractionLevel: 'normal',
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
// PART 4B — MODE2 경험형 가드 (무근거 보강 / 세공 제한 / 축약형)
// ============================================================

/**
 * MODE2 전용 3중 가드:
 * 1) 무근거 보강 금지 — 원문에 없는 시간감, 정서, 암시 추가 차단
 * 2) 세공된 재치 문장 제한 — 번역자의 저자성 침범 방지
 * 3) 축약형 강도 제어 — 작품 톤에 맞는 수축형 레벨
 */
function buildExperienceGuards(config: TranslationConfig): string {
  const sections: string[] = [];

  // 1) 무근거 보강 금지
  sections.push(`[GUARD: No Groundless Reinforcement]
Do NOT insert words, phrases, or implications that have no basis in the source text.
Specifically forbidden additions:
- Time markers not in source: "for years", "always", "never", "once", "already", "still" (unless source has equivalent)
- Emotional hedging: "somehow", "almost", "as if", "seemed to", "a kind of" (unless source has equivalent)
- Interpretive additions: "or care", "for all she knew", "like it had always been"
- Causal links the source doesn't make: "because", "so that", "which meant"
- Atmospheric padding: "in the silence", "without a word", "just like that"
If the source states a fact flatly, translate it flatly. Do not dramatize neutral statements.
If the source is ambiguous, stay ambiguous — do not resolve ambiguity with added words.`);

  // 2) 세공된 재치 문장 제한
  sections.push(`[GUARD: No Translator Wit]
Do NOT craft clever, polished, or aphoristic sentences that exceed the source's literary register.
If the source says something plainly, the translation must be plain.
Examples of forbidden translator wit:
- Turning a simple observation into an elegant paradox
- Adding rhetorical symmetry the source doesn't have
- Making a flat statement "quotable" or "literary"
- Inserting wordplay, alliteration, or rhythmic flourishes beyond the source's own
The author's voice is the only voice allowed. The translator is invisible.`);

  // 3) 축약형 제어
  const contractionRule = buildContractionRule(config.contractionLevel);
  sections.push(contractionRule);

  return sections.join('\n\n');
}

function buildContractionRule(level: ContractionLevel): string {
  switch (level) {
    case 'none':
      return `[GUARD: Contractions — NONE]
Do not use contractions in narration or dialogue. Write all words in full form.
"do not" instead of "don't", "could not" instead of "couldn't", etc.
This applies to all text including dialogue.`;
    case 'low':
      return `[GUARD: Contractions — LOW]
Narration/description: Do NOT use contractions. Write in full form ("did not", "could not", "was not").
Dialogue only: Contractions are allowed when they match the character's natural speech.
This creates a formal, documentary tone in narration while keeping dialogue alive.`;
    case 'normal':
      return `[GUARD: Contractions — NORMAL]
Dialogue: Use contractions naturally.
Narration: Use contractions sparingly — only where the prose rhythm strongly benefits.
Default to full forms in narration for dry, restrained, or formal source texts.`;
    case 'high':
      return `[GUARD: Contractions — HIGH]
Use contractions freely in both narration and dialogue for a casual, conversational tone.
"didn't", "couldn't", "wasn't", "it's", "that's" — all allowed everywhere.
Appropriate for light novels, web fiction, casual first-person narration.`;
  }
}

// ============================================================
// PART 4C — 국가별 웹소설 현지화 알고리즘 (JP, CN 특화)
// ============================================================

function buildCountrySpecificDirective(targetLang: TranslationTarget, mode: TranslationMode): string {
  if (mode !== 'experience') return ''; // Fidelity 모드에서는 원문 1:1 대응 원칙이므로 생략

  if (targetLang === 'JP') {
    return `[JA Localization Algorithm (Narou/Light Novel Style)]
- **Pronouns & Honorifics:** Carefully choose first-person pronouns (俺/僕/私) and second-person pronouns (お前/君/あなた) based on the character's relation and personality.
- **Suffixes:** Retain or adapt honorific suffixes (-san, -sama, -kun, -chan) if it fits the character dynamics. Translate "선배", "형", "오빠", "누나" to appropriate Japanese equivalents.
- **Emphasis:** Use Japanese quotation marks (「」 and 『』). Use Katakana (カタカナ) creatively for emphasis, foreign concepts, or magic spells.
- **Reading Rhythm:** Japanese web novels (Narou-kei) favor extremely short paragraphs and frequent line breaks. Embrace this spacing if the source text implies a fast pace.
- **Tone:** Translate distinct anime/manga tropes smoothly (e.g., Tsundere, Chuunibyou elements) using native Japanese otaku/novel vocabularies.`;
  }

  if (targetLang === 'CN') {
    return `[ZH Localization Algorithm (Wangwen/Xianxia Style)]
- **Cultural Equivalents:** Convert Korean idioms into equivalent four-character Chinese idioms (成语 - Chengyu) where it elevates the prose naturally.
- **Honorifics & Titles:** Translate martial arts or interpersonal titles into proper Wuxia/Xianxia terms (e.g., 사형 → 师兄 Shixiong, 장문인 → 掌门 Zhangmen, 도련님 → 少爷 Shaoye).
- **Prose Style:** Chinese web fiction flows with punchy, rhythmic sentences (often pairing 4-character or 6-character phrases). Adapt sentence structure to fit this cadence.
- **Emphasis & Formatting:** Use full-width punctuation. Translate distinct Korean web novel slang into equivalent native Chinese web novel slang (网文) where possible.
- **Pacing:** Chinese readers expect forward momentum. Ensure action scenes read dynamically without bloated descriptive padding.`;
  }

  return '';
}

// ============================================================
// PART 5 — 통합 시스템 프롬프트 빌더
// ============================================================

const MAX_CONTEXT_BRIDGE_CHARS = 2000;

export function buildTranslationSystemPrompt(config: TranslationConfig): string {
  // Guard: clamp band to valid range regardless of caller input
  const safeBand = clampBand(config.band);
  const safeConfig: TranslationConfig = {
    ...config,
    band: safeBand,
    contextBridge: config.contextBridge?.slice(0, MAX_CONTEXT_BRIDGE_CHARS) ?? '',
  };

  const parts: string[] = [];
  const lang = langName(safeConfig.targetLang);
  const isMode1 = safeConfig.mode === 'fidelity';

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
    parts.push(buildFidelityDirective(safeConfig.band));
  } else {
    parts.push(buildExperienceDirective(safeConfig.band, safeConfig.targetLang));
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

  // 번역투 금지 (공통)
  parts.push(`[Anti-Translationese Rules]
- No unnatural passive voice inherited from Korean grammar.
- No excessive subject repetition — use pronouns where ${lang} naturally would.
- No stiff formal register unless the source is formally written.
- No "translation smell": awkward collocations, unnatural word order, robotic rhythm.
- The result must read as if originally written in ${lang}.`);

  // MODE2 전용 가드: 무근거 보강 금지 + 세공 제한 + 축약형 제어
  if (!isMode1) {
    parts.push(buildExperienceGuards(safeConfig));
  }

  // 용어집
  if (safeConfig.glossary.length > 0) {
    const glossaryLines = safeConfig.glossary.map(g => {
      const lock = g.locked ? ' [LOCKED]' : '';
      const ctx = g.context ? ` (${g.context})` : '';
      return `  "${g.source}" → "${g.target}"${ctx}${lock}`;
    });
    parts.push(`[Glossary — MUST use these translations consistently]
${glossaryLines.join('\n')}`);
  }

  // 국가 별 특정 알고리즘 주입 (일본/중국 웹소설 특화)
  const countryDirective = buildCountrySpecificDirective(safeConfig.targetLang, safeConfig.mode);
  if (countryDirective) {
    parts.push(countryDirective);
  }

  // 장르 프리셋 주입 (PART 13)
  if (safeConfig.genre) {
    const genreDirective = buildGenreTranslationDirective(safeConfig.genre, safeConfig.targetLang);
    if (genreDirective) parts.push(genreDirective);
  }

  // 캐릭터 레지스터 주입 (PART 14)
  if (safeConfig.characterRegisters && safeConfig.characterRegisters.length > 0) {
    const registerDirective = buildCharacterRegisterDirective(safeConfig.characterRegisters, safeConfig.targetLang);
    parts.push(registerDirective);
  }

  // 번역 오류 패턴 힌트 (PART 15)
  if (safeConfig.translatorProfile) {
    const profileHint = buildTranslatorProfileHint(safeConfig.translatorProfile);
    if (profileHint) parts.push(profileHint);
  }

  // 문맥 브릿지 (length-guarded via safeConfig)
  if (safeConfig.contextBridge.trim()) {
    parts.push(`[Context from previous chapter — for continuity only, do NOT translate this]
${safeConfig.contextBridge}`);
  }

  return parts.join('\n\n');
}

// ============================================================
// PART 6 — 3문장 청킹
// ============================================================

/**
 * 소설 텍스트를 문장 단위로 분리한 뒤 chunkSize개씩 묶는다.
 *
 * 분리 전략:
 * 1. 빈 줄(단락 구분)을 최우선 분리 지점으로 사용
 * 2. 단락 내부에서는 한국어 종결 어미 + 마침표/물음표/느낌표 패턴으로 분리
 * 3. 대사 내부의 마침표("알겠다." 민아는...)에서 잘리지 않도록 보호
 * 4. 줄임표(...) 뒤에서 오분리 방지
 */
export function chunkBySentences(text: string, chunkSize: number = 3): string[] {
  // 1단계: 빈 줄 기준으로 단락 분리
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);

  // 2단계: 단락 내에서 문장 분리
  const allSentences: string[] = [];
  for (const para of paragraphs) {
    const sentences = splitSentences(para);
    allSentences.push(...sentences);
    // 단락 경계 마커: 빈 문자열로 표시 (나중에 줄바꿈 복원용)
    allSentences.push('\n\n');
  }
  // 마지막 단락 경계 제거
  if (allSentences.length > 0 && allSentences[allSentences.length - 1] === '\n\n') {
    allSentences.pop();
  }

  // 3단계: chunkSize개씩 묶기
  const chunks: string[] = [];
  let buffer: string[] = [];
  let sentenceCount = 0;

  for (const s of allSentences) {
    if (s === '\n\n') {
      // 단락 경계는 문장 수에 포함하지 않되, 버퍼에는 추가
      if (buffer.length > 0) buffer.push('\n\n');
      continue;
    }
    buffer.push(s);
    sentenceCount++;

    if (sentenceCount >= chunkSize) {
      chunks.push(buffer.join('').trim());
      buffer = [];
      sentenceCount = 0;
    }
  }
  if (buffer.length > 0) {
    const remaining = buffer.join('').trim();
    if (remaining.length > 0) chunks.push(remaining);
  }

  if (chunks.length === 0 && text.trim().length > 0) {
    chunks.push(text.trim());
  }

  return chunks;
}

// 따옴표 페어 매핑: 열림 → 닫힘
const QUOTE_PAIRS: Record<string, string> = {
  '\u201C': '\u201D', // " → "
  '\u300C': '\u300D', // 「 → 」
  '"': '"',           // 일반 큰따옴표 (열림/닫힘 동일)
};
const QUOTE_OPENERS = new Set(Object.keys(QUOTE_PAIRS));
const QUOTE_CLOSERS = new Set(Object.values(QUOTE_PAIRS));

/**
 * 단락 내 문장 분리.
 * - 따옴표 스택으로 중첩 대사 보호 (열림/닫힘 페어 매칭)
 * - 줄임표(...)가 포함된 문장은 다음 종결까지 이어붙임
 * - 영문 약어(U.S.A.) 오분리 방지: 단일 대문자 + . 패턴 스킵
 */
function splitSentences(paragraph: string): string[] {
  const sentences: string[] = [];
  let current = '';
  const quoteStack: string[] = [];
  let inEllipsis = false;

  for (let i = 0; i < paragraph.length; i++) {
    const ch = paragraph[i];
    const next = paragraph[i + 1];
    current += ch;

    // 따옴표 스택 관리
    if (QUOTE_OPENERS.has(ch)) {
      // 일반 큰따옴표(")는 토글: 스택 top이 "이면 닫기, 아니면 열기
      if (ch === '"') {
        if (quoteStack.length > 0 && quoteStack[quoteStack.length - 1] === '"') {
          quoteStack.pop();
        } else {
          quoteStack.push(ch);
        }
      } else {
        quoteStack.push(ch);
      }
      continue;
    }
    if (QUOTE_CLOSERS.has(ch) && quoteStack.length > 0) {
      const top = quoteStack[quoteStack.length - 1];
      if (QUOTE_PAIRS[top] === ch) quoteStack.pop();
      continue;
    }

    // 줄임표 감지: 연속 3개 이상의 마침표
    if (ch === '.' && next === '.') { inEllipsis = true; continue; }
    if (inEllipsis && ch === '.') continue; // 줄임표 내부
    if (inEllipsis && ch !== '.') { inEllipsis = false; } // 줄임표 끝

    // 대사(따옴표) 안에서는 분리하지 않음
    if (quoteStack.length > 0) continue;

    // 영문 약어 스킵: 대문자 1글자 + . (e.g. U.S.A.)
    if (ch === '.' && i >= 1) {
      const prev = paragraph[i - 1];
      if (prev >= 'A' && prev <= 'Z' && next && next >= 'A' && next <= 'Z') continue;
    }

    // 문장 종결 감지: [.!?。] 뒤에 공백/줄바꿈/EOF
    if ((ch === '.' || ch === '!' || ch === '?' || ch === '\u3002') &&
        (next === undefined || next === ' ' || next === '\n' || next === '\t')) {
      const trimmed = current.trim();
      if (trimmed.length > 0) {
        sentences.push(trimmed);
        current = '';
      }
    }
  }

  const trimmed = current.trim();
  if (trimmed.length > 0) sentences.push(trimmed);

  return sentences;
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
ALSO check for translator overreach: additions, dramatization, or literary polish not present in the source.

Score on 6 axes (0.00 to 1.00):

1. **immersion** (HIGHER is better): Can a ${lang} reader read this without pausing?
   Does every sentence flow naturally? Would they ever think "this feels translated"?
   0.00 = constantly breaks immersion. 1.00 = reads like original ${lang} fiction.

2. **emotionResonance** (HIGHER is better): Does the translation produce the same emotional effect?
   If the source is cold and detached, is the translation cold and detached?
   If the source builds unease, does the translation build unease?
   IMPORTANT: If the translation is MORE emotional than the source, score DOWN. Restraint must be preserved.
   0.00 = emotional tone completely lost or distorted. 1.00 = identical emotional impact.

3. **culturalFit** (HIGHER is better): Are there moments where a ${lang} reader would be confused or distracted by cultural context?
   0.00 = full of unexplained cultural references. 1.00 = perfectly adapted for ${lang} readers.

4. **consistency** (HIGHER is better): Are character names, terminology, tone, and point of view consistent?
   ${config.glossary.length > 0 ? config.glossary.map(g => `"${g.source}"→"${g.target}"`).join(', ') : 'No glossary — score 1.00.'}

5. **groundedness** (HIGHER is better): Does every word in the translation trace back to the source?
   Check for: added time markers ("for years", "always"), emotional hedging ("somehow", "as if"),
   interpretive additions ("or care", "for all she knew"), causal links not in source, atmospheric padding.
   0.00 = many groundless additions. 1.00 = every element traces to source.

6. **voiceInvisibility** (HIGHER is better): Is the translator's own literary voice invisible?
   Check for: clever paradoxes the source doesn't have, aphoristic rewrites of plain statements,
   rhetorical polish beyond the source's register, quotable sentences crafted from flat observations.
   0.00 = translator's wit dominates. 1.00 = only the author's voice is present.

Respond ONLY with JSON:
{"immersion": 0.00, "emotionResonance": 0.00, "culturalFit": 0.00, "consistency": 0.00, "groundedness": 0.00, "voiceInvisibility": 0.00}

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
    overall: 0.5, immersion: 0.5, emotionResonance: 0.5, culturalFit: 0.5,
    consistency: 1.0, groundedness: 0.5, voiceInvisibility: 0.5,
  };
  try {
    const jsonMatch = raw.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) return fallback;
    const p = JSON.parse(jsonMatch[0]);
    const im = clamp01(p.immersion ?? 0.5);
    const er = clamp01(p.emotionResonance ?? 0.5);
    const cf = clamp01(p.culturalFit ?? 0.5);
    const co = clamp01(p.consistency ?? 1.0);
    const gr = clamp01(p.groundedness ?? 0.5);
    const vi = clamp01(p.voiceInvisibility ?? 0.5);
    // 6축 가중치: 몰입*0.22 + 감정재현*0.22 + 문화적합*0.16 + 일관성*0.10 + 무근거*0.15 + 투명성*0.15
    const overall = im * 0.22 + er * 0.22 + cf * 0.16 + co * 0.10 + gr * 0.15 + vi * 0.15;
    return {
      overall: round3(overall), immersion: im, emotionResonance: er,
      culturalFit: cf, consistency: co, groundedness: gr, voiceInvisibility: vi,
    };
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
    if (scoreDetail.emotionResonance < 0.6) issues.push('Emotional impact lost or distorted. The feeling doesn\'t match the source.');
    if (scoreDetail.culturalFit < 0.6) issues.push('Cultural references confuse the target reader.');
    if (scoreDetail.consistency < 0.8) issues.push('Names, terms, or tone inconsistent.');
    if (scoreDetail.groundedness < 0.7) issues.push('Groundless additions detected: words/phrases/implications not in the source were inserted. Remove ALL added time markers, emotional hedging, interpretive additions, and atmospheric padding.');
    if (scoreDetail.voiceInvisibility < 0.7) issues.push('Translator\'s literary voice is showing. Simplify crafted sentences back to the source\'s own register. The translator must be invisible.');
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

/** Band 밴드 라벨 — 4개 언어 네이티브 */
const BAND_LABELS: Record<AppLanguage, { fidelity: string[]; experience: string[] }> = {
  KO: {
    fidelity: ['자연스러움 허용', '약간의 보정', '원문 유지 (기본)', '원문 고수', '직역'],
    experience: ['적극 재창조', '능동 적응', '균형 재현 (기본)', '보수적 재현', '최소 재현'],
  },
  EN: {
    fidelity: ['Naturalization allowed', 'Slight adjustment', 'Source-faithful (default)', 'Source-strict', 'Near-literal'],
    experience: ['Full recreation', 'Active adaptation', 'Balanced recreation (default)', 'Conservative recreation', 'Minimal recreation'],
  },
  JP: {
    fidelity: ['自然さを許容', 'わずかな補正', '原文維持 (基本)', '原文厳守', '直訳'],
    experience: ['積極的再創造', '能動的適応', 'バランス再現 (基本)', '保守的再現', '最小限再現'],
  },
  CN: {
    fidelity: ['允许自然化', '轻微调整', '忠于原文 (基本)', '严守原文', '直译'],
    experience: ['全面再创作', '主动适应', '平衡再现 (基本)', '保守再现', '最小再现'],
  },
};

/** Band 값 → 사용자 레이블 (모드별, 4개 언어) */
export function bandLabel(band: number, mode: TranslationMode, language: AppLanguage): string {
  const b = clampBand(band);
  const delta = b - BAND_DEFAULT;
  const L = BAND_LABELS[language] ?? BAND_LABELS.EN;
  const labels = mode === 'fidelity' ? L.fidelity : L.experience;

  // delta 범위 → 인덱스 매핑 (−0.012 미만 ~ 0.012 초과)
  let idx = 2; // 기본(중간)
  if (delta <= -0.012) idx = 0;
  else if (delta <= -0.004) idx = 1;
  else if (delta <= 0.004) idx = 2;
  else if (delta <= 0.012) idx = 3;
  else idx = 4;
  return labels[idx];
}

/** Band 메타데이터 */
export const BAND_META = {
  min: BAND_MIN,
  max: BAND_MAX,
  default: BAND_DEFAULT,
  step: BAND_STEP,
  steps: Math.round((BAND_MAX - BAND_MIN) / BAND_STEP) + 1, // 41
} as const;

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

/** 축별 critical failure 감지 */
export function hasCriticalAxisFailure(score: ChunkScoreDetail, mode: TranslationMode): boolean {
  if (mode === 'fidelity' && isFidelityScore(score)) {
    // 번역투가 너무 높으면 무조건 실패
    if (score.translationese > 0.60) return true;
    // 충실도가 너무 낮으면 무조건 실패
    if (score.fidelity < 0.40) return true;
    return false;
  }
  if (mode === 'experience' && isExperienceScore(score)) {
    // 무근거 보강이 심하면 무조건 실패
    if (score.groundedness < 0.45) return true;
    // 번역자 투명성이 너무 낮으면 무조건 실패
    if (score.voiceInvisibility < 0.45) return true;
    // 몰입도가 바닥이면 무조건 실패
    if (score.immersion < 0.40) return true;
    return false;
  }
  return false;
}

/** 청크간 용어 일관성 추적기 */
export interface ChunkConsistencyTracker {
  termUsage: Map<string, string>;  // glossary.source → 실제 사용된 target
  inconsistencies: string[];
}

export function createConsistencyTracker(): ChunkConsistencyTracker {
  return { termUsage: new Map(), inconsistencies: [] };
}

/**
 * 청크 번역 완료 후 용어 일관성 추적 업데이트.
 * 이전 청크에서 쓴 용어와 다르게 번역되면 경고.
 */
export function updateConsistencyTracker(
  tracker: ChunkConsistencyTracker,
  chunkIndex: number,
  translatedText: string,
  glossary: GlossaryEntry[],
): void {
  for (const entry of glossary) {
    if (translatedText.includes(entry.target)) {
      const prev = tracker.termUsage.get(entry.source);
      if (prev && prev !== entry.target) {
        tracker.inconsistencies.push(
          `chunk[${chunkIndex}]: "${entry.source}" → "${entry.target}" (was "${prev}" in earlier chunk)`
        );
      }
      tracker.termUsage.set(entry.source, entry.target);
    }
  }
}

// IDENTITY_SEAL: PART-1  | role=Types | inputs=none | outputs=TranslationMode,TranslationConfig,FidelityScoreDetail,ExperienceScoreDetail
// IDENTITY_SEAL: PART-2  | role=BandUtils | inputs=band(number) | outputs=clamped(number),config
// IDENTITY_SEAL: PART-3  | role=FidelityDirective | inputs=band | outputs=directive(string)
// IDENTITY_SEAL: PART-4  | role=ExperienceDirective | inputs=band,targetLang(JP/CN/EN/KO) | outputs=directive(string)
// IDENTITY_SEAL: PART-5  | role=SystemPromptBuilder | inputs=TranslationConfig | outputs=systemPrompt(string)
// IDENTITY_SEAL: PART-6  | role=Chunking | inputs=text,chunkSize | outputs=string[]
// IDENTITY_SEAL: PART-7  | role=ScoringPrompt | inputs=source,translation,config | outputs=scoringPrompt(string)
// IDENTITY_SEAL: PART-8  | role=ScoreParsing | inputs=raw,mode | outputs=ChunkScoreDetail
// IDENTITY_SEAL: PART-9  | role=RecreatePrompt | inputs=source,failed,score,attempt,mode | outputs=recreatePrompt(string)
// IDENTITY_SEAL: PART-10 | role=Utilities | inputs=lang,band,mode | outputs=labels,constants,descriptions
// IDENTITY_SEAL: PART-11 | role=StaticValidation | inputs=source,translated,knownNames | outputs=StaticValidationResult
// IDENTITY_SEAL: PART-12 | role=AutoBridge | inputs=prevResult,glossary | outputs=contextBridge(string)
// IDENTITY_SEAL: PART-13 | role=GenreTranslationStyle | inputs=genre,targetLang | outputs=genreDirective(string)
// IDENTITY_SEAL: PART-14 | role=CharacterRegister | inputs=registers,targetLang | outputs=registerDirective(string)
// IDENTITY_SEAL: PART-15 | role=TranslatorProfile | inputs=profile | outputs=profileHint(string),updatedProfile
// IDENTITY_SEAL: PART-16 | role=AdaptiveChunking | inputs=text,baseSize,maxTokens | outputs=chunkSize(number)
// IDENTITY_SEAL: PART-17 | role=GlossaryVerify | inputs=source,translated,glossary | outputs=GlossaryVerification
// IDENTITY_SEAL: PART-18 | role=LengthVerify | inputs=source,translated,targetLang,mode | outputs=LengthVerification
// IDENTITY_SEAL: PART-19 | role=AxisThreshold+ConsistencyTracker | inputs=score,mode,tracker,chunk | outputs=boolean,void
