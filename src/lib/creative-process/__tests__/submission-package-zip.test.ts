import JSZip from 'jszip';

jest.mock('../event-recorder', () => ({
  listCreativeEvents: jest.fn().mockResolvedValue([]),
  recordCreativeEvent: jest.fn(),
  countCreativeEvents: jest.fn().mockResolvedValue(0),
  CREATIVE_EVENT_CAPTURED: 'noa:creative-event-captured',
}));

jest.mock('../source-recorder', () => ({
  listSources: jest.fn().mockResolvedValue([]),
  recordSource: jest.fn(),
  countSources: jest.fn().mockResolvedValue(0),
  getSource: jest.fn(),
  computeSha256Hex: async (text: string) => {
    let hash = 0;
    for (let i = 0; i < text.length; i++) hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
    return Math.abs(hash).toString(16).padStart(64, '0');
  },
}));

import {
  buildSubmissionPackageZipBlob,
  buildSubmissionPackageZipFilename,
  buildSubmissionPackageZipManifest,
} from '../submission-package-zip';
import {
  buildSubmissionPackage,
  DISTRIBUTION_PROFILES,
  type SubmissionPackage,
} from '../submission-package';
import { buildPublicCertificateCardPayload, serializePublicCertificateCardForUserKo } from '../public-certificate-card';
import { listCreativeEvents } from '../event-recorder';
import { listSources } from '../source-recorder';
import {
  buildProjectExternalMaterialClusters,
  buildProjectMediaIpPackFormCompletions,
} from '@/lib/creative/media-ip-pack-project';
import type { MediaIpPackProfileId } from '@/lib/creative/media-ip-pack-profile';
import { Genre, PlatformType, type EpisodeManuscript, type StoryConfig } from '@/lib/studio-types';
import type { CreativeEvent, ProcessCertificate, SourceRecord } from '../types';

const mockedListSources = listSources as jest.MockedFunction<typeof listSources>;
const mockedListCreativeEvents = listCreativeEvents as jest.MockedFunction<typeof listCreativeEvents>;

afterEach(() => {
  mockedListSources.mockResolvedValue([]);
  mockedListCreativeEvents.mockResolvedValue([]);
});

async function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === 'function') return blob.arrayBuffer();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
}

function makePackage(): SubmissionPackage {
  const artifacts: SubmissionPackage['artifacts'] = [
    {
      id: 'process-certificate',
      filename: 'process-certificate.html',
      mimeType: 'text/html;charset=utf-8',
      size: 18,
      content: '<h1>record</h1>',
    },
    {
      id: 'import-file-report',
      filename: '../bad:name.json',
      mimeType: 'application/json;charset=utf-8',
      size: 39,
      content: '{"kind":"loreguard.import-file-report.v1"}',
    },
  ];

  return {
    id: 'pkg_cert-test-123',
    projectId: 'proj-1',
    projectName: 'IP Pack 테스트: 첫 제출',
    language: 'ko',
    profile: DISTRIBUTION_PROFILES.publisher,
    view: 'publisher',
    recipientLabel: '테스트 출판사',
    generatedAt: '2026-06-13T00:00:00.000Z',
    artifacts,
    manuscriptHash: 'a'.repeat(64),
    totalSize: artifacts.reduce((total, artifact) => total + artifact.size, 0),
    certificateId: 'cert-test-123',
    regulatoryReports: [],
    finalCleanAudit: {
      kind: 'loreguard.final-clean-audit.v1',
      targetArtifactId: 'manuscript-final-clean-md',
      verdict: 'PASS',
      generatedAt: '2026-06-13T00:00:00.000Z',
      checkedTextHash: 'b'.repeat(64),
      findingCount: 0,
      severityCounts: { high: 0, medium: 0, low: 0 },
      byType: {
        'markdown-residue': 0,
        emoji: 0,
        'dialogue-run-on': 0,
        'replacement-residue': 0,
        'broken-hangul-spacing': 0,
        'glued-sentence-boundary': 0,
        'excess-blank-lines': 0,
        'title-body-boundary': 0,
      },
      findings: [],
      limitation: 'test',
    },
    packageIssuanceReceipt: {
      kind: 'loreguard.package-issuance-receipt.v1',
      generatedAt: '2026-06-13T00:00:00.000Z',
      packageProfile: 'publisher',
      view: 'publisher',
      recipientLabel: '테스트 출판사',
      certificateId: 'cert-test-123',
      generatedBy: 'test',
      artifactIds: artifacts.map((artifact) => artifact.id),
      finalCleanAuditVerdict: 'PASS',
      regulatoryStatusCounts: { ready: 0, 'needs-review': 0, 'not-ready': 0 },
      jurisdictionPackId: 'ko-KR',
      holdReasons: [],
      receiptText: 'test',
      limitation: 'test',
    },
  } as SubmissionPackage;
}

