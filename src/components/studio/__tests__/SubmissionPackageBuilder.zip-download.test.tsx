import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ComponentProps } from 'react';
import SubmissionPackageBuilder from '../SubmissionPackageBuilder';
import {
  buildSubmissionPackage,
  DISTRIBUTION_PROFILES,
  type SubmissionPackage,
} from '@/lib/creative-process/submission-package';
import {
  buildSubmissionPackageZipBlob,
  buildSubmissionPackageZipFilename,
} from '@/lib/creative-process/submission-package-zip';

jest.mock('@/lib/creative-process/submission-package', () => {
  const actual = jest.requireActual('@/lib/creative-process/submission-package');
  return {
    ...actual,
    buildSubmissionPackage: jest.fn(),
  };
});

jest.mock('@/lib/creative-process/submission-package-zip', () => ({
  buildSubmissionPackageZipBlob: jest.fn(),
  buildSubmissionPackageZipFilename: jest.fn(() => 'loreguard-package-cert-ui.zip'),
}));

function makePackage(): SubmissionPackage {
  const artifacts: SubmissionPackage['artifacts'] = [
    {
      id: 'process-certificate',
      filename: 'process-certificate.html',
      mimeType: 'text/html;charset=utf-8',
      size: 15,
      content: '<h1>확인</h1>',
    },
    {
      id: 'import-file-report',
      filename: 'import-file-report.json',
      mimeType: 'application/json;charset=utf-8',
      size: 43,
      content: '{"kind":"loreguard.import-file-report.v1"}',
    },
  ];

  return {
    id: 'pkg_cert-ui',
    projectId: 'proj-ui',
    language: 'ko',
    profile: DISTRIBUTION_PROFILES.publisher,
    view: 'publisher',
    recipientLabel: '출판사 제출',
    generatedAt: '2026-06-13T00:00:00.000Z',
    artifacts,
    manuscriptHash: 'a'.repeat(64),
    totalSize: artifacts.reduce((total, artifact) => total + artifact.size, 0),
    certificateId: 'cert-ui',
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
      recipientLabel: '출판사 제출',
      certificateId: 'cert-ui',
      generatedBy: 'test',
      artifactIds: artifacts.map((artifact) => artifact.id),
      finalCleanAuditVerdict: 'PASS',
      regulatoryStatusCounts: { ready: 0, 'needs-review': 0, 'not-ready': 0 },
      jurisdictionPackId: 'ko-KR',
      holdReasons: [],
      receiptText: 'test',
      limitation: 'test',
    },
  };
}

function seedStoredProject() {
  window.localStorage.setItem(
    'noa_projects_v2',
    JSON.stringify([
      {
        id: 'proj-ui',
        name: 'ZIP 테스트 작품',
        sessions: [
          {
            id: 'sess-ui',
            config: {
              title: 'ZIP 테스트 작품',
              synopsis: '권리를 사고파는 도시에서 문을 여는 작가의 이야기',
              corePremise: '문을 여는 권리가 계급을 바꾼다.',
              currentConflict: '권리 없는 자와 문을 독점한 길드의 충돌',
              totalEpisodes: 12,
              genreMode: 'drama',
              releasePurpose: 'ip_pitch',
              rightsStatus: 'author_owned',
              rightsNote: '작가 단독 창작, 영상화 제안 가능',
              targetMarket: 'KR',
              projectTargetLanguage: 'KO',
              manuscripts: [{ episode: 1, title: '첫 문', content: '제출할 원고 본문입니다.', charCount: 11, lastUpdate: 1 }],
              characters: [
                {
                  id: 'char-1',
                  name: '유나',
                  appearance: '은색 머리와 검은 코트',
                  symbol: '은색 열쇠',
                  relationPattern: '길드장과 경쟁한다',
                },
              ],
              sceneDirection: {
                plotStructure: '1막 의뢰, 2막 대가, 3막 문 개방',
                writerNotes: '차가운 조명과 문서 클로즈업',
                hooks: [{ position: '초반', hookType: '의문', desc: '문서가 작가의 이름을 부른다.' }],
              },
              importFileReports: [
                {
                  id: 'import-1',
                  fileName: 'world.md',
                  status: 'success',
                  detail: '후보 생성',
                  candidateCount: 2,
                  importedAt: '2026-06-13T00:00:00.000Z',
                },
              ],
            },
          },
        ],
      },
    ]),
  );
}

