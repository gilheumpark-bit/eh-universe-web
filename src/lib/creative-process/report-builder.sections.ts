import type {
  CertificateLanguage,
  CertificateSectionId,
  CertificateView,
  CreativeEvent,
  SourceRecord,
} from './types';
import {
  FORBIDDEN_WORDS_4LANG,
  LIMITATION_TEXT_4LANG,
} from './limitation-text';
import type { CertificateBuildInput, SectionPayload } from './report-builder';

export const SECTION_TITLES: Record<CertificateSectionId, Record<CertificateLanguage, string>> = {
  'overview': {
    ko: '프로젝트 개요', en: 'Overview', ja: 'プロジェクト概要', zh: '项目概述',
  },
  'manuscript-info': {
    ko: '원고 정보', en: 'Manuscript', ja: '原稿情報', zh: '原稿信息',
  },
  'world-baseline': {
    ko: '세계관 기준선', en: 'World Baseline', ja: '世界観基準', zh: '世界观基线',
  },
  'character-baseline': {
    ko: '캐릭터·주요 설정', en: 'Characters', ja: 'キャラクター', zh: '角色',
  },
  'ai-usage-summary': {
    ko: '같이 쓴 흐름', en: 'Co-Write Activity', ja: '共同執筆の流れ', zh: '共同写作流程',
  },
  'external-import': {
    ko: '외부 텍스트 편입 이력', en: 'External Imports', ja: '外部取り込み履歴', zh: '外部导入记录',
  },
  'version-timeline': {
    ko: '주요 버전 타임라인', en: 'Version Timeline', ja: 'バージョン履歴', zh: '版本时间线',
  },
  'author-choice-summary': {
    ko: '작가 선택·수정·폐기', en: 'Author Choices', ja: '作家の選択・修正', zh: '作家选择与修改',
  },
  'hash-and-export-time': {
    ko: '원고 해시·발급 시각', en: 'Hash & Issued At', ja: 'ハッシュと発行時刻', zh: '哈希与发行时间',
  },
  'limitation-statement': {
    ko: '확인서의 한계와 책임 범위', en: 'Limitations', ja: '本書の限界', zh: '确认书限制',
  },
};

const L = {
  projectName: { ko: '프로젝트명', en: 'Project', ja: 'プロジェクト名', zh: '项目名称' },
  authorName: { ko: '작가', en: 'Author', ja: '作家', zh: '作家' },
  createdAt: { ko: '생성 시각', en: 'Created At', ja: '作成日時', zh: '创建时间' },
  totalEpisodes: { ko: '총 에피소드', en: 'Total Episodes', ja: '総エピソード数', zh: '总集数' },
  totalUnits: { ko: '총 글자/단어', en: 'Total Units', ja: '総文字/単語数', zh: '总字数' },
  hashPrefix: { ko: '해시 (앞 12자)', en: 'Hash (12 chars)', ja: 'ハッシュ(12文字)', zh: '哈希(前 12 字符)' },
  genre: { ko: '장르', en: 'Genre', ja: 'ジャンル', zh: '类型' },
  era: { ko: '시대', en: 'Era', ja: '時代', zh: '时代' },
  ruleCount: { ko: '룰 갯수', en: 'Rule Count', ja: 'ルール数', zh: '规则数' },
  characterCount: { ko: '캐릭터 수', en: 'Character Count', ja: 'キャラクター数', zh: '角色数' },
  characterNames: { ko: '주요 캐릭터', en: 'Main Characters', ja: '主要キャラクター', zh: '主要角色' },
  aiAssistUsed: { ko: '같이 쓰기', en: 'Co-Write', ja: '共同執筆', zh: '共同写作' },
  aiEventCount: { ko: '같이 쓴 횟수', en: 'Co-Write Count', ja: '共同執筆回数', zh: '共同写作次数' },
  modelList: { ko: '사용 모델', en: 'Models Used', ja: '使用モデル', zh: '使用模型' },
  externalStatus: { ko: '점검 상태', en: 'Review Status', ja: '点検状況', zh: '检查状态' },
  importCount: { ko: '편입 건수', en: 'Import Count', ja: '取り込み件数', zh: '导入次数' },
  acceptCount: { ko: '채택 건수', en: 'Accepted', ja: '採用件数', zh: '采纳次数' },
  rejectCount: { ko: '미채택 건수', en: 'Not adopted', ja: '未採用件数', zh: '未采纳次数' },
  decisionRecordCount: { ko: '판단 기록', en: 'Decision Records', ja: '判断記録', zh: '判断记录' },
  choiceReason: { ko: '선택 근거', en: 'Choice Reason', ja: '選択理由', zh: '选择理由' },
  manuscriptHash: { ko: '원고 해시', en: 'Manuscript Hash', ja: '原稿ハッシュ', zh: '原稿哈希' },
  timelineHash: { ko: '타임라인 해시', en: 'Timeline Hash', ja: 'タイムラインハッシュ', zh: '时间线哈希' },
  sourceSummaryHash: { ko: '소스 요약 해시', en: 'Source Summary Hash', ja: 'ソース要約ハッシュ', zh: '来源摘要哈希' },
  generatedAt: { ko: '발급 시각', en: 'Issued At', ja: '発行時刻', zh: '发行时间' },
  yes: { ko: '예', en: 'Yes', ja: 'はい', zh: '是' },
  no: { ko: '아니오', en: 'No', ja: 'いいえ', zh: '否' },
  notSpecified: { ko: '미지정', en: 'Not specified', ja: '未指定', zh: '未指定' },
} as const;