function makeStoryConfig(overrides: Partial<StoryConfig> = {}): StoryConfig {
  return {
    genre: Genre.FANTASY,
    povCharacter: '유나',
    setting: '문서와 권리가 거래되는 도시',
    primaryEmotion: '긴장',
    episode: 1,
    title: 'IP Pack 테스트',
    totalEpisodes: 24,
    synopsis: '잃어버린 권리 원장을 되찾는 창작자의 이야기',
    guardrails: { min: 5500, max: 7000 },
    platform: PlatformType.WEB,
    corePremise: '작가의 결정 기록이 외부 제시 자료가 된다.',
    currentConflict: '제출 전 권리 경계와 매체 확장 범위를 다시 확인해야 한다.',
    rightsNote: '작가 단독 창작, 매체 확장 제안 가능, 외부 제출 전 권리/IP 점검 필요',
    targetMarket: 'KR',
    projectTargetLanguage: 'KO',
    characters: [
      {
        id: 'char-yuna',
        name: '유나',
        role: '기록 책임자',
        traits: '신중함',
        appearance: '은색 머리와 검은 코트',
        dna: 80,
        symbol: '은색 열쇠',
        relationPattern: '동료를 쉽게 믿지 않는다',
        speechStyle: '짧고 단정한 말투',
        changeArc: '불신에서 책임 있는 협업으로 이동한다.',
      },
    ],
    charRelations: [{ from: '유나', to: '길드장', type: 'rival' }],
    items: [
      {
        id: 'item-key',
        name: '은색 열쇠',
        category: 'quest',
        rarity: 'rare',
        description: '닫힌 원장을 여는 증표',
        effect: '권리 기록을 확인한다',
        obtainedFrom: '등기소',
      },
    ],
    sceneDirection: {
      writerNotes: '회색 도시, 낮은 조도, 문서 클로즈업',
      hooks: [{ position: 'ending', hookType: 'verification', desc: '서명이 맞지 않으면 출고가 중지된다.' }],
      sceneTransitions: [{ fromScene: '등기소', toScene: '골목', method: '문서 클로즈업' }],
    },
    episodeSceneSheets: [
      {
        id: 'sheet-1',
        episode: 1,
        title: '첫 제출',
        scenes: [
          {
            sceneId: '1-1',
            sceneName: '등기소',
            characters: '유나',
            tone: '긴장',
            summary: '제출 직전 원장과 해시를 대조한다.',
            keyDialogue: '서명이 맞지 않으면 오늘은 멈춥니다.',
            emotionPoint: '불안',
            hookPoint: '봉인번호가 비어 있다.',
            rewardBeat: '원장 위치를 확인한다.',
            nextScene: '심사실',
          },
        ],
        lastUpdate: 1,
      },
    ],
    visualPromptCards: [
      {
        id: 'visual-1',
        episode: 1,
        title: '키비주얼',
        shotType: 'cover',
        targetUse: 'cover',
        selectedCharacters: [],
        selectedObjects: [],
        levels: {
          subjectFocus: 2,
          backgroundDensity: 2,
          sceneTension: 2,
          emotionIntensity: 2,
          compositionDrama: 2,
          styleStrength: 2,
          symbolismWeight: 2,
        },
        subjectPrompt: '은색 열쇠를 든 기록 책임자',
        backgroundPrompt: '비 오는 등기소',
        scenePrompt: '제출 직전의 긴장감',
        compositionPrompt: '정면 클로즈업',
        lightingPrompt: '차가운 조명',
        stylePrompt: '웹소설 표지',
        negativePrompt: '',
        moodTags: [],
        consistencyTags: [],
        createdAt: 1,
        updatedAt: 1,
      },
    ],
    ...overrides,
  } as StoryConfig;
}

