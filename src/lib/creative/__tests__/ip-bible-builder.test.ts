import {
  buildIpBible,
  buildSubmissionPackage,
  IP_BIBLE_SECTION_KEYS,
  IP_BIBLE_SECTION_META,
  PACKAGE_SECTION_MAP,
  PACKAGE_LABELS,
  type IpAnalysisScores,
  type IpBibleSectionKey,
  type IpBibleSourceConfig,
  type SubmissionPackageType,
} from '@/lib/creative/ip-bible-builder';

// ------------------------------------------------------------
// 픽스처
// ------------------------------------------------------------

/** 풍부한 config — StoryConfig 구조 호환 부분집합 */
function richConfig(): IpBibleSourceConfig {
  return {
    title: '터널 끝의 등기소',
    genre: '판타지',
    subGenres: ['헌터물', '경제물'],
    synopsis: '출구를 발견한 자가 그 길의 주인이 되는 세계에서, 한 남자가 마지막 길만은 팔지 않기로 한다.',
    povCharacter: '강민우',
    setting: '차원 통로가 겹친 현대 서울',
    primaryEmotion: '통쾌함',
    narrativeIntensity: 'standard',
    episode: 4,
    totalEpisodes: 400,
    platform: '카카오페이지',
    publishPlatform: '문피아',
    corePremise: '출구 소유권 경제 — 발견자가 통행료를 받는다',
    powerStructure: '등기소·길드·국가의 3축',
    currentConflict: '암시장 세력의 출구 강탈',
    worldHistory: '20년 전 첫 통로 출현',
    socialSystem: '등기 기반 소유권 사회',
    economy: '통행료 현금 흐름 경제',
    magicTechSystem: '통로 감응 능력',
    factionRelations: '길드 연합 vs 암시장',
    survivalEnvironment: '통로 내부 이질 환경',
    culture: '발견자 숭배 문화',
    religion: '길의 신 신앙',
    lawOrder: '등기법 중심 질서',
    taboo: '타인 출구 무단 통과 금기',
    characters: [
      { name: '강민우', role: '주인공' },
      { name: '유주', role: '사이드킥' },
      { name: '' }, // 이름 빈 항목 — 제외되어야 함
    ],
    charRelations: [
      { from: '강민우', to: '유주', type: '보호자' },
      { from: '강민우', to: '' }, // to 누락 — 제외
    ],
    items: [{ name: '할아버지의 시계', description: '첫 출구의 단서' }],
    skills: [{ name: '통로 감응', description: '출구 위치 감지' }],
    magicSystems: [{ name: '등기 마법', rules: '발견 즉시 소유권 각인' }],
  };
}

function richScores(): IpAnalysisScores {
  return {
    ipReadiness: { score: 72.5, tier: 'C' },
    webtoonFit: 81,
    gameFit: 87.5,
    dramaFit: 76,
    industryScores: { 출판: 80, 해외_번역: 70 },
  };
}

/** 정식 순서로 필터된 기대 키 목록 */
function canonicalFilter(keys: readonly IpBibleSectionKey[]): IpBibleSectionKey[] {
  const set = new Set(keys);
  return IP_BIBLE_SECTION_KEYS.filter((k) => set.has(k));
}

// ------------------------------------------------------------
// 13섹션 구조
// ------------------------------------------------------------

describe('buildIpBible — 13섹션 구조', () => {
  it('13섹션 키가 모두 존재하고 totalSections=13', () => {
    const bible = buildIpBible(richConfig(), richScores());
    expect(IP_BIBLE_SECTION_KEYS).toHaveLength(13);
    expect(bible.totalSections).toBe(13);
    for (const key of IP_BIBLE_SECTION_KEYS) {
      expect(bible.sections[key]).toBeDefined();
      expect(bible.sections[key].key).toBe(key);
    }
  });

  it('섹션 code 집합 = 표준 13문서 번호 (00~12 중 13개)', () => {
    const bible = buildIpBible({});
    const codes = IP_BIBLE_SECTION_KEYS.map((k) => bible.sections[k].code);
    expect(codes).toEqual([
      '07', '00', // 진입
      '01', '04', '05', '12', // 스토리
      '02', '03', '11', // 설정
      '08', '09', '10', '06', // 제작·사업
    ]);
  });

  it('군집·스포일러 등급이 표준 §1.1 매트릭스와 일치 (spot check)', () => {
    const m = IP_BIBLE_SECTION_META;
    expect(m.oneSheet).toMatchObject({ code: '07', cluster: 'entry', spoiler: 'safe' });
    expect(m.synopsis).toMatchObject({ code: '01', cluster: 'story', spoiler: 'ending' });
    expect(m.plotStructure).toMatchObject({ code: '04', cluster: 'story', spoiler: 'ending' });
    expect(m.keyScenes).toMatchObject({ code: '12', cluster: 'story', spoiler: 'ending' });
    expect(m.world).toMatchObject({ code: '02', cluster: 'setting', spoiler: 'mixed' });
    expect(m.glossary).toMatchObject({ code: '11', cluster: 'setting', spoiler: 'mixed' });
    expect(m.marketPositioning).toMatchObject({ code: '09', cluster: 'business', spoiler: 'safe' });
    expect(m.ipExpansion).toMatchObject({ code: '06', cluster: 'business', spoiler: 'safe' });
  });
});