function l(key: keyof typeof L, lang: CertificateLanguage): string {
  return L[key][lang];
}

export function unitLabelFor(language: CertificateLanguage): 'chars' | 'words' {
  return language === 'en' ? 'words' : 'chars';
}

export function countUnits(text: string, unit: 'chars' | 'words'): number {
  if (!text) return 0;
  if (unit === 'chars') return text.length;
  return text.trim().split(/\s+/).filter((w) => w.length > 0).length;
}

export function buildOverviewSection(
  language: CertificateLanguage,
  input: CertificateBuildInput,
): SectionPayload {
  return {
    id: 'overview',
    title: SECTION_TITLES.overview[language],
    rows: [
      { key: l('projectName', language), value: input.projectMeta.name || l('notSpecified', language) },
      { key: l('authorName', language), value: input.projectMeta.authorName || l('notSpecified', language) },
      { key: l('createdAt', language), value: input.projectMeta.createdAt || l('notSpecified', language) },
      { key: l('totalEpisodes', language), value: String(input.episodes.length) },
    ],
  };
}

export async function buildManuscriptInfoSection(
  language: CertificateLanguage,
  input: CertificateBuildInput,
  manuscriptHash: string,
): Promise<SectionPayload> {
  const unit = unitLabelFor(language);
  const totalUnits = input.episodes.reduce((sum, ep) => sum + countUnits(ep.content, unit), 0);

  return {
    id: 'manuscript-info',
    title: SECTION_TITLES['manuscript-info'][language],
    rows: [
      { key: l('totalEpisodes', language), value: String(input.episodes.length) },
      { key: l('totalUnits', language), value: `${totalUnits} ${unit}` },
      { key: l('hashPrefix', language), value: manuscriptHash.slice(0, 12) },
    ],
  };
}

export function buildWorldBaselineSection(
  language: CertificateLanguage,
  input: CertificateBuildInput,
  view: CertificateView,
): SectionPayload | null {
  if (view === 'public') return null;
  const w = input.worldSummary;
  return {
    id: 'world-baseline',
    title: SECTION_TITLES['world-baseline'][language],
    rows: [
      { key: l('genre', language), value: w?.genre || l('notSpecified', language) },
      { key: l('era', language), value: w?.era || l('notSpecified', language) },
      { key: l('ruleCount', language), value: String(w?.ruleCount ?? 0) },
    ],
  };
}

