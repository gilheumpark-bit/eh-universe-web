// ============================================================
// C2PA-ready Manifest — 표준 매핑용 JSON 산출물
// ============================================================
//
// 이 파일은 공식 C2PA Manifest Store(JUMBF/CBOR/X.509 서명)를 생성하지 않는다.
// 현재 Loreguard가 가진 과정기록을 C2PA 2.4의 actions, metadata, AI disclosure,
// repository receipt 계열로 옮길 수 있게 정규화된 JSON payload를 만든다.
//
// 외부 표기:
//   - "C2PA-ready"
//   - "Content Credentials 준비 데이터"
// 피할 표기:
//   - 공식 서명된 C2PA Manifest Store 인 것처럼 쓰는 표현
//   - 권리/IP 책임을 확정하는 표현
// ============================================================

import type { CreativeEvent, ProcessCertificate, SourceRecord } from './types';
import type { RegulatoryProfileReport } from './regulatory-profile';
import { normalizePublicVerificationUrl } from './public-verification-url';

// ============================================================
// PART 1 — Types
// ============================================================

export interface C2paReadyAssetInput {
  filename: string;
  mediaType: string;
  hash: string;
}

export interface C2paReadyManifestInput {
  cert: ProcessCertificate;
  asset: C2paReadyAssetInput;
  sources: SourceRecord[];
  events: CreativeEvent[];
  regulatoryReports?: RegulatoryProfileReport[];
  generatedBy?: string;
  manifestStoreUri?: string;
}

export interface C2paReadyAction {
  action: string;
  when: string;
  softwareAgent: {
    name: string;
    version?: string;
  };
  metadata: {
    loreguardEventId: string;
    actorType: CreativeEvent['actorType'];
    originType: CreativeEvent['originType'];
    stage?: CreativeEvent['stage'];
  };
}

export interface C2paReadyManifest {
  kind: 'loreguard.c2pa-ready-manifest.v1';
  compatibility: {
    targetSpec: 'C2PA 2.4';
    level: 'json-assertion-payload';
    officialC2paManifestStore: false;
    note: string;
  };
  claimGenerator: {
    name: 'Loreguard';
    version: string;
    generator: string;
  };
  asset: {
    filename: string;
    mediaType: string;
    hash: {
      alg: 'sha256';
      value: string;
    };
    contentBinding: {
      method: 'hash-data-ready';
      note: string;
    };
  };
  assertions: {
    c2paActions: C2paReadyAction[];
    aiDisclosure: {
      aiAssisted: boolean;
      aiRequestCount: number;
      aiAcceptCount: number;
      aiUnusedCount: number;
      modelsUsed: string[];
      humanControlIndex: number | null;
      originSummary: ProcessCertificate['originSummary'] | null;
    };
    metadata: {
      title: string | null;
      language: string | null;
      issuedAt: string;
      verificationUrl: string | null;
      sealNumber: string | null;
      certificateId: string;
    };
    loreguardProcessRecord: {
      manuscriptHash: string;
      timelineHash: string;
      sourceSummaryHash: string;
      chainTipHash: string | null;
      eventCount: number;
      sourceCount: number;
      limitationTextVersion: string;
    };
    regulatoryProfiles: Array<{
      id: string;
      status: string;
      score: number;
      missingRequired: string[];
    }>;
  };
  repositoryReceipt: {
    certificateId: string;
    verificationUrl: string | null;
    githubCommitSha: string | null;
    manifestStoreUri: string | null;
  };
  createdAt: string;
  limitation: string;
}

const MAX_ACTIONS = 50;
const SHA256_HEX = /^[a-f0-9]{64}$/i;

// ============================================================
// PART 2 — Helpers
// ============================================================

function normalizeVersion(generatedBy: string | undefined): string {
  if (!generatedBy) return 'unknown';
  const at = generatedBy.lastIndexOf('@');
  return at >= 0 ? generatedBy.slice(at + 1) || 'unknown' : generatedBy;
}

function validSha256(hash: string): string {
  return SHA256_HEX.test(hash) ? hash.toLowerCase() : '';
}

function collectModels(cert: ProcessCertificate, sources: SourceRecord[], events: CreativeEvent[]): string[] {
  const models = new Set<string>();
  for (const model of cert.summaryStats.aiModelsUsed ?? []) {
    if (model.trim()) models.add(model.trim());
  }
  for (const source of sources) {
    if (source.sourceType !== 'ai_output') continue;
    const label = [source.provider, source.model].filter(Boolean).join('/');
    if (label) models.add(label);
  }
  for (const event of events) {
    if (event.actorType === 'ai' && event.actorId.trim()) models.add(event.actorId.trim());
  }
  return Array.from(models).sort();
}

function mapEventToC2paAction(event: CreativeEvent): string {
  if (event.stage === 'translate') return 'c2pa.translated';
  switch (event.eventType) {
    case 'create':
      return 'c2pa.created';
    case 'edit':
    case 'accept':
    case 'reject':
    case 'merge':
      return 'c2pa.edited';
    case 'import':
      return 'c2pa.placed';
    case 'delete':
      return 'c2pa.deleted';
    case 'restore':
      return 'c2pa.edited';
    default:
      return 'c2pa.unknown';
  }
}

