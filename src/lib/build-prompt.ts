// ============================================================
// [I-02 — 2026-05-10] Translation 레지스트리 마이그레이션 진입점
// ============================================================
//
// build-prompt.ts 의 stage 1~5 + 10 은 writing-agent-registry 의
//   translator-stage-1-draft / translator-stage-2-lore-tone /
//   translator-stage-3-rhythm / translator-stage-4-culture /
//   translator-stage-5-chief-editor / translator-story-bible
// 와 1:1 매핑. 현재 buildPrompt 함수는 stage 별 strict_directives + MISSION 을 직접 조립.
//
// 점진 마이그레이션 경로:
//   1) [완료] buildAgentBasePromptForStage() 헬퍼 — 레지스트리에서 role+duty+가드 추출
//   2) [대기] buildPrompt 의 baseInstructions 시작 부분을 헬퍼로 교체
//   3) [영구 inline] stage 별 MISSION 본문 — sourceText/text 마크업 specific
//
// 호출 측 (dual-pipeline 등) 은 buildAgentBasePromptForStage() 직접 사용 가능.
//
// 활성화 사용 예시 (점진 채택용):
//
//   import { buildPrompt, buildAgentBasePromptForStage } from '@/lib/build-prompt';
//
//   // 옵션 A — buildPrompt 출력 앞에 레지스트리 base prepend (단일 소스 정렬)
//   const base = buildAgentBasePromptForStage(stage, to, {
//     glossary, characterProfiles, storySummary,
//   });
//   const legacy = buildPrompt({ ..., stage });
//   const finalPrompt = [base, legacy].filter(Boolean).join('\n\n');
//
//   // 옵션 B — 레지스트리 base 만 사용 (가벼운 호출용. stage MISSION 미포함)
//   const minimal = buildAgentBasePromptForStage(stage, to, {});
//
// 옵션 A 가 회귀 안전. 단 가드 ('/no_think') 가 두 번 나타나므로 dedup 처리 권장.
//
// ============================================================

import { buildAgentSystemPrompt, type AgentId } from '@/lib/ai/writing-agent-registry';
import { normalizeToAgentLang } from '@/lib/ai/lang-normalize';
// [P-04 — 2026-05-10] Stage 4 Market track 도메인 hint 자동 주입.
import { getTranslationDomainHint } from './translation/translation-domain-hints';

const STAGE_TO_AGENT_ID: Record<number, AgentId> = {
  1: 'translator-stage-1-draft',
  2: 'translator-stage-2-lore-tone',
  3: 'translator-stage-3-rhythm',
  4: 'translator-stage-4-culture',
  5: 'translator-stage-5-chief-editor',
  10: 'translator-story-bible',
};

/**
 * [G4 registry flag — 2026-06-11] 번역 레지스트리 기본 활성 스위치.
 * NEXT_PUBLIC_TRANSLATOR_REGISTRY = 'off' | 'false' | '0' → 비활성 (legacy prompt 복귀).
 * 미설정 또는 그 외 값 → 활성 (기본 on).
 * 호출 측이 params.useAgentRegistry 를 명시하면 그 값이 env 보다 우선.
 * 출력 회귀 발견 시 env 한 줄 ('off') 로 즉시 롤백 가능 — 코드 수정 불필요.
 * 주의: stage 가 undefined 인 호출 (단순 분석/직번역 경로) 은 registry 매핑이
 * 없어 본 플래그와 무관하게 기존 동작 그대로다.
 */
export function isTranslatorRegistryEnabled(): boolean {
  const v = (process.env.NEXT_PUBLIC_TRANSLATOR_REGISTRY ?? '').trim().toLowerCase();
  return v !== 'off' && v !== 'false' && v !== '0';
}

/**
 * stage 번호 → 레지스트리 base prompt. 미지정 stage 는 null.
 * 호출 측이 자체 baseInstructions 앞에 prepend 하는 용도.
 *
 * [P-03 — 2026-05-10] tensionCurve 슬롯 추가 — translator-stage-3-rhythm 의
 * 페이싱 정합 강화. dual-pipeline 의 DualPipelineParams.tensionCurve 가 흐름.
 */
