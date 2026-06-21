// ============================================================
// PART 1 — Types & Constants
// ============================================================

import type { AppLanguage } from '@/lib/studio-types';
import {
  buildRAGTranslationContext,
  type RAGTranslationContext,
  type RAGTranslationInput,
} from '@/services/ragService';
// RAG 타입 re-export — useTranslation / Phase 2 통합 시 단일 import 경로 유지
export type { RAGTranslationContext, RAGTranslationInput };

/** 번역 대상 언어 */
export type TranslationTarget = 'EN' | 'JP' | 'CN' | 'KO';

/**
 * 번역 모드: 두 가지 접근
 * MODE1 — 원문 보존형: 원문 구조와 형식을 최대한 유지하며 번역
 * MODE2 — 독자 경험형: 타겟 독자가 같은 감정을 느끼도록 재창조
 *
 * [2026-05-09] 정의는 ./scoring/bands 로 이전 — re-export (외부 import path 무영향).
 */
export type { TranslationMode } from './scoring/bands';
import type { TranslationMode } from './scoring/bands';
import {
  buildCharacterRegisterDirective,
  buildGenreTranslationDirective,
  buildTranslatorProfileHint,
} from './translation-extras';

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

/**
 * 번역 세그먼트 — 원문/번역 1:1 대응 단위 (Voice Guard 검증용).
 * speaker 가 있는 세그먼트만 캐릭터 말투 검증에 사용된다.
 * 나레이션은 isDialogue=false, speaker=undefined.
 *
 * Phase 4 (Voice Guard) 호환:
 * - applyVoiceGuard 가 segments[].translation + segments[].speaker 를 수집
 * - speaker 미상이면 검증 skip (false positive 방지)
 */
export interface TranslatedSegment {
  /** 원문 문장 */
  sourceText: string;
  /** 번역된 문장 */
  translation: string;
  /** 화자 (확인된 경우만, 나레이션은 undefined) */
  speaker?: string;
  /** 대사인지 나레이션인지 (감지 결과) */
  isDialogue?: boolean;
}

/** 3문장 청크 */
export interface TranslationChunk {
  index: number;
  sourceText: string;
  translatedText: string;
  score: number;
  attempt: number;
  passed: boolean;
  /**
   * 청크 내부의 문장별 세그먼트 분해 (선택).
   * Voice Guard 활성화된 번역에서만 채워진다.
   */
  segments?: TranslatedSegment[];
}

// 채점 type + 타입 가드 — engine/scoring/score-parser.ts 로 이전 (2026-05-09).
// re-export — 외부 import path 무영향. translation.ts 내부 직접 사용 없음.
export type {
  ChunkScoreDetail,
  FidelityScoreDetail,
  ExperienceScoreDetail,
} from './scoring/score-parser';
export { isFidelityScore, isExperienceScore } from './scoring/score-parser';

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
  /**
   * 모든 청크의 세그먼트를 평탄화한 배열 (선택).
   * Voice Guard 가 segments[].translation + segments[].speaker 로 화자별 검증 수행.
   * speaker 미상 세그먼트는 검증 skip (나레이션 + 화자 추론 실패 케이스).
   */
  segments?: TranslatedSegment[];
}

// Band 상수 — engine/scoring/bands.ts 로 이전 (2026-05-09).
// 본 파일 내부 prompt 빌더에서 BAND_DEFAULT 만 사용.
import { BAND_DEFAULT } from './scoring/bands';

// ============================================================
// PART 2 — Band 클램핑 & 기본 설정
// ============================================================
// clampBand — engine/scoring/bands.ts 로 이전 (2026-05-09). re-export + internal use.
import { clampBand } from './scoring/bands';
export { clampBand };

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