export function buildCharacterBaselineSection(
  language: CertificateLanguage,
  input: CertificateBuildInput,
  view: CertificateView,
): SectionPayload | null {
  if (view === 'public') {
    return {
      id: 'character-baseline',
      title: SECTION_TITLES['character-baseline'][language],
      rows: [{ key: l('characterCount', language), value: String(input.characters?.length ?? 0) }],
    };
  }
  const names = (input.characters ?? []).map((c) => c.name).filter(Boolean).join(', ');
  return {
    id: 'character-baseline',
    title: SECTION_TITLES['character-baseline'][language],
    rows: [
      { key: l('characterCount', language), value: String(input.characters?.length ?? 0) },
      { key: l('characterNames', language), value: names || l('notSpecified', language) },
    ],
  };
}

export function buildAIUsageSummarySection(
  language: CertificateLanguage,
  events: CreativeEvent[],
  sources: SourceRecord[],
  externalStatusLabel: string,
): SectionPayload {
  const aiEvents = events.filter((e) => e.actorType === 'ai');
  const usedModels = Array.from(
    new Set(
      sources
        .filter((s) => s.sourceType === 'ai_output' && s.model)
        .map((s) => `${s.provider ?? '?'}/${s.model ?? '?'}`),
    ),
  );

  return {
    id: 'ai-usage-summary',
    title: SECTION_TITLES['ai-usage-summary'][language],
    rows: [
      { key: l('aiAssistUsed', language), value: aiEvents.length > 0 ? l('yes', language) : l('no', language) },
      { key: l('aiEventCount', language), value: String(aiEvents.length) },
      { key: l('modelList', language), value: usedModels.length ? usedModels.join(', ') : l('notSpecified', language) },
      { key: l('externalStatus', language), value: externalStatusLabel },
    ],
  };
}

export function buildExternalImportSection(
  language: CertificateLanguage,
  events: CreativeEvent[],
  sources: SourceRecord[],
  view: CertificateView,
): SectionPayload {
  const importEvents = events.filter((e) => e.eventType === 'import');
  if (view === 'public') {
    return {
      id: 'external-import',
      title: SECTION_TITLES['external-import'][language],
      rows: [{ key: l('importCount', language), value: String(importEvents.length) }],
    };
  }
  const sourceMap = new Map(sources.map((s) => [s.id, s]));
  const rows = importEvents.map((e) => {
    const src = e.sourceId ? sourceMap.get(e.sourceId) : null;
    const label = src?.label ?? '(no label)';
    const time = e.createdAt;
    let value = `${label} @ ${time}`;
    if (view === 'private') {
      if (src?.url) value += ` | ${src.url}`;
      if (src?.licenseNote) value += ` | ${src.licenseNote}`;
    }
    return { key: e.id.slice(0, 12), value };
  });
  if (rows.length === 0) {
    rows.push({ key: l('importCount', language), value: '0' });
  }
  return {
    id: 'external-import',
    title: SECTION_TITLES['external-import'][language],
    rows,
  };
}

export function buildVersionTimelineSection(
  language: CertificateLanguage,
  events: CreativeEvent[],
): SectionPayload {
  const timeline = events.filter((e) => e.eventType === 'create' || e.eventType === 'merge');
  const rows = timeline.length === 0
    ? [{ key: '-', value: l('notSpecified', language) }]
    : timeline.map((e) => ({
        key: e.createdAt,
        value: `[${e.actorType}] ${e.targetType}/${e.targetId.slice(0, 8)} (${e.eventType})`,
      }));
  return {
    id: 'version-timeline',
    title: SECTION_TITLES['version-timeline'][language],
    rows,
  };
}