export function buildAgentBasePromptForStage(
  stage: number,
  to: string,
  options: {
    glossary?: string;
    characterProfiles?: string;
    storySummary?: string;
    continuityNotes?: string;
    tensionCurve?: string;
  } = {},
): string | null {
  const agentId = STAGE_TO_AGENT_ID[stage];
  if (!agentId) return null;
  // [autoTrim — 2026-05-10] translator stage 1~5 의 critical token pressure 시 자동 절삭.
  // contextBlock 우선순위: tension-curve / continuity-notes 먼저 제거, character-dna 마지막 유지.
  return buildAgentSystemPrompt(agentId, {
    language: normalizeToAgentLang(to),
    'glossary': options.glossary,
    'character-dna': options.characterProfiles,
    'story-summary': options.storySummary,
    'continuity-notes': options.continuityNotes,
    'tension-curve': options.tensionCurve,
  }, { autoTrim: true });
}

export type BuildPromptParams = {
  text: string;
  from: string;
  to: string;
  tone?: string;
  genre?: string;
  context?: string;
  glossary?: string;
  characterProfiles?: string;
  continuityNotes?: string;
  episodeContext?: string;
  storySummary?: string;
  sourceText?: string;
  stage?: number;
  mode?: 'novel' | 'general';
  /** Novel-only: preserve dialogue vs narration markers and punctuation habits */
  preserveDialogueLayout?: boolean;
  /** Sub-template for general mode accuracy */
  domainPreset?: 'general' | 'legal' | 'it' | 'medical';
  /**
   * [2026-05-08 — 시장 분석 4차 반영 / I-12 — 2026-05-10 명시 보강]
   * 출력 의도. 시장 분석은 Translation Studio 가 항상 2개 결과를 제공해야 한다고 명시.
   *
   *   faithful: Source-faithful Translation — 원문 보존 (작가 의도·고유명사·복선·문체)
   *   market:   Market-ready Localization — 현지화 (대사 리듬·호칭·장르 문법·시장 감각)
   *   dual:     두 결과 동시 출력 — runDualTranslation() 사용 (buildPrompt 자체는 한 번에 한 모드만 처리)
   *   default:  ⚠️ DEPRECATED 별칭 — 'market' 와 동등 동작. legacy 호환 위해 유지.
   *             신규 코드는 'faithful' 또는 'market' 명시. dual-pipeline 은 항상 둘 다 출력.
   *
   * Stage 4 (Cultural Immersion) 와 Stage 5 (Chief Editor) 거동이 분기된다.
   *   - faithful: Stage 4 minimal (idiom 만 명료화, transcreation 금지) / Stage 5 light polish
   *   - market:   Stage 4 full transcreation (장르 클리셰·문화권 적응 적극) / Stage 5 reader-flow polish
   *   - default:  내부적으로 market 분기로 흐름 (legacy 동작 보존). market track 으로 명시 전환 권장.
   *   - dual:     buildPrompt 단일 호출 시 default 와 동일 (실제 dual 흐름은 runDualTranslation 이 관리)
   *
   * 마이그레이션 가이드: 'default' 사용처를 식별하여 'market' 으로 교체하면 의미가 명확해짐.
   */
  outputMode?: 'faithful' | 'market' | 'dual' | 'default';
  /**
   * [A.5 — 2026-05-08] 호칭 매트릭스 hint (Market track 자동 적용 권장).
   * `buildHonorificHint(relations)` 호출 결과를 그대로 prompt 영역에 주입.
   * 예: "[Honorific Hints — Market track]:\n- 김철수 → 김민수: suggest \"오빠\" ..."
   */
  honorificHint?: string;
  /**
   * [A.5 — 2026-05-08] 한국 웹소설 장르 hint (Market track Stage 4 cultural immersion).
   * `buildGenreHint(id)` 호출 결과 — 8 장르 매트릭스.
   */
  genreHint?: string;
  /**
   * [I-02 본문 마이그레이션 — 2026-05-10] 레지스트리 base prompt 활성화.
   *   true: buildAgentBasePromptForStage(stage, ...) 출력을 baseInstructions
   *         시작에 prepend. 기존 buildTranslationGuard 는 skip (가드 중복 방지).
   *   false: 기존 legacy prompt 그대로.
   * [G4 — 2026-06-11] 미지정 시 기본값이 false → isTranslatorRegistryEnabled()
   * (env NEXT_PUBLIC_TRANSLATOR_REGISTRY 기본 on·'off'/'false'/'0' 으로 차단) 로 변경.
   * 호출 측 (dual-pipeline 등) 명시값이 항상 env 보다 우선.
   */
  useAgentRegistry?: boolean;
  /**
   * [P-03 — 2026-05-10] 텐션 곡선 데이터 (LLM hint 형식 string).
   * translator-stage-3-rhythm 의 contextBlock 'tension-curve' 슬롯에 주입.
   * useAgentRegistry: true 이고 stage === 3 일 때만 사용.
   */
  tensionCurve?: string;
};

