// ============================================================
// Segment Operations — 부분 재번역, 재채점, 코멘트
// ============================================================

import type { TranslationSegment } from './editable-segment';

/** 특정 세그먼트만 재번역하기 위한 프롬프트 생성 */
export function buildPartialRetranslatePrompt(
  segment: TranslationSegment,
  targetLang: string,
  glossary?: Record<string, string>,
  context?: { prevSource: string; prevTarget: string; nextSource: string },
): string {
  const glossaryBlock = glossary && Object.keys(glossary).length > 0
    ? `\n[Glossary]: ${Object.entries(glossary).map(([k, v]) => `${k}→${v}`).join(', ')}`
    : '';

  const contextBlock = context
    ? `\n[Context — previous]: ${context.prevTarget}\n[Context — next source]: ${context.nextSource}`
    : '';

  return `Translate this single sentence from the source language to ${targetLang}.
Maintain consistency with surrounding context.${glossaryBlock}${contextBlock}

<source_sentence>
${segment.source}
</source_sentence>

${segment.status === 'rejected' ? `The previous translation was rejected: "${segment.target}". Provide a better alternative.` : ''}

Output ONLY the translated sentence. No commentary.`;
}

/** 특정 세그먼트의 재채점 프롬프트 */
export function buildSegmentScorePrompt(
  segment: TranslationSegment,
): string {
  return `Score this translation pair on accuracy (0-100), naturalness (0-100), and completeness (0-100).

<source>${segment.source}</source>
<translation>${segment.target}</translation>

Respond with ONLY a JSON object: {"accuracy": N, "naturalness": N, "completeness": N}`;
}

/** 세그먼트 점수 파싱 */
export function parseSegmentScore(raw: string): number {
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return 0;
    const parsed = JSON.parse(match[0]);
    const vals = [parsed.accuracy, parsed.naturalness, parsed.completeness].filter(v => typeof v === 'number');
    return vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
  } catch {
    return 0;
  }
}

/** 세그먼트에 코멘트 추가 */
export function addComment(seg: TranslationSegment, comment: string): TranslationSegment {
  return { ...seg, comment };
}

/** 변경 이력 요약 */
export function getEditSummary(seg: TranslationSegment): string {
  if (seg.history.length === 0) return 'No edits';
  const last = seg.history[seg.history.length - 1];
  return `${seg.history.length} edit(s), last by ${last.source} at ${new Date(last.timestamp).toLocaleTimeString()}`;
}
