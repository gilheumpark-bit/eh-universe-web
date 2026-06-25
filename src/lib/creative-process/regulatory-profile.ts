// ============================================================
// Regulatory Profile — 출고 전 관할/플랫폼별 확인 패키지
// ============================================================
//
// 역할:
//   - "준법 확정"이 아니라, 관할/플랫폼이 요구할 가능성이 높은 증거 항목을
//     현재 Loreguard 기록으로 얼마나 채웠는지 계산한다.
//   - 결과는 제출 판단 보조 자료다. 법률 자문/확정 준법 판정이 아니다.
//
// 설계 원칙:
//   - 입력 원문 저장 0. ProcessCertificate·CreativeEvent·SourceRecord 메타만 사용.
//   - 모든 판정 문구는 "확인/기록/보완" 어휘만 사용.
//   - 새 프로필 추가 시 requirement만 늘리고 산식은 건드리지 않는다.
// ============================================================

import type { CreativeEvent, ProcessCertificate, SourceRecord } from './types';

// ============================================================
// PART 1 — Types & Constants
// ============================================================

export type RegulatoryProfileId =
  | 'eu-ai-act-article-50'
  | 'kr-ai-basic-act'
  | 'ca-sb942-ab853'
  | 'platform-provenance'
  | 'authors-guild-evidence';

/** 전체 규제 프로파일 ID — 출고 묶음(submission-package)이 전 관할 준비도를 일괄 평가할 때 사용. */
export const ALL_REGULATORY_PROFILE_IDS: readonly RegulatoryProfileId[] = [
  'eu-ai-act-article-50',
  'kr-ai-basic-act',
  'ca-sb942-ab853',
  'platform-provenance',
  'authors-guild-evidence',
];

export type RegulatoryRequirementSeverity = 'required' | 'recommended';

export type RegulatoryReadinessStatus = 'ready' | 'needs-review' | 'not-ready';

export interface RegulatoryRequirementResult {
  id: string;
  label: string;
  severity: RegulatoryRequirementSeverity;
  met: boolean;
  evidence: string;
}

export interface RegulatoryProfileDefinition {
  id: RegulatoryProfileId;
  label: Record<'ko' | 'en', string>;
  scope: Record<'ko' | 'en', string>;
  limitation: Record<'ko' | 'en', string>;
}

export interface RegulatoryEvidenceInput {
  cert: ProcessCertificate;
  sources: SourceRecord[];
  events: CreativeEvent[];
  artifactIds?: readonly string[];
}

export interface RegulatoryProfileReport {
  id: RegulatoryProfileId;
  label: string;
  scope: string;
  status: RegulatoryReadinessStatus;
  score: number;
  metRequired: number;
  totalRequired: number;
  metRecommended: number;
  totalRecommended: number;
  requirements: RegulatoryRequirementResult[];
  missingRequired: string[];
  limitation: string;
}

type EvidencePredicate = (input: RegulatoryEvidenceInput) => boolean;

interface RequirementDefinition {
  id: string;
  label: Record<'ko' | 'en', string>;
  severity: RegulatoryRequirementSeverity;
  evidence: Record<'ko' | 'en', string>;
  check: EvidencePredicate;
}

const REQUIRED_WEIGHT = 2;
const RECOMMENDED_WEIGHT = 1;

export const REGULATORY_PROFILE_DEFINITIONS: Record<
  RegulatoryProfileId,
  RegulatoryProfileDefinition