function dialogueRuleNovel(to: string): string {
  return `
5. DIALOGUE & NARRATION: Preserve quotation marks/brackets used in the source (e.g. 「」, 『』, ", '). Do not merge dialogue lines with narration lines. Keep onomatopoeia and ellipsis spacing habits unless grammatically impossible in ${to}.
`;
}

/**
 * Qwen 3.6-35B MoE 추론 아티팩트 차단 가드 (번역 전용).
 * vLLM `/no_think` 토큰 + <think> 태그·"Thinking Process:"·"Reasoning:" 누출 금지.
 * 타깃 언어(`to`)에 따라 첫 문자 강제 — 언어-무관 가드. `NO_ENGLISH_THINKING_GUARD`
 * (한글 소설 전용)와 충돌하지 않도록 번역 경로에서는 이 함수를 사용한다.
 */
function buildTranslationGuard(to: string): string {
  return `/no_think
[ABSOLUTE RULE — TRANSLATION]: Do NOT emit <think></think> blocks, "Thinking Process:", "Reasoning:", "Let me analyze", or any numbered analytical preamble in any language. Output ONLY the final text. The first character of your output MUST be a valid character of the target language: ${to}.

`;
}

const DOMAIN_EXTRA: Record<string, string> = {
  legal:
    'DOMAIN LEGAL: Preserve defined terms, party names, article numbers, and citation formats. Do not paraphrase obligations or dates.',
  it: 'DOMAIN IT: Preserve API names, commands, paths, version numbers, and code tokens exactly. Translate comments and prose only.',
  medical:
    'DOMAIN MEDICAL: Use standard terminology for the target locale. Do not invent dosages or diagnoses; keep numbers and units exactly.',
  general: '',
};