function makePublicCardCertificate(input: {
  certificateId: string;
  projectId: string;
  manuscriptHash: string;
  generatedAt: string;
}): ProcessCertificate {
  return {
    id: input.certificateId,
    projectId: input.projectId,
    manuscriptHash: input.manuscriptHash,
    generatedAt: input.generatedAt,
    generatedBy: 'loreguard@test',
    reportVersion: '1.1.0',
    visibility: 'public',
    includedSections: [],
    summaryStats: {
      totalEpisodes: 1,
      totalUnits: 6400,
      unitLabel: 'chars',
      aiAssistUsed: false,
      externalImportCount: 1,
      humanRevisionCount: 3,
      externalStatus: '확인 가능',
    },
    timelineHash: 'c'.repeat(64),
    sourceSummaryHash: 'd'.repeat(64),
    limitationTextVersion: 'test',
    verificationUrl: `https://example.test/verify/${input.certificateId}`,
    sealNumber: 'LG-2606-ZIP-BOUNDARY',
    hciPayload: {
      hci: 83.2,
      intent: 'verified',
      density: 'high',
      logic: 'validated',
      totalEvents: 12,
    },
  };
}

async function readIpManifestFromPackageZip(input: {
  profileId: MediaIpPackProfileId;
  config: StoryConfig;
}): Promise<Record<string, unknown>> {
  const manuscripts: EpisodeManuscript[] = [
    {
      episode: 1,
      title: '첫 제출',
      content: '유나는 제출 직전 원고와 권리 원장의 해시를 다시 대조했다.',
      charCount: 34,
      lastUpdate: 1,
    },
  ];
  const pkg = await buildSubmissionPackage({
    projectId: `proj-${input.profileId}`,
    language: 'ko',
    profileId: 'publisher',
    projectMeta: { name: `${input.profileId} Pack 테스트`, authorName: '테스트 작가' },
    episodes: manuscripts.map((item) => ({ episode: item.episode, content: item.content })),
    characters: input.config.characters?.map((character) => ({ id: character.id, name: character.name })) ?? [],
    generatedBy: 'loreguard@test',
    ipPack: {
      externalMaterialClusters: buildProjectExternalMaterialClusters({
        config: input.config,
        manuscripts,
      }),
      mediaFormGroups: buildProjectMediaIpPackFormCompletions({
        config: input.config,
        manuscripts,
        profileId: input.profileId,
      }),
      projectLedgerScope: {
        projectId: `proj-${input.profileId}`,
        projectScoped: true,
      },
    },
  });
  const blob = await buildSubmissionPackageZipBlob(pkg);
  const zip = await JSZip.loadAsync(await blobToArrayBuffer(blob!));
  const manifest = JSON.parse(await zip.file('manifest.json')!.async('string'));
  const ipArtifact = manifest.artifacts.find((artifact: { id: string }) => artifact.id === 'ip-pack-manifest');
  expect(ipArtifact?.path).toBeTruthy();
  return JSON.parse(await zip.file(ipArtifact.path)!.async('string')) as Record<string, unknown>;
}

