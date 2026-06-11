// ============================================================
// Report Builder — 창작 과정 확인서 본문 생성 (10 섹션 + 통계 + 해시)
// ============================================================
//
// 입력: projectId + view + language + 외부 주입 데이터 (project/episodes)
// 출력: ProcessCertificate + 10 섹션 payload
//
// UI/React import 0건. 순수 함수만.
//
// 사상 정합:
//   - 4차 §3 "Loreguard 가 해야 하는 말 = 정보, 판정 X"
//   - 13차 §5.2 "외부=확인서, 내부=영수증"
//   - 14차 §3 엄밀성 시장 — 책임 회피 단어 명시 부정
// ============================================================

import type {
  CertificateLanguage,
  CertificateSectionId,
  CertificateSummaryStats,
  CertificateView,
  CreativeEvent,
  ProcessCertificate,
  SourceRecord,
} from './types';
import { CERTIFICATE_LABELS } from './types';
import { listCreativeEvents } from './event-recorder';
import { extractChainTipHash } from './chain-verify';
import { listSources } from './source-recorder';
import { computeSha256Hex } from './source-recorder';
import { LIMITATION_TEXT_4LANG, LIMITATION_TEXT_VERSION, assertNoForbiddenWords } from './limitation-text';
import { mapInternalToExternalStatus, type InternalStatus } from './external-status-mapper';
// [Visual Charter v1.0 — 2026-05-10]
import { computeHCIDetail, categorizeOriginSummary } from './hci-calculator';
import { issueWitnessSeal } from './seal-issuer';
import { generateQRDataUrl } from './qr-renderer';
import { ATTESTATION_OF_GENESIS_4LANG } from './attestation-text';

// ============================================================
// PART 1 — 입력·출력 타입
// ============================================================

/** 외부 주입 데이터 (project/episodes 정보) */
export interface CertificateBuildInput {
  projectId: string;
  view: CertificateView;
  language: CertificateLanguage;
  /** 프로젝트 메타 (호출자가 외부에서 주입) */
  projectMeta: {
    name: string;
    authorName?: string;
    createdAt?: string;
  };
  /** 원고 데이터 (호출자 주입) */
  episodes: Array<{ episode: number; content: string }>;
  /** 세계관 (선택) */
  worldSummary?: { genre?: string; era?: string; ruleCount?: number };
  /** 캐릭터 (선택) */
  characters?: Array<{ id: string; name: string }>;
  /** 발급 시스템 식별자 (예: 'loreguard@2.2.0-alpha.1') */
  generatedBy?: string;
}

/** 섹션 페이로드 — HTML/Markdown 렌더러 공통 소비 */
export interface SectionPayload {
  id: CertificateSectionId;
  title: string;
  rows: Array<{ key: string; value: string }>;
  warnings?: string[];
}

/** buildCertificate 반환 */
export interface CertificateBuildOutput {
  cert: ProcessCertificate;
  sections: Record<CertificateSectionId, SectionPayload | null>;
}

// ============================================================
// PART 2 — 4언어 섹션 라벨
// ============================================================

