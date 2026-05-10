// ============================================================
// Submission Package — `_1` 제출 번들 메타데이터 + 발급 로직
// ============================================================
//
// stitch_lore_guard `_1` Certificate Vault — Submission Package 화면 backbone.
//
// 4 Artifact 구성:
//   1. manuscript-md           — 본문 markdown
//   2. process-certificate     — 창작 과정 확인서 (HTML/MD)
//   3. source-bundle           — SourceRecord 묶음 (JSON)
//   4. digital-signature       — manuscriptHash + sealNumber + 발급시각
//
// 4 Distribution Profile:
//   - legal-deposit  (저작권 등록·법적 보관)
//   - publisher      (출판사 제출)
//   - platform       (네이버·카카오·아마존 등)
//   - private-archive (작가 개인 보관)
//
// 사상 정합:
//   - Visual Charter v1.0 — Sharp 0px / Modern Institutionalism
//   - 4차 §1 "보증 X 기록 O"
//   - 13차 §5.2 "외부=확인서, 내부=영수증"
//
// [C] 안전성: 빈 episodes / 빈 events 방어, view 정책 준수
// [G] 성능: 단일 buildCertificate 호출 + 직렬화 1회
// [K] 간결성: 단일 export buildSubmissionPackage()
// ============================================================

import type {
  CreativeEvent,
  SourceRecord,
  CertificateLanguage,
  CertificateView,
} from './types';
import { buildCertificate } from './report-builder';
import { renderCertificateHtml } from './html-renderer';
import { renderCertificateMarkdown } from './markdown-renderer';
import { listSources } from './source-recorder';
import { listCreativeEvents } from './event-recorder';

// ============================================================
// PART 1 — Distribution Profile + Recipient
// ============================================================

export type DistributionProfileId =
  | 'legal-deposit'
  | 'publisher'
  | 'platform'
  | 'private-archive';

export interface DistributionProfile {
  id: DistributionProfileId;
  defaultView: CertificateView;
  /** publisher view 이상 노출 강제 여부 */
  forcedView?: CertificateView;
  includesSourceBundle: boolean;
  includesDigitalSignature: boolean;
  /** 부가 권장 라벨 (4언어) */
  label: { ko: string; en: string; ja: string; zh: string };
  /** 추천 보관 기간 (년) */
  recommendedRetentionYears: number;
}

export const DISTRIBUTION_PROFILES: Record<DistributionProfileId, DistributionProfile> = {
  'legal-deposit': {
    id: 'legal-deposit',
    defaultView: 'legal',
    forcedView: 'legal',
    includesSourceBundle: true,
    includesDigitalSignature: true,
    label: { ko: '저작권 등록·법적 보관', en: 'Legal Deposit', ja: '法的保管', zh: '法定保管' },
    recommendedRetentionYears: 70, // 저작권법 기본
  },
  publisher: {
    id: 'publisher',
    defaultView: 'publisher',
    includesSourceBundle: true,
    includesDigitalSignature: true,
    label: { ko: '출판사 제출', en: 'Publisher', ja: '出版社提出', zh: '出版社提交' },
    recommendedRetentionYears: 10,
  },
  platform: {
    id: 'platform',
    defaultView: 'public',
    includesSourceBundle: false,
    includesDigitalSignature: true,
    label: { ko: '플랫폼 게시', en: 'Platform', ja: 'プラットフォーム', zh: '平台发布' },
    recommendedRetentionYears: 5,
  },
  'private-archive': {
    id: 'private-archive',
    defaultView: 'private',
    includesSourceBundle: true,
    includesDigitalSignature: true,
    label: { ko: '작가 개인 보관', en: 'Private Archive', ja: '個人保管', zh: '个人存档' },
    recommendedRetentionYears: 100,
  },
};

// ============================================================
// PART 2 — Artifact 정의
// ============================================================

export type ArtifactId =
  | 'manuscript-md'
  | 'process-certificate'
  | 'source-bundle'
  | 'digital-signature';

export interface ArtifactDescriptor {
  id: ArtifactId;
  filename: string;
  mimeType: string;
  size: number;
  /** UTF-8 string content. 큰 binary 인 경우 base64 string */
  content: string;
}

// ============================================================
// PART 3 — Submission Package
// ============================================================