// ------------------------------------------------------------
// 채움 동작 (날조 금지)
// ------------------------------------------------------------

describe('buildIpBible — 입력 기반 채움 (날조 금지)', () => {
  it('config 데이터가 해당 섹션에 채워진다', () => {
    const bible = buildIpBible(richConfig(), richScores());
    expect(bible.workTitle).toBe('터널 끝의 등기소');
    expect(bible.sections.oneSheet.filled).toBe(true);
    expect(bible.sections.oneSheet.fields['제목']).toBe('터널 끝의 등기소');
    expect(bible.sections.oneSheet.fields['장르 한 줄']).toBe('판타지 (서브: 헌터물·경제물)');
    expect(bible.sections.oneSheet.fields['분량/구성']).toBe('본편 400화');
    expect(bible.sections.world.fields['핵심 전제']).toBe(
      '출구 소유권 경제 — 발견자가 통행료를 받는다',
    );
    expect(bible.sections.characters.fields['주요 인물']).toBe(
      '강민우 (주인공) · 유주 (사이드킥)',
    );
    expect(bible.sections.characters.fields['관계']).toBe('강민우 → 유주 (보호자)');
    expect(bible.sections.glossary.fields['아이템']).toBe(
      '할아버지의 시계 — 첫 출구의 단서',
    );
    expect(bible.sections.episodeGuide.fields['본편 분량']).toBe('본편 400화');
    expect(bible.sections.episodeGuide.fields['진행 회차']).toBe('4화 진행');
    expect(bible.sections.marketPositioning.fields['연재 플랫폼']).toBe(
      '카카오페이지 (발행: 문피아)',
    );
  });

  it('대응 입력이 없는 섹션(플롯·키씬·비주얼)은 빈 섹션 + missingNote', () => {
    const bible = buildIpBible(richConfig(), richScores());
    for (const key of ['plotStructure', 'keyScenes', 'visualGuide'] as const) {
      const s = bible.sections[key];
      expect(s.filled).toBe(false);
      expect(s.fields).toEqual({});
      expect(s.missingNote).toContain('입력 데이터 없음');
    }
    // 채워진 섹션은 missingNote 없음
    expect(bible.sections.world.missingNote).toBeNull();
  });

  it('scores → ipExpansion 무변조 전달', () => {
    const bible = buildIpBible({}, richScores());
    const f = bible.sections.ipExpansion.fields;
    expect(bible.sections.ipExpansion.filled).toBe(true);
    expect(f['웹툰화 fit']).toBe('81/100');
    expect(f['게임화 fit']).toBe('87.5/100'); // 반올림·clamp 없음 (무변조)
    expect(f['영상화 fit']).toBe('76/100');
    expect(f['IP 준비도']).toBe('72.5/100 (tier C)');
    expect(f['산업별 score']).toBe('출판 80 · 해외_번역 70');
  });

  it('NaN/Infinity scores 는 흡수 — 전부 무효면 ipExpansion 빈 섹션', () => {
    const bible = buildIpBible({}, {
      webtoonFit: NaN,
      gameFit: Infinity,
      dramaFit: null,
      ipReadiness: { score: NaN },
      industryScores: { 출판: NaN },
    });
    expect(bible.sections.ipExpansion.filled).toBe(false);
    expect(bible.sections.ipExpansion.fields).toEqual({});
  });

  it('원시트 시놉 발췌는 200자 초과 시 …로 절단, 01 시놉은 원문 유지', () => {
    const long = 'あ'.repeat(250);
    const bible = buildIpBible({ synopsis: long });
    expect(bible.sections.oneSheet.fields['시놉 발췌']).toBe(`${'あ'.repeat(200)}…`);
    expect(bible.sections.synopsis.fields['풀 시놉(원문)']).toBe(long);
  });

  it('입력 config 를 변형하지 않는다 (순수 함수)', () => {
    const cfg = richConfig();
    const snapshot = JSON.stringify(cfg);
    buildIpBible(cfg, richScores());
    expect(JSON.stringify(cfg)).toBe(snapshot);
  });
});

// ------------------------------------------------------------
// 빈/이상 입력 안전
// ------------------------------------------------------------

