import { logger } from '@/lib/logger';
import {
  buildProjectExternalMaterialClusters,
  buildProjectMediaIpPackFormCompletions,
  inferMediaIpPackProfileId,
} from '@/lib/creative/media-ip-pack-project';
import {
  buildCoreCopyrightPackage,
  serializeCoreCopyrightPackageMarkdown,
} from '@/lib/creative-process/core-copyright-package';
import { EXPORT_PACKAGE_PROFILES } from '@/lib/creative-process/export-package-profile';
import {
  inferLocalePackId,
  type LocalePackId,
} from '@/lib/creative-process/jurisdiction-form-pack';
import {
  type DistributionProfileId,
  type SubmissionImportFileReportItem,
  type SubmissionPackageInput,
} from '@/lib/creative-process/submission-package';
import type { CertificateLanguage } from '@/lib/creative-process/types';
import { recommendCreatorSegment } from '@/lib/billing/creator-segments';
import type {
  LoreguardPlanId,
  ReleaseEntitlementPlan,
} from '@/lib/billing/loreguard-plans';
import type { AppLanguage, EpisodeManuscript, StoryConfig } from '@/lib/studio-types';

export const LABELS = {
  ko: {
    title: '제출 묶음 생성',
    subtitle: '원고·과정기록·권리/IP 파일을 한 번에 다운로드',
    artifactsHeader: '포함될 파일',
    profileHeader: '제출 용도',
    recipientHeader: '받는 곳 (선택)',
    recipientPlaceholder: '예: 한국문학번역원 / 출판사 / 플랫폼',
    formatHeader: '확인서 형식',
    formatHtml: 'HTML',
    formatMd: 'Markdown',
    issue: '묶음 생성',
    issuing: '생성 중...',
    success: '묶음 생성 완료',
    error: '오류',
    downloadAll: 'ZIP 다운로드',
    zipReady: 'ZIP 다운로드 준비됨',
    zipFallback: 'ZIP 생성이 어려워 개별 파일 다운로드로 전환했습니다.',
    downloadFailed: '다운로드를 시작하지 못했습니다.',
    artifactSize: '크기',
    coverPreview: '표지 미리보기',
    sealNo: '발급 번호',
    notReady: '프로젝트가 선택되지 않았습니다.',
    retentionYears: '권장 보관 기간',
    years: '년',
  },
  en: {
    title: 'Submission Package',
    subtitle: 'Download manuscript, process record, and rights/IP files together',
    artifactsHeader: 'Artifacts Included',
    profileHeader: 'Submission Use',
    recipientHeader: 'Recipient (optional)',
    recipientPlaceholder: 'e.g. Library of Congress / Publisher / Platform',
    formatHeader: 'Certificate Format',
    formatHtml: 'HTML',
    formatMd: 'Markdown',
    issue: 'Generate Package',
    issuing: 'Generating...',
    success: 'Package generated',
    error: 'Error',
    downloadAll: 'Download ZIP',
    zipReady: 'ZIP download ready',
    zipFallback: 'ZIP could not be created. Downloading individual files instead.',
    downloadFailed: 'Could not start download.',
    artifactSize: 'Size',
    coverPreview: 'Cover Preview',
    sealNo: 'Serial No.',
    notReady: 'No project selected.',
    retentionYears: 'Recommended retention',
    years: 'yr',
  },
  ja: {
    title: '提出パッケージ',
    subtitle: '原稿・過程記録・権利/IPファイルを一括ダウンロード',
    artifactsHeader: '同梱ファイル',
    profileHeader: '提出用途',
    recipientHeader: '送付先 (任意)',
    recipientPlaceholder: '例: 国立国会図書館 / 出版社 / プラットフォーム',
    formatHeader: '確認書形式',
    formatHtml: 'HTML',
    formatMd: 'Markdown',
    issue: 'パッケージ生成',
    issuing: '生成中...',
    success: 'パッケージ生成完了',
    error: 'エラー',
    downloadAll: 'ZIPダウンロード',
    zipReady: 'ZIPダウンロード準備完了',
    zipFallback: 'ZIPを作成できないため、個別ファイルのダウンロードに切り替えました。',
    downloadFailed: 'ダウンロードを開始できませんでした。',
    artifactSize: 'サイズ',
    coverPreview: '表紙プレビュー',
    sealNo: '発行番号',
    notReady: 'プロジェクトが選択されていません。',
    retentionYears: '推奨保管期間',
    years: '年',
  },
  zh: {
    title: '提交包',
    subtitle: '一次性下载稿件、过程记录和权利/IP文件',
    artifactsHeader: '包含文件',
    profileHeader: '提交用途',
    recipientHeader: '接收方 (选填)',
    recipientPlaceholder: '例: 国家图书馆 / 出版社 / 平台',
    formatHeader: '确认书格式',
    formatHtml: 'HTML',
    formatMd: 'Markdown',
    issue: '生成包',
    issuing: '生成中...',
    success: '包生成完成',
    error: '错误',
    downloadAll: '下载 ZIP',
    zipReady: 'ZIP 下载已准备好',
    zipFallback: '无法生成 ZIP，已改为下载单个文件。',
    downloadFailed: '无法开始下载。',
    artifactSize: '大小',
    coverPreview: '封面预览',
    sealNo: '发行编号',
    notReady: '尚未选择项目。',
    retentionYears: '建议保管期限',
    years: '年',
  },
} as const;

