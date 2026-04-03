// ============================================================
// General Translation — Prompt Builder (Sandboxed)
// ============================================================
// 소설 특화 build-prompt.ts와 완전 분리.
// 소설 파이프라인은 이 파일을 import하지 않음.

import { GENERAL_DOMAIN_PRESETS, type GeneralDomain } from './general-domains';

export interface GeneralTranslationParams {
  text: string;
  from: string;
  to: string;
  domain: GeneralDomain;
  glossary?: Record<string, string>;
  context?: string;
  /** 다단계 번역 스테이지 (1=초벌, 2=교정, 3=현지화, 4=최종) */
  stage?: number;
  sourceText?: string;
}

export function buildGeneralPrompt(params: GeneralTranslationParams): string {
  const { text, from, to, domain, glossary, context, stage, sourceText } = params;
  const preset = GENERAL_DOMAIN_PRESETS[domain];

  const glossaryBlock = glossary && Object.keys(glossary).length > 0
    ? `[Terminology Glossary — apply consistently]:\n${Object.entries(glossary).map(([k, v]) => `  ${k} → ${v}`).join('\n')}\n`
    : '';

  const contextBlock = context ? `[Additional Context]:\n${context}\n` : '';

  const base = `[SYSTEM: DETERMINISTIC TRANSLATION ENGINE — MODE: GENERAL ACCURACY]
You are a professional translation engine converting text from ${from} to ${to}.
<strict_directives>
1. NO YAP: Output ONLY the translated text. No intros, outros, or commentary.
2. FORMAT PRESERVATION: Preserve paragraph/line break structure exactly. No markdown wrapping.
3. STRICT ACCURACY: Prioritize factual accuracy. Do NOT add creative interpretation.
4. Preserve proper nouns, technical terms, numeric data, and formatted tokens exactly.
5. Placeholders like ⟦EHPT:N⟧ must be kept EXACTLY as-is — do NOT translate or modify them.
${preset.directive}
</strict_directives>
${glossaryBlock}${contextBlock}`;

  if (!stage || stage === 1) {
    return `${base}
MISSION: Accurate draft translation. Preserve all structure and data precisely.
<source_text>
${text}
</source_text>`;
  }

  if (stage === 2) {
    return `${base}
MISSION: Review and correct the draft. Fix terminology errors, awkward phrasing, and tone inconsistencies. Do NOT change meaning.
<source_text>
${sourceText || text}
</source_text>
<current_draft>
${text}
</current_draft>
Output ONLY the revised draft.`;
  }

  if (stage === 3) {
    return `${base}
MISSION: Localize for native ${to} readers. Adapt idioms, cultural references, and register while preserving factual accuracy.
<source_text>
${sourceText || text}
</source_text>
<current_draft>
${text}
</current_draft>
Output ONLY the revised draft.`;
  }

  // stage 4: final polish
  return `${base}
MISSION: Final quality check. Fix grammar, typos, and formatting. Ensure consistency with glossary. Do NOT change meaning.
<source_text>
${sourceText || text}
</source_text>
<current_draft>
${text}
</current_draft>
Output ONLY the final polished text.`;
}
