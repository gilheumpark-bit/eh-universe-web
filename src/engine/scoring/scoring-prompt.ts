// ============================================================
// PART 1 — Module Header
// ============================================================
//
// scoring-prompt.ts — LLM 채점 프롬프트 + 재창조 프롬프트 (모드별 분기).
//
// 이전: engine/translation.ts PART 7 (buildScoringPrompt + 모드별)
//        + PART 9 (buildRecreatePrompt).
// 수정: 단일 모듈 — 채점·재시도 prompt 빌더 격리 (~150 LOC).
//
// 역할:
//   - MODE1 (fidelity) 4축 채점 prompt
//   - MODE2 (experience) 6축 채점 prompt
//   - 재창조 prompt — 점수 미달 시 다른 접근 강제
//
// [K] 단일 책임 — prompt 문자열 빌드만 (LLM 호출 X, 파싱 X)
// [G] template literal — runtime allocation 1회
// ============================================================

import type { TranslationMode } from './bands';
import type { ChunkScoreDetail } from './score-parser';
import { isFidelityScore, isExperienceScore } from './score-parser';

/**
 * 순환 의존성 회피 — translation.ts 가 본 모듈을 re-export 하므로
 * TranslationConfig/TranslationTarget 직접 import 하지 않고 minimal shape 사용.
 * (translation.ts 의 원형과 호환 — runtime 검증 X, 컴파일러 type 호환만)
 */
type TranslationTarget = 'EN' | 'JP' | 'CN' | 'KO';
interface TranslationConfig {
  mode: TranslationMode;
  targetLang: TranslationTarget;
  band: number;
  glossary: Array<{ source: string; target: string }>;
}

// ============================================================
// PART 2 — Internal helpers
// ============================================================

function langName(lang: TranslationTarget): string {
  const names: Record<TranslationTarget, string> = { EN: 'English', JP: 'Japanese', CN: 'Chinese', KO: 'Korean' };
  return names[lang];
}

// ============================================================
// PART 3 — Scoring prompt (모드별 분기)
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
// PART 4 — Recreate prompt (재창조 — 점수 미달 후 재시도)
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
