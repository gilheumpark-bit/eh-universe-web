import { buildMediaIpPackMarkdown } from '@/lib/creative/media-ip-pack-markdown';
import { buildMediaIpPackPlan } from '@/lib/creative/media-ip-pack-profile';

function makeInput() {
  const plan = buildMediaIpPackPlan({
    profileId: 'screen',
    filledSectionKeys: ['oneSheet', 'overview', 'synopsis', 'characters', 'episodeGuide'],
  });

  return {
    workTitle: '검은 등기소',
    generatedAt: '2026. 6. 14. 오후 11:30',
    plan,
    packageSummary: {
      labelKo: 'IP 자산화',
      audienceKo: '웹툰·영상·게임·해외화 검토자',
      boundaryKo: '원고 전문은 거래 단계에서만 분리합니다.',
      requiredItemsKo: ['권리/IP 자산화 구성표', '창작 과정 확인서'],
      recommendedItemsKo: ['국가별 양식 패키지'],
      privateItemsKo: ['본문 원고', '작업 영수증 기록'],
      summaryKo: '권리/IP 중심 패키지입니다.',
    },
    jurisdictionLabelKo: '대한민국 출고 양식',
    jurisdictionFormRows: [
      {
        titleKo: '프로젝트 접수',
        purposeKo: '제목과 작가 표시명을 고정합니다.',
        requiredPresent: 3,
        requiredTotal: 4,
      },
    ],
    jurisdictionSourceRows: [
      {
        titleKo: 'U.S. Copyright Office — Copyright and Artificial Intelligence',
        url: 'https://www.copyright.gov/ai/',
        checkedAt: '2026-06-14',
      },
    ],
    rightsLedgerRows: [
      {
        categoryKo: '원고 본문',
        ownerKo: '작가/프로젝트 소유자',
        usageScopeKo: '제출용 패키지',
        exclusivityKo: '비독점 제안 가능',
        termKo: '2026-06-14부터 2년',
        regionKo: '한국·일본',
        mediaKo: '웹소설·영상',
        evidenceFileKo: 'rights-note.md',
        statusKo: '작가 단독 창작',
        noteKo: '영상화 제안 가능',
      },
    ],
    sourceSummaryRows: [
      {
        labelKo: '작가 제공 설정집',
        typeKo: '외부 문서',
        originKo: 'setting-bible.md',
        visibilityKo: '제출용',
        licenseKo: '작가 제공 자료',
        evidenceKo: '해시 a1b2c3d4',
        noteKo: '원문 전문은 별도 첨부',
      },
    ],
    certificateOutput: {
      labelKo: '제출용 확인서',
      purposeKo: '심사 담당자가 원고와 과정기록을 함께 검토합니다.',
      boundaryKo: '출처 원문은 요청 또는 계약 조건이 있을 때만 별도 첨부합니다.',
      visualModeKo: '전체 문서',
      verificationUrl: 'https://example.test/api/cp/verify/cert-media-ip-pack',
      sealNumber: 'LG-2606-0002-IPCK',
      exposedFieldsKo: ['작품명', '작가명', '수정·승인 흐름'],
      privateFieldsKo: ['개인 작업노트 전문', '민감 출처 원문'],
      includedArtifactsKo: ['제출용 정리 원고', '창작 과정 확인서', '디지털 서명'],
      excludedArtifactsKo: ['출처 자료 묶음', '작업 영수증 기록'],
      rightsLedgerPolicyKo: '제출용 문서에 권리 원장 상세를 선택 첨부합니다.',
      safetyPolicyKo: '민감 출처 원문은 별도 조건으로 분리합니다.',
      missingKo: ['QR 조회 링크'],
      summaryKo: '제출용 확인서 출력 전 QR 조회 링크를 확인하세요.',
    },
    productLabelKo: 'Publisher 패키지',
    productPriceKrw: 100000,
    rightsStatusKo: '작가 단독 창작',
    rightsNote: '영상화 제안 가능',
  };
}

