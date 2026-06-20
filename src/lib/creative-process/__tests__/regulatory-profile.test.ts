import {
  evaluateRegulatoryProfile,
  evaluateRegulatoryProfiles,
  REGULATORY_PROFILE_DEFINITIONS,
  type RegulatoryEvidenceInput,
} from '../regulatory-profile';
import type { CreativeEvent, ProcessCertificate, SourceRecord } from '../types';

const cert: ProcessCertificate = {
  id: '01HZXK3V9T2M4N5P6Q7R8S9T0A',
  projectId: 'project-regulatory',
  manuscriptHash: 'a'.repeat(64),
  generatedAt: '2026-06-11T00:00:00.000Z',
  generatedBy: 'loreguard@test',
  reportVersion: '1.1.0',
  visibility: 'publisher',
  includedSections: ['overview', 'ai-usage-summary', 'hash-and-export-time'],
  summaryStats: {
    totalEpisodes: 2,
    totalUnits: 1200,
    unitLabel: 'chars',
    aiAssistUsed: true,
    externalImportCount: 1,
    humanRevisionCount: 3,
    externalStatus: '확인 가능',
    aiModelsUsed: ['openai/gpt-test'],
    aiRequestCount: 2,
    aiAcceptCount: 1,
    aiUnusedCount: 1,
  },
  timelineHash: 'b'.repeat(64),
  sourceSummaryHash: 'c'.repeat(64),
  limitationTextVersion: 'v1',
  verificationUrl: 'https://example.test/api/cp/verify/01HZX',
  retention: {
    expiresAt: '2027-06-11T00:00:00.000Z',
    autoDelete: true,
  },
  sealNumber: 'LG-2606-0001-ABCD',
};

const events: CreativeEvent[] = [
  {
    id: '01evt-human',
    projectId: cert.projectId,
    targetType: 'manuscript',
    targetId: 'ep1',
    eventType: 'edit',
    actorType: 'human',
    actorId: 'author',
    originType: 'HUMAN_REVISION',
    beforeHash: '0'.repeat(64),
    afterHash: '1'.repeat(64),
    createdAt: '2026-06-11T00:01:00.000Z',
    appVersion: 'test',
  },
  {
    id: '01evt-ai',
    projectId: cert.projectId,
    targetType: 'manuscript',
    targetId: 'ep1',
    eventType: 'accept',
    actorType: 'ai',
    actorId: 'openai/gpt-test',
    originType: 'AI_SUGGESTION',
    beforeHash: '1'.repeat(64),
    afterHash: '2'.repeat(64),
    createdAt: '2026-06-11T00:02:00.000Z',
    appVersion: 'test',
  },
];

const sources: SourceRecord[] = [
  {
    id: 'src-ai',
    projectId: cert.projectId,
    sourceType: 'ai_output',
    label: 'AI suggestion',
    importedAt: '2026-06-11T00:02:00.000Z',
    contentHash: 'd'.repeat(64),
    provider: 'openai',
    model: 'gpt-test',
    visibility: 'publisher',
  },
];

function input(overrides?: Partial<RegulatoryEvidenceInput>): RegulatoryEvidenceInput {
  return {
    cert,
    events,
    sources,
    artifactIds: ['manuscript-md', 'process-certificate', 'c2pa-ready-manifest'],
    ...overrides,
  };
}

describe('regulatory-profile', () => {
  test('모든 profile 정의는 외부 보증이 아니라 확인/준비 문구를 쓴다', () => {
    for (const profile of Object.values(REGULATORY_PROFILE_DEFINITIONS)) {
      expect(profile.limitation.ko).not.toContain('보증');
      expect(profile.limitation.ko).toMatch(/확인|정리|대체하지 않습니다/);
    }
  });

  test('EU profile 은 C2PA-ready artifact 와 AI 개입 기록이 있으면 ready', () => {
    const report = evaluateRegulatoryProfile('eu-ai-act-article-50', input(), 'ko');
    expect(report.status).toBe('ready');
    expect(report.score).toBeGreaterThanOrEqual(85);
    expect(report.missingRequired).toEqual([]);
  });

  test('C2PA-ready artifact 가 없으면 EU profile 은 보완 필요로 내려간다', () => {
    const report = evaluateRegulatoryProfile(
      'eu-ai-act-article-50',
      input({ artifactIds: ['manuscript-md', 'process-certificate'] }),
      'ko',
    );
    expect(report.status).not.toBe('ready');
    expect(report.missingRequired).toContain('C2PA-ready 산출물');
  });

  test('작가 결정 기록이 없으면 작가 주도 창작 기록 profile 은 ready 가 아니다', () => {
    const report = evaluateRegulatoryProfile(
      'authors-guild-evidence',
      input({
        cert: { ...cert, summaryStats: { ...cert.summaryStats, humanRevisionCount: 0 } },
        events: events.filter((event) => event.actorType !== 'human'),
      }),
      'ko',
    );
    expect(report.status).not.toBe('ready');
    expect(report.missingRequired).toContain('작가 지시·수정·승인 기록');
  });

  test('중복 profile id 는 1번만 평가한다', () => {
    const reports = evaluateRegulatoryProfiles(
      ['platform-provenance', 'platform-provenance'],
      input(),
      'en',
    );
    expect(reports).toHaveLength(1);
    expect(reports[0].id).toBe('platform-provenance');
  });
});