function toC2paAction(event: CreativeEvent): C2paReadyAction {
  return {
    action: mapEventToC2paAction(event),
    when: event.createdAt,
    softwareAgent: {
      name: event.actorType === 'ai' ? event.actorId || 'AI tool' : 'Loreguard',
      version: event.appVersion,
    },
    metadata: {
      loreguardEventId: event.id,
      actorType: event.actorType,
      originType: event.originType,
      stage: event.stage,
    },
  };
}

function buildActions(events: CreativeEvent[]): C2paReadyAction[] {
  return [...events]
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
    .slice(-MAX_ACTIONS)
    .map(toC2paAction);
}

// ============================================================
// PART 3 — Manifest Builder
// ============================================================

export function buildC2paReadyManifest(input: C2paReadyManifestInput): C2paReadyManifest {
  const generatedBy = input.generatedBy ?? input.cert.generatedBy;
  const modelsUsed = collectModels(input.cert, input.sources, input.events);
  const verificationUrl = normalizePublicVerificationUrl(input.cert.verificationUrl);
  const aiAssisted =
    input.cert.summaryStats.aiAssistUsed ||
    modelsUsed.length > 0 ||
    input.events.some((event) => event.actorType === 'ai');

  return {
    kind: 'loreguard.c2pa-ready-manifest.v1',
    compatibility: {
      targetSpec: 'C2PA 2.4',
      level: 'json-assertion-payload',
      officialC2paManifestStore: false,
      note:
        'This file is a C2PA-ready assertion payload, not a signed C2PA Manifest Store. Use it as input for a C2PA signer/claim generator.',
    },
    claimGenerator: {
      name: 'Loreguard',
      version: normalizeVersion(generatedBy),
      generator: generatedBy ?? 'loreguard@unknown',
    },
    asset: {
      filename: input.asset.filename,
      mediaType: input.asset.mediaType,
      hash: {
        alg: 'sha256',
        value: validSha256(input.asset.hash) || input.cert.manuscriptHash,
      },
      contentBinding: {
        method: 'hash-data-ready',
        note:
          'Prepared for a future c2pa.hash.data assertion. This JSON does not embed or sign a C2PA hash assertion by itself.',
      },
    },
    assertions: {
      c2paActions: buildActions(input.events),
      aiDisclosure: {
        aiAssisted,
        aiRequestCount: input.cert.summaryStats.aiRequestCount ?? 0,
        aiAcceptCount: input.cert.summaryStats.aiAcceptCount ?? 0,
        aiUnusedCount: input.cert.summaryStats.aiUnusedCount ?? 0,
        modelsUsed,
        humanControlIndex: input.cert.hciPayload?.hci ?? null,
        originSummary: input.cert.originSummary ?? null,
      },
      metadata: {
        title: null,
        language: input.cert.summaryStats.unitLabel === 'words' ? 'en' : null,
        issuedAt: input.cert.generatedAt,
        verificationUrl,
        sealNumber: input.cert.sealNumber ?? null,
        certificateId: input.cert.id,
      },
      loreguardProcessRecord: {
        manuscriptHash: input.cert.manuscriptHash,
        timelineHash: input.cert.timelineHash,
        sourceSummaryHash: input.cert.sourceSummaryHash,
        chainTipHash: input.cert.chainTipHash ?? null,
        eventCount: input.events.length,
        sourceCount: input.sources.length,
        limitationTextVersion: input.cert.limitationTextVersion,
      },
      regulatoryProfiles: (input.regulatoryReports ?? []).map((report) => ({
        id: report.id,
        status: report.status,
        score: report.score,
        missingRequired: report.missingRequired,
      })),
    },
    repositoryReceipt: {
      certificateId: input.cert.id,
      verificationUrl,
      githubCommitSha: input.cert.githubCommitSha ?? null,
      manifestStoreUri: input.manifestStoreUri ?? null,
    },
    createdAt: new Date().toISOString(),
    limitation:
      'Loreguard records process evidence and hash bindings. It does not determine copyright ownership, direct authorship, or legal compliance.',
  };
}

// ============================================================
// PART 4 — Serializers
// ============================================================

export function serializeC2paReadyManifest(manifest: C2paReadyManifest): string {
  return JSON.stringify(manifest, null, 2);
}

export function buildC2paPreparationNote(manifest: C2paReadyManifest): string {
  const lines = [
    '# C2PA-ready export note',
    '',
    `- certificateId: ${manifest.assertions.metadata.certificateId}`,
    `- assetHash: sha256:${manifest.asset.hash.value}`,
    `- officialC2paManifestStore: ${String(manifest.compatibility.officialC2paManifestStore)}`,
    `- targetSpec: ${manifest.compatibility.targetSpec}`,
    '',
    'This note is not a C2PA manifest block. After a signed `.c2pa` manifest store is produced, place its URL in a structured text manifest block.',
  ];
  if (manifest.repositoryReceipt.manifestStoreUri) {
    lines.push('', 'Future structured-text reference:', '');
    lines.push('```md');
    lines.push('---');
    lines.push('-----BEGIN C2PA MANIFEST-----');
    lines.push(manifest.repositoryReceipt.manifestStoreUri);
    lines.push('-----END C2PA MANIFEST-----');
    lines.push('---');
    lines.push('```');
  }
  return lines.join('\n');
}

// IDENTITY_SEAL: c2pa-ready-manifest | role=C2PA assertion payload adapter | inputs=cert,asset,sources,events,reports | outputs=json payload,note
