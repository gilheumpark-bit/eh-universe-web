import type { AppLanguage, StoryConfig } from '../lib/studio-types';
import { PlatformType, type EngineReport } from './types';
import { generateEngineReport } from './scoring';
import { quickPurify, type TargetLang } from './language-purity';
import { stripEngineArtifactsBase } from '@/lib/engine-artifacts';

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

export function stripEngineArtifacts(text: string, language?: AppLanguage): string {
  let clean = stripEngineArtifactsBase(text, language);

  if (language === 'KO' || language === 'JP' || language === 'CN') {
    clean = quickPurify(clean, language as TargetLang);
  }

  return clean;
}
