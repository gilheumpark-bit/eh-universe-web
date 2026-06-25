/**
 * submission-package.test.ts (2026-05-10 — `_1` 화면 backbone)
 */

// IndexedDB / source-recorder / event-recorder mock — jsdom SubtleCrypto 미지원 우회
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
  // jsdom 에 SubtleCrypto 미지원 — fallback hash
  computeSha256Hex: async (text: string) => {
    let h = 0;
    for (let i = 0; i < text.length; i++) h = ((h << 5) - h + text.charCodeAt(i)) | 0;
    return Math.abs(h).toString(16).padStart(64, '0');
  },
}));

// seal-issuer 의 IDB 의존 fallback (timestamp 기반) 사용
import {
  buildSubmissionPackage,
  DISTRIBUTION_PROFILES,
  ARTIFACT_LABELS,
} from '../submission-package';

const baseInput = {
  projectId: 'proj-test-1',
  language: 'ko' as const,
  projectMeta: { name: 'Test Work', authorName: 'Test Author' },
  episodes: [
    { episode: 1, content: '첫 화 본문 내용입니다. 작가가 직접 작성했습니다.' },
    { episode: 2, content: '둘째 화 본문. 충분히 긴 내용으로 manuscript hash 가 빈 hash 와 다르도록.' },
  ],
  worldSummary: { genre: '판타지' },
  characters: [{ id: 'c1', name: '주인공' }],
  generatedBy: 'loreguard@test',
};

describe('submission-package — DISTRIBUTION_PROFILES', () => {
  it('4 profile 모두 정의', () => {
    expect(DISTRIBUTION_PROFILES['legal-deposit']).toBeDefined();
    expect(DISTRIBUTION_PROFILES.publisher).toBeDefined();
    expect(DISTRIBUTION_PROFILES.platform).toBeDefined();
    expect(DISTRIBUTION_PROFILES['private-archive']).toBeDefined();
  });

  it('legal-deposit forcedView=legal', () => {
    expect(DISTRIBUTION_PROFILES['legal-deposit'].forcedView).toBe('legal');
  });

  it('각 profile 4언어 라벨', () => {
    for (const id of Object.keys(DISTRIBUTION_PROFILES) as Array<keyof typeof DISTRIBUTION_PROFILES>) {
      const p = DISTRIBUTION_PROFILES[id];
      expect(p.label.ko).toBeDefined();
      expect(p.label.en).toBeDefined();
      expect(p.label.ja).toBeDefined();
      expect(p.label.zh).toBeDefined();
    }
  });

  it('보관 기간 — legal-deposit 70년, private-archive 100년', () => {
    expect(DISTRIBUTION_PROFILES['legal-deposit'].recommendedRetentionYears).toBe(70);
    expect(DISTRIBUTION_PROFILES['private-archive'].recommendedRetentionYears).toBe(100);
  });
});

describe('submission-package — ARTIFACT_LABELS', () => {
  it('4 artifact × 4언어 모두 정의', () => {
    const ids = [
      'manuscript-md',
      'public-certificate-card',
      'process-certificate',
      'source-bundle',
      'core-copyright-package',
      'release-credit-preview',
      'digital-signature',
    ] as const;
    for (const id of ids) {
      expect(ARTIFACT_LABELS[id].ko).toBeDefined();
      expect(ARTIFACT_LABELS[id].en).toBeDefined();
      expect(ARTIFACT_LABELS[id].ja).toBeDefined();
      expect(ARTIFACT_LABELS[id].zh).toBeDefined();
    }
  });
});

