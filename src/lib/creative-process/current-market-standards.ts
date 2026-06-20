// ============================================================
// Current Market Standards Registry — 2026-06 snapshot
// ============================================================
//
// This registry is intentionally dated. Platform rules, contest terms,
// font licenses, and trademark search tools change, so release flows must
// treat these values as a current checklist, not permanent truth.
// ============================================================

export type MarketStandardId =
  | 'kr-webnovel-serial'
  | 'global-wattpad-serial'
  | 'us-kdp-ebook'
  | 'webtoon-canvas'
  | 'jp-light-novel'
  | 'cn-webnovel-serial';

export type TextUnit = 'chars-no-spaces' | 'chars' | 'words' | 'panels' | 'pages' | 'not-fixed';
export type StandardEvidenceLevel = 'official-rule' | 'official-formatting' | 'market-average' | 'manual-review';
export type SourceCategory = 'platform' | 'trademark' | 'font' | 'law-policy' | 'industry-reference';
export type RegionId = 'KR' | 'US' | 'EU' | 'JP' | 'CN' | 'GLOBAL';

export interface DatedSourceReference {
  titleKo: string;
  url: string;
  category: SourceCategory;
  checkedAt: string;
  noteKo: string;
}

export interface EpisodeLengthTarget {
  unit: TextUnit;
  min: number | null;
  recommendedMin: number | null;
  recommendedMax: number | null;
  hardMax: number | null;
  noteKo: string;
  hardRule: boolean;
}

export interface MarketStandardProfile {
  id: MarketStandardId;
  labelKo: string;
  region: RegionId;
  languageKo: string;
  checkedAt: string;
  expiresAt: string;
  evidenceLevel: StandardEvidenceLevel;
  lengthTarget: EpisodeLengthTarget;
  requiredReleaseChecksKo: readonly string[];
  sourceReferences: readonly DatedSourceReference[];
  cautionKo: string;
}

export interface TrademarkSearchProfile {
  region: RegionId;
  labelKo: string;
  officialSearchName: string;
  url: string;
  checkedAt: string;
  requiredQueryKo: readonly string[];
}

export interface FontLicenseProfile {
  id: string;
  labelKo: string;
  providerKo: string;
  licenseKo: string;
  url: string;
  checkedAt: string;
  releaseCheckKo: readonly string[];
}

export interface StandardsAuditResult {
  asOf: string;
  staleMarketStandardIds: MarketStandardId[];
  staleSourceUrls: string[];
  ready: boolean;
}

export const CURRENT_MARKET_STANDARDS_CHECKED_AT = '2026-06-13';
export const CURRENT_MARKET_STANDARDS_EXPIRES_AT = '2026-07-13';

function source(
  titleKo: string,
  url: string,
  category: SourceCategory,
  noteKo: string,
): DatedSourceReference {
  return { titleKo, url, category, checkedAt: CURRENT_MARKET_STANDARDS_CHECKED_AT, noteKo };
}

function lengthTarget(input: EpisodeLengthTarget): EpisodeLengthTarget {
  return input;
}