export interface SubmissionPackageInput {
  projectId: string;
  language: CertificateLanguage;
  profileId: DistributionProfileId;
  /** 호출자 주입 — 작가가 입력한 받는 곳 (free text) */
  recipientLabel?: string;
  /** 인증서 형식 — HTML or Markdown */
  certificateFormat?: 'html' | 'md';
  /** 프로젝트 메타·원고·세계관 등 buildCertificate 와 동일 props */
  projectMeta: { name: string; authorName?: string; createdAt?: string };
  episodes: Array<{ episode: number; content: string }>;
  worldSummary?: { genre?: string; era?: string; ruleCount?: number };
  characters?: Array<{ id: string; name: string }>;
  generatedBy?: string;
}

export interface SubmissionPackage {
  id: string;
  projectId: string;
  language: CertificateLanguage;
  profile: DistributionProfile;
  view: CertificateView;
  recipientLabel: string;
  generatedAt: string;
  artifacts: ArtifactDescriptor[];
  manuscriptHash: string;
  sealNumber?: string;
  /** 합산 사이즈 */
  totalSize: number;
  /** 확인서 ID (buildCertificate 결과) */
  certificateId: string;
}

// ============================================================
// PART 4 — Manuscript markdown 직렬화 (간단 헤더 + 에피소드)
// ============================================================

function serializeManuscriptMarkdown(
  projectMeta: { name: string; authorName?: string },
  episodes: Array<{ episode: number; content: string }>,
  language: CertificateLanguage,
): string {
  const lines: string[] = [];
  lines.push(`# ${projectMeta.name}`);
  if (projectMeta.authorName) {
    const lbl = { ko: '작가', en: 'Author', ja: '作者', zh: '作者' }[language];
    lines.push(`> ${lbl}: ${projectMeta.authorName}`);
  }
  lines.push('');
  for (const ep of episodes) {
    lines.push(`## Episode ${ep.episode}`);
    lines.push('');
    lines.push(ep.content);
    lines.push('');
  }
  return lines.join('\n');
}

// ============================================================
// PART 5 — Source Bundle 직렬화 (JSON)
// ============================================================

function serializeSourceBundle(
  sources: SourceRecord[],
  events: CreativeEvent[],
): string {
  // [C] 민감 필드 제거 — note 는 작가 메모이므로 visibility 'private' 만 보존
  const sanitized = sources.map((s) => ({
    id: s.id,
    sourceType: s.sourceType,
    label: s.label,
    importedAt: s.importedAt,
    contentHash: s.contentHash,
    provider: s.provider,
    model: s.model,
    fileName: s.fileName,
    licenseNote: s.licenseNote,
    visibility: s.visibility,
  }));
  // events 는 sourceId 가 있는 것만 추림 — bundle 사이즈 절약
  const linked = events
    .filter((e) => !!e.sourceId)
    .map((e) => ({
      id: e.id,
      sourceId: e.sourceId,
      eventType: e.eventType,
      originType: e.originType,
      createdAt: e.createdAt,
    }));
  return JSON.stringify({ sources: sanitized, links: linked }, null, 2);
}

// ============================================================
// PART 6 — Digital Signature 직렬화
// ============================================================

function serializeDigitalSignature(input: {
  manuscriptHash: string;
  timelineHash: string;
  sourceSummaryHash: string;
  sealNumber?: string;
  generatedAt: string;
  reportVersion: string;
  certificateId: string;
}): string {
  return JSON.stringify(
    {
      kind: 'loreguard.digital-signature.v1',
      manuscriptHash: input.manuscriptHash,
      timelineHash: input.timelineHash,
      sourceSummaryHash: input.sourceSummaryHash,
      sealNumber: input.sealNumber || null,
      generatedAt: input.generatedAt,
      reportVersion: input.reportVersion,
      certificateId: input.certificateId,
    },
    null,
    2,
  );
}

// ============================================================
// PART 7 — 메인 export
// ============================================================

/**
 * Submission Package 생성 — 4 artifact bundle.
 *
 * @throws Error('UNKNOWN_PROFILE') 잘못된 profileId
 * @throws Error('EMPTY_MANUSCRIPT') 원고 본문 0
 */