export function toCertLang(lang: AppLanguage): CertificateLanguage {
  switch (lang) {
    case 'KO': return 'ko';
    case 'EN': return 'en';
    case 'JP': return 'ja';
    case 'CN': return 'zh';
    default: return 'ko';
  }
}

export function triggerDownloadBlob(filename: string, content: string, mimeType: string): void {
  if (typeof document === 'undefined') return;
  try {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (err) {
    logger.warn('SubmissionPackageBuilder', 'triggerDownloadBlob failed', err);
  }
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

interface ProjectReadResult {
  projectName: string;
  authorName?: string;
  episodes: Array<{ episode: number; content: string }>;
  worldSummary?: { genre?: string; era?: string; ruleCount?: number };
  characters?: Array<{ id: string; name: string }>;
  importFileReports?: SubmissionImportFileReportItem[];
  ipPack?: SubmissionPackageInput['ipPack'];
  coreCopyrightPackage?: SubmissionPackageInput['coreCopyrightPackage'];
  jurisdictionPackId?: LocalePackId;
  recommendedPlanId?: LoreguardPlanId;
}

type StoredSessionConfig = Partial<StoryConfig> & {
  manuscripts?: Array<Partial<EpisodeManuscript> & { episode?: number; content?: string }>;
  world?: { genre?: string; era?: string; rules?: unknown[] };
  worldSimData?: { genre?: string };
  importFileReports?: unknown[];
};

function normalizeImportFileReport(value: unknown): SubmissionImportFileReportItem | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const fileName = typeof record.fileName === 'string' ? record.fileName.trim() : '';
  const status = record.status;
  if (!fileName || !['success', 'failed', 'unsupported', 'empty'].includes(String(status))) {
    return null;
  }
  return {
    id: typeof record.id === 'string' && record.id.trim() ? record.id : `import-${fileName}`,
    fileName,
    status: status as SubmissionImportFileReportItem['status'],
    detail: typeof record.detail === 'string' ? record.detail : '',
    candidateCount: typeof record.candidateCount === 'number' && Number.isFinite(record.candidateCount)
      ? Math.max(0, record.candidateCount)
      : 0,
    importedAt: typeof record.importedAt === 'string' ? record.importedAt : new Date(0).toISOString(),
    ...(typeof record.reasonCode === 'string' ? { reasonCode: record.reasonCode as SubmissionImportFileReportItem['reasonCode'] } : {}),
    ...(typeof record.reasonLabel === 'string' ? { reasonLabel: record.reasonLabel } : {}),
  };
}

function normalizeEpisodeManuscript(value: unknown, fallbackEpisode: number): EpisodeManuscript | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const content = typeof record.content === 'string' ? record.content : '';
  if (!content) return null;
  const episode = typeof record.episode === 'number' && Number.isFinite(record.episode)
    ? record.episode
    : fallbackEpisode;

  return {
    episode,
    title: typeof record.title === 'string' && record.title.trim() ? record.title : `${episode}화`,
    content,
    charCount: typeof record.charCount === 'number' && Number.isFinite(record.charCount)
      ? Math.max(0, record.charCount)
      : content.length,
    lastUpdate: typeof record.lastUpdate === 'number' && Number.isFinite(record.lastUpdate)
      ? record.lastUpdate
      : 0,
    ...(typeof record.summary === 'string' ? { summary: record.summary } : {}),
    ...(typeof record.detailedSummary === 'string' ? { detailedSummary: record.detailedSummary } : {}),
  };
}

function buildIpPackFromStoredConfig(input: {
  projectId: string;
  projectName: string;
  config: Partial<StoryConfig> | null;
  manuscripts: readonly EpisodeManuscript[];
  characters: readonly { id: string; name: string }[];
}): SubmissionPackageInput['ipPack'] | undefined {
  if (!input.config && input.manuscripts.length === 0) return undefined;
  const storyConfig = {
    ...(input.config ?? {}),
    title: input.config?.title || input.projectName,
    manuscripts: input.manuscripts,
    characters: input.config?.characters ?? input.characters,
  } as StoryConfig;
  const profileId = inferMediaIpPackProfileId(storyConfig);

  return {
    externalMaterialClusters: buildProjectExternalMaterialClusters({
      config: storyConfig,
      manuscripts: input.manuscripts,
    }),
    mediaFormGroups: buildProjectMediaIpPackFormCompletions({
      config: storyConfig,
      manuscripts: input.manuscripts,
      profileId,
    }),
    projectLedgerScope: {
      projectId: input.projectId,
      projectScoped: true,
    },
  };
}