describe('submission-package — buildSubmissionPackage', () => {
  it('publisher profile → 원고·확인서·서명·권리/IP 구성표를 포함한다', async () => {
    const pkg = await buildSubmissionPackage({ ...baseInput, profileId: 'publisher' });
    expect(pkg.profile.id).toBe('publisher');
    expect(pkg.view).toBe('publisher');
    expect(pkg.artifacts.length).toBeGreaterThanOrEqual(4);
    const ids = pkg.artifacts.map((a) => a.id);
    expect(ids).toContain('manuscript-md');
    expect(ids).toContain('public-certificate-card');
    expect(ids).toContain('process-certificate');
    expect(ids).toContain('digital-signature');
    expect(ids).toContain('ip-pack-manifest');
  });

  it('platform profile → source-bundle 제외', async () => {
    const pkg = await buildSubmissionPackage({ ...baseInput, profileId: 'platform' });
    const ids = pkg.artifacts.map((a) => a.id);
    expect(ids).not.toContain('source-bundle');
    expect(ids).toContain('public-certificate-card');
    expect(ids).toContain('process-certificate');
  });

  it('공개용 과정기록 카드는 본문 없이 축약 메타만 담는다', async () => {
    const pkg = await buildSubmissionPackage({ ...baseInput, profileId: 'publisher' });
    const card = pkg.artifacts.find((artifact) => artifact.id === 'public-certificate-card');
    expect(card).toBeDefined();
    expect(card!.filename).toMatch(/^public-process-card-/);
    expect(card!.content).toContain('공개용 과정기록 카드');
    expect(card!.content).toContain('Test Work');
    expect(card!.content).not.toContain('첫 화 본문 내용입니다');
    expect(card!.content).not.toContain(pkg.manuscriptHash);
  });

  it('legal-deposit profile → forced view legal', async () => {
    const pkg = await buildSubmissionPackage({ ...baseInput, profileId: 'legal-deposit' });
    expect(pkg.view).toBe('legal');
  });

  it('manuscript-md content 가 작품 제목 + 본문 포함', async () => {
    const pkg = await buildSubmissionPackage({ ...baseInput, profileId: 'publisher' });
    const ms = pkg.artifacts.find((a) => a.id === 'manuscript-md');
    expect(ms).toBeDefined();
    expect(ms!.content).toContain('Test Work');
    expect(ms!.content).toContain('첫 화 본문');
  });

  it('digital-signature JSON 파싱 가능 + manuscriptHash 포함', async () => {
    const pkg = await buildSubmissionPackage({ ...baseInput, profileId: 'publisher' });
    const sig = pkg.artifacts.find((a) => a.id === 'digital-signature');
    expect(sig).toBeDefined();
    const parsed = JSON.parse(sig!.content);
    expect(parsed.kind).toBe('loreguard.digital-signature.v1');
    // 64자 hex (실제 구현 시 SHA-256, 테스트 fallback 도 64자 padding)
    expect(typeof parsed.manuscriptHash).toBe('string');
    expect(parsed.manuscriptHash.length).toBe(64);
  });

  it('패키지 표지에서 쓸 조회 링크와 QR 데이터를 함께 가진다', async () => {
    const pkg = await buildSubmissionPackage({ ...baseInput, profileId: 'publisher' });

    expect(pkg.verificationUrl).toContain(`/verify/${pkg.certificateId}`);
    expect(pkg.verificationQrDataUrl).toMatch(/^data:image\//);
  });

  it('ip-pack-manifest JSON 파싱 가능 + 매체별 양식 상태 포함', async () => {
    const pkg = await buildSubmissionPackage({
      ...baseInput,
      profileId: 'publisher',
      ipPack: {
        mediaFormGroups: [
          {
            titleKo: '영상 제안 요약',
            purposeKo: '제작사가 로그라인, 시즌성, 장면성을 빠르게 판단하게 한다.',
            filledCount: 4,
            totalCount: 5,
            fields: [
              { labelKo: '시즌 로그라인', filled: true, sourceKo: '시놉시스·핵심 전제' },
              { labelKo: '타깃 시청층', filled: true, sourceKo: '시장·플랫폼 설정' },
              { labelKo: '시즌 수', filled: true, sourceKo: '목표 회차·시즌 구조' },
              { labelKo: '주요 갈등', filled: true, sourceKo: '현재 갈등·사건 체인' },
              { labelKo: '결말 포함 여부', filled: false, sourceKo: '입력 대기' },
            ],
          },
        ],
      },
    });
    const manifestArtifact = pkg.artifacts.find((artifact) => artifact.id === 'ip-pack-manifest');
    expect(manifestArtifact).toBeDefined();
    const parsed = JSON.parse(manifestArtifact!.content);
    expect(parsed.kind).toBe('loreguard.ip-pack-manifest.v1');
    expect(parsed.projectLedgerScope.projectId).toBe('proj-test-1');
    expect(parsed.mediaFormGroups[0].titleKo).toBe('영상 제안 요약');
    expect(parsed.mediaFormGroups[0].statusKo).toBe('보강 필요');
    expect(parsed.artifacts.map((artifact: { id: string }) => artifact.id)).toContain('ip-pack-manifest');
  });

  it('패키지 조건 미리보기 JSON을 실제 차감 없이 포함한다', async () => {
    const pkg = await buildSubmissionPackage({
      ...baseInput,
      profileId: 'publisher',
      releaseCredit: {
        planId: 'studio',
        packageProfileId: 'external-submission',
      },
    });
    const artifact = pkg.artifacts.find((item) => item.id === 'release-credit-preview');
    expect(artifact).toBeDefined();
    const parsed = JSON.parse(artifact!.content);
    expect(parsed).toMatchObject({
      kind: 'loreguard.release-credit-preview.v1',
      packageProfileId: 'external-submission',
      planId: 'studio',
      product: expect.objectContaining({
        labelKo: '완결 과정기록',
        requiredCredits: 10,
      }),
      ledgerEventDraft: expect.objectContaining({
        projectId: 'proj-test-1',
        projectScoped: true,
        checkedAt: '2026-06-14',
      }),
    });
    expect(parsed.limitation).toContain('실제 결제');
  });

  it('코어 저작권 등록 준비 패키지를 선택 산출물로 포함한다', async () => {
    const pkg = await buildSubmissionPackage({
      ...baseInput,
      profileId: 'publisher',
      coreCopyrightPackage: {
        filename: 'core-copyright-package-test.md',
        content: '# 코어 저작권 등록 준비 패키지\n\n세계관 등록 기준본',
      },
    });
    const artifact = pkg.artifacts.find((item) => item.id === 'core-copyright-package');
    expect(artifact).toBeDefined();
    expect(artifact!.filename).toBe('core-copyright-package-test.md');
    expect(artifact!.content).toContain('세계관 등록 기준본');
    expect(ARTIFACT_LABELS['core-copyright-package'].ko).toBe('코어 저작권 등록 준비 패키지');
  });

  it('totalSize = artifacts 합산', async () => {
    const pkg = await buildSubmissionPackage({ ...baseInput, profileId: 'publisher' });
    const sum = pkg.artifacts.reduce((acc, a) => acc + a.size, 0);
    expect(pkg.totalSize).toBe(sum);
  });

  it('recipientLabel default = profile.label[language]', async () => {
    const pkg = await buildSubmissionPackage({ ...baseInput, profileId: 'publisher' });
    expect(pkg.recipientLabel).toBe('출판사 제출');
  });

  it('recipientLabel 사용자 지정 우선', async () => {
    const pkg = await buildSubmissionPackage({
      ...baseInput,
      profileId: 'publisher',
      recipientLabel: '문학동네',
    });
    expect(pkg.recipientLabel).toBe('문학동네');
  });

  it('UNKNOWN_PROFILE throw', async () => {
    await expect(
      buildSubmissionPackage({ ...baseInput, profileId: 'invalid' as never }),
    ).rejects.toThrow(/UNKNOWN_PROFILE/);
  });
});