describe('buildIpBible — 빈 config 안전', () => {
  it('빈 객체 → 13섹션 전부 빈 섹션, filledCount 0', () => {
    const bible = buildIpBible({});
    expect(bible.filledCount).toBe(0);
    expect(bible.workTitle).toBe('(제목 미정)');
    for (const key of IP_BIBLE_SECTION_KEYS) {
      expect(bible.sections[key].filled).toBe(false);
      expect(bible.sections[key].fields).toEqual({});
      expect(bible.sections[key].missingNote).not.toBeNull();
    }
  });

  it('null / undefined config·scores 도 크래시 없이 13섹션 반환', () => {
    const bn = buildIpBible(null);
    expect(bn.totalSections).toBe(13);
    expect(bn.filledCount).toBe(0);
    const bu = buildIpBible(undefined, null);
    expect(bu.totalSections).toBe(13);
    expect(Object.keys(bu.sections)).toHaveLength(13);
  });

  it('공백 문자열·0·음수 분량은 채움으로 인정하지 않는다', () => {
    const bible = buildIpBible({
      title: '   ',
      synopsis: '',
      totalEpisodes: 0,
      episode: -3,
    });
    expect(bible.filledCount).toBe(0);
    expect(bible.workTitle).toBe('(제목 미정)');
  });
});

// ------------------------------------------------------------
// 5 패키지 선별
// ------------------------------------------------------------

describe('buildSubmissionPackage — 5 패키지 (A출판/B영상/C웹툰/D라이선스/E해외)', () => {
  const TYPES: SubmissionPackageType[] = ['A', 'B', 'C', 'D', 'E'];

  it('패키지 타입별 includedKeys = 매핑 상수 (정식 순서)', () => {
    const bible = buildIpBible(richConfig(), richScores());
    for (const t of TYPES) {
      const pkg = buildSubmissionPackage(bible, t);
      expect(pkg.type).toBe(t);
      expect(pkg.label).toBe(PACKAGE_LABELS[t]);
      expect(pkg.includedKeys).toEqual(canonicalFilter(PACKAGE_SECTION_MAP[t]));
      expect(pkg.sections.map((s) => s.key)).toEqual(pkg.includedKeys);
    }
  });

  it('모든 패키지가 진입 군집(07 원시트 + 00 개요)을 포함 (표준 §0.5 최소 핵심)', () => {
    const bible = buildIpBible(richConfig());
    for (const t of TYPES) {
      const pkg = buildSubmissionPackage(bible, t);
      expect(pkg.includedKeys).toContain('oneSheet');
      expect(pkg.includedKeys).toContain('overview');
    }
  });

  it('PACKAGE_SECTION_MAP 무결성 — 모든 키가 유효한 13섹션 키', () => {
    const valid = new Set(IP_BIBLE_SECTION_KEYS);
    for (const t of TYPES) {
      for (const key of PACKAGE_SECTION_MAP[t]) {
        expect(valid.has(key)).toBe(true);
      }
      // 중복 없음
      expect(new Set(PACKAGE_SECTION_MAP[t]).size).toBe(PACKAGE_SECTION_MAP[t].length);
    }
  });

  it('결말 스포일러 신호 — A(시놉·플롯 포함) true, D(라이선스) false', () => {
    const bible = buildIpBible(richConfig());
    expect(buildSubmissionPackage(bible, 'A').containsEndingSpoiler).toBe(true);
    expect(buildSubmissionPackage(bible, 'B').containsEndingSpoiler).toBe(true);
    expect(buildSubmissionPackage(bible, 'D').containsEndingSpoiler).toBe(false);
  });

  it('빈 바이블 → emptyIncludedCount = 포함 섹션 전부', () => {
    const bible = buildIpBible({});
    for (const t of TYPES) {
      const pkg = buildSubmissionPackage(bible, t);
      expect(pkg.emptyIncludedCount).toBe(pkg.includedKeys.length);
    }
  });

  it('채워진 바이블은 emptyIncludedCount 가 감소한다', () => {
    const bible = buildIpBible(richConfig(), richScores());
    const pkg = buildSubmissionPackage(bible, 'A');
    // A 포함 9섹션 중 plotStructure(자동 추출 불가)만 빈 섹션
    expect(pkg.emptyIncludedCount).toBe(1);
  });

  it('소문자/공백 타입은 정규화, 무효 타입은 RangeError', () => {
    const bible = buildIpBible({});
    expect(buildSubmissionPackage(bible, 'a').type).toBe('A');
    expect(buildSubmissionPackage(bible, ' e ').type).toBe('E');
    expect(() => buildSubmissionPackage(bible, 'F')).toThrow(RangeError);
    expect(() => buildSubmissionPackage(bible, '')).toThrow(RangeError);
    expect(() =>
      buildSubmissionPackage(bible, null as unknown as string),
    ).toThrow(RangeError);
  });

  it('note 에 매핑 추정 한계(confidence 0.6) 고지 포함', () => {
    const bible = buildIpBible({});
    for (const t of TYPES) {
      expect(buildSubmissionPackage(bible, t).note).toContain('confidence 0.6');
    }
  });

  it('손상 바이블(sections 누락)도 크래시 없이 빈 패키지 반환', () => {
    const broken = { workTitle: 'x' } as unknown as ReturnType<typeof buildIpBible>;
    const pkg = buildSubmissionPackage(broken, 'A');
    expect(pkg.sections).toEqual([]);
    expect(pkg.includedKeys).toEqual([]);
    expect(pkg.emptyIncludedCount).toBe(0);
  });
});