describe('submission-package-zip', () => {
  it('zip 파일명을 작품명과 certificate id 기준으로 만든다', () => {
    expect(buildSubmissionPackageZipFilename(makePackage())).toBe('loreguard-package-IP-Pack-테스트-첫-제출-cert-test-123.zip');
  });

  it('작품명이 없으면 기존처럼 certificate id 기준 파일명을 만든다', () => {
    expect(buildSubmissionPackageZipFilename({ id: 'pkg-only', certificateId: 'cert-only' })).toBe('loreguard-package-cert-only.zip');
  });

  it('manifest 는 ZIP 내부 경로와 한계 문구를 포함한다', () => {
    const pkg = makePackage();
    const paths = new Map([
      ['process-certificate', 'artifacts/process-certificate.html'],
      ['import-file-report', 'artifacts/bad-name.json'],
    ]) as Parameters<typeof buildSubmissionPackageZipManifest>[1];

    const manifest = buildSubmissionPackageZipManifest(pkg, paths);

    expect(manifest.kind).toBe('loreguard.submission-package-zip.v1');
    expect(manifest.projectName).toBe('IP Pack 테스트: 첫 제출');
    expect(manifest.artifactCount).toBe(2);
    expect(manifest.artifacts.map((artifact) => artifact.path)).toEqual([
      'artifacts/process-certificate.html',
      'artifacts/bad-name.json',
    ]);
    expect(manifest.sections.map((section) => section.labelKo)).toEqual(['과정기록', '권리/IP 자산화']);
    expect(manifest.sections.find((section) => section.id === 'rights-ip')?.checklistKo).toEqual([
      '외부 제시 자료 4군집',
      '매체별 작성 양식',
      '국가·플랫폼별 양식',
      '권리/IP 점검',
      '불러오기 기록',
    ]);
    expect(manifest.projectScope.noteKo).toContain('프로젝트 proj-1 기준');
    expect(manifest.limitation).toContain('권리 귀속');
    expect(manifest.limitation).toContain('별도 검토 단계');
  });

  it('아티팩트, manifest, README를 단일 ZIP으로 생성한다', async () => {
    const blob = await buildSubmissionPackageZipBlob(makePackage());

    expect(blob).toBeInstanceOf(Blob);
    const zip = await JSZip.loadAsync(await blobToArrayBuffer(blob!));
    const manifestFile = zip.file('manifest.json');
    const readmeFile = zip.file('README.txt');

    expect(manifestFile).toBeTruthy();
    expect(readmeFile).toBeTruthy();

    const manifest = JSON.parse(await manifestFile!.async('string'));
    const paths = manifest.artifacts.map((artifact: { path: string }) => artifact.path);
    const importFilePath = paths.find((path: string) => path.includes('bad') && path.endsWith('.json'));
    expect(paths).toContain('artifacts/process-certificate.html');
    expect(paths.some((path: string) => path.includes('..') || path.includes(':'))).toBe(false);
    expect(zip.file('artifacts/process-certificate.html')).toBeTruthy();
    expect(importFilePath).toBeTruthy();
    expect(zip.file(importFilePath!)).toBeTruthy();
    const readme = await readmeFile!.async('string');
    expect(readme).toContain('Loreguard 출고 패키지');
    expect(readme).toContain('프로젝트 격리');
    expect(readme).toContain('권리/IP 자산화');
    expect(readme).toContain('확인 항목: 외부 제시 자료 4군집, 매체별 작성 양식');
    expect(readme).toContain('공개용 과정기록 카드는 이 ZIP의 원고·출처·작업 영수증을 그대로 노출하지 않습니다.');
  });

  it('공개용 카드와 제출용 ZIP 자료 범위를 분리한다', async () => {
    const manuscriptSentinel = 'AI-TEST-INPUT-PRIVATE-MANUSCRIPT-본문-경계';
    const sourceSentinel = 'AI-TEST-INPUT-PRIVATE-SOURCE-LABEL-경계';
    const workNoteSentinel = 'AI-TEST-INPUT-PRIVATE-WORK-NOTE-경계';
    const sourceRecord: SourceRecord = {
      id: 'source-boundary-1',
      projectId: 'proj-boundary',
      sourceType: 'external_doc',
      label: sourceSentinel,
      importedAt: '2026-06-15T00:00:00.000Z',
      contentHash: 'e'.repeat(64),
      fileName: '비공개_출처_자료.md',
      licenseNote: '제출용 검토 범위',
      visibility: 'publisher',
      note: workNoteSentinel,
    };
    const creativeEvent: CreativeEvent = {
      id: 'event-boundary-1',
      projectId: 'proj-boundary',
      episodeId: 1,
      targetType: 'manuscript',
      targetId: 'episode-1',
      eventType: 'import',
      actorType: 'human',
      actorId: 'author-boundary',
      originType: 'EXTERNAL_IMPORT',
      beforeHash: null,
      afterHash: 'f'.repeat(64),
      sourceId: sourceRecord.id,
      createdAt: '2026-06-15T00:01:00.000Z',
      appVersion: 'test',
      note: workNoteSentinel,
    };
    mockedListSources.mockResolvedValue([sourceRecord]);
    mockedListCreativeEvents.mockResolvedValue([creativeEvent]);

    const pkg = await buildSubmissionPackage({
      projectId: 'proj-boundary',
      language: 'ko',
      profileId: 'publisher',
      projectMeta: { name: '공개 제출 경계 테스트', authorName: '테스트 작가' },
      episodes: [{ episode: 1, content: manuscriptSentinel }],
      generatedBy: 'loreguard@test',
    });
    const publicPayload = buildPublicCertificateCardPayload({
      cert: makePublicCardCertificate({
        certificateId: pkg.certificateId,
        projectId: pkg.projectId,
        manuscriptHash: pkg.manuscriptHash,
        generatedAt: pkg.generatedAt,
      }),
      workTitle: '공개 제출 경계 테스트',
      authorName: '테스트 작가',
    });
    const publicSerialized = `${JSON.stringify(publicPayload)}\n${serializePublicCertificateCardForUserKo(publicPayload)}`;

    expect(publicSerialized).not.toContain(manuscriptSentinel);
    expect(publicSerialized).not.toContain(sourceSentinel);
    expect(publicSerialized).not.toContain(workNoteSentinel);
    expect(publicPayload.publicPolicy.noManuscriptText).toBe(true);
    expect(publicPayload.publicPolicy.noSourceBodyText).toBe(true);
    expect(publicPayload.publicPolicy.noWorkReceiptText).toBe(true);

    const blob = await buildSubmissionPackageZipBlob(pkg);
    const zip = await JSZip.loadAsync(await blobToArrayBuffer(blob!));
    const manifest = JSON.parse(await zip.file('manifest.json')!.async('string'));
    expect(manifest.disclosureBoundary.publicCard.allowedArtifactIds).toEqual([
      'public-certificate-card',
      'digital-signature',
    ]);
    expect(manifest.disclosureBoundary.publicCard.excludedArtifactIds).toEqual(
      expect.arrayContaining(['manuscript-md', 'process-certificate', 'source-bundle', 'jurisdiction-form-pack', 'ip-pack-manifest']),
    );
    expect(manifest.disclosureBoundary.publicCard.excludedPayloadKo).toEqual(
      expect.arrayContaining(['원고 본문', '출처 원문', '작업 영수증 원문', '권리 원장 상세 메모']),
    );
    expect(manifest.disclosureBoundary.submissionPackage.includedArtifactIds).toEqual(
      expect.arrayContaining(['manuscript-md', 'process-certificate', 'source-bundle', 'digital-signature']),
    );
    expect(manifest.disclosureBoundary.submissionPackage.privateEvidenceArtifactIds).toEqual(
      expect.arrayContaining(['source-bundle']),
    );

    const manuscriptArtifact = manifest.artifacts.find((artifact: { id: string }) => artifact.id === 'manuscript-md');
    const publicCardArtifact = manifest.artifacts.find(
      (artifact: { id: string }) => artifact.id === 'public-certificate-card',
    );
    const sourceArtifact = manifest.artifacts.find((artifact: { id: string }) => artifact.id === 'source-bundle');
    const manuscriptContent = await zip.file(manuscriptArtifact.path)!.async('string');
    const publicCardContent = await zip.file(publicCardArtifact.path)!.async('string');
    const sourceBundleContent = await zip.file(sourceArtifact.path)!.async('string');
    expect(manuscriptContent).toContain(manuscriptSentinel);
    expect(publicCardContent).not.toContain(manuscriptSentinel);
    expect(publicCardContent).not.toContain(sourceSentinel);
    expect(publicCardContent).not.toContain(workNoteSentinel);
    expect(sourceBundleContent).toContain(sourceSentinel);
    expect(sourceBundleContent).not.toContain(workNoteSentinel);
  });

  it('실제 제출 묶음 ZIP 안에 권리/IP 구성표 상세 JSON을 포함한다', async () => {
    const pkg = await buildSubmissionPackage({
      projectId: 'proj-ip-zip',
      language: 'ko',
      profileId: 'publisher',
      projectMeta: { name: 'IP ZIP 테스트', authorName: '테스트 작가' },
      episodes: [{ episode: 1, content: '테스트 원고입니다. 권리/IP 묶음 검증을 위한 본문입니다.' }],
      generatedBy: 'loreguard@test',
      ipPack: {
        externalMaterialClusters: [
          {
            id: 'entry',
            labelKo: '진입 자료',
            purposeKo: '외부 검토자가 작품을 빠르게 파악하도록 돕는 요약 자료입니다.',
            filledCount: 1,
            totalCount: 2,
            statusKo: '보강 필요',
          },
        ],
        mediaFormGroups: [
          {
            titleKo: '영상 제안 요약',
            purposeKo: '영상화 검토에 필요한 핵심 정보를 한 장으로 정리합니다.',
            filledCount: 4,
            totalCount: 5,
            fields: [
              { labelKo: '로그라인', filled: true, sourceKo: '핵심 전제' },
              { labelKo: '핵심 인물', filled: true, sourceKo: '캐릭터 카드' },
              { labelKo: '회차 구조', filled: true, sourceKo: '목표 회차' },
              { labelKo: '미기입 항목', filled: false, sourceKo: '입력 대기' },
            ],
          },
        ],
        projectLedgerScope: {
          projectId: 'proj-ip-zip',
          projectScoped: true,
          projectScopeNoteKo: '프로젝트 proj-ip-zip 기준으로 분리된 제출 묶음입니다.',
          packageLedgerNoteKo: '테스트 제출 묶음의 권리/IP 구성표입니다.',
        },
      },
      releaseCredit: {
        planId: 'pro',
        packageProfileId: 'ip-sale',
      },
    });

    const blob = await buildSubmissionPackageZipBlob(pkg);
    const zip = await JSZip.loadAsync(await blobToArrayBuffer(blob!));
    const manifestFile = zip.file('manifest.json');
    expect(manifestFile).toBeTruthy();

    const manifest = JSON.parse(await manifestFile!.async('string'));
    const ipArtifact = manifest.artifacts.find((artifact: { id: string }) => artifact.id === 'ip-pack-manifest');
    expect(ipArtifact?.path).toBeTruthy();

    const jurisdictionArtifact = manifest.artifacts.find(
      (artifact: { id: string }) => artifact.id === 'jurisdiction-form-pack',
    );
    expect(jurisdictionArtifact?.path).toBeTruthy();
    const jurisdictionPack = JSON.parse(await zip.file(jurisdictionArtifact.path)!.async('string'));
    expect(jurisdictionPack).toMatchObject({
      kind: 'loreguard.jurisdiction-form-pack.v1',
      packId: 'ko-KR',
      label: expect.objectContaining({
        ko: '한국어/한국 출고 팩',
      }),
    });
    expect(jurisdictionPack.forms.map((form: { title: { ko: string } }) => form.title.ko)).toEqual(
      expect.arrayContaining(['프로젝트 접수', '권리/IP 자산화 양식', '출고 패키지 양식']),
    );
    expect(jurisdictionPack.sourceReferences.map((reference: { checkedAt: string }) => reference.checkedAt)).toContain(
      '2026-06-15',
    );
    expect(JSON.stringify(jurisdictionPack)).toContain('역번역 한국어 요약');
    expect(JSON.stringify(jurisdictionPack)).toContain('문화 리스크 한국어 요약');

    const releaseCreditArtifact = manifest.artifacts.find(
      (artifact: { id: string }) => artifact.id === 'release-credit-preview',
    );
    expect(releaseCreditArtifact?.path).toBeTruthy();
    const releaseCreditPreview = JSON.parse(await zip.file(releaseCreditArtifact.path)!.async('string'));
    expect(releaseCreditPreview).toMatchObject({
      kind: 'loreguard.release-credit-preview.v1',
      packageProfileId: 'ip-sale',
      planId: 'pro',
      product: expect.objectContaining({
        labelKo: '완결 출고 패키지 Pro',
        requiredCredits: 20,
      }),
      ledgerEventDraft: expect.objectContaining({
        projectId: 'proj-ip-zip',
        projectScoped: true,
        checkedAt: '2026-06-14',
      }),
      uiContract: {
        gateLabelKo: '발급 전 검토 가능',
        reviewCtaKo: '출고 묶음 검토 생성',
        paymentExecutionKo: '검토만 진행',
        submissionActionKo: '작가 승인 전 검토용 산출물',
      },
    });
    expect(releaseCreditPreview.creditPreview.debitPreviewKo).toContain('차감 후');
    expect(releaseCreditPreview.limitation).toContain('실제 결제');

    const ipManifestFile = zip.file(ipArtifact.path);
    expect(ipManifestFile).toBeTruthy();
    const ipManifest = JSON.parse(await ipManifestFile!.async('string'));

    expect(ipManifest.kind).toBe('loreguard.ip-pack-manifest.v1');
    expect(ipManifest.projectLedgerScope.projectId).toBe('proj-ip-zip');
    expect(ipManifest.externalMaterialClusters[0].labelKo).toBe('진입 자료');
    expect(ipManifest.mediaFormGroups[0].titleKo).toBe('영상 제안 요약');
    expect(ipManifest.mediaFormGroups[0].statusKo).toBe('보강 필요');
    expect(ipManifest.mediaFormGroups[0].fields.map((field: { labelKo: string }) => field.labelKo)).toContain(
      '로그라인',
    );
    expect(ipManifest.publicVerifyPolicy.exposedFields).toEqual(expect.arrayContaining(['확인서 식별자', '원고 해시']));
    expect(ipManifest.publicVerifyPolicy.privateFields).toEqual(expect.arrayContaining(['원고 전문', '출처 본문']));
    expect(ipManifest.limitation).toContain('저작권 귀속');
    expect(ipManifest.limitation).not.toContain('does not certify');
    expect(JSON.stringify(ipManifest.riskRegister)).not.toContain('source record(s)');
    expect(JSON.stringify(ipManifest.riskRegister)).not.toContain('C2PA-ready JSON');
    expect(ipManifest.artifacts.map((artifact: { id: string }) => artifact.id)).toContain('jurisdiction-form-pack');
    expect(ipManifest.artifacts.map((artifact: { id: string }) => artifact.id)).toContain('release-credit-preview');

    const readme = await zip.file('README.txt')!.async('string');
    expect(readme).toContain('권리/IP 자산화');
    expect(readme).toContain('확인 항목: 외부 제시 자료 4군집, 매체별 작성 양식');
  });

  it.each([
    {
      profileId: 'screen' as const,
      config: makeStoryConfig({
        genreMode: 'drama',
        releasePurpose: 'ip_pitch',
        mainScenarioStructure: {
          acts: [{ id: 'act1', title: '파일럿', summary: '첫 제출과 봉인번호 확인' }],
          endingLock: { locked: true, finalImage: '서명된 원장이 공개된다.' },
          eventChain: [{ id: 'event-1', order: 1, title: '제출', locked: true }],
        },
      }),
      expectedGroupTitles: ['영상 제안 요약', '구조·장면 자료', '권리·각색 경계'],
      expectedFieldLabels: ['시즌 로그라인', '타깃 시청층', '각색권 기간', '트리트먼트 귀속'],
    },
    {
      profileId: 'gameAnimation' as const,
      config: makeStoryConfig({
        genreMode: 'game',
        magicTechSystem: '권리 원장을 열면 능력이 해금된다.',
        taboo: '타인의 원장을 무단 열람할 수 없다.',
        factionRelations: '기록 길드와 제작 조합이 대립한다.',
        skills: [{
          id: 'skill-ledger',
          name: '원장 해금',
          type: 'active',
          owner: '유나',
          description: '봉인된 권리 기록을 확인한다.',
          cost: '집중력',
          cooldown: '1회 제출',
          rank: '희귀',
        }],
      }),
      expectedGroupTitles: ['세계관 운용 규칙', '자산 목록', '확장 경계'],
      expectedFieldLabels: ['세계 규칙', '플레이어블 후보', '스킬 체계', '스핀오프 범위'],
    },
    {
      profileId: 'audioDrama' as const,
      config: makeStoryConfig({
        primaryEmotion: '긴장과 안도',
        rightsNote: '오디오북 제작권, 성우 녹음, 홍보 클립 범위 별도 승인',
        characters: [
          {
            id: 'char-yuna',
            name: '유나',
            role: '기록 책임자',
            traits: '신중함',
            appearance: '은색 머리와 검은 코트',
            speechStyle: '짧고 낮게 말한다',
            speechExample: '그 문은 아직 열면 안 됩니다.',
            dna: 80,
            relationPattern: '상대를 직함으로 부른다',
          },
        ],
        sceneDirection: {
          writerNotes: '내레이션은 짧게, 대사는 낮고 느리게 처리한다.',
        },
      }),
      expectedGroupTitles: ['음성화 기본 정보', '캐릭터 음성 기준', '음향·권리 경계'],
      expectedFieldLabels: ['대상 형식', '내레이션 비중', '주요 인물 말투', '성우 녹음 권리'],
    },
    {
      profileId: 'globalTranslation' as const,
      config: makeStoryConfig({
        projectTargetLanguage: 'EN',
        targetMarket: 'US',
        translationConfig: {
          targetLang: 'EN',
          glossary: [{ source: '권리 원장', target: 'rights ledger' }],
        } as StoryConfig['translationConfig'],
      }),
      expectedGroupTitles: ['현지화 기본 정보', '번역 기준', '권리 지역'],
      expectedFieldLabels: ['대상 국가', '대상 언어', '현지 플랫폼', '용어집', '언어권 범위'],
    },
    {
      profileId: 'goodsBrand' as const,
      config: makeStoryConfig({
        releasePurpose: 'ip_pitch',
        characters: [
          {
            id: 'char-yuna',
            name: '유나',
            role: '기록 책임자',
            traits: '신중함',
            appearance: '은색 머리와 검은 코트',
            dna: 80,
            symbol: '은색 열쇠',
            assetMemo: '키링, 배지, 표지 문양 후보',
          },
        ],
      }),
      expectedGroupTitles: ['상품화 가능 요소', '브랜드 사용 기준', '라이선스 조건'],
      expectedFieldLabels: ['캐릭터명', '상징 문구', '허용 상품군', '카테고리 독점'],
    },
  ])('$profileId Pack의 한국어 작성 양식을 ZIP 내부 권리/IP 구성표에 보존한다', async ({
    profileId,
    config,
    expectedGroupTitles,
    expectedFieldLabels,
  }) => {
    const ipManifest = await readIpManifestFromPackageZip({ profileId, config });
    const mediaFormGroups = ipManifest.mediaFormGroups as Array<{
      titleKo: string;
      fields: Array<{ labelKo: string }>;
    }>;
    const externalClusters = ipManifest.externalMaterialClusters as Array<{ labelKo: string }>;

    expect(externalClusters.map((cluster) => cluster.labelKo)).toEqual(expect.arrayContaining([
      '진입 자료',
      '스토리 자료',
      '설정 자료',
      '제작·사업 자료',
    ]));
    expect(mediaFormGroups.map((group) => group.titleKo)).toEqual(expect.arrayContaining(expectedGroupTitles));
    expect(mediaFormGroups.flatMap((group) => group.fields.map((field) => field.labelKo))).toEqual(
      expect.arrayContaining(expectedFieldLabels),
    );
    expect(ipManifest.projectLedgerScope).toMatchObject({
      projectId: `proj-${profileId}`,
      projectScoped: true,
    });
  });

  it('국가별 양식 Pack을 지정한 지역 기준으로 ZIP 내부 JSON에 포함한다', async () => {
    const pkg = await buildSubmissionPackage({
      projectId: 'proj-eu-pack',
      language: 'ko',
      profileId: 'publisher',
      jurisdictionPackId: 'en-EU',
      projectMeta: { name: 'EU Pack 테스트', authorName: '테스트 작가' },
      episodes: [{ episode: 1, content: 'EU 제출 양식 검증을 위한 테스트 원고입니다.' }],
      generatedBy: 'loreguard@test',
    });
    const blob = await buildSubmissionPackageZipBlob(pkg);
    const zip = await JSZip.loadAsync(await blobToArrayBuffer(blob!));
    const manifest = JSON.parse(await zip.file('manifest.json')!.async('string'));
    const jurisdictionArtifact = manifest.artifacts.find(
      (artifact: { id: string }) => artifact.id === 'jurisdiction-form-pack',
    );

    expect(jurisdictionArtifact?.path).toBeTruthy();
    const jurisdictionPack = JSON.parse(await zip.file(jurisdictionArtifact.path)!.async('string'));
    expect(jurisdictionPack.packId).toBe('en-EU');
    expect(jurisdictionPack.label.ko).toBe('영어/EU 출고 팩');
    expect(jurisdictionPack.forms.map((form: { title: { ko: string } }) => form.title.ko)).toContain('출고 패키지 양식');
    expect(JSON.stringify(jurisdictionPack)).toContain('EU 투명성 확인');
    expect(jurisdictionPack.sourceReferences.map((reference: { checkedAt: string }) => reference.checkedAt)).toContain(
      '2026-06-15',
    );
  });
});