> = {
  'eu-ai-act-article-50': {
    id: 'eu-ai-act-article-50',
    label: {
      ko: 'EU AI Act 50조 출고 확인',
      en: 'EU AI Act Article 50 Export Check',
    },
    scope: {
      ko: '생성형 도구 보조 텍스트의 기계 판독 표시와 사용 범위 설명을 위한 제출 보조 자료',
      en: 'Export support for machine-readable AI-use marking and AI involvement records.',
    },
    limitation: {
      ko: '이 리포트는 EU 준법을 확정하지 않습니다. 표시·기록·해시 증거의 준비 상태만 정리합니다.',
      en: 'This report does not determine EU compliance. It only summarizes disclosure, record, and hash readiness.',
    },
  },
  'kr-ai-basic-act': {
    id: 'kr-ai-basic-act',
    label: {
      ko: '한국 AI 기본법 출고 확인',
      en: 'Korea AI Basic Act Export Check',
    },
    scope: {
      ko: '도구 보조 범위, 표시 자료, 원고 해시, 보존 정책을 묶는 국내 플랫폼 제출 보조 자료',
      en: 'Domestic platform support package for AI involvement, labeling material, hashes, and retention records.',
    },
    limitation: {
      ko: '시행령·고시·플랫폼 약관 확정 전까지는 확인 항목입니다. 법률 자문을 대체하지 않습니다.',
      en: 'Items remain review targets until decrees, notices, and platform terms are settled. This is not legal advice.',
    },
  },
  'ca-sb942-ab853': {
    id: 'ca-sb942-ab853',
    label: {
      ko: 'California SB942/AB853 출처 데이터 확인',
      en: 'California SB942/AB853 Provenance Data Check',
    },
    scope: {
      ko: '텍스트 직접 표시보다 플랫폼 provenance 보존·조회에 맞춘 시스템 출처 데이터 보조 자료',
      en: 'System provenance support for platform preservation and inspection workflows.',
    },
    limitation: {
      ko: '캘리포니아의 텍스트 적용 범위는 제한적입니다. 이 항목은 플랫폼 출처 데이터 확인용입니다.',
      en: 'California text obligations are limited. This profile focuses on platform provenance handling.',
    },
  },
  'platform-provenance': {
    id: 'platform-provenance',
    label: {
      ko: '플랫폼 업로드 출처 확인',
      en: 'Platform Upload Provenance Check',
    },
    scope: {
      ko: '네이버·카카오·해외 연재 플랫폼에 제출 가능한 도구 보조 범위/출처/확인 URL 묶음',
      en: 'AI involvement, source, and verification URL bundle for platform uploads.',
    },
    limitation: {
      ko: '각 플랫폼 심사 기준은 별도입니다. 이 리포트는 제출 자료 준비 상태를 정리합니다.',
      en: 'Each platform has its own review rules. This report summarizes submission-material readiness.',
    },
  },
  'authors-guild-evidence': {
    id: 'authors-guild-evidence',
    label: {
      ko: '작가 주도 창작 기록 확인',
      en: 'Author-Led Creative Record Check',
    },
    scope: {
      ko: '외부 마크·등록 신청 시 제출할 작가 결정/수정/승인 로그 보조 자료',
      en: 'Author decision, revision, and approval record support for external marks or registrations.',
    },
    limitation: {
      ko: '작성자가 직접 썼는지 자체를 확정하지 않습니다. 작가가 지시·수정·승인한 확인 기록의 밀도를 보여줍니다.',
      en: 'This does not determine direct authorship. It shows the density of author direction, revision, and approval records.',
    },
  },
};

// ============================================================
// PART 2 — Evidence Predicates
// ============================================================

function hasHash(value: string | undefined | null): boolean {
  return typeof value === 'string' && /^[a-f0-9]{64}$/i.test(value);
}

function hasArtifact(input: RegulatoryEvidenceInput, artifactId: string): boolean {
  return Array.isArray(input.artifactIds) && input.artifactIds.includes(artifactId);
}

function hasAiInvolvementRecord(input: RegulatoryEvidenceInput): boolean {
  return (
    input.cert.summaryStats.aiAssistUsed ||
    input.cert.summaryStats.aiRequestCount !== undefined ||
    input.events.some((event) => event.actorType === 'ai') ||
    input.sources.some((source) => source.sourceType === 'ai_output')
  );
}

function hasModelOrToolRecord(input: RegulatoryEvidenceInput): boolean {
  if (input.cert.summaryStats.aiModelsUsed?.length) return true;
  if (input.sources.some((source) => source.sourceType === 'ai_output' && !!source.model)) return true;
  return input.events.some((event) => event.actorType === 'ai' && event.actorId.length > 0);
}

function hasHumanDecisionRecord(input: RegulatoryEvidenceInput): boolean {
  return (
    input.cert.summaryStats.humanRevisionCount > 0 ||
    input.events.some((event) => event.actorType === 'human') ||
    input.events.some(
      (event) =>
        (event.eventType === 'accept' || event.eventType === 'reject') &&
        event.actorType === 'human',
    )
  );
}

