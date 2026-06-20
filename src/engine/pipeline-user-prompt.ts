import type { AppLanguage, StoryConfig } from '../lib/studio-types';
import { extractPreviousEpisodeSummary } from './previous-episode-extractor';
import { LANG_NAMES } from './pipeline-prompt-blocks';

export function buildUserPrompt(
  config: StoryConfig,
  draft: string,
  options?: {
    previousContent?: string;
    language?: AppLanguage;
    /**
     * 이전 화 자동 요약 비활성화. 기본 false (자동 주입 활성).
     * 사용자가 명시적으로 previousContent를 줬을 때는 그것이 우선이라 의미 없음.
     */
    disableAutoPreviousEpisode?: boolean;
    /** 자동 추출 모드 — 'summary'(기본) or 'tail' */
    autoPreviousMode?: 'summary' | 'tail';
    /** 자동 추출 최대 글자수 (기본 400) */
    autoPreviousMaxChars?: number;
  },
): string {
  const language = options?.language ?? 'KO';
  const langName = LANG_NAMES[language];

  let previousBlock = '';
  if (options?.previousContent) {
    previousBlock = `[RE-BRANCHING CONTEXT]\nPrevious version: ${options.previousContent}\n`;
  } else if (!options?.disableAutoPreviousEpisode) {
    const extracted = extractPreviousEpisodeSummary(config, {
      mode: options?.autoPreviousMode ?? 'summary',
      maxChars: options?.autoPreviousMaxChars ?? 400,
    });
    if (extracted.text) {
      previousBlock = `[PREVIOUS EPISODE — Ep.${extracted.sourceEpisode} (${extracted.sourceType})]\n${extracted.text}\n\n`;
    }
  }

  let draftTargetHint = '';
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { isDraftDetailActive } = require('@/lib/feature-flags') as { isDraftDetailActive: () => boolean };
    if (isDraftDetailActive()) {
      draftTargetHint = `\n[TARGET LENGTH — ${langName === 'Korean' ? 'Korean' : langName}]
- Goal: ~4,000 characters (acceptable range 3,500~5,500)
- This is an INITIAL DRAFT pass. The writer may expand it manually or via a separate detail pass.
- Focus on structural completeness over length. Avoid padding.
- DO NOT produce analysis, thinking process, or outline — just the narrative body.\n`;
    }
  } catch {
    /* feature-flags 미로드 (SSR/테스트 환경) — 힌트 주입 건너뜀 */
  }

  return `[SYSTEM COMMAND: NARRATIVE GENERATION]
- Target Language: ${langName}
- Episode: ${config.episode}
- Title: ${config.title}
- Genre: ${config.genre}
- POV Character: ${config.povCharacter}
- Setting: ${config.setting}
${draftTargetHint}
[MASTER SYNOPSIS]
${config.synopsis || 'No master synopsis provided.'}

${previousBlock}[CURRENT DRAFT/INSTRUCTION]
${draft}

Please execute the high-density narrative generation in ${langName}.
All analysis results and JSON critiques must also be provided in ${langName}.`;
}
