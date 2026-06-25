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
import { sortEventsForChain, verifyEventChain } from './chain-verify';
import { listSources } from './source-recorder';
import { computeSha256Hex } from './source-recorder';
import {
  LIMITATION_TEXT_VERSION,
  assertNoForbiddenWords,
} from './limitation-text';
import { mapInternalToExternalStatus, type InternalStatus } from './external-status-mapper';
// [Visual Charter v1.0 — 2026-05-10]
import { computeHCIDetail, categorizeOriginSummary } from './hci-calculator';
import { issueWitnessSeal } from './seal-issuer';
import { generateQRDataUrl } from './qr-renderer';
import { ATTESTATION_OF_GENESIS_4LANG } from './attestation-text';
import {
  buildAIUsageSummarySection,
  buildAuthorChoiceSummarySection,
  buildCharacterBaselineSection,
  buildExternalImportSection,
  buildHashAndExportTimeSection,
  buildLimitationStatementSection,
  buildManuscriptInfoSection,
  buildOverviewSection,
  buildVersionTimelineSection,
  buildWorldBaselineSection,
  countUnits,
  unitLabelFor,
} from './report-builder.sections';

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

  // 확인서는 과정기록 위에 서는 산출물이다. 발급 직전에 해시 체인을 검문해
  // 위변조·중간 삽입·무해시 이벤트 끼워넣기를 통과시키지 않는다.
  const chainVerification = await verifyEventChain(sortEventsForChain(events));
  if (!chainVerification.valid) {
    const broken = chainVerification.brokenAt;
    const reason = broken ? `${broken.reason}:${broken.eventId}` : 'unknown';
    throw new Error(`EVENT_CHAIN_INVALID — 과정기록 해시 체인이 손상되어 확인서를 발급할 수 없습니다. (${reason})`);
  }

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
  const publicVerificationBaseUrl = `${verificationBaseUrl.replace(/\/+$/, '')}/verify`;
  const verificationUrl = `${publicVerificationBaseUrl}/${certId}`;

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
  const verificationQrDataUrl = await generateQRDataUrl(sealNumber, publicVerificationBaseUrl);
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
    chainTipHash: chainVerification.tipHash ?? undefined,
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
