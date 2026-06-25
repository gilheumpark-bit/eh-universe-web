import type { StoryConfig } from '@/lib/studio-types';
import {
  computeMediaAvg,
  dramaFitScore,
  estimateDramaFitFromConfig,
  estimateGameFitFromConfig,
  estimateGlobalAppealFromConfig,
  estimateWebtoonFitFromConfig,
  gameFitScore,
  globalAppealScore,
  webtoonFitScore,
} from '@/lib/creative/media-fit-score';
import {
  evaluateReadinessGates,
  type IPReadinessParts,
  type ReadinessGatesResult,
} from '@/lib/creative/ip-readiness';
import {
  buildIpBible,
  buildSubmissionPackage,
  IP_BIBLE_SECTION_KEYS,
  type IpBible,
  type IpBibleCluster,
  type IpBibleSection,
  type SpoilerGrade,
  type SubmissionPackage,
  type SubmissionPackageType,
} from '@/lib/creative/ip-bible-builder';
import {
  type MediaExposureDecision,
  type MediaTarget,
  type SpoilerLevel,
} from '@/lib/creative/spoiler-guard';
import {
  buildPrevisualSlots,
  type PrevisualSlotsResult,
} from '@/lib/creative/previsual-slots';
import {
  exposureJudgmentLabel,
  visualMediumLabel,
} from '@/lib/loreguard/output-localization';
import { buildPrevisualSlotMarkdownLines } from '@/lib/loreguard/previsual-output';

export const PACKAGE_TYPES: readonly SubmissionPackageType[] = ['A', 'B', 'C', 'D', 'E'];

export const GRADE_TO_LEVEL: Readonly<Record<SpoilerGrade, SpoilerLevel>> = Object.freeze({
  safe: 'Public',
  mixed: 'Internal',
  ending: 'Restricted',
});

export const PACKAGE_MEDIA_TARGET: Readonly<Record<SubmissionPackageType, MediaTarget>> =
  Object.freeze({ A: 'image', B: 'video', C: 'image', D: 'cover', E: 'image' });

export const CLUSTER_KO: Readonly<Record<IpBibleCluster, string>> = Object.freeze({
  entry: '진입',
  story: '스토리',
  setting: '설정',
  business: '제작·사업',
});

export const SPOILER_KO: Readonly<Record<SpoilerGrade, string>> = Object.freeze({
  safe: '안전',
  mixed: '혼합',
  ending: '결말',
});