function hasVerificationAnchor(input: RegulatoryEvidenceInput): boolean {
  return Boolean(input.cert.verificationUrl || input.cert.sealNumber || input.cert.chainTipHash);
}

function hasRetentionPolicy(input: RegulatoryEvidenceInput): boolean {
  return Boolean(input.cert.retention?.expiresAt && input.cert.retention.autoDelete !== undefined);
}

function hasSourceRecord(input: RegulatoryEvidenceInput): boolean {
  return input.sources.length > 0 || hasHash(input.cert.sourceSummaryHash);
}

function hasProcessTimeline(input: RegulatoryEvidenceInput): boolean {
  return hasHash(input.cert.timelineHash) && (input.events.length > 0 || input.cert.summaryStats.totalEpisodes > 0);
}

function hasC2paReady(input: RegulatoryEvidenceInput): boolean {
  return hasArtifact(input, 'c2pa-ready-manifest');
}

// ============================================================
// PART 3 — Requirement Matrix
// ============================================================

const COMMON_REQUIREMENTS = {
  manuscriptHash: {
    id: 'manuscript-hash',
    severity: 'required' as const,
    label: { ko: '원고 해시', en: 'Manuscript hash' },
    evidence: { ko: 'SHA-256 원고 해시', en: 'SHA-256 manuscript hash' },
    check: (input: RegulatoryEvidenceInput) => hasHash(input.cert.manuscriptHash),
  },
  processTimeline: {
    id: 'process-timeline',
    severity: 'required' as const,
    label: { ko: '과정 타임라인', en: 'Process timeline' },
    evidence: { ko: '타임라인 해시와 작업 이벤트', en: 'Timeline hash and work events' },
    check: hasProcessTimeline,
  },
  aiRecord: {
    id: 'ai-involvement-record',
    severity: 'required' as const,
    label: { ko: '도구 보조 범위 기록', en: 'AI involvement record' },
    evidence: { ko: '도구 사용 여부·범위·횟수 기록', en: 'AI use, scope, and count record' },
    check: hasAiInvolvementRecord,
  },
  c2paReady: {
    id: 'c2pa-ready-export',
    severity: 'required' as const,
    label: { ko: 'C2PA-ready 산출물', en: 'C2PA-ready export' },
    evidence: { ko: 'C2PA 매핑 가능한 JSON 산출물', en: 'JSON payload mappable to C2PA assertions' },
    check: hasC2paReady,
  },
  verificationAnchor: {
    id: 'verification-anchor',
    severity: 'recommended' as const,
    label: { ko: '외부 확인 앵커', en: 'External verification anchor' },
    evidence: { ko: '확인 URL·봉인번호·체인 tip', en: 'Verification URL, seal number, or chain tip' },
    check: hasVerificationAnchor,
  },
  modelRecord: {
    id: 'model-tool-record',
    severity: 'recommended' as const,
    label: { ko: '모델·도구 기록', en: 'Model/tool record' },
    evidence: { ko: 'AI 모델명 또는 도구명', en: 'AI model or tool name' },
    check: hasModelOrToolRecord,
  },
  sourceRecord: {
    id: 'source-record',
    severity: 'recommended' as const,
    label: { ko: '출처/참조 기록', en: 'Source/reference record' },
    evidence: { ko: 'SourceRecord 또는 sourceSummaryHash', en: 'SourceRecord or sourceSummaryHash' },
    check: hasSourceRecord,
  },
  retentionPolicy: {
    id: 'retention-policy',
    severity: 'recommended' as const,
    label: { ko: '보존 정책', en: 'Retention policy' },
    evidence: { ko: '보존 만료·자동 삭제 정책', en: 'Retention expiry and auto-delete policy' },
    check: hasRetentionPolicy,
  },
  humanDecisionRecord: {
    id: 'human-decision-record',
    severity: 'required' as const,
    label: { ko: '작가 지시·수정·승인 기록', en: 'Author direction/revision/approval record' },
    evidence: { ko: '작가 수정, 채택, 미채택 이벤트', en: 'Author revision, accept, and not-adopted events' },
    check: hasHumanDecisionRecord,
  },
};