export function buildPrompt(params: BuildPromptParams): string {
  const {
    text,
    from,
    to,
    tone = 'natural',
    genre = 'Novel',
    context,
    glossary,
    characterProfiles,
    continuityNotes,
    episodeContext,
    storySummary,
    sourceText,
    stage,
    mode = 'novel',
    preserveDialogueLayout = true,
    domainPreset = 'general',
    outputMode = 'default',
    honorificHint,
    genreHint,
    // [G4 — 2026-06-11] 기본값: env 스위치 (기본 on). 명시 전달 시 그 값 우선.
    useAgentRegistry = isTranslatorRegistryEnabled(),
  } = params;

  // [I-02 본문 마이그레이션 — 2026-05-10] 레지스트리 base 활성화 시 가드는 skip — registryBase 가 가드 포함.
  // [P-03 — 2026-05-10] tensionCurve 슬롯 전달 — stage 3 에서만 사용되나 모든 stage 호출에 안전.
  const registryBase = useAgentRegistry && stage !== undefined
    ? buildAgentBasePromptForStage(stage, to, {
        glossary, characterProfiles, storySummary, continuityNotes,
        tensionCurve: params.tensionCurve,
      })
    : null;
  const guard = registryBase ? '' : buildTranslationGuard(to);

  if (stage === 10) {
    // [G4 — 2026-06-11] registry 활성 시 base prepend. 기존 코드는 guard 만 '' 로
    // 비우고 registryBase 를 어디에도 넣지 않아 (early return 이 prepend 블록보다
    // 앞) 가드가 통째로 소실되는 잠복 버그 — 기본 on 전환과 함께 수정.
    return `${registryBase ? registryBase + '\n\n' : guard}[SYSTEM: STORY BIBLE SUMMARIZER]
You are updating the running Story Bible for a serialized novel translation workspace.
<strict_directives>
1. Output ONLY concise bullet points.
2. Focus on newly introduced facts, character shifts, relationship movement, locations, powers, factions, promises, clues, and unresolved hooks.
3. Do NOT repeat unchanged background unless the chapter meaningfully updates it.
4. Preserve names, titles, spellings, and terminology exactly as they appear in the chapter text.
5. If a new honorific or name variant CONFLICTS with an earlier bullet in [Current Story Bible], add a line "CONFLICT CHECK:" explaining the discrepancy briefly — do not silently overwrite established facts.
</strict_directives>
${storySummary ? `[Current Story Bible]:\n${storySummary}\n` : ''}
${characterProfiles ? `[Character Profiles]:\n${characterProfiles}\n` : ''}
${context ? `[World Lore]:\n${context}\n` : ''}
${continuityNotes ? `[Cross Project Continuity Notes]:\n${continuityNotes}\n` : ''}
<chapter_text>
${text}
</chapter_text>
Output ONLY the summary points.`;
  }

  const domainLine = DOMAIN_EXTRA[domainPreset] || '';

  let baseInstructions = `${guard}[SYSTEM: DETERMINISTIC TRANSLATION ENGINE — MODE: ${mode === 'general' ? 'GENERAL ACCURACY' : 'NOVEL SPECIALIST'}]
You are a highly constrained, professional translation engine converting text from ${from} to ${to}.
<strict_directives>
1. NO YAP: Output ONLY the requested final text. NEVER output intros/outros like "Here is the translation" or "Understood".
2. FORMAT PRESERVATION: Do NOT wrap your output in markdown code blocks (\`\`\`). Do NOT alter capitalization artificially.
3. ★ ABSOLUTE SOURCE INTEGRITY (RULE #1) ★:
   - Output MUST contain EVERY paragraph from the source. Missing any source content = CRITICAL FAILURE.
   - NEVER silently skip, summarize, or drop a paragraph. NEVER collapse multiple source paragraphs into one. NEVER split a single source paragraph.
   - Paragraph count of your output MUST equal paragraph count of source (1:1 paragraph mapping).
   - If a paragraph genuinely cannot be translated (untranslatable proper noun block, code, etc.), output it verbatim. Do NOT omit it.
   - If you must skip something, output the literal tag [TRANSLATION-OMITTED: <reason>] in place of that paragraph instead of silent deletion.
   - Preserve all line breaks within paragraphs unless grammatically impossible in ${to}.
4. STRUCTURE PRESERVATION: Preserve exact paragraph/line break structure. Match every empty line in the source with an empty line in the output.
${mode === 'general'
  ? `5. STRICT ACCURACY: Prioritize factual accuracy above all else. Do NOT add creative interpretation. Preserve technical terms, proper nouns, and numeric data exactly.
${domainLine}`
  : `5. TONE & GENRE OVERRIDE: Your output MUST strictly reflect Tone: [${tone}] and Genre: [${genre}].
${preserveDialogueLayout ? dialogueRuleNovel(to) : ''}`}
</strict_directives>
`;
  if (glossary) baseInstructions += `[Glossary — apply these term mappings consistently]:\n${glossary}\n`;
  if (characterProfiles) baseInstructions += `[Character Profiles]:\n${characterProfiles}\n`;
  if (storySummary) baseInstructions += `[Previous Story Summary]:\n${storySummary}\n`;
  if (continuityNotes) baseInstructions += `[Cross Project Continuity Notes]:\n${continuityNotes}\n`;
  if (episodeContext) {
    baseInstructions += `
CRITICAL INSTRUCTION: The following excerpts are PREVIOUS TRANSLATED CHAPTERS or approved continuity references.
Use them ONLY for lore, pacing, callbacks, and character tone consistency. DO NOT translate this or include it in your output.
<continuity_reference_do_not_translate_this>
${episodeContext}
</continuity_reference_do_not_translate_this>
`;
  }
  if (context) baseInstructions += `Additional Context:\n${context}\n`;
  // [A.5 — 2026-05-08] Market track 전용 hint — Faithful track 은 호칭/장르 적응 X
  if (outputMode === 'market' || outputMode === 'dual' || outputMode === 'default') {
    if (honorificHint) baseInstructions += `\n${honorificHint}\n`;
    if (genreHint) baseInstructions += `\n${genreHint}\n`;
  }

  // [I-02 본문 마이그레이션 — 2026-05-10] 레지스트리 base 활성화 시 시작에 prepend.
  // 가드 ('/no_think') 는 위에서 guard='' 로 처리되어 중복 X.
  if (registryBase) {
    baseInstructions = registryBase + '\n\n' + baseInstructions;
  }

  let prompt = '';

  if (stage === 1) {
    prompt = `${baseInstructions}
MISSION: Stage 1 (Draft Translator).
Provide a highly accurate, 1:1 structural draft translation of the source text.
★ RULE #1 ENFORCEMENT ★: Do NOT miss any sentence or paragraph. Count source paragraphs before you start; output count MUST equal source count. If unsure, copy the original line verbatim rather than omit it.
<source_text>
${text}
</source_text>`;
  } else if (stage === 2) {
    prompt = `${baseInstructions}
MISSION: Stage 2 (Lore/Tone Editor).
Review the Source Text and the Current Draft. Fix character speech patterns, honorifics, and respect the Character Profiles strictly.
<source_text>
${sourceText}
</source_text>
<current_draft>
${text}
</current_draft>
Output ONLY the revised draft.`;
  } else if (stage === 3) {
    prompt = `${baseInstructions}
MISSION: Stage 3 (Pacing & Rhythm Agent).
Ensure the translation matches the original author's sentence length, rhythm, and pacing. Keep short impacts short, and long descriptive sentences flowing.
<source_text>
${sourceText}
</source_text>
<current_draft>
${text}
</current_draft>
Output ONLY the revised draft.`;
  } else if (stage === 4) {
    // [2026-05-08 — 시장 분석 4차 반영] outputMode 분기.
    //   faithful: 원문 보존 — idiom 만 가볍게 명료화. transcreation 금지. 호칭·고유명사 그대로.
    //   market:   현지화 — full transcreation, 장르 클리셰 적응, 회차 후킹 강화 가능.
    //   default:  legacy (market 동등) — 점진적으로 두 모드로 수렴.
    if (outputMode === 'faithful') {
      prompt = `${baseInstructions}
MISSION: Stage 4 (Faithful Resonance — Source-faithful Translation track).
GOAL: **Preserve the author's intent**. This is the *Source-faithful* output for archival, audit, and translator review.
HARD CONSTRAINTS (★ Faithful Mode ★):
- DO NOT transcreate. DO NOT replace cultural references with Western/Eastern equivalents.
- DO NOT change proper nouns, skill names, item names, organization names. Use established glossary spellings as-is.
- PRESERVE honorifics and address forms exactly. If the source uses 형/오빠/様/さん, keep the same relationship distance.
- Only LIGHTLY clarify obvious idiomatic obscurity if it would otherwise be incomprehensible. Prefer footnote-style minimal adjustment over rewriting.
- Author voice and sentence rhythm MUST be preserved. Do NOT smooth out distinctive style.
- ★ RULE #1 ENFORCEMENT ★: Every paragraph in <source_text> must have a corresponding paragraph in output. Zero omission.
<source_text>
${sourceText}
</source_text>
<current_draft>
${text}
</current_draft>
Output ONLY the revised faithful draft.`;
    } else {
      // 'market' 또는 'default' — full cultural immersion
      // [P-04 — 2026-05-10] Market track 시 도메인 hint 자동 주입 (4 시장 × source-target 매트릭스).
      const domainHint = outputMode === 'market'
        ? `\n${getTranslationDomainHint(from, to)}`
        : '';
      const marketGenreHint = outputMode === 'market'
        ? `\n[Market-ready Mode] Adapt to the ${to} target market's reading conventions:\n- Pacing: short paragraphs, dialogue-heavy, fast scene transitions if matching webnovel/popular fiction conventions.\n- Genre clichés: use the conventional ${genre} vocabulary native readers expect.\n- Hooks: where the source has soft chapter ends, you may strengthen reader hooks (without changing facts).\n- Reader-native names: where appropriate, use the ${to} reader-friendly form (still consistent with glossary).${domainHint}`
        : '';
      prompt = `${baseInstructions}
MISSION: Stage 4 (Target Culture & Native Resonance — ${outputMode === 'market' ? 'Market-ready Localization' : 'default'} track).
Your ultimate goal is **Total Cultural Immersion into the ${to} native culture**.
Analyze the source text for foreign idioms, wordplay, pop-culture references, historical contexts, and subtle social dynamics (like honorifics or politeness levels).
You MUST completely transcreate these elements using equivalent cultural touchstones, idioms, and expressions that are highly natural to native ${to} speakers.
- If translating to Korean/Japanese, strictly calibrate honorifics/politeness levels between characters and adapt subtle emotional nuances.
- If translating to English/Western languages, convert Eastern idioms into equivalent Western cultural idioms.
If a literal translation is even slightly awkward or foreign-sounding, rewrite the sentence entirely from the perspective of a native ${to} writer, while protecting the core narrative facts.${marketGenreHint}
★ RULE #1 ENFORCEMENT ★: Every source paragraph must produce an output paragraph. Transcreation does NOT permit deletion.
<source_text>
${sourceText}
</source_text>
<current_draft>
${text}
</current_draft>
Output ONLY the revised draft.`;
    }
  } else if (stage === 5) {
    // [2026-05-08] Stage 5 도 outputMode 별 polish 강도 분기
    const polishDirective = (() => {
      if (mode === 'general') {
        return 'Fix grammar errors, typos, and unnatural phrasing. Do NOT change the meaning or add creative embellishment. Keep it factual and precise.';
      }
      if (outputMode === 'faithful') {
        return 'LIGHT POLISH ONLY (Faithful Mode). Fix only typos, broken grammar, and unintended ambiguity. DO NOT smooth out author voice or replace expressions for fluency. Preserve sentence rhythm and distinctive phrasing.';
      }
      if (outputMode === 'market') {
        // [fix] single-quoted string left ${to} literal; use template literal so target language interpolates
        return `READER-FLOW POLISH (Market-ready Mode). Optimize sentence flow for native ${to} readers. Strengthen reader-friendly cadence. Polish dialogue rhythm and chapter hook lines. Keep narrative facts unchanged.`;
      }
      return 'Perform a final polish. Fix any lingering awkward phrasing, typos, or grammatical errors. Ensure perfect narrative flow.';
    })();
    prompt = `${baseInstructions}
MISSION: Stage 5 (Chief Editor — ${outputMode} track).
${polishDirective}
★ RULE #1 ENFORCEMENT ★: Output paragraph count MUST equal source paragraph count. Never collapse, never drop.
<source_text>
${sourceText}
</source_text>
<current_draft>
${text}
</current_draft>
Output ONLY the final polished draft. Never add commentary.`;
  } else {
    prompt = `${baseInstructions}
Analyze the text or translate directly depending on the prompt:
<text>
${text}
</text>`;
  }

  return prompt;
}