export const CURRENT_MARKET_STANDARDS: Readonly<Record<MarketStandardId, MarketStandardProfile>> =
  Object.freeze({
    'kr-webnovel-serial': {
      id: 'kr-webnovel-serial',
      labelKo: '한국 웹소설 연재 평균',
      region: 'KR',
      languageKo: '한국어',
      checkedAt: CURRENT_MARKET_STANDARDS_CHECKED_AT,
      expiresAt: CURRENT_MARKET_STANDARDS_EXPIRES_AT,
      evidenceLevel: 'market-average',
      lengthTarget: lengthTarget({
        unit: 'chars-no-spaces',
        min: 4_500,
        recommendedMin: 5_500,
        recommendedMax: 7_000,
        hardMax: 8_000,
        hardRule: false,
        noteKo: '국내 웹소설 회차 작업 기본값이다. 플랫폼별 계약·공모 요강이 있으면 그 문서를 우선한다.',
      }),
      requiredReleaseChecksKo: Object.freeze([
        '플랫폼별 최신 약관과 공모 요강 재확인',
        '회차 제목, 작품 소개, 키워드, 연령 등급 분리',
        '원고 글자 수와 공백 제외 글자 수 동시 표시',
      ]),
      sourceReferences: Object.freeze([
        source(
          'K-Book Trends — 한국 웹소설 플랫폼 개요',
          'https://www.kbook-eng.or.kr/sub/trend.php?code=trend&idx=1019&page=%24page&ptype=view',
          'industry-reference',
          '국내 주요 플랫폼 지형 참고. 회차 글자 수 규칙은 플랫폼별 최신 공지 확인 필요.',
        ),
      ]),
      cautionKo: '자수 기준은 계약·공모·플랫폼 정책에 따라 달라질 수 있으므로 출고 직전 재확인한다.',
    },
    'global-wattpad-serial': {
      id: 'global-wattpad-serial',
      labelKo: 'Wattpad형 영어 연재 평균',
      region: 'GLOBAL',
      languageKo: '영어',
      checkedAt: CURRENT_MARKET_STANDARDS_CHECKED_AT,
      expiresAt: CURRENT_MARKET_STANDARDS_EXPIRES_AT,
      evidenceLevel: 'market-average',
      lengthTarget: lengthTarget({
        unit: 'words',
        min: 1_000,
        recommendedMin: 1_500,
        recommendedMax: 3_000,
        hardMax: 5_000,
        hardRule: false,
        noteKo: '모바일 연재 가독성용 평균값이다. 공식 하드 룰로 취급하지 않는다.',
      }),
      requiredReleaseChecksKo: Object.freeze([
        '파트 제목, 태그, 성숙도 표시 확인',
        '영어권 독자용 문단 길이와 대사 밀도 점검',
        '플랫폼 커뮤니티 가이드라인 최신 확인',
      ]),
      sourceReferences: Object.freeze([
        source(
          'Wattpad Policies and Safety',
          'https://policies.wattpad.com/',
          'platform',
          '콘텐츠·안전 정책 확인용. 회차 단어 수는 시장 평균으로만 사용.',
        ),
      ]),
      cautionKo: '단어 수는 작품 장르와 독자층에 따라 크게 달라진다.',
    },
    'us-kdp-ebook': {
      id: 'us-kdp-ebook',
      labelKo: 'Amazon KDP 전자책/종이책 출고',
      region: 'US',
      languageKo: '영어',
      checkedAt: CURRENT_MARKET_STANDARDS_CHECKED_AT,
      expiresAt: CURRENT_MARKET_STANDARDS_EXPIRES_AT,
      evidenceLevel: 'official-formatting',
      lengthTarget: lengthTarget({
        unit: 'not-fixed',
        min: null,
        recommendedMin: null,
        recommendedMax: null,
        hardMax: null,
        hardRule: false,
        noteKo: 'KDP는 회차형 자수보다 파일 형식, 판형, 가독성, 메타데이터 확인이 중심이다.',
      }),
      requiredReleaseChecksKo: Object.freeze([
        'DOCX/EPUB/PDF 형식과 목차 확인',
        '본문 가독성, 잘림, 겹침, 폰트 임베딩 확인',
        '제목·저자명·시리즈명·권리 지역 메타데이터 확인',
      ]),
      sourceReferences: Object.freeze([
        source(
          'Amazon KDP — eBook Manuscript Formatting Guide',
          'https://kdp.amazon.com/help?topicId=G200645680',
          'platform',
          '전자책 원고 포맷 준비 공식 도움말.',
        ),
        source(
          'Amazon KDP — Paperback Submission Guidelines',
          'https://kdp.amazon.com/help/topic/G201857950',
          'platform',
          '종이책 제출과 파일 가이드 확인용.',
        ),
      ]),
      cautionKo: 'KDP 출고는 회차 수보다 책 단위 패키징·메타데이터·권리 지역 확인이 우선이다.',
    },
    'webtoon-canvas': {
      id: 'webtoon-canvas',
      labelKo: 'WEBTOON CANVAS/웹툰 피칭',
      region: 'GLOBAL',
      languageKo: '영어/현지어',
      checkedAt: CURRENT_MARKET_STANDARDS_CHECKED_AT,
      expiresAt: CURRENT_MARKET_STANDARDS_EXPIRES_AT,
      evidenceLevel: 'official-rule',
      lengthTarget: lengthTarget({
        unit: 'panels',
        min: 15,
        recommendedMin: 40,
        recommendedMax: 70,
        hardMax: null,
        hardRule: false,
        noteKo: '공모/카테고리별 최소 컷 수가 다를 수 있다. 일반 웹툰 피칭은 컷 수와 에피소드 수를 따로 본다.',
      }),
      requiredReleaseChecksKo: Object.freeze([
        '컬러 여부와 컷 수 기준 확인',
        '세로 스크롤 호흡, 썸네일, 표지, 1화 후킹 분리',
        '웹툰화 권리팩의 키씬·캐릭터 외형·시각 금지선 확인',
      ]),
      sourceReferences: Object.freeze([
        source(
          'WEBTOON CANVAS — Creators 101',
          'https://www.webtoons.com/en/creators101/webtoon-canvas',
          'platform',
          'CANVAS 게시 흐름과 창작자 페이지 공식 안내.',
        ),
        source(
          'WEBTOON Contest FAQ — episode and panel minimum examples',
          'https://www.webtoons.com/en/notice/detail?noticeNo=3320',
          'platform',
          '카테고리별 에피소드/컷 수 요구 예시. 상시 규칙이 아니라 공모별 확인 필요.',
        ),
      ]),
      cautionKo: '웹툰은 글자 수보다 컷 수, 화면 호흡, 키씬 시각화 가능성이 더 중요하다.',
    },
    'jp-light-novel': {
      id: 'jp-light-novel',
      labelKo: '일본 라이트노벨/문예 제출 평균',
      region: 'JP',
      languageKo: '일본어',
      checkedAt: CURRENT_MARKET_STANDARDS_CHECKED_AT,
      expiresAt: CURRENT_MARKET_STANDARDS_EXPIRES_AT,
      evidenceLevel: 'manual-review',
      lengthTarget: lengthTarget({
        unit: 'chars',
        min: null,
        recommendedMin: null,
        recommendedMax: null,
        hardMax: null,
        hardRule: false,
        noteKo: '일본 공모·출판 제출은 원고지 매수/문자 수 기준이 공모별로 달라 앱 기본값을 고정하지 않는다.',
      }),
      requiredReleaseChecksKo: Object.freeze([
        '공모·출판사별 원고지 매수/문자 수 최신 확인',
        '후리가나, 고유명사 표기, 금칙 처리 확인',
        '유사성·의거성 메모와 참고작 접근 가능성 분리',
      ]),
      sourceReferences: Object.freeze([
        source(
          '文化庁 — AIと著作権について',
          'https://www.bunka.go.jp/seisaku/chosakuken/aiandcopyright.html',
          'law-policy',
          '저작권/도구 활용 관련 일본 공식 자료 확인용.',
        ),
      ]),
      cautionKo: '일본 제출은 공모별 양식 차이가 커서 수동 재확인이 기본이다.',
    },
    'cn-webnovel-serial': {
      id: 'cn-webnovel-serial',
      labelKo: '중국 웹소설 연재 평균',
      region: 'CN',
      languageKo: '중국어 간체',
      checkedAt: CURRENT_MARKET_STANDARDS_CHECKED_AT,
      expiresAt: CURRENT_MARKET_STANDARDS_EXPIRES_AT,
      evidenceLevel: 'market-average',
      lengthTarget: lengthTarget({
        unit: 'chars',
        min: 2_000,
        recommendedMin: 2_000,
        recommendedMax: 4_000,
        hardMax: 6_000,
        hardRule: false,
        noteKo: '중국어 회차형 연재의 평균 작업 기준이다. 플랫폼별 심사와 표식 요구가 우선한다.',
      }),
      requiredReleaseChecksKo: Object.freeze([
        '중국 내 공개 서비스 제공 여부 확인',
        '생성합성 콘텐츠 표시 필요 여부 확인',
        '플랫폼별 금지 소재·연령·검열 리스크 확인',
      ]),
      sourceReferences: Object.freeze([
        source(
          '中央网信办 — 人工智能生成合成内容标识办法',
          'https://www.cac.gov.cn/2025-03/14/c_1743654684782215.htm',
          'law-policy',
          '중국 생성합성 콘텐츠 표식 규정 확인용.',
        ),
      ]),
      cautionKo: '중국 출고는 글자 수보다 공개 서비스 범위와 표식·플랫폼 심사 기준이 우선이다.',
    },
  });