const REQUIREMENTS_BY_PROFILE: Record<RegulatoryProfileId, RequirementDefinition[]> = {
  'eu-ai-act-article-50': [
    COMMON_REQUIREMENTS.manuscriptHash,
    COMMON_REQUIREMENTS.aiRecord,
    COMMON_REQUIREMENTS.c2paReady,
    COMMON_REQUIREMENTS.modelRecord,
    COMMON_REQUIREMENTS.verificationAnchor,
  ],
  'kr-ai-basic-act': [
    COMMON_REQUIREMENTS.manuscriptHash,
    COMMON_REQUIREMENTS.aiRecord,
    COMMON_REQUIREMENTS.processTimeline,
    COMMON_REQUIREMENTS.sourceRecord,
    COMMON_REQUIREMENTS.retentionPolicy,
    COMMON_REQUIREMENTS.verificationAnchor,
  ],
  'ca-sb942-ab853': [
    COMMON_REQUIREMENTS.manuscriptHash,
    COMMON_REQUIREMENTS.c2paReady,
    COMMON_REQUIREMENTS.verificationAnchor,
    COMMON_REQUIREMENTS.modelRecord,
  ],
  'platform-provenance': [
    COMMON_REQUIREMENTS.manuscriptHash,
    COMMON_REQUIREMENTS.processTimeline,
    COMMON_REQUIREMENTS.aiRecord,
    COMMON_REQUIREMENTS.sourceRecord,
    COMMON_REQUIREMENTS.verificationAnchor,
    COMMON_REQUIREMENTS.c2paReady,
  ],
  'authors-guild-evidence': [
    COMMON_REQUIREMENTS.manuscriptHash,
    COMMON_REQUIREMENTS.humanDecisionRecord,
    COMMON_REQUIREMENTS.processTimeline,
    COMMON_REQUIREMENTS.sourceRecord,
    COMMON_REQUIREMENTS.verificationAnchor,
  ],
};

// ============================================================
// PART 4 — Evaluation
// ============================================================

export function evaluateRegulatoryProfile(
  profileId: RegulatoryProfileId,
  input: RegulatoryEvidenceInput,
  language: 'ko' | 'en' = 'ko',
): RegulatoryProfileReport {
  const profile = REGULATORY_PROFILE_DEFINITIONS[profileId];
  const definitions = REQUIREMENTS_BY_PROFILE[profileId];
  const requirements = definitions.map((definition) => ({
    id: definition.id,
    label: definition.label[language],
    severity: definition.severity,
    met: definition.check(input),
    evidence: definition.evidence[language],
  }));

  const required = requirements.filter((item) => item.severity === 'required');
  const recommended = requirements.filter((item) => item.severity === 'recommended');
  const metRequired = required.filter((item) => item.met).length;
  const metRecommended = recommended.filter((item) => item.met).length;
  const weightedTotal =
    required.length * REQUIRED_WEIGHT + recommended.length * RECOMMENDED_WEIGHT;
  const weightedMet = requirements.reduce(
    (sum, item) => sum + (item.met ? (item.severity === 'required' ? REQUIRED_WEIGHT : RECOMMENDED_WEIGHT) : 0),
    0,
  );
  const score = weightedTotal === 0 ? 0 : Math.round((weightedMet / weightedTotal) * 100);
  const missingRequired = required.filter((item) => !item.met).map((item) => item.label);
  const status: RegulatoryReadinessStatus =
    missingRequired.length === 0 && score >= 85
      ? 'ready'
      : missingRequired.length <= 1 && score >= 65
        ? 'needs-review'
        : 'not-ready';

  return {
    id: profile.id,
    label: profile.label[language],
    scope: profile.scope[language],
    status,
    score,
    metRequired,
    totalRequired: required.length,
    metRecommended,
    totalRecommended: recommended.length,
    requirements,
    missingRequired,
    limitation: profile.limitation[language],
  };
}

export function evaluateRegulatoryProfiles(
  profileIds: readonly RegulatoryProfileId[],
  input: RegulatoryEvidenceInput,
  language: 'ko' | 'en' = 'ko',
): RegulatoryProfileReport[] {
  const unique = Array.from(new Set(profileIds));
  return unique.map((profileId) => evaluateRegulatoryProfile(profileId, input, language));
}

// IDENTITY_SEAL: regulatory-profile | role=jurisdiction/platform evidence readiness | inputs=cert,sources,events,artifactIds | outputs=profile reports