const SECTION_TITLES: Record<CertificateSectionId, Record<CertificateLanguage, string>> = {
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
    // [톤 정책 — 2026-05-07] 5차 §4 + 6차 §9 + AGENTS.md §6 "AI 단어 줄이기" 정합.
    // 작가 자존감 보호 — "자동 생성" 함의 0. 같이 쓰기 = AI와 협업 어휘.
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

// ============================================================
// PART 3 — 4언어 row 라벨 헬퍼
// ============================================================

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
  // [톤 정책] 외부 노출 라벨은 작가 친숙어. 코드 변수명만 ai* 유지 (개발자 가독성).
  aiAssistUsed: { ko: '같이 쓰기', en: 'Co-Write', ja: '共同執筆', zh: '共同写作' },
  aiEventCount: { ko: '같이 쓴 횟수', en: 'Co-Write Count', ja: '共同執筆回数', zh: '共同写作次数' },
  modelList: { ko: '사용 모델', en: 'Models Used', ja: '使用モデル', zh: '使用模型' },
  externalStatus: { ko: '점검 상태', en: 'Review Status', ja: '点検状況', zh: '检查状态' },
  importCount: { ko: '편입 건수', en: 'Import Count', ja: '取り込み件数', zh: '导入次数' },
  acceptCount: { ko: '채택 건수', en: 'Accepted', ja: '採用件数', zh: '采纳次数' },
  // [2026-05-09 — LearningGuard 설계서 §3.1] 어휘 중립화.
  // '거절/拒否/拒绝' 은 법원·부정적 어조 — '미채택/未採用/未采纳' 으로 작가 중립 표현.
  rejectCount: { ko: '미채택 건수', en: 'Not adopted', ja: '未採用件数', zh: '未采纳次数' },
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

// ============================================================
// PART 4 — 단위 결정 (chars vs words)
// ============================================================

function unitLabelFor(language: CertificateLanguage): 'chars' | 'words' {
  return language === 'en' ? 'words' : 'chars';
}

function countUnits(text: string, unit: 'chars' | 'words'): number {
  if (!text) return 0;
  if (unit === 'chars') return text.length;
  // 영어 word count — whitespace split + 빈 문자열 제거
  return text.trim().split(/\s+/).filter((w) => w.length > 0).length;
}

// ============================================================
// PART 5 — 섹션 빌더 10개
// ============================================================

function buildOverviewSection(
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

async function buildManuscriptInfoSection(
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

function buildWorldBaselineSection(
  language: CertificateLanguage,
  input: CertificateBuildInput,
  view: CertificateView,
): SectionPayload | null {
  if (view === 'public') return null; // private/publisher 만 노출
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

function buildCharacterBaselineSection(
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

function buildAIUsageSummarySection(
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

function buildExternalImportSection(
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
  // publisher / private: label + 시각 (private 추가로 url + licenseNote)
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

function buildVersionTimelineSection(
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

function buildAuthorChoiceSummarySection(
  language: CertificateLanguage,
  events: CreativeEvent[],
  view: CertificateView,
): SectionPayload {
  const accepts = events.filter((e) => e.eventType === 'accept').length;
  const rejects = events.filter((e) => e.eventType === 'reject').length;

  const rows = [
    { key: l('acceptCount', language), value: String(accepts) },
    { key: l('rejectCount', language), value: String(rejects) },
  ];

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

function buildHashAndExportTimeSection(
  language: CertificateLanguage,
  hashes: { manuscriptHash: string; timelineHash: string; sourceSummaryHash: string },
  generatedAt: string,
): SectionPayload {
  return {
    id: 'hash-and-export-time',
    title: SECTION_TITLES['hash-and-export-time'][language],
    rows: [
      { key: l('manuscriptHash', language), value: hashes.manuscriptHash },
      { key: l('timelineHash', language), value: hashes.timelineHash },
      { key: l('sourceSummaryHash', language), value: hashes.sourceSummaryHash },
      { key: l('generatedAt', language), value: generatedAt },
    ],
  };
}

function buildLimitationStatementSection(
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

// ============================================================
// PART 6 — 통계·status 도출
// ============================================================

function deriveInternalStatus(
  events: CreativeEvent[],
  sources: SourceRecord[],
  episodes: Array<{ episode: number; content: string }>,
): InternalStatus {
  // [C] 빈 원고 → 발급 차단
  if (episodes.length === 0) return 'EXPORT_BLOCKED';

  // 외부 편입 있으나 source 누락
  const importEvents = events.filter((e) => e.eventType === 'import');
  const orphanImports = importEvents.filter(
    (e) => !e.sourceId || !sources.find((s) => s.id === e.sourceId),
  );
  if (orphanImports.length > 0) return 'SOURCE_MISSING';

  // 외부 편입 기록 있음 (정상)
  if (importEvents.length > 0 && events.length > 5) return 'SOURCE_MISSING';

  // 작가 개입 비율 낮음 (HUMAN_REVISION < 10% of total)
  if (events.length > 10) {
    const humanRev = events.filter((e) => e.eventType === 'edit' && e.actorType === 'human').length;
    if (humanRev / events.length < 0.1) return 'HUMAN_REVIEW_LOW';
  }

  // 로그 누락 (이벤트가 너무 적음)
  if (episodes.length > 0 && events.length === 0) return 'LOG_GAP';

  // 추가 확인 필요 케이스 (예: 이벤트 5개 미만)
  if (events.length > 0 && events.length < 5) return 'REVIEW_NEEDED';

  return 'READY';
}

function buildSummaryStats(
  events: CreativeEvent[],
  sources: SourceRecord[],
  episodes: Array<{ episode: number; content: string }>,
  language: CertificateLanguage,
  externalStatusLabel: string,
): CertificateSummaryStats {
  const unit = unitLabelFor(language);
  const totalUnits = episodes.reduce((sum, ep) => sum + countUnits(ep.content, unit), 0);

  // [2026-05-09 — LearningGuard 설계서 §2.9] AI 모델·도구 list 자동 추출.
  // event.actorId 또는 details.model 에서 모델명 수집 → 중복 제거.
  const aiModels = new Set<string>();
  for (const e of events) {
    if (e.actorType !== 'ai') continue;
    const id = e.actorId?.trim();
    if (id && id !== 'unknown') aiModels.add(id);
    // details JSON 안 model 필드도 점검 (event-recorder 가 model 정보를 details 안에 넣을 수 있음)
    if (typeof e.note === 'string') {
      const match = e.note.match(/model[=:]\s*([\w.-]+)/i);
      if (match) aiModels.add(match[1]);
    }
  }

  // 4-decision 카운트 (시장 분석 §2.4 / LearningGuard §1 핵심 지표)
  const aiRequestCount = events.filter((e) => e.actorType === 'ai' && e.eventType === 'create').length;
  const aiAcceptCount = events.filter((e) => e.eventType === 'accept').length;
  const aiUnusedCount = events.filter((e) => e.eventType === 'reject').length;

  // 자료 열람 — SourceRecord (READ_RESOURCE 매핑) 외 소스 갯수.
  const resourcesViewedCount = sources.length;

  return {
    totalEpisodes: episodes.length,
    totalUnits,
    unitLabel: unit,
    aiAssistUsed: events.some((e) => e.actorType === 'ai'),
    externalImportCount: events.filter((e) => e.eventType === 'import').length,
    humanRevisionCount: events.filter((e) => e.eventType === 'edit' && e.actorType === 'human').length,
    // [C] CertificateExternalStatus 타입 union — assertion (외부 라벨이 union 멤버 중 하나)
    externalStatus: externalStatusLabel as CertificateSummaryStats['externalStatus'],
    // [§2.9] 사용된 AI 모델·도구 + 4-decision 카운트 + 자료 열람 수
    aiModelsUsed: aiModels.size > 0 ? Array.from(aiModels) : undefined,
    aiRequestCount: aiRequestCount > 0 ? aiRequestCount : undefined,
    aiAcceptCount: aiAcceptCount > 0 ? aiAcceptCount : undefined,
    aiUnusedCount: aiUnusedCount > 0 ? aiUnusedCount : undefined,
    resourcesViewedCount: resourcesViewedCount > 0 ? resourcesViewedCount : undefined,
  };
}

// ============================================================
// PART 7 — 해시 계산
// ============================================================

async function computeManuscriptHash(
  episodes: Array<{ episode: number; content: string }>,
): Promise<string> {
  const joined = episodes
    .map((ep) => `---EPISODE-${ep.episode}---\n\n${ep.content}`)
    .join('\n\n');
  return computeSha256Hex(joined);
}

async function computeTimelineHash(events: CreativeEvent[]): Promise<string> {
  const sorted = [...events].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const minimal = sorted.map((e) => [
    e.id,
    e.eventType,
    e.actorType,
    e.originType,
    e.createdAt,
  ]);
  return computeSha256Hex(JSON.stringify(minimal));
}

async function computeSourceSummaryHash(sources: SourceRecord[]): Promise<string> {
  const sorted = [...sources].sort((a, b) => a.importedAt.localeCompare(b.importedAt));
  const minimal = sorted.map((s) => [
    s.id,
    s.sourceType,
    s.contentHash,
    s.importedAt,
  ]);
  return computeSha256Hex(JSON.stringify(minimal));
}

// ============================================================
// PART 8 — 메인 export — buildCertificate
// ============================================================

/**
 * 창작 과정 확인서 1장 생성.
 *
 * @throws Error('FORBIDDEN_WORD: ...') 외부 노출 텍스트에 금지어 포함 시
 * @throws Error('EMPTY_PROJECT') 에피소드 0건 + view 'public/publisher' (legal 만 발급 가능 — Phase 2)
 */
export async function buildCertificate(
  input: CertificateBuildInput,
): Promise<CertificateBuildOutput> {
  const { projectId, view, language, generatedBy } = input;

  // [Round 2-3 — 2026-05-07] legal view 지원 — 분쟁 대응 자료 (해시·diff·승인 로그·외부 가져오기 전수)
  // private 와 동일 정보 + 추가로 메타데이터·hash 강조. UI 에서 별도 강조.

  // 1) 이벤트·소스 read
  const events = await listCreativeEvents({ projectId });
  const sources = await listSources(projectId);

  // 2) 해시 계산 (병렬)
  const [manuscriptHash, timelineHash, sourceSummaryHash] = await Promise.all([
    computeManuscriptHash(input.episodes),
    computeTimelineHash(events),
    computeSourceSummaryHash(sources),
  ]);

  // [2026-05-09 — LearningGuard 설계서 §3.3] 빈 문자열 SHA-256 false positive 방어.
  // e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 = 빈 문자열 hash.
  // 본 hash 가 manuscriptHash 로 나오면 → 원고 자체가 빈 본문 → EXPORT_BLOCKED.
  const EMPTY_SHA256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
  if (manuscriptHash === EMPTY_SHA256) {
    throw new Error('EMPTY_MANUSCRIPT — 원고 본문이 비어 있어 확인서를 발급할 수 없습니다. 최소 1 문장 이상 작성 후 재시도하세요.');
  }

  // 3) status 도출 + 외부 라벨
  const internalStatus = deriveInternalStatus(events, sources, input.episodes);
  const externalStatusLabel = mapInternalToExternalStatus(internalStatus, language);

  // 4) 요약 통계
  const summaryStats = buildSummaryStats(events, sources, input.episodes, language, externalStatusLabel);

  // 5) 섹션 빌드
  const generatedAt = new Date().toISOString();
  const sections: Record<CertificateSectionId, SectionPayload | null> = {
    'overview': buildOverviewSection(language, input),
    'manuscript-info': await buildManuscriptInfoSection(language, input, manuscriptHash),
    'world-baseline': buildWorldBaselineSection(language, input, view),
    'character-baseline': buildCharacterBaselineSection(language, input, view),
    'ai-usage-summary': buildAIUsageSummarySection(language, events, sources, externalStatusLabel),
    'external-import': buildExternalImportSection(language, events, sources, view),
    'version-timeline': buildVersionTimelineSection(language, events),
    'author-choice-summary': buildAuthorChoiceSummarySection(language, events, view),
    'hash-and-export-time': buildHashAndExportTimeSection(language, { manuscriptHash, timelineHash, sourceSummaryHash }, generatedAt),
    'limitation-statement': buildLimitationStatementSection(language),
  };

  // 6) 금지어 검증 (모든 외부 노출 row 통과)
  for (const sectionId of Object.keys(sections) as CertificateSectionId[]) {
    const payload = sections[sectionId];
    if (!payload) continue;
    // 한계 문구 자체는 LIMITATION_TEXT 와 일치하면 skip
    for (const row of payload.rows) {
      assertNoForbiddenWords(row.key, language);
      assertNoForbiddenWords(row.value, language);
    }
    assertNoForbiddenWords(payload.title, language);
  }

  // 7) ProcessCertificate 객체 생성
  const certId = generateCertificateId();

  // [2026-05-09 — LearningGuard 설계서 §2.3·2.8·2.10] 보강 필드 산출
  const verificationBaseUrl =
    (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SITE_URL) ||
    'https://eh-universe.com';
  const verificationUrl = `${verificationBaseUrl.replace(/\/+$/, '')}/api/cp/verify/${certId}`;

  // 시간대 — IANA. 브라우저 환경 또는 server 환경에서 안전 추출.
  let timeZone: string | undefined;
  try {
    timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch { /* SSR fallback */ }
  // Local ISO — Intl.DateTimeFormat 으로 timezone 정보 + offset 표기
  let issuedAtLocal: string | undefined;
  try {
    const dt = new Date(generatedAt);
    issuedAtLocal = dt.toLocaleString('sv-SE', { hour12: false }).replace(' ', 'T'); // 'YYYY-MM-DDTHH:mm:ss'
  } catch { /* */ }

  // 보존 정책 — 1년 default (alpha 단계). 사용자 명시 보관 요청 시 expiresAt 갱신.
  const RETENTION_DAYS = 365;
  const expiresAt = new Date(Date.parse(generatedAt) + RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();

  // [Visual Charter v1.0 — 2026-05-10] HCI + Origin Summary + Witness Seal + ATTESTATION 산출.
  const hciDetail = computeHCIDetail(events);
  const originSummaryPct = categorizeOriginSummary(hciDetail.byOrigin);
  const sealNumber = await issueWitnessSeal({ generatedAt, manuscriptHash });
  const verificationQrDataUrl = await generateQRDataUrl(sealNumber, verificationBaseUrl);
  const attestationStatement = ATTESTATION_OF_GENESIS_4LANG[language];
  // Work Sessions — events 시간순 + 의미 있는 시점 추출 (현재는 첫 / 중간 / 마지막)
  const workSessions = (() => {
    if (events.length === 0) return [];
    const sorted = [...events].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const out: Array<{ date: string; title: string }> = [];
    out.push({ date: sorted[0].createdAt, title: 'Initial Work' });
    if (sorted.length >= 3) {
      out.push({ date: sorted[Math.floor(sorted.length / 2)].createdAt, title: 'Mid Work' });
    }
    if (sorted.length >= 2) {
      out.push({ date: sorted[sorted.length - 1].createdAt, title: 'Final Sweep' });
    }
    return out;
  })();

  const cert: ProcessCertificate = {
    id: certId,
    projectId,
    manuscriptHash,
    generatedAt,
    generatedBy: generatedBy || 'loreguard@unknown',
    reportVersion: '1.1.0', // Visual Charter v1.0 통합 → 1.1.0 bump
    visibility: view,
    includedSections: (Object.keys(sections) as CertificateSectionId[]).filter((id) => sections[id] !== null),
    summaryStats,
    timelineHash,
    sourceSummaryHash,
    limitationTextVersion: LIMITATION_TEXT_VERSION,
    // [§2.1] schema·app version
    schemaVersion: '1.0.0',
    appVersion: (generatedBy?.split('@')[1]) || 'unknown',
    // [§2.2] issuer (alpha — self default; future Phase 2: OAuth 검증)
    issuer: {
      type: 'self',
      verified: false,
    },
    // [§2.3] verification URL (외부 검증)
    verificationUrl,
    verificationQrDataUrl,
    // [§2.8] time zone + local ISO
    timeZone,
    issuedAtLocal,
    // [§2.10] retention policy (자동 삭제)
    retention: {
      expiresAt,
      autoDelete: true,
      policyUrl: `${verificationBaseUrl.replace(/\/+$/, '')}/privacy`,
    },
    // [Visual Charter v1.0 — 2026-05-10]
    sealNumber,
    hciPayload: {
      hci: hciDetail.hci,
      intent: hciDetail.intent,
      density: hciDetail.density,
      logic: hciDetail.logic,
      totalEvents: hciDetail.totalEvents,
    },
    attestationStatement,
    originSummary: originSummaryPct,
    workSessions,
    // [s81-hash-chain] 발급 시점 체인 tip anchoring (hashed 이벤트 0건이면 undefined)
    chainTipHash: extractChainTipHash(events),
  };

  return { cert, sections };
}

// ============================================================
// PART 9 — Certificate ID 생성 (event-recorder 와 별도 ULID)
// ============================================================

function generateCertificateId(): string {
  const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  const time = Date.now();
  let timeStr = '';
  let t = time;
  for (let i = 0; i < 10; i++) {
    timeStr = CROCKFORD[t % 32] + timeStr;
    t = Math.floor(t / 32);
  }
  let randStr = '';
  for (let i = 0; i < 16; i++) {
    randStr += CROCKFORD[Math.floor(Math.random() * 32)];
  }
  return timeStr + randStr;
}

// ============================================================
// PART 10 — 메뉴 텍스트 헬퍼 (UI 노출용)
// ============================================================

/** 4언어 메뉴 텍스트 (Settings 섹션 제목용 — "작업 정리 노트") */
export const MENU_LABELS: Record<CertificateLanguage, string> = {
  ko: '작업 정리 노트',
  en: 'Work Notes',
  ja: '作業ノート',
  zh: '作业笔记',
} as const;

/** 4언어 외부 명칭 (문서 제목용 — "창작 과정 확인서") */
export function getCertificateLabel(language: CertificateLanguage): string {
  return CERTIFICATE_LABELS[language];
}
