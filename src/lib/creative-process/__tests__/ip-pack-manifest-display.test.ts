import {
  buildIpPackManifest,
  serializeIpPackManifestForUserKo,
  type IpPackAssetRightsSummaryItem,
  type IpPackManifest,
} from '../ip-pack-manifest';
import type { ArtifactDescriptor } from '../submission-package';
import type { CreativeEvent, ProcessCertificate, SourceRecord } from '../types';

function rightsItem(extra: Partial<IpPackAssetRightsSummaryItem> = {}): IpPackAssetRightsSummaryItem {
  return {
    sourceCount: 1,
    aiOutputCount: 0,
    externalSourceCount: 1,
    missingLicenseNoteCount: 0,
    privateSourceCount: 1,
    publisherSourceCount: 0,
    publicSourceCount: 0,
    reviewStatus: 'recorded',
    ...extra,
  };
}

describe('serializeIpPackManifestForUserKo', () => {
  it('사용자 제출용 매니페스트 제목과 상세 항목을 한국어로 출력한다', () => {
    const manifest: IpPackManifest = {
      kind: 'loreguard.ip-pack-manifest.v1',
      packageProfile: 'publisher',
      certificateId: 'LG-TEST-001',
      generatedAt: '2026-06-14T00:00:00.000Z',
      generatedBy: 'AI-TEST-INPUT',
      verification: {
        publicEndpoint: null,
        sealNumber: null,
        githubCommitSha: null,
        manifestStoreUri: null,
      },
      artifacts: [
        {
          id: 'ip-pack-manifest',
          filename: 'ip-pack.json',
          mimeType: 'application/json',
          size: 42,
          role: 'package-disclosure-policy',
          disclosure: 'recipient-package',
        },
      ],
      publicVerifyPolicy: {
        exposedFields: ['certificateId', 'sealNumber'],
        privateFields: ['prompt text', 'source body text'],
        noManuscriptContent: true,
        noPromptText: true,
        noSourceBodyText: true,
      },
      creativeProcess: {
        view: 'public',
        reportVersion: 'test',
        manuscriptHash: 'hash-a',
        timelineHash: 'hash-b',
        sourceSummaryHash: 'hash-c',
        chainTipHash: null,
        eventCount: 2,
        sourceCount: 1,
        limitationTextVersion: 'v1',
      },
      humanContributionSummary: {
        humanEventCount: 1,
        humanRevisionCount: 1,
        manualTypingChars: 120,
        humanControlIndex: 88,
        humanControlStatus: 'human-led',
      },
      aiUsageSummary: {
        aiAssisted: true,
        aiEventCount: 1,
        aiRequestCount: 1,
        aiAcceptCount: 0,
        aiUnusedCount: 1,
        modelsUsed: ['model-a'],
        aiSourceCount: 0,
      },
      workReceiptSummary: {
        count: 1,
        approved: 1,
        rejected: 0,
        contentPolicy: 'counts-only-no-reasons-or-receipts',
      },
      sourceRightsSummary: {
        totalSources: 1,
        aiOutputCount: 0,
        externalDocumentCount: 1,
        previsualAssetSourceCount: 0,
        privateSourceCount: 1,
        publisherSourceCount: 0,
        publicSourceCount: 0,
        missingLicenseNoteCount: 0,
      },
      externalMaterialClusters: [
        {
          id: 'entry',
          labelKo: '진입 자료',
          purposeKo: '첫 검토자가 작품의 정체와 매력을 빠르게 파악하는 자료입니다.',
          filledCount: 1,
          totalCount: 2,
          statusKo: '보강 필요',
        },
      ],
      mediaFormGroups: [
        {
          titleKo: '영상 제안 요약',
          purposeKo: '제작사가 로그라인, 시즌성, 장면성을 빠르게 판단하게 한다.',
          filledCount: 4,
          totalCount: 5,
          statusKo: '보강 필요',
          fields: [
            { labelKo: '시즌 로그라인', filled: true, sourceKo: '시놉시스·핵심 전제' },
            { labelKo: '타깃 시청층', filled: true, sourceKo: '시장·플랫폼 설정' },
            { labelKo: '시즌 수', filled: true, sourceKo: '목표 회차·시즌 구조' },
            { labelKo: '주요 갈등', filled: true, sourceKo: '현재 갈등·사건 체인' },
            { labelKo: '결말 포함 여부', filled: false, sourceKo: '입력 대기' },
          ],
        },
      ],
      projectLedgerScope: {
        projectId: 'project-ip-pack',
        projectScoped: true,
        projectScopeNoteKo: '프로젝트 project-ip-pack 기준으로 구성표와 원장 키를 분리합니다.',
        packageLedgerNoteKo: '출고 패키지 원장 처리는 작가 승인과 발급 처리 이후 서버 원장에서 분리 기록합니다.',
      },
      assetRightsSummary: {
        manuscriptText: {
          ...rightsItem(),
          artifactIds: ['manuscript-final-md'],
          humanEventCount: 1,
          aiEventCount: 0,
          externalImportEventCount: 0,
        },
        previsualAssets: rightsItem({ sourceCount: 0, externalSourceCount: 0 }),
        aiOutputs: rightsItem({ sourceCount: 0, externalSourceCount: 0 }),
        externalReferenceMaterials: rightsItem(),
      },
      regulatorySummary: [],
      riskRegister: [
        {
          id: 'source-license-review',
          severity: 'high',
          status: 'needs-review',
          message: '1 source record does not include a license or rights note.',
        },
      ],
      riskSeveritySummary: {
        critical: 0,
        high: 1,
        medium: 0,
        low: 0,
      },
      limitation: 'machine-readable limitation',
    };

    const markdown = serializeIpPackManifestForUserKo(manifest);

    expect(markdown).toContain('# 권리/IP 자산화 구성표');
    expect(markdown).toContain('패키지 공개 범위 정책');
    expect(markdown).toContain('제출 패키지');
    expect(markdown).toContain('원고 본문');
    expect(markdown).toContain('외부 제시 자료 4군집');
    expect(markdown).toContain('진입 자료: 1/2 · 보강 필요');
    expect(markdown).toContain('매체별 작성 양식');
    expect(markdown).toContain('영상 제안 요약: 4/5 · 보강 필요');
    expect(markdown).toContain('결말 포함 여부(대기)');
    expect(markdown).toContain('프로젝트 격리·원장 처리');
    expect(markdown).toContain('노아 보조 산출물');
    expect(markdown).toContain('일부 출처 기록에 라이선스 또는 권리 메모가 없습니다.');
    expect(markdown).not.toContain('assetRightsSummary');
    expect(markdown).not.toContain('manuscriptText');
    expect(markdown).not.toContain('package-disclosure-policy');
    expect(markdown).not.toContain('source record does not include');
  });
});