export const TRADEMARK_SEARCH_PROFILES: readonly TrademarkSearchProfile[] = Object.freeze([
  {
    region: 'KR',
    labelKo: '한국 상표 검색',
    officialSearchName: 'KIPRIS',
    url: 'https://www.kipris.or.kr/khome/search/searchResult.do?tab=trademark',
    checkedAt: CURRENT_MARKET_STANDARDS_CHECKED_AT,
    requiredQueryKo: Object.freeze(['작품명', '시리즈명', '캐릭터명', '로고/심볼명']),
  },
  {
    region: 'US',
    labelKo: '미국 상표 검색',
    officialSearchName: 'USPTO Trademark Search',
    url: 'https://tmsearch.uspto.gov/',
    checkedAt: CURRENT_MARKET_STANDARDS_CHECKED_AT,
    requiredQueryKo: Object.freeze(['영문 제목', '영문 시리즈명', '주요 캐릭터명']),
  },
  {
    region: 'EU',
    labelKo: 'EU 상표 검색',
    officialSearchName: 'EUIPO TMview',
    url: 'https://www.euipo.europa.eu/en/trade-marks/before-applying/availability',
    checkedAt: CURRENT_MARKET_STANDARDS_CHECKED_AT,
    requiredQueryKo: Object.freeze(['영문 제목', '현지화 제목', '로고/심볼명']),
  },
  {
    region: 'JP',
    labelKo: '일본 상표 검색',
    officialSearchName: 'J-PlatPat',
    url: 'https://www.jpo.go.jp/e/support/j_platpat/trademark_search.html',
    checkedAt: CURRENT_MARKET_STANDARDS_CHECKED_AT,
    requiredQueryKo: Object.freeze(['일본어 제목', '가타카나 표기', '캐릭터명']),
  },
]);