export function buildAuthorChoiceSummarySection(
  language: CertificateLanguage,
  events: CreativeEvent[],
  view: CertificateView,
): SectionPayload {
  const accepts = events.filter((e) => e.eventType === 'accept').length;
  const rejects = events.filter((e) => e.eventType === 'reject').length;
  const decisionEvents = events.filter((e) => e.decisionContext);

  const rows = [
    { key: l('acceptCount', language), value: String(accepts) },
    { key: l('rejectCount', language), value: String(rejects) },
    { key: l('decisionRecordCount', language), value: String(decisionEvents.length) },
  ];

  if (view !== 'public') {
    const details = decisionEvents
      .slice(-5)
      .reverse()
      .map((e, index) => ({
        key: `${l('choiceReason', language)} ${index + 1}`,
        value: formatDecisionContextRow(language, e),
      }));
    rows.push(...details);
  }

  if (view === 'private') {
    const rejectedList = events
      .filter((e) => e.eventType === 'reject')
      .map((e) => `${e.createdAt} ${e.targetType}/${e.targetId.slice(0, 8)}`)
      .join(' | ');
    if (rejectedList) {
      rows.push({ key: 'rejected', value: rejectedList });
    }
  }

  return {
    id: 'author-choice-summary',
    title: SECTION_TITLES['author-choice-summary'][language],
    rows,
  };
}

function decisionActionLabel(language: CertificateLanguage, action: NonNullable<CreativeEvent['decisionContext']>['action']): string {
  const table: Record<NonNullable<CreativeEvent['decisionContext']>['action'], Record<CertificateLanguage, string>> = {
    accepted: { ko: '채택', en: 'Accepted', ja: '採用', zh: '采纳' },
    rejected: { ko: '미채택', en: 'Not adopted', ja: '未採用', zh: '未采纳' },
    revised: { ko: '수정 반영', en: 'Revised', ja: '修正反映', zh: '修改采纳' },
    discarded: { ko: '폐기', en: 'Discarded', ja: '破棄', zh: '废弃' },
  };
  return table[action][language];
}

function cleanReportRowText(language: CertificateLanguage, value: string): string {
  let out = value.replace(/\s+/g, ' ').trim();
  for (const word of FORBIDDEN_WORDS_4LANG[language]) {
    const pattern = language === 'en'
      ? new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
      : new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    out = out.replace(pattern, '[redacted]');
  }
  return out;
}

function formatDecisionContextRow(language: CertificateLanguage, event: CreativeEvent): string {
  const context = event.decisionContext;
  if (!context) return l('notSpecified', language);
  const selected = context.alternatives?.find((item) => item.id === context.selectedAlternativeId);
  const selectedLabel = selected?.label ?? context.selectedAlternativeId ?? l('notSpecified', language);
  const optionCount = context.alternatives?.length ?? 0;
  const delta = context.delta;
  const deltaText = delta
    ? `${delta.beforeChars ?? '?'}→${delta.afterChars ?? '?'} chars`
    : undefined;
  const parts = [
    event.createdAt,
    decisionActionLabel(language, context.action),
    `${event.targetType}/${event.targetId.slice(0, 12)}`,
    selectedLabel,
    optionCount > 0 ? `${optionCount} options` : undefined,
    context.reason,
    deltaText,
  ].filter(Boolean);
  return cleanReportRowText(language, parts.join(' · '));
}

export function buildHashAndExportTimeSection(
  language: CertificateLanguage,
  hashes: { manuscriptHash: string; timelineHash: string; sourceSummaryHash: string },
  generatedAt: string,
): SectionPayload {
  const displayHash = (value: string) => (
    value.length > 24 ? `${value.slice(0, 16)}...${value.slice(-8)}` : value
  );

  return {
    id: 'hash-and-export-time',
    title: SECTION_TITLES['hash-and-export-time'][language],
    rows: [
      { key: l('manuscriptHash', language), value: displayHash(hashes.manuscriptHash) },
      { key: l('timelineHash', language), value: displayHash(hashes.timelineHash) },
      { key: l('sourceSummaryHash', language), value: displayHash(hashes.sourceSummaryHash) },
      { key: l('generatedAt', language), value: generatedAt },
    ],
  };
}

export function buildLimitationStatementSection(
  language: CertificateLanguage,
): SectionPayload {
  return {
    id: 'limitation-statement',
    title: SECTION_TITLES['limitation-statement'][language],
    rows: [
      { key: '', value: LIMITATION_TEXT_4LANG[language] },
    ],
  };
}