describe('buildIpPackManifest', () => {
  it('공개 검증 주소를 사용자용 /verify 경로로 정규화한다', () => {
    const cert: ProcessCertificate = {
      id: 'LG-TEST-VERIFY',
      projectId: 'project-ip-pack',
      manuscriptHash: 'a'.repeat(64),
      generatedAt: '2026-06-14T00:00:00.000Z',
      generatedBy: 'loreguard@test',
      reportVersion: '1.0.0',
      visibility: 'publisher',
      includedSections: ['overview'],
      summaryStats: {
        totalEpisodes: 1,
        totalUnits: 1000,
        unitLabel: 'chars',
        aiAssistUsed: false,
        externalImportCount: 0,
        humanRevisionCount: 1,
        externalStatus: '확인 가능',
      },
      timelineHash: 'b'.repeat(64),
      sourceSummaryHash: 'c'.repeat(64),
      limitationTextVersion: 'v1',
      verificationUrl: 'https://example.test/api/cp/verify/LG-TEST-VERIFY?lookup=true',
      sealNumber: 'LG-2606-VERIFY',
    };
    const artifacts: ArtifactDescriptor[] = [
      {
        id: 'ip-pack-manifest',
        filename: 'ip-pack.json',
        mimeType: 'application/json',
        size: 42,
        content: '{}',
      },
    ];
    const sources: SourceRecord[] = [];
    const events: CreativeEvent[] = [];

    const manifest = buildIpPackManifest({
      cert,
      profileId: 'publisher',
      view: 'publisher',
      artifacts,
      sources,
      events,
      regulatoryReports: [],
      generatedBy: cert.generatedBy,
      mediaFormGroups: [
        {
          titleKo: '작품 한눈 요약',
          purposeKo: '웹툰 PD가 30초 안에 장르, 후킹, 연재 호흡을 파악하게 한다.',
          filledCount: 5,
          totalCount: 5,
          fields: [
            { labelKo: '로그라인', filled: true, sourceKo: '시놉시스·핵심 전제' },
            { labelKo: '1화 후킹', filled: true, sourceKo: '1화 원고·훅' },
            { labelKo: '목표 독자', filled: true, sourceKo: '시장·플랫폼 설정' },
            { labelKo: '연재 회차', filled: true, sourceKo: '목표 회차·시즌 구조' },
            { labelKo: '플랫폼 기준', filled: true, sourceKo: '플랫폼·분량 기준' },
          ],
        },
      ],
    });

    expect(manifest.verification.publicEndpoint).toBe('https://example.test/verify/LG-TEST-VERIFY');
    expect(manifest.externalMaterialClusters.map((cluster) => cluster.labelKo)).toEqual([
      '진입 자료',
      '스토리 자료',
      '설정 자료',
      '제작·사업 자료',
    ]);
    expect(manifest.projectLedgerScope.projectScopeNoteKo).toContain('프로젝트 project-ip-pack 기준');
    expect(manifest.mediaFormGroups[0]?.statusKo).toBe('준비');
    expect(manifest.publicVerifyPolicy.exposedFields).toEqual(expect.arrayContaining(['확인서 식별자', '원고 해시']));
    expect(manifest.publicVerifyPolicy.privateFields).toEqual(expect.arrayContaining(['원고 전문', '출처 본문']));
    expect(manifest.limitation).toContain('저작권 귀속');
    expect(manifest.limitation).not.toContain('does not certify');
    expect(manifest.riskRegister.map((risk) => risk.message).join('\n')).not.toContain('No public verification');
    expect(manifest.riskRegister.map((risk) => risk.message).join('\n')).not.toContain('C2PA-ready JSON');
    expect(serializeIpPackManifestForUserKo(manifest)).toContain(
      '- 공개 검증 주소: https://example.test/verify/LG-TEST-VERIFY',
    );
    expect(serializeIpPackManifestForUserKo(manifest)).toContain('작품 한눈 요약: 5/5 · 준비');
    expect(serializeIpPackManifestForUserKo(manifest)).not.toContain('/api/cp/verify');
  });
});