function seedStoredProjectWithNeighbor() {
  window.localStorage.setItem(
    'noa_projects_v2',
    JSON.stringify([
      {
        id: 'proj-ui',
        name: '격리 대상 작품',
        sessions: [
          {
            id: 'sess-selected',
            config: {
              title: '격리 대상 작품',
              synopsis: '선택된 작품의 권리/IP 묶음입니다.',
              corePremise: '작가가 선택한 문만 출고 패키지에 들어간다.',
              currentConflict: '선택 프로젝트와 이웃 프로젝트의 기준선을 분리한다.',
              totalEpisodes: 10,
              genreMode: 'drama',
              releasePurpose: 'ip_pitch',
              rightsStatus: 'author_owned',
              rightsNote: '선택 작품 권리 메모',
              targetMarket: 'KR',
              projectTargetLanguage: 'KO',
              manuscripts: [
                {
                  episode: 1,
                  title: '선택된 1화',
                  content: '선택 프로젝트 원고만 제출 묶음에 포함됩니다.',
                  charCount: 24,
                  lastUpdate: 11,
                },
              ],
              characters: [
                {
                  id: 'selected-char',
                  name: '선택 인물',
                  appearance: '검은 코트',
                  symbol: '은색 문장',
                  relationPattern: '선택 작품 안에서만 충돌한다',
                },
              ],
              sceneDirection: {
                plotStructure: '선택 작품 1막, 2막, 3막',
                writerNotes: '선택 작품 연출 메모',
              },
              importFileReports: [
                {
                  id: 'selected-import',
                  fileName: 'selected-world.md',
                  status: 'success',
                  detail: '선택 프로젝트 후보 생성',
                  candidateCount: 1,
                  importedAt: '2026-06-13T00:00:00.000Z',
                },
              ],
            },
          },
        ],
      },
      {
        id: 'proj-neighbor',
        name: '오염 이웃 작품',
        sessions: [
          {
            id: 'sess-neighbor',
            config: {
              title: '오염 이웃 작품',
              synopsis: '오염 데이터가 들어오면 실패해야 합니다.',
              corePremise: '오염 전제가 제출 묶음에 섞이면 안 됩니다.',
              currentConflict: '오염 충돌',
              totalEpisodes: 99,
              genreMode: 'fantasy',
              releasePurpose: 'platform_serial',
              rightsStatus: 'collab_review',
              rightsNote: '오염 권리 메모',
              targetMarket: 'JP',
              projectTargetLanguage: 'JA',
              manuscripts: [
                {
                  episode: 99,
                  title: '오염 99화',
                  content: '오염 원고 본문입니다.',
                  charCount: 11,
                  lastUpdate: 99,
                },
              ],
              characters: [
                {
                  id: 'polluted-char',
                  name: '오염 인물',
                  appearance: '오염 외형',
                  symbol: '오염 상징',
                  relationPattern: '오염 관계',
                },
              ],
              sceneDirection: {
                plotStructure: '오염 플롯',
                writerNotes: '오염 연출 메모',
              },
              importFileReports: [
                {
                  id: 'polluted-import',
                  fileName: 'polluted-world.md',
                  status: 'success',
                  detail: '오염 후보 생성',
                  candidateCount: 8,
                  importedAt: '2026-06-13T00:00:00.000Z',
                },
              ],
            },
          },
        ],
      },
    ]),
  );
}

function spyCreatedAnchors(originalCreateElement: typeof document.createElement) {
  const createdAnchors: HTMLAnchorElement[] = [];
  jest.spyOn(document, 'createElement').mockImplementation((tagName: string, options?: ElementCreationOptions) => {
    const element = originalCreateElement.call(document, tagName, options);
    if (tagName.toLowerCase() === 'a') {
      createdAnchors.push(element as HTMLAnchorElement);
    }
    return element;
  });
  return createdAnchors;
}

async function issuePackage(props: Partial<ComponentProps<typeof SubmissionPackageBuilder>> = {}) {
  render(<SubmissionPackageBuilder language="KO" projectIdOverride="proj-ui" {...props} />);
  fireEvent.click(screen.getByRole('button', { name: /묶음 생성/ }));
  await screen.findByRole('button', { name: /묶음 생성 완료/ });
}