describe('media-ip-pack-markdown', () => {
  it('권리/IP 자산화 초안을 한국어 제목과 섹션으로 만든다', () => {
    const markdown = buildMediaIpPackMarkdown(makeInput());

    expect(markdown).toContain('# 검은 등기소 권리/IP 자산화 초안');
    expect(markdown).toContain('## 1. 패키지 개요');
    expect(markdown).toContain('- 매체 방향: 드라마·OTT·영화 권리팩');
    expect(markdown).toContain('- 상품 연결: Publisher 패키지 · ₩100,000');
    expect(markdown).toContain('## 2. 외부 제시 자료 4군집');
    expect(markdown).toContain('- 진입 자료: 2/2');
    expect(markdown).toContain('원시트(채움) · 작품 개요(채움)');
    expect(markdown).toContain('- 스토리 자료: 1/4');
    expect(markdown).toContain('플롯 구조(필수 보강)');
    expect(markdown).toContain('- 설정 자료: 1/3');
    expect(markdown).toContain('세계관(권장 보강)');
    expect(markdown).toContain('- 제작·사업 자료: 1/4');
    expect(markdown).toContain('비주얼 가이드(권장 보강)');
    expect(markdown).toContain('## 4. 권리/IP 점검');
    expect(markdown).toContain('## 5. 권리 원장');
    expect(markdown).toContain('- 원고 본문:');
    expect(markdown).toContain('소유/주체 작가/프로젝트 소유자');
    expect(markdown).toContain('독점 여부 비독점 제안 가능');
    expect(markdown).toContain('기간 2026-06-14부터 2년');
    expect(markdown).toContain('지역 한국·일본');
    expect(markdown).toContain('매체 웹소설·영상');
    expect(markdown).toContain('근거 파일 rights-note.md');
    expect(markdown).toContain('## 6. 출처·외부 자료 요약');
    expect(markdown).toContain('- 작가 제공 설정집:');
    expect(markdown).toContain('권리 메모 작가 제공 자료');
    expect(markdown).toContain('근거 해시 a1b2c3d4');
    expect(markdown).toContain('원문 전문은 별도 첨부');
    expect(markdown).toContain('## 7. 공개용·제출용 확인 문서');
    expect(markdown).toContain('- 출력 형태: 제출용 확인서 · 전체 문서');
    expect(markdown).toContain('- 봉인번호: LG-2606-0002-IPCK');
    expect(markdown).toContain('- 조회 링크: https://example.test/api/cp/verify/cert-media-ip-pack');
    expect(markdown).toContain('- 제외 항목: 개인 작업노트 전문 · 민감 출처 원문');
    expect(markdown).toContain('- 첨부 산출물: 제출용 정리 원고 · 창작 과정 확인서 · 디지털 서명');
    expect(markdown).toContain('- 구조적 제외 산출물: 출처 자료 묶음 · 작업 영수증 기록');
    expect(markdown).toContain('- 권리 원장 정책: 제출용 문서에 권리 원장 상세를 선택 첨부합니다.');
    expect(markdown).toContain('### 8-1. 매체별 작성 양식');
    expect(markdown).toContain('- 영상 제안 요약: 제작사가 로그라인, 시즌성, 장면성을 빠르게 판단하게 한다.');
    expect(markdown).toContain('작성 항목: 시즌 로그라인 · 타깃 시청층 · 시즌 수 · 주요 갈등 · 결말 포함 여부');
    expect(markdown).toContain('- 권리·각색 경계: 영상화권과 개발 산출물의 귀속을 거래 전에 분리한다.');
    expect(markdown).toContain('## 9. 국가별 양식 진행');
    expect(markdown).toContain('- U.S. Copyright Office — Copyright and Artificial Intelligence: 기준일 2026-06-14 · https://www.copyright.gov/ai/');
  });

  it('공개 화면용 상품 금액 라벨을 별도로 받을 수 있다', () => {
    const markdown = buildMediaIpPackMarkdown({
      ...makeInput(),
      productPriceLabelKo: '오디션 기간 비공개',
    });

    expect(markdown).toContain('- 상품 연결: Publisher 패키지 · 오디션 기간 비공개');
    expect(markdown).not.toContain('- 상품 연결: Publisher 패키지 · ₩100,000');
  });

  it('부족한 IP 바이블 섹션을 한국어 항목명으로 표시한다', () => {
    const markdown = buildMediaIpPackMarkdown(makeInput());

    expect(markdown).toContain('- 플롯 구조');
    expect(markdown).toContain('- 키씬 하이라이트');
    expect(markdown).not.toContain('- plotStructure');
    expect(markdown).not.toContain('- keyScenes');
  });

  it('부족 항목이 없으면 자연스러운 한국어 문구를 출력한다', () => {
    const plan = buildMediaIpPackPlan({
      profileId: 'webtoon',
      filledSectionKeys: [
        'oneSheet',
        'overview',
        'keyScenes',
        'characters',
        'visualGuide',
        'episodeGuide',
        'synopsis',
        'world',
        'glossary',
        'ipExpansion',
      ],
    });
    const markdown = buildMediaIpPackMarkdown({
      ...makeInput(),
      plan,
      rightsNote: '',
      jurisdictionFormRows: [],
      jurisdictionSourceRows: [],
      sourceSummaryRows: [],
    });

    expect(markdown).toContain('- 필수 항목 부족 없음');
    expect(markdown).toContain('- 권장 항목 부족 없음');
    expect(markdown).toContain('- 권리 메모: 별도 메모 없음');
    expect(markdown).toContain('- 근거 출처: 공통 팩은 프로젝트별 제출처 확인을 우선합니다.');
    expect(markdown).toContain('- 등록된 국가별 양식이 없습니다.');
    expect(markdown).toContain('- 외부 자료·출처 상세 기록이 아직 없습니다.');
  });

  it('매체별 작성 양식에 프로젝트 입력 채움 상태를 함께 표시한다', () => {
    const markdown = buildMediaIpPackMarkdown({
      ...makeInput(),
      formGroupCompletions: [
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
    });

    expect(markdown).toContain('- 영상 제안 요약: 제작사가 로그라인, 시즌성, 장면성을 빠르게 판단하게 한다. · 채움 4/5');
    expect(markdown).toContain('시즌 로그라인(채움) · 타깃 시청층(채움) · 시즌 수(채움) · 주요 갈등(채움) · 결말 포함 여부(대기)');
  });
});