export const FONT_LICENSE_PROFILES: readonly FontLicenseProfile[] = Object.freeze([
  {
    id: 'google-fonts',
    labelKo: 'Google Fonts',
    providerKo: 'Google',
    licenseKo: 'SIL OFL, Apache, Ubuntu 등 개별 폰트 라이선스 확인',
    url: 'https://developers.google.com/fonts/faq',
    checkedAt: CURRENT_MARKET_STANDARDS_CHECKED_AT,
    releaseCheckKo: Object.freeze(['개별 폰트 라이선스 링크 저장', 'PDF/EPUB 임베딩 가능 여부 확인']),
  },
  {
    id: 'naver-nanum',
    labelKo: '네이버 나눔 글꼴',
    providerKo: 'NAVER',
    licenseKo: '네이버 한글한글 아름답게 글꼴 라이선스 확인',
    url: 'https://hangeul.naver.com/font',
    checkedAt: CURRENT_MARKET_STANDARDS_CHECKED_AT,
    releaseCheckKo: Object.freeze(['폰트 자체 유료 판매 금지 조건 확인', '저작권 고지 포함 여부 확인']),
  },
  {
    id: 'pretendard',
    labelKo: 'Pretendard',
    providerKo: 'orioncactus',
    licenseKo: 'SIL Open Font License 1.1',
    url: 'https://github.com/orioncactus/pretendard/blob/main/LICENSE',
    checkedAt: CURRENT_MARKET_STANDARDS_CHECKED_AT,
    releaseCheckKo: Object.freeze(['OFL 고지 보존', '변형 폰트명 사용 시 reserved name 확인']),
  },
  {
    id: 'adobe-fonts',
    labelKo: 'Adobe Fonts',
    providerKo: 'Adobe',
    licenseKo: 'Adobe Fonts 이용 조건 확인',
    url: 'https://helpx.adobe.com/fonts/using/font-licensing.html',
    checkedAt: CURRENT_MARKET_STANDARDS_CHECKED_AT,
    releaseCheckKo: Object.freeze(['Creative Cloud 계정/프로젝트 사용 범위 확인', '클라이언트 편집·웹 임베딩 조건 확인']),
  },
]);

export function listCurrentMarketStandards(): MarketStandardProfile[] {
  return Object.values(CURRENT_MARKET_STANDARDS);
}

export function getCurrentMarketStandard(id: MarketStandardId | string): MarketStandardProfile {
  if (id in CURRENT_MARKET_STANDARDS) {
    return CURRENT_MARKET_STANDARDS[id as MarketStandardId];
  }
  return CURRENT_MARKET_STANDARDS['kr-webnovel-serial'];
}

function isAfterIsoDay(left: string, right: string): boolean {
  return Date.parse(left) > Date.parse(right);
}

export function isMarketStandardStale(
  profile: Pick<MarketStandardProfile, 'expiresAt'>,
  asOf = new Date().toISOString().slice(0, 10),
): boolean {
  return isAfterIsoDay(asOf, profile.expiresAt);
}

export function buildCurrentStandardsAudit(
  asOf = new Date().toISOString().slice(0, 10),
): StandardsAuditResult {
  const staleMarketStandardIds = listCurrentMarketStandards()
    .filter((profile) => isMarketStandardStale(profile, asOf))
    .map((profile) => profile.id);
  const sourceUrls = [
    ...listCurrentMarketStandards().flatMap((profile) => profile.sourceReferences.map((item) => item.url)),
    ...TRADEMARK_SEARCH_PROFILES.map((item) => item.url),
    ...FONT_LICENSE_PROFILES.map((item) => item.url),
  ];

  return {
    asOf,
    staleMarketStandardIds,
    staleSourceUrls: staleMarketStandardIds.length > 0 ? [...new Set(sourceUrls)].sort() : [],
    ready: staleMarketStandardIds.length === 0,
  };
}

// IDENTITY_SEAL: current-market-standards | role=dated release standards registry | inputs=market/date | outputs=length/font/trademark/checklist readiness