function langName(lang: TranslationTarget): string {
  const names: Record<TranslationTarget, string> = { EN: 'English', JP: 'Japanese', CN: 'Chinese', KO: 'Korean' };
  return names[lang];
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

export function buildTranslationSystemPrompt(
  config: TranslationConfig,
  ragBlock: string = '',
): string {
  // Guard: clamp band to valid range regardless of caller input
  const safeBand = clampBand(config.band);
  const safeConfig: TranslationConfig = {
    ...config,
    band: safeBand,
    contextBridge: config.contextBridge?.slice(0, MAX_CONTEXT_BRIDGE_CHARS) ?? '',
  };

  const parts: string[] = [];
  // RAG 블록이 있으면 가장 앞(역할 정의 이전)에 주입 — 세계관이 지시문 해석의 전제가 되도록
  if (ragBlock && ragBlock.trim()) {
    parts.push(ragBlock.trim());
  }
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
// PART 5B — RAG 컨텍스트 포매터 + 비동기 프롬프트 빌더
// ============================================================

// 프롬프트 길이 상한 (system prompt + RAG 블록이 컨텍스트 윈도우를 잠식하지 않도록)
const RAG_WORLD_MAX = 2000;
const RAG_TERMS_MAX = 20;
const RAG_EPISODES_MAX = 3;
const RAG_GENRE_MAX = 1500;

/**
 * RAGTranslationContext → 시스템 프롬프트 주입용 블록 문자열.
 * ctx.fetched === false 이면 빈 문자열 반환 — 호출부는 기존 프롬프트 그대로 유지.
 * 순수 함수 — 단위 테스트 대상.
 */
export function formatRAGBlock(ctx: RAGTranslationContext): string {
  if (!ctx || !ctx.fetched) return '';

  const sections: string[] = [];

  if (ctx.worldBible && ctx.worldBible.trim()) {
    sections.push(`[WORLD CONTEXT — source-of-truth, do NOT translate this block]
${ctx.worldBible.slice(0, RAG_WORLD_MAX)}`);
  }

  if (ctx.pastTerms.length > 0) {
    const termLines = ctx.pastTerms
      .slice(0, RAG_TERMS_MAX)
      .map(t => `- "${t.src}" → "${t.tgt}"${t.episode ? ` (ep.${t.episode})` : ''}`)
      .join('\n');
    sections.push(`[TERM HISTORY — MUST keep these mappings unchanged]
${termLines}`);
  }

  if (ctx.pastEpisodeSummary.length > 0) {
    const episodes = ctx.pastEpisodeSummary
      .slice(-RAG_EPISODES_MAX)
      .join('\n---\n');
    sections.push(`[RECENT EPISODES — continuity reference only, do NOT translate]
${episodes}`);
  }

  if (ctx.genreRules && ctx.genreRules.trim()) {
    sections.push(`[GENRE RULES]
${ctx.genreRules.slice(0, RAG_GENRE_MAX)}`);
  }

  return sections.length > 0 ? sections.join('\n\n') : '';
}

/**
 * 비동기 시스템 프롬프트 빌더 — RAG 컨텍스트를 자동 주입한다.
 * 호출부 (useTranslation 등) 가 Phase 2 완료 후 교체 사용.
 * 내부 동작:
 *   1) buildRAGTranslationContext — timeout 6s, 실패 시 빈 컨텍스트
 *   2) formatRAGBlock — fetched=false 이면 빈 문자열
 *   3) buildTranslationSystemPrompt(config, ragBlock) — 기존 프롬프트에 선두 주입
 * RAG 실패는 번역을 차단하지 않는다 (silent fallback).
 */
export async function buildTranslationSystemPromptWithRAG(
  config: TranslationConfig,
  input: RAGTranslationInput,
  options: { timeoutMs?: number } = {},
): Promise<{ systemPrompt: string; ragCtx: RAGTranslationContext }> {
  const ragCtx = await buildRAGTranslationContext(input, options);
  const ragBlock = formatRAGBlock(ragCtx);
  const systemPrompt = buildTranslationSystemPrompt(config, ragBlock);
  return { systemPrompt, ragCtx };
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
import { splitSentences } from './translation-sentences';

export { buildScoringPrompt } from './scoring/scoring-prompt';

// ============================================================
// PART 8 — 채점 파싱 (모드별)
// ============================================================
// parseScoreResponse — engine/scoring/score-parser.ts 로 이전 (2026-05-09).
export { parseScoreResponse } from './scoring/score-parser';

// ============================================================
// PART 9 — 재창조 프롬프트 (모드별)
// ============================================================
// buildRecreatePrompt — engine/scoring/scoring-prompt.ts 로 이전 (2026-05-09).
export { buildRecreatePrompt } from './scoring/scoring-prompt';

// ============================================================
// PART 10 — 유틸리티
// ============================================================

export {
  BAND_META,
  adaptiveChunkSize,
  applyVoiceGuard,
  bandLabel,
  buildAutoBridge,
  buildCharacterRegisterDirective,
  buildGenreTranslationDirective,
  buildRetryHintFromViolations,
  buildSegmentsFromChunk,
  buildTranslatorProfileHint,
  buildVoiceRulesFromProject,
  createConsistencyTracker,
  createEmptyTranslatorProfile,
  detectVoiceViolations,
  extractDialogueLines,
  hasCriticalAxisFailure,
  inferSpeakerFromContext,
  modeDescription,
  staticValidate,
  updateConsistencyTracker,
  updateTranslatorProfile,
  verifyGlossary,
  verifyLength,
} from './translation-extras';
export type {
  ChunkConsistencyTracker,
  GlossaryVerification,
  LengthVerification,
  StaticValidationResult,
  VoiceGuardedResult,
  VoiceRule,
  VoiceViolation,
} from './translation-extras';

// IDENTITY_SEAL: PART-1  | role=Types | inputs=none | outputs=TranslationMode,TranslationConfig,FidelityScoreDetail,ExperienceScoreDetail
// IDENTITY_SEAL: PART-2  | role=BandUtils | inputs=band(number) | outputs=clamped(number),config
// IDENTITY_SEAL: PART-3  | role=FidelityDirective | inputs=band | outputs=directive(string)
// IDENTITY_SEAL: PART-4  | role=ExperienceDirective | inputs=band,targetLang(JP/CN/EN/KO) | outputs=directive(string)
// IDENTITY_SEAL: PART-5  | role=SystemPromptBuilder | inputs=TranslationConfig,ragBlock? | outputs=systemPrompt(string)
// IDENTITY_SEAL: PART-5B | role=RAGBlockFormatter+AsyncPromptBuilder | inputs=RAGTranslationContext,RAGTranslationInput | outputs=ragBlock(string),{systemPrompt,ragCtx}
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
// IDENTITY_SEAL: PART-20 | role=VoiceGuardIntegration | inputs=result,rules,targetLang | outputs=VoiceGuardedResult{voiceViolations,needsRetry,retryHint}
// IDENTITY_SEAL: PART-21 | role=SpeakerInference+SegmentBuilder | inputs=sourceText,translation,characterNames,targetLang | outputs=TranslatedSegment[]{speaker?,isDialogue?}