export async function buildSubmissionPackage(
  input: SubmissionPackageInput,
): Promise<SubmissionPackage> {
  const profile = DISTRIBUTION_PROFILES[input.profileId];
  if (!profile) throw new Error(`UNKNOWN_PROFILE: ${input.profileId}`);

  const view: CertificateView = profile.forcedView ?? profile.defaultView;
  const fmt = input.certificateFormat ?? 'html';

  // 1) buildCertificate — manuscript hash + seal number + sections
  const result = await buildCertificate({
    projectId: input.projectId,
    view,
    language: input.language,
    projectMeta: input.projectMeta,
    episodes: input.episodes,
    worldSummary: input.worldSummary,
    characters: input.characters,
    generatedBy: input.generatedBy,
  });

  // 2) Sources / events list (private bundle 일 때만)
  const [sources, events] = profile.includesSourceBundle
    ? await Promise.all([listSources(input.projectId), listCreativeEvents({ projectId: input.projectId })])
    : [[] as SourceRecord[], [] as CreativeEvent[]];

  const generatedAt = result.cert.generatedAt;
  const manuscriptHash = result.cert.manuscriptHash;
  const sealNumber = result.cert.sealNumber;
  const certId = result.cert.id;

  const artifacts: ArtifactDescriptor[] = [];

  // 3) Artifact 1 — manuscript-md
  const manuscriptContent = serializeManuscriptMarkdown(input.projectMeta, input.episodes, input.language);
  artifacts.push({
    id: 'manuscript-md',
    filename: `manuscript-${shortId(input.projectId)}.md`,
    mimeType: 'text/markdown;charset=utf-8',
    size: byteLength(manuscriptContent),
    content: manuscriptContent,
  });

  // 4) Artifact 2 — process-certificate
  const certContent =
    fmt === 'html'
      ? renderCertificateHtml(result.cert, result.sections, view, input.language)
      : renderCertificateMarkdown(result.cert, result.sections, view, input.language);
  artifacts.push({
    id: 'process-certificate',
    filename: `authorship-journal-${shortId(certId)}.${fmt}`,
    mimeType: fmt === 'html' ? 'text/html;charset=utf-8' : 'text/markdown;charset=utf-8',
    size: byteLength(certContent),
    content: certContent,
  });

  // 5) Artifact 3 — source-bundle (선택)
  if (profile.includesSourceBundle) {
    const bundleJson = serializeSourceBundle(sources, events);
    artifacts.push({
      id: 'source-bundle',
      filename: `source-bundle-${shortId(certId)}.json`,
      mimeType: 'application/json;charset=utf-8',
      size: byteLength(bundleJson),
      content: bundleJson,
    });
  }

  // 6) Artifact 4 — digital-signature
  if (profile.includesDigitalSignature) {
    const sigJson = serializeDigitalSignature({
      manuscriptHash,
      timelineHash: result.cert.timelineHash,
      sourceSummaryHash: result.cert.sourceSummaryHash,
      sealNumber,
      generatedAt,
      reportVersion: result.cert.reportVersion,
      certificateId: certId,
    });
    artifacts.push({
      id: 'digital-signature',
      filename: `signature-${shortId(certId)}.json`,
      mimeType: 'application/json;charset=utf-8',
      size: byteLength(sigJson),
      content: sigJson,
    });
  }

  const totalSize = artifacts.reduce((acc, a) => acc + a.size, 0);

  return {
    id: `pkg_${certId}`,
    projectId: input.projectId,
    language: input.language,
    profile,
    view,
    recipientLabel: input.recipientLabel?.trim() || profile.label[input.language],
    generatedAt,
    artifacts,
    manuscriptHash,
    sealNumber,
    totalSize,
    certificateId: certId,
  };
}

// ============================================================
// PART 8 — Artifact 사이즈 계산 helpers
// ============================================================

function byteLength(s: string): number {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(s).length;
  }
  // SSR fallback — 약간의 부정확
  return s.length;
}

function shortId(id: string): string {
  return (id || 'unknown').slice(-8).replace(/[^a-zA-Z0-9_-]/g, '');
}

// ============================================================
// PART 9 — Artifact 4언어 라벨 (UI용)
// ============================================================

export const ARTIFACT_LABELS: Record<ArtifactId, Record<CertificateLanguage, string>> = {
  'manuscript-md': {
    ko: '본문 원고', en: 'Manuscript', ja: '本文原稿', zh: '正文原稿',
  },
  'process-certificate': {
    ko: '창작 과정 확인서', en: 'Authorship Journal', ja: '制作過程確認書', zh: '创作过程确认书',
  },
  'source-bundle': {
    ko: '출처 묶음', en: 'Source Bundle', ja: '出典バンドル', zh: '来源包',
  },
  'digital-signature': {
    ko: '디지털 서명', en: 'Digital Signature', ja: 'デジタル署名', zh: '数字签名',
  },
};
