import type { AppLanguage, StoryConfig } from '../lib/studio-types';
import { PlatformType, type EngineReport } from './types';
import { generateEngineReport } from './scoring';
import { quickPurify, type TargetLang } from './language-purity';

export function postProcessResponse(
  text: string,
  config: StoryConfig,
  language: AppLanguage,
  platform: PlatformType = PlatformType.MOBILE,
): { content: string; report: EngineReport } {
  const totalStart = performance.now();
  let worldUpdates = undefined;

  const parseStart = performance.now();
  const jsonMatch = text.match(/```(?:json|JSON)?\s*(\{[\s\S]*?\})\s*```/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      if (parsed.world_updates) {
        worldUpdates = parsed.world_updates;
      }
    } catch { /* JSON parse advisory — world_updates extraction is optional */ }
  } else {
    try {
      const gradeIndex = text.lastIndexOf('"grade"');
      if (gradeIndex !== -1) {
        for (let braceIndex = text.lastIndexOf('{', gradeIndex); braceIndex >= 0; braceIndex = text.lastIndexOf('{', braceIndex - 1)) {
          const candidate = text.slice(braceIndex).trim();
          if (candidate.startsWith('{')) {
            const parsed = JSON.parse(candidate);
            if (parsed.world_updates) {
              worldUpdates = parsed.world_updates;
            }
            break;
          }
        }
      }
    } catch { /* JSON fallback parse advisory — non-blocking */ }
  }
  const parseEnd = performance.now();

  const scoringStart = performance.now();
  const report = generateEngineReport(text, config, language, platform);
  const scoringEnd = performance.now();

  if (worldUpdates) {
    report.worldUpdates = worldUpdates;
  }

  const stripStart = performance.now();
  const content = stripEngineArtifacts(text, language);
  const stripEnd = performance.now();

  const totalEnd = performance.now();

  report.stageTiming = {
    worldUpdateParse: Math.round(parseEnd - parseStart),
    scoring: Math.round(scoringEnd - scoringStart),
    stripArtifacts: Math.round(stripEnd - stripStart),
    total: Math.round(totalEnd - totalStart),
  };
  report.processingTimeMs = Math.round(totalEnd - totalStart);

  return { content, report };
}

function stripTrailingReportJson(text: string): string {
  const mdMatch = text.match(/```(?:json|JSON)?\s*\{[\s\S]*?"grade"\s*:\s*[\s\S]*?\}\s*```\s*$/);
  if (mdMatch) {
    return text.slice(0, mdMatch.index).trimEnd();
  }

  const gradeIndex = text.lastIndexOf('"grade"');
  if (gradeIndex === -1 && !/"world_updates"\s*:/.test(text)) {
    return text;
  }

  const scanStart = Math.max(gradeIndex, text.lastIndexOf('"world_updates"'));
  for (let braceIndex = text.lastIndexOf('{', scanStart); braceIndex >= 0; braceIndex = text.lastIndexOf('{', braceIndex - 1)) {
    const candidate = text.slice(braceIndex).trim();
    if (!candidate.startsWith('{')) continue;
    try {
      if (candidate.length > 5000) continue;

      const parsed = JSON.parse(candidate.replace(/\s*```\s*$/, ''));
      if (parsed && typeof parsed === 'object' && ('grade' in parsed || 'metrics' in parsed || 'world_updates' in parsed)) {
        return text.slice(0, braceIndex).trimEnd();
      }
    } catch {
      // keep scanning earlier braces
    }
  }

  return text;
}

const REASONING_ARTIFACT_KEYWORDS: readonly RegExp[] = [
  /here['’]s (?:a |my |the )?thinking process/i,
  /we are given[:\s]/i,
  /\bthinking process[:\s]/i,
  /\breasoning[:\s]/i,
  /let me (?:think|analyze|first|break|start|figure)/i,
  /\banalysis[:\s]/i,
  /\bdeconstruct(?:ing|\s+constraints)/i,
  /the user (?:wants|asks|said|provided|is asking)/i,
  /i (?:need|should|will|must) (?:analyze|think|understand|break)/i,
  /step\s*\d[:\s.]/i,
  /^\s*\d+\.\s+\*{1,2}(?:Analyze|Deconstruct|Plan|Formulate|Identify|Constraints|Drafting)/mi,
];

const FINAL_OUTPUT_MARKERS: readonly RegExp[] = [
  /<\/think>[\s\n]*/i,
  /\*{2}Final (?:Output|Response|Answer|Draft)\*{2}[:\s\n]*/i,
  /^\s*##\s+Final[^\n]*\n/im,
];

export function stripEngineArtifacts(text: string, language?: AppLanguage): string {
  let clean = text;

  let terminatorEnd = -1;
  for (const marker of FINAL_OUTPUT_MARKERS) {
    const match = marker.exec(clean);
    if (match && typeof match.index === 'number') {
      const candidateEnd = match.index + match[0].length;
      if (candidateEnd > terminatorEnd) terminatorEnd = candidateEnd;
    }
  }
  if (terminatorEnd > 0) {
    clean = clean.slice(terminatorEnd);
  }

  clean = clean.replace(/<think>[\s\S]*?<\/think>/gi, '');

  const head = clean.slice(0, 500);
  const hasReasoningArtifact = REASONING_ARTIFACT_KEYWORDS.some(pattern => pattern.test(head));

  if (hasReasoningArtifact) {
    const hangulLineMatch = clean.match(/(?:^|\n)[ \t]*([\uac00-\ud7af])/);
    if (hangulLineMatch && typeof hangulLineMatch.index === 'number') {
      const hangulOffset = hangulLineMatch.index + hangulLineMatch[0].length - 1;
      if (hangulOffset > 0) {
        const lineStart = clean.lastIndexOf('\n', hangulOffset);
        clean = clean.slice(lineStart >= 0 ? lineStart + 1 : hangulOffset);
      }
    } else {
      clean = '';
    }
  }

  clean = clean.replace(/^(?:\s*\d+\.\s+\*{0,2}[A-Z][^\n]*\n(?:\s{2,}\*[\s\S]*?\n)+\s*)+/m, '');

  clean = clean
    .replace(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*"(?:grade|metrics|critique|tension|eos(?:_score|Score)?|pacing|immersion)"[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g, '')
    .replace(/\{\s*\n\s*"(?:grade|metrics|tension|pacing|immersion|eos|active_eh_layer|critique|eosScore|serialization)"[\s\S]*?\n\s*\}/g, '')
    .replace(/\[?(Engine|엔진)\s*(Report|리포트|분석)[:\]].*/gi, '')
    .replace(/^\s*"(?:grade|metrics|tension|pacing|immersion|eos)"[\s:].*/gm, '');

  clean = stripTrailingReportJson(clean);

  clean = clean
    .replace(/^(?:알겠습니다[,.]?\s*작가님[.!]?\s*|네[,.]?\s*(?:이어서|계속|작성|시작)\s*(?:하겠습니다|합니다|할게요)[.!]?\s*|(?:Sure|Okay|Got it)[,.]?\s*(?:I'll|Let me)\s*(?:continue|start|write)[.!]?\s*)/i, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (language === 'KO' || language === 'JP' || language === 'CN') {
    clean = quickPurify(clean, language as TargetLang);
  }

  return clean;
}