function buildCoreCopyrightPackageFromStoredConfig(input: {
  projectId: string;
  projectName: string;
  config: Partial<StoryConfig> | null;
  manuscripts: readonly EpisodeManuscript[];
}): SubmissionPackageInput['coreCopyrightPackage'] | undefined {
  if (!input.config && input.manuscripts.length === 0) return undefined;
  const storyConfig = {
    ...(input.config ?? {}),
    title: input.config?.title || input.projectName,
    manuscripts: input.manuscripts,
  } as StoryConfig;
  const pack = buildCoreCopyrightPackage({
    config: storyConfig,
    manuscripts: input.manuscripts,
    authorDisplayName: input.projectName,
    generatedAtKo: new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
  });
  const safeProjectId = input.projectId.replace(/[^a-zA-Z0-9_-]/g, '').slice(-24) || 'project';
  return {
    filename: `core-copyright-package-${safeProjectId}.md`,
    content: serializeCoreCopyrightPackageMarkdown(pack),
    package: pack,
  };
}

export function defaultPackageProfileForDistribution(
  profileId: DistributionProfileId,
): ReleaseEntitlementPlan['packageProfileId'] {
  if (profileId === 'platform') return 'public-reader';
  if (profileId === 'private-archive' || profileId === 'legal-deposit') return 'internal-archive';
  return 'external-submission';
}

export function defaultDistributionProfileForPackage(
  packageProfileId?: ReleaseEntitlementPlan['packageProfileId'],
): DistributionProfileId {
  if (!packageProfileId) return 'publisher';
  return EXPORT_PACKAGE_PROFILES[packageProfileId]?.mappedDistributionProfile ?? 'publisher';
}

export function readProjectFromStorage(projectId: string): ProjectReadResult {
  const fallback: ProjectReadResult = { projectName: projectId, episodes: [] };
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage?.getItem('noa_projects_v2');
    if (!raw) return fallback;
    const projects = JSON.parse(raw) as Array<{
      id: string;
      name?: string;
      sessions?: Array<{
        config?: StoredSessionConfig;
      }>;
    }>;
    const proj = projects.find((p) => p.id === projectId);
    if (!proj) return fallback;
    const allMs: EpisodeManuscript[] = [];
    const charsMap = new Map<string, { id: string; name: string }>();
    const importReports: SubmissionImportFileReportItem[] = [];
    let mergedConfig: Partial<StoryConfig> | null = null;
    let worldGenre: string | undefined;
    let ruleCount = 0;
    for (const sess of proj.sessions ?? []) {
      if (sess.config) {
        mergedConfig = { ...(mergedConfig ?? {}), ...sess.config };
      }
      for (const manuscript of sess.config?.manuscripts ?? []) {
        const normalized = normalizeEpisodeManuscript(manuscript, allMs.length + 1);
        if (normalized) {
          allMs.push(normalized);
        }
      }
      for (const character of sess.config?.characters ?? []) {
        if (character?.id) {
          charsMap.set(character.id, { id: character.id, name: character.name || character.id });
        }
      }
      for (const report of sess.config?.importFileReports ?? []) {
        const normalized = normalizeImportFileReport(report);
        if (normalized) importReports.push(normalized);
      }
      if (!worldGenre) worldGenre = sess.config?.world?.genre || sess.config?.worldSimData?.genre;
      if (Array.isArray(sess.config?.world?.rules)) ruleCount += sess.config.world.rules.length;
    }
    return {
      projectName: proj.name || projectId,
      episodes: allMs,
      characters: Array.from(charsMap.values()),
      worldSummary: worldGenre || ruleCount > 0 ? { genre: worldGenre, ruleCount } : undefined,
      importFileReports: importReports,
      jurisdictionPackId: inferLocalePackId({
        projectTargetLanguage: mergedConfig?.projectTargetLanguage,
        targetMarket: mergedConfig?.targetMarket,
      }),
      recommendedPlanId: recommendCreatorSegment(mergedConfig).recommendedPlanId,
      ipPack: buildIpPackFromStoredConfig({
        projectId,
        projectName: proj.name || projectId,
        config: mergedConfig,
        manuscripts: allMs,
        characters: Array.from(charsMap.values()),
      }),
      coreCopyrightPackage: buildCoreCopyrightPackageFromStoredConfig({
        projectId,
        projectName: proj.name || projectId,
        config: mergedConfig,
        manuscripts: allMs,
      }),
    };
  } catch (err) {
    logger.warn('SubmissionPackageBuilder', 'readProjectFromStorage failed', err);
    return fallback;
  }
}