describe('SubmissionPackageBuilder ZIP download', () => {
  const originalCreateObjectUrl = URL.createObjectURL;
  const originalRevokeObjectUrl = URL.revokeObjectURL;
  const originalCreateElement = document.createElement;
  const originalAnchorClick = HTMLAnchorElement.prototype.click;

  beforeEach(() => {
    window.localStorage.clear();
    jest.clearAllMocks();
    (buildSubmissionPackage as jest.Mock).mockResolvedValue(makePackage());
    (buildSubmissionPackageZipBlob as jest.Mock).mockResolvedValue(new Blob(['zip-content'], { type: 'application/zip' }));
    URL.createObjectURL = jest.fn(() => 'blob:zip-download');
    URL.revokeObjectURL = jest.fn();
    HTMLAnchorElement.prototype.click = jest.fn();
  });

  afterEach(() => {
    URL.createObjectURL = originalCreateObjectUrl;
    URL.revokeObjectURL = originalRevokeObjectUrl;
    HTMLAnchorElement.prototype.click = originalAnchorClick;
    jest.restoreAllMocks();
  });

  it('묶음 생성 후 ZIP 다운로드 버튼이 단일 ZIP Blob을 내려받는다', async () => {
    seedStoredProject();
    const createdAnchors = spyCreatedAnchors(originalCreateElement);

    await issuePackage();
    expect(buildSubmissionPackage).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'proj-ui',
          profileId: 'publisher',
          ipPack: expect.objectContaining({
            externalMaterialClusters: expect.arrayContaining([
              expect.objectContaining({ labelKo: '진입 자료' }),
            ]),
            mediaFormGroups: expect.arrayContaining([
              expect.objectContaining({
                titleKo: '영상 제안 요약',
                fields: expect.arrayContaining([
                  expect.objectContaining({ labelKo: '시즌 로그라인', filled: true }),
                ]),
              }),
            ]),
            projectLedgerScope: expect.objectContaining({
              projectId: 'proj-ui',
              projectScoped: true,
            }),
          }),
          importFileReports: [
            expect.objectContaining({
            fileName: 'world.md',
            status: 'success',
            candidateCount: 2,
          }),
        ],
        jurisdictionPackId: 'ko-KR',
        releaseCredit: expect.objectContaining({
          planId: 'pro',
          packageProfileId: 'external-submission',
        }),
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: /ZIP 다운로드/ }));
    expect(screen.getAllByRole('button', { name: /ZIP 다운로드/ })).toHaveLength(1);

    await waitFor(() => {
      expect(buildSubmissionPackageZipBlob).toHaveBeenCalledWith(expect.objectContaining({ id: 'pkg_cert-ui' }));
    });
    expect(await screen.findByText('ZIP 다운로드 준비됨')).toBeInTheDocument();
    expect(buildSubmissionPackageZipFilename).toHaveBeenCalledWith(expect.objectContaining({ certificateId: 'cert-ui' }));
    expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(createdAnchors[0]?.download).toBe('loreguard-package-cert-ui.zip');
    expect(createdAnchors[0]?.href).toBe('blob:zip-download');
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(1);
  });

  it('공개용 출고 방향은 공개 범위 제출 프로필로 생성한다', async () => {
    seedStoredProject();

    await issuePackage({ packageProfileId: 'public-reader' });

    expect(buildSubmissionPackage).toHaveBeenCalledWith(
      expect.objectContaining({
        profileId: 'platform',
        releaseCredit: expect.objectContaining({
          packageProfileId: 'public-reader',
        }),
      }),
    );
  });

  it('제출 묶음 입력은 선택한 프로젝트 기준선만 읽고 이웃 프로젝트 자료를 섞지 않는다', async () => {
    seedStoredProjectWithNeighbor();

    await issuePackage();

    const input = (buildSubmissionPackage as jest.Mock).mock.calls[0]?.[0];
    expect(input).toEqual(
      expect.objectContaining({
        projectId: 'proj-ui',
        projectMeta: expect.objectContaining({ name: '격리 대상 작품' }),
        episodes: [
          expect.objectContaining({
            episode: 1,
            content: '선택 프로젝트 원고만 제출 묶음에 포함됩니다.',
          }),
        ],
        characters: [
          expect.objectContaining({
            id: 'selected-char',
            name: '선택 인물',
          }),
        ],
        importFileReports: [
          expect.objectContaining({
            id: 'selected-import',
            fileName: 'selected-world.md',
          }),
        ],
        ipPack: expect.objectContaining({
          projectLedgerScope: expect.objectContaining({
            projectId: 'proj-ui',
            projectScoped: true,
          }),
        }),
        jurisdictionPackId: 'ko-KR',
      }),
    );
    expect(JSON.stringify(input)).not.toContain('오염');
    expect(JSON.stringify(input)).not.toContain('proj-neighbor');
    expect(JSON.stringify(input)).not.toContain('polluted');
  });

  it('ZIP 생성이 불가능하면 개별 파일 다운로드로 전환하고 상태를 표시한다', async () => {
    seedStoredProject();
    const createdAnchors = spyCreatedAnchors(originalCreateElement);
    (buildSubmissionPackageZipBlob as jest.Mock).mockResolvedValue(null);

    await issuePackage();

    fireEvent.click(screen.getByRole('button', { name: /ZIP 다운로드/ }));

    expect(await screen.findByText('ZIP 생성이 어려워 개별 파일 다운로드로 전환했습니다.')).toBeInTheDocument();
    await waitFor(() => {
      expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(2);
    });
    expect(buildSubmissionPackageZipFilename).not.toHaveBeenCalled();
    expect(createdAnchors.map((anchor) => anchor.download)).toEqual([
      'process-certificate.html',
      'import-file-report.json',
    ]);
  });

  it('브라우저 다운로드 시작이 실패하면 오류 상태를 표시한다', async () => {
    seedStoredProject();
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    URL.createObjectURL = jest.fn(() => {
      throw new Error('download blocked');
    });

    await issuePackage();

    fireEvent.click(screen.getByRole('button', { name: /ZIP 다운로드/ }));

    expect(await screen.findByText('다운로드를 시작하지 못했습니다.')).toBeInTheDocument();
    expect(buildSubmissionPackageZipFilename).toHaveBeenCalledWith(expect.objectContaining({ certificateId: 'cert-ui' }));
    expect(HTMLAnchorElement.prototype.click).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
  });
});
