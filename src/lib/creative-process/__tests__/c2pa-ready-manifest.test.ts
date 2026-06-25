import {
  buildC2paPreparationNote,
  buildC2paReadyManifest,
  serializeC2paReadyManifest,
} from '../c2pa-ready-manifest';
import type { CreativeEvent, ProcessCertificate, SourceRecord } from '../types';

const cert: ProcessCertificate = {
  id: '01HZXK3V9T2M4N5P6Q7R8S9T0A',
  projectId: 'project-c2pa',
  manuscriptHash: 'a'.repeat(64),
  generatedAt: '2026-06-11T00:00:00.000Z',
  generatedBy: 'loreguard@2.3.0-preview',
  reportVersion: '1.1.0',
  visibility: 'publisher',
  includedSections: ['overview', 'ai-usage-summary', 'hash-and-export-time'],
  summaryStats: {
    totalEpisodes: 1,
    totalUnits: 600,
    unitLabel: 'chars',
    aiAssistUsed: true,
    externalImportCount: 0,
    humanRevisionCount: 2,
    externalStatus: '확인 가능',
    aiRequestCount: 1,
    aiAcceptCount: 1,
  },
  timelineHash: 'b'.repeat(64),
  sourceSummaryHash: 'c'.repeat(64),
  limitationTextVersion: 'v1',
  verificationUrl: 'https://example.test/api/cp/verify/01HZX',
  sealNumber: 'LG-2606-0001-ABCD',
  hciPayload: {
    hci: 82.5,
    intent: 'verified',
    density: 'high',
    logic: 'validated',
    totalEvents: 2,
  },
};

const events: CreativeEvent[] = [
  {
    id: 'evt-create',
    projectId: cert.projectId,
    targetType: 'manuscript',
    targetId: 'ep1',
    eventType: 'create',
    actorType: 'human',
    actorId: 'author',
    originType: 'HUMAN_DRAFT',
    beforeHash: null,
    afterHash: 'd'.repeat(64),
    createdAt: '2026-06-11T00:01:00.000Z',
    appVersion: '2.3.0-preview',
  },
  {
    id: 'evt-ai',
    projectId: cert.projectId,
    targetType: 'manuscript',
    targetId: 'ep1',
    eventType: 'accept',
    actorType: 'ai',
    actorId: 'openai/gpt-test',
    originType: 'AI_SUGGESTION',
    beforeHash: 'd'.repeat(64),
    afterHash: 'e'.repeat(64),
    createdAt: '2026-06-11T00:02:00.000Z',
    appVersion: '2.3.0-preview',
  },
];

const sources: SourceRecord[] = [
  {
    id: 'src-ai',
    projectId: cert.projectId,
    sourceType: 'ai_output',
    label: 'suggestion',
    importedAt: '2026-06-11T00:02:00.000Z',
    contentHash: 'f'.repeat(64),
    provider: 'openai',
    model: 'gpt-test',
    visibility: 'publisher',
  },
];

describe('c2pa-ready-manifest', () => {
  test('공식 C2PA Manifest Store 로 위장하지 않는다', () => {
    const manifest = buildC2paReadyManifest({
      cert,
      asset: {
        filename: 'manuscript.md',
        mediaType: 'text/markdown',
        hash: cert.manuscriptHash,
      },
      sources,
      events,
      generatedBy: cert.generatedBy,
    });

    expect(manifest.kind).toBe('loreguard.c2pa-ready-manifest.v1');
    expect(manifest.compatibility.targetSpec).toBe('C2PA 2.4');
    expect(manifest.compatibility.officialC2paManifestStore).toBe(false);
    expect(manifest.limitation).toContain('does not determine copyright ownership');
  });

  test('CreativeEvent 를 C2PA actions 후보로 매핑한다', () => {
    const manifest = buildC2paReadyManifest({
      cert,
      asset: { filename: 'manuscript.md', mediaType: 'text/markdown', hash: cert.manuscriptHash },
      sources,
      events,
    });

    expect(manifest.assertions.c2paActions.map((action) => action.action)).toEqual([
      'c2pa.created',
      'c2pa.edited',
    ]);
    expect(manifest.assertions.aiDisclosure.modelsUsed).toContain('openai/gpt-test');
    expect(manifest.assertions.loreguardProcessRecord.eventCount).toBe(2);
  });

  test('외부 공개 조회 주소는 사용자용 /verify 경로로 정규화한다', () => {
    const manifest = buildC2paReadyManifest({
      cert,
      asset: { filename: 'manuscript.md', mediaType: 'text/markdown', hash: cert.manuscriptHash },
      sources,
      events,
    });

    expect(manifest.assertions.metadata.verificationUrl).toBe('https://example.test/verify/01HZX');
    expect(manifest.repositoryReceipt.verificationUrl).toBe('https://example.test/verify/01HZX');
    expect(serializeC2paReadyManifest(manifest)).not.toContain('/api/cp/verify');
  });

  test('직렬화 결과는 JSON 파싱 가능하다', () => {
    const manifest = buildC2paReadyManifest({
      cert,
      asset: { filename: 'manuscript.md', mediaType: 'text/markdown', hash: cert.manuscriptHash },
      sources,
      events,
    });
    const parsed = JSON.parse(serializeC2paReadyManifest(manifest));
    expect(parsed.asset.hash.value).toBe(cert.manuscriptHash);
  });

  test('manifestStoreUri 가 있을 때만 향후 structured-text reference 예시를 포함한다', () => {
    const manifest = buildC2paReadyManifest({
      cert,
      asset: { filename: 'manuscript.md', mediaType: 'text/markdown', hash: cert.manuscriptHash },
      sources,
      events,
      manifestStoreUri: 'https://example.test/manifests/abc.c2pa',
    });
    const note = buildC2paPreparationNote(manifest);
    expect(note).toContain('-----BEGIN C2PA MANIFEST-----');
    expect(note).toContain('https://example.test/manifests/abc.c2pa');
  });
});