export function triggerDownload(filename: string, content: string, mimeType: string): void {
  if (typeof document === 'undefined') return;
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function sanitizeFilename(value: string): string {
  const safe = value.replace(/[\\/:*?"<>|\s]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40);
  return safe.length > 0 ? safe : 'work';
}

export function todayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

function hasNonEmptyText(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function sectionToMd(section: IpBibleSection): string {
  const lines: string[] = [
    `## [${section.code}] ${section.title} — ${CLUSTER_KO[section.cluster]} · 스포일러 ${SPOILER_KO[section.spoiler]}`,
  ];
  if (section.filled) {
    for (const [label, value] of Object.entries(section.fields)) {
      lines.push(`- **${label}**: ${value}`);
    }
  } else {
    lines.push(`> (빈 섹션 — 정직 표시) ${section.missingNote ?? '입력 데이터 없음'}`);
  }
  if (section.pendingSlots.length > 0) {
    lines.push(`- _작가 작성 영역(미채움 슬롯)_: ${section.pendingSlots.join(' · ')}`);
  }
  return lines.join('\n');
}

export function bibleToMarkdown(bible: IpBible): string {
  const head = [
    `# IP 자산 정리 — ${bible.workTitle}`,
    '',
    `- 생성일: ${todayStamp()}`,
    `- 채움: ${bible.filledCount}/${bible.totalSections} 섹션`,
    '- 용도: 작품 자료 기반 참고 정리 (제출·계약 전 확인 필요)',
    '',
    `> ${bible.honesty}`,
    '',
  ];
  const body = IP_BIBLE_SECTION_KEYS.map((key) => sectionToMd(bible.sections[key]));
  return head.concat(body.join('\n\n')).join('\n');
}

export function packageToMarkdown(
  pkg: SubmissionPackage,
  workTitle: string,
  exposures: ReadonlyMap<string, MediaExposureDecision>,
  previsual?: PrevisualSlotsResult,
): string {
  const head = [
    `# IP 제출 패키지 ${pkg.type} (${pkg.label.replace(/_/g, ' ')}) — ${workTitle}`,
    '',
    `- 생성일: ${todayStamp()}`,
    `- 포함 섹션: ${pkg.includedKeys.length} (미채움 ${pkg.emptyIncludedCount})`,
    `- 결말 스포일러 섹션 포함: ${pkg.containsEndingSpoiler ? '예 — 공개 범위 주의' : '아니오'}`,
    `- 매체 공개 기준: ${visualMediumLabel('KO', PACKAGE_MEDIA_TARGET[pkg.type])}`,
    '- 용도: 작품 자료 기반 참고 정리 (제출·계약 전 확인 필요)',
    '',
    `> ${pkg.note}`,
    '',
  ];
  const body = pkg.sections.map((section) => {
    const exposure = exposures.get(section.key);
    const exposureLine = exposure
      ? `\n- _매체 노출 판정_: ${exposureJudgmentLabel('KO', exposure.judgment)} — ${exposure.reason}`
      : '';
    return sectionToMd(section) + exposureLine;
  });
  const previsualLines =
    previsual && pkg.includedKeys.includes('visualGuide')
      ? ['', ...buildPrevisualSlotMarkdownLines('KO', previsual)]
      : [];
  return head.concat(body.join('\n\n'), ...previsualLines).join('\n');
}

export interface MediaFitCard {
  key: 'webtoon' | 'game' | 'drama' | 'global';
  score: number;
  verdict: string;
  confidence: number;
}

export interface IpAssetAnalysis {
  fits: MediaFitCard[];
  mediaAvg: number;
  parts: IPReadinessParts;
  partsProvenance: string[];
  gates: ReadinessGatesResult;
  bible: IpBible;
  previsual: PrevisualSlotsResult;
}

export type AssetView = 'readiness' | 'bible' | 'package';

export function analyzeIpAsset(config: StoryConfig | null | undefined): IpAssetAnalysis {
  const webtoonEst = estimateWebtoonFitFromConfig(config);
  const gameEst = estimateGameFitFromConfig(config);
  const dramaEst = estimateDramaFitFromConfig(config);
  const globalEst = estimateGlobalAppealFromConfig(config);
  const webtoon = webtoonFitScore(webtoonEst.parts);
  const game = gameFitScore(gameEst.parts);
  const drama = dramaFitScore(dramaEst.parts);
  const global = globalAppealScore(globalEst.parts);

  const mediaAvg = computeMediaAvg({
    webtoon: webtoon.score,
    game: game.score,
    drama: drama.score,
    global: global.score,
  });

  const firstBible = buildIpBible(config, {
    webtoonFit: webtoon.score,
    gameFit: game.score,
    dramaFit: drama.score,
  });

  let packageComplete = false;
  for (const packageType of PACKAGE_TYPES) {
    if (buildSubmissionPackage(firstBible, packageType).emptyIncludedCount === 0) {
      packageComplete = true;
      break;
    }
  }

  const assetPackagePct =
    Math.round((firstBible.filledCount / firstBible.totalSections) * 1000) / 10;
  const parts: IPReadinessParts = {
    rights: 30,
    market: globalEst.parts.genreGlobalDemand,
    adaptation: mediaAvg,
    assetPackage: assetPackagePct,
    riskControl: 30,
  };
  const partsProvenance = [
    '권리 30 — 설정값만으로 검증 불가, 보수 고정',
    `시장성 ${parts.market} — 장르와 대상 시장 기준 참고`,
    `각색 가능성 ${parts.adaptation} — 4개 매체 적합도 평균`,
    `자산 패키지 ${parts.assetPackage} — 자산 정리 채움률 ${firstBible.filledCount}/${firstBible.totalSections}`,
    '리스크 통제 30 — 리스크 등록부 부재, 보수 고정',
  ];

  const gates = evaluateReadinessGates(parts, mediaAvg, {
    hasPremise: hasNonEmptyText(config?.corePremise) || hasNonEmptyText(config?.synopsis),
    packageComplete,
  });

  const bible = buildIpBible(config, {
    webtoonFit: webtoon.score,
    gameFit: game.score,
    dramaFit: drama.score,
    ipReadiness: { score: gates.verdict.score, tier: gates.verdict.tier },
  });

  const previsual = buildPrevisualSlots({
    episode: config?.episode,
    setting: config?.setting,
    characters: Array.isArray(config?.characters)
      ? config.characters.map((character) => ({ name: character?.name }))
      : undefined,
  });

  return {
    fits: [
      { key: 'webtoon', score: webtoon.score, verdict: webtoon.verdict, confidence: webtoonEst.confidence },
      { key: 'game', score: game.score, verdict: game.verdict, confidence: gameEst.confidence },
      { key: 'drama', score: drama.score, verdict: drama.verdict, confidence: dramaEst.confidence },
      { key: 'global', score: global.score, verdict: global.verdict, confidence: globalEst.confidence },
    ],
    mediaAvg,
    parts,
    partsProvenance,
    gates,
    bible,
    previsual,
  };
}
