import {
  IP_BIBLE_SECTION_KEYS,
  PACKAGE_SECTION_MAP,
  type IpBible,
  type IpBibleSectionKey,
  type SubmissionPackage,
  type SubmissionPackageType,
} from '@/lib/creative/ip-bible-builder';
import type { MediaTarget } from '@/lib/creative/spoiler-guard';

// ============================================================
// PART 1 — 타입 정의
// ============================================================

export type MediaIpPackProfileId =
  | 'webtoon'
  | 'screen'
  | 'gameAnimation'
  | 'audioDrama'
  | 'globalTranslation'
  | 'goodsBrand';

export type MediaIpPackStatus = 'ready' | 'review' | 'hold';

export interface MediaIpPackFormGroup {
  titleKo: string;
  purposeKo: string;
  fieldsKo: readonly string[];
}

export interface MediaIpPackFormFieldCompletion {
  labelKo: string;
  filled: boolean;
  sourceKo: string;
}

export interface MediaIpPackFormGroupCompletion {
  titleKo: string;
  purposeKo: string;
  filledCount: number;
  totalCount: number;
  fields: readonly MediaIpPackFormFieldCompletion[];
}

export interface MediaIpPackProfile {
  id: MediaIpPackProfileId;
  labelKo: string;
  shortLabelKo: string;
  packageType: SubmissionPackageType;
  mediaTargets: readonly MediaTarget[];
  audienceKo: string;
  purposeKo: string;
  requiredSections: readonly IpBibleSectionKey[];
  recommendedSections: readonly IpBibleSectionKey[];
  rightsChecklistKo: readonly string[];
  deliverablesKo: readonly string[];
  riskNotesKo: readonly string[];
  formGroupsKo: readonly MediaIpPackFormGroup[];
}

export interface MediaIpPackPlanInput {
  profileId: MediaIpPackProfileId | string;
  bible?: Pick<IpBible, 'sections'> | null;
  submissionPackage?: Pick<SubmissionPackage, 'sections' | 'includedKeys'> | null;
  filledSectionKeys?: readonly IpBibleSectionKey[] | null;
}

export interface MediaIpPackPlan {
  profile: MediaIpPackProfile;
  status: MediaIpPackStatus;
  completionPercent: number;
  filledSections: IpBibleSectionKey[];
  missingRequired: IpBibleSectionKey[];
  missingRecommended: IpBibleSectionKey[];
  packageSections: IpBibleSectionKey[];
  packageAlignmentWarnings: string[];
  summaryKo: string;
}

// ============================================================
// PART 2 — profile registry
// ============================================================

const PROFILE_IDS: readonly MediaIpPackProfileId[] = Object.freeze([
  'webtoon',
  'screen',
  'gameAnimation',
  'audioDrama',
  'globalTranslation',
  'goodsBrand',
]);

function freezeFormGroups(values: readonly MediaIpPackFormGroup[]): readonly MediaIpPackFormGroup[] {
  return Object.freeze(
    values.map((group) =>
      Object.freeze({
        ...group,
        fieldsKo: Object.freeze([...group.fieldsKo]),
      }),
    ),
  );
}

export const MEDIA_IP_PACK_PROFILES: Readonly<Record<MediaIpPackProfileId, MediaIpPackProfile>> =
  Object.freeze({
    webtoon: {
      id: 'webtoon',
      labelKo: '웹툰화 권리팩',
      shortLabelKo: '웹툰',
      packageType: 'C',
      mediaTargets: Object.freeze(['image', 'cover'] as MediaTarget[]),
      audienceKo: '웹툰 제작사, 스튜디오 PD, 콘티·작화팀',
      purposeKo: '장면화 가능성, 캐릭터 식별성, 연재 호흡을 빠르게 검토하게 한다.',
      requiredSections: Object.freeze([
        'oneSheet',
        'overview',
        'keyScenes',
        'characters',
        'visualGuide',
        'episodeGuide',
      ] as IpBibleSectionKey[]),
      recommendedSections: Object.freeze([
        'synopsis',
        'world',
        'glossary',
        'ipExpansion',
      ] as IpBibleSectionKey[]),
      rightsChecklistKo: Object.freeze([
        '캐릭터 외형·의상·상징물의 2차 이용 범위',
        '콘티·작화·채색 산출물의 귀속과 재사용 범위',
        '플랫폼 선공개·독점 연재 여부',
        '표지·썸네일·광고 소재 사용 범위',
      ]),
      deliverablesKo: Object.freeze([
        '원시트와 1화 후킹 요약',
        '주요 인물 외형·관계표',
        '키씬 5~10개와 회차별 컷 전환 메모',
        '비주얼 가이드와 금지 표현 메모',
      ]),
      riskNotesKo: Object.freeze([
        '결말 스포일러 키씬은 1차 제안본에서 분리한다.',
        '기존 작품과 유사한 캐릭터 실루엣·상징색은 별도 점검한다.',
      ]),
      formGroupsKo: freezeFormGroups([
        {
          titleKo: '작품 한눈 요약',
          purposeKo: '웹툰 PD가 30초 안에 장르, 후킹, 연재 호흡을 파악하게 한다.',
          fieldsKo: ['로그라인', '1화 후킹', '목표 독자', '연재 회차', '플랫폼 기준'],
        },
        {
          titleKo: '캐릭터·키씬 전달',
          purposeKo: '작화팀이 바로 콘티와 캐릭터 시안을 잡을 수 있게 한다.',
          fieldsKo: ['주요 인물 외형', '상징색·소품', '관계 구도', '키씬 5~10개', '컷 전환 메모'],
        },
        {
          titleKo: '제작 경계',
          purposeKo: '스토리, 콘티, 작화, 광고 소재의 사용 범위를 분리한다.',
          fieldsKo: ['콘티 귀속', '작화 산출물 귀속', '썸네일 사용 범위', '선공개 조건', '스포일러 공개 시점'],
        },
      ]),
    },
    screen: {
      id: 'screen',
      labelKo: '드라마·OTT·영화 권리팩',
      shortLabelKo: '영상',
      packageType: 'B',
      mediaTargets: Object.freeze(['video', 'image'] as MediaTarget[]),
      audienceKo: '제작사, 투자 검토자, 각색 작가, 연출팀',
      purposeKo: '시즌 구조, 장면성, 인물 갈등, 제작 난도를 한 번에 판단하게 한다.',
      requiredSections: Object.freeze([
        'oneSheet',
        'overview',
        'synopsis',
        'plotStructure',
        'keyScenes',
        'characters',
        'episodeGuide',
      ] as IpBibleSectionKey[]),
      recommendedSections: Object.freeze([
        'themeTone',
        'world',
        'visualGuide',
        'marketPositioning',
        'ipExpansion',
      ] as IpBibleSectionKey[]),
      rightsChecklistKo: Object.freeze([
        '각색권, 영상화권, 시즌 확장권의 기간·지역·독점 여부',
        '원작 표기와 크레딧 위치',
        '파일럿·트리트먼트·대본 개발물의 귀속',
        '캐스팅·홍보 소재에서 원작 요소 사용 범위',
      ]),
      deliverablesKo: Object.freeze([
        '시즌 로그라인과 결말 포함 시놉시스',
        '주요 회차·전환점·클라이맥스 표',
        '핵심 인물 갈등 구조',
        '영상화 난도와 세트·효과 필요 메모',
      ]),
      riskNotesKo: Object.freeze([
        '결말 포함 자료는 수신자와 목적을 남긴 뒤 전달한다.',
        '실존 인물·상표·장소가 핵심 장면에 걸리면 법무 검토 후보로 분리한다.',
      ]),
      formGroupsKo: freezeFormGroups([
        {
          titleKo: '영상 제안 요약',
          purposeKo: '제작사가 로그라인, 시즌성, 장면성을 빠르게 판단하게 한다.',
          fieldsKo: ['시즌 로그라인', '타깃 시청층', '시즌 수', '주요 갈등', '결말 포함 여부'],
        },
        {
          titleKo: '구조·장면 자료',
          purposeKo: '트리트먼트와 파일럿 검토에 필요한 구조를 정리한다.',
          fieldsKo: ['전환점 표', '회차별 핵심 사건', '클라이맥스', '주요 세트', '제작 난도 메모'],
        },
        {
          titleKo: '권리·각색 경계',
          purposeKo: '영상화권과 개발 산출물의 귀속을 거래 전에 분리한다.',
          fieldsKo: ['각색권 기간', '지역 범위', '독점 여부', '크레딧 표기', '트리트먼트 귀속'],
        },
      ]),
    },
    gameAnimation: {
      id: 'gameAnimation',
      labelKo: '게임·애니 권리팩',
      shortLabelKo: '게임·애니',
      packageType: 'D',
      mediaTargets: Object.freeze(['image', 'video', 'audio'] as MediaTarget[]),
      audienceKo: '게임 개발사, 애니메이션 제작사, 캐릭터 사업팀',
      purposeKo: '세계관 룰, 캐릭터 운용, 용어, 반복 플레이·시리즈 확장성을 검토하게 한다.',
      requiredSections: Object.freeze([
        'oneSheet',
        'overview',
        'world',
        'characters',
        'glossary',
        'visualGuide',
        'ipExpansion',
      ] as IpBibleSectionKey[]),
      recommendedSections: Object.freeze([
        'themeTone',
        'keyScenes',
        'episodeGuide',
        'marketPositioning',
      ] as IpBibleSectionKey[]),
      rightsChecklistKo: Object.freeze([
        '캐릭터·아이템·스킬의 게임/애니 변환 이용 범위',
        '음성, OST, 굿즈, DLC, 스핀오프 권리 분리',
        '세계관 설정 추가·변경 승인 절차',
        '원작자 감수 범위와 수정 반영 기준',
      ]),
      deliverablesKo: Object.freeze([
        '세계관 규칙표와 금기 목록',
        '캐릭터·아이템·스킬 자산 목록',
        '용어집과 발음·표기 기준',
        '매체 확장 아이디어와 금지선',
      ]),
      riskNotesKo: Object.freeze([
        '시스템 룰이 모호하면 게임화 기획에서 설정 충돌이 커진다.',
        '캐릭터·아이템 명칭은 상표 후보와 겹치는지 별도 확인한다.',
      ]),
      formGroupsKo: freezeFormGroups([
        {
          titleKo: '세계관 운용 규칙',
          purposeKo: '게임·애니 제작 중 설정이 흔들리지 않게 기준선을 세운다.',
          fieldsKo: ['세계 규칙', '금기', '능력 제한', '진영 관계', '시대·지역 범위'],
        },
        {
          titleKo: '자산 목록',
          purposeKo: '캐릭터, 아이템, 스킬, 적대 세력 같은 반복 운용 자산을 정리한다.',
          fieldsKo: ['플레이어블 후보', '주요 아이템', '스킬 체계', '적대 세력', '성장 단계'],
        },
        {
          titleKo: '확장 경계',
          purposeKo: '추가 콘텐츠, 음성, 음악, 상품, 스핀오프 권리를 분리한다.',
          fieldsKo: ['스핀오프 범위', '음성·음악 권리', '상품화 권리', '감수 범위', '설정 변경 승인 절차'],
        },
      ]),
    },
    audioDrama: {
      id: 'audioDrama',
      labelKo: '오디오북·오디오드라마 권리팩',
      shortLabelKo: '오디오',
      packageType: 'D',
      mediaTargets: Object.freeze(['audio'] as MediaTarget[]),
      audienceKo: '오디오북 제작사, 오디오드라마 제작사, 성우·음향팀',
      purposeKo: '목소리, 대사 호흡, 장면 전환, 음향 연출, 오디오 권리 범위를 검토하게 한다.',
      requiredSections: Object.freeze([
        'oneSheet',
        'overview',
        'characters',
        'glossary',
        'visualGuide',
        'ipExpansion',
      ] as IpBibleSectionKey[]),
      recommendedSections: Object.freeze([
        'synopsis',
        'themeTone',
        'world',
        'keyScenes',
        'episodeGuide',
      ] as IpBibleSectionKey[]),
      rightsChecklistKo: Object.freeze([
        '오디오북·오디오드라마 제작권의 기간·지역·독점 여부',
        '성우 녹음, 음향, 음악 산출물의 귀속',
        '대사 각색, 내레이션 추가, 장면 생략 승인 절차',
        '샘플 낭독·트레일러·홍보 클립 사용 범위',
      ]),
      deliverablesKo: Object.freeze([
        '오디오용 로그라인과 회차 호흡 요약',
        '주요 인물 말투·호칭·감정 흐름 표',
        '키씬 대사와 내레이션 전환 메모',
        '성우·음향·홍보 클립 권리 체크표',
      ]),
      riskNotesKo: Object.freeze([
        '성우·음향 산출물은 원작 권리와 별도 계약으로 분리한다.',
        '대사 압축이나 장면 생략은 작가 승인 기록을 남긴다.',
      ]),
      formGroupsKo: freezeFormGroups([
        {
          titleKo: '음성화 기본 정보',
          purposeKo: '제작자가 형식, 길이, 청취층, 판매 채널을 빠르게 판단하게 한다.',
          fieldsKo: ['대상 형식', '회차 길이', '내레이션 비중', '주요 청취층', '연재·판매 채널'],
        },
        {
          titleKo: '캐릭터 음성 기준',
          purposeKo: '성우와 연출팀이 인물의 말투, 호칭, 감정 흐름을 흔들리지 않게 잡는다.',
          fieldsKo: ['주요 인물 말투', '호칭 기준', '감정 흐름', '대사 밀도', '발음·표기 기준'],
        },
        {
          titleKo: '음향·권리 경계',
          purposeKo: '녹음, 음악, 효과음, 홍보 클립, 각색 승인 범위를 계약 전에 분리한다.',
          fieldsKo: ['성우 녹음 권리', '음향·음악 사용 범위', '효과음 권리', '홍보 클립 범위', '각색 승인 절차'],
        },
      ]),
    },
    globalTranslation: {
      id: 'globalTranslation',
      labelKo: '해외·번역 권리팩',
      shortLabelKo: '해외',
      packageType: 'E',
      mediaTargets: Object.freeze(['image'] as MediaTarget[]),
      audienceKo: '해외 에이전시, 번역 출판사, 현지 플랫폼 담당자',
      purposeKo: '현지화 가능성, 보편 정서, 문화 리스크, 번역 기준을 검토하게 한다.',
      requiredSections: Object.freeze([
        'oneSheet',
        'overview',
        'synopsis',
        'themeTone',
        'marketPositioning',
        'ipExpansion',
      ] as IpBibleSectionKey[]),
      recommendedSections: Object.freeze([
        'world',
        'characters',
        'glossary',
        'episodeGuide',
      ] as IpBibleSectionKey[]),
      rightsChecklistKo: Object.freeze([
        '언어권·지역별 번역권과 전자책/오디오/종이책 범위',
        '현지 제목·표지·홍보 문구 승인권',
        '문화권별 민감 표현 수정 기준',
        '역번역 검토와 용어집 유지 책임',
      ]),
      deliverablesKo: Object.freeze([
        '현지화용 작품 소개서',
        '핵심 정서와 장르 관습 설명',
        '용어집 초안과 고유명사 표기 원칙',
        '문화 리스크·수정 가능 범위 메모',
      ]),
      riskNotesKo: Object.freeze([
        '사용자는 대상 언어를 모른다는 전제로 한국어 위험 요약을 함께 제공한다.',
        '번역본 공개 전 원문 보존·충실판·시장판 비교 기록을 남긴다.',
      ]),
      formGroupsKo: freezeFormGroups([
        {
          titleKo: '현지화 기본 정보',
          purposeKo: '대상 언어를 모르는 작가도 제출 범위와 검수 기준을 이해하게 한다.',
          fieldsKo: ['대상 국가', '대상 언어', '현지 플랫폼', '현지 제목 후보', '독자층'],
        },
        {
          titleKo: '번역 기준',
          purposeKo: '충실판과 시장판의 차이를 기록해 오역과 어색한 표현을 줄인다.',
          fieldsKo: ['용어집', '고유명사 표기', '말투 기준', '문화권 민감 표현', '역번역 확인 메모'],
        },
        {
          titleKo: '권리 지역',
          purposeKo: '언어권, 지역, 전자책, 종이책, 오디오 권리를 분리한다.',
          fieldsKo: ['언어권 범위', '지역 범위', '전자책 권리', '오디오 권리', '표지·홍보 승인권'],
        },
      ]),
    },
    goodsBrand: {
      id: 'goodsBrand',
      labelKo: '굿즈·브랜드 권리팩',
      shortLabelKo: '굿즈',
      packageType: 'D',
      mediaTargets: Object.freeze(['cover', 'image'] as MediaTarget[]),
      audienceKo: '굿즈 제작사, 브랜드 협업 담당자, 라이선싱 에이전시',
      purposeKo: '캐릭터·상징물·문구가 상품으로 쓰일 수 있는지 검토하게 한다.',
      requiredSections: Object.freeze([
        'oneSheet',
        'overview',
        'characters',
        'glossary',
        'visualGuide',
        'ipExpansion',
      ] as IpBibleSectionKey[]),
      recommendedSections: Object.freeze([
        'world',
        'themeTone',
        'marketPositioning',
      ] as IpBibleSectionKey[]),
      rightsChecklistKo: Object.freeze([
        '캐릭터명, 로고, 문장, 상징물의 상품화 범위',
        '카테고리별 독점 여부와 최소 보장금',
        '샘플 승인·품질 관리·폐기 기준',
        '2차 판매, 해외 판매, 재고 처리 조건',
      ]),
      deliverablesKo: Object.freeze([
        '캐릭터·상징물 사용 가이드',
        '상품화 가능한 문구·아이템 목록',
        '금지 조합과 브랜드 훼손 위험 메모',
        '라이선스 범위 요약표',
      ]),
      riskNotesKo: Object.freeze([
        '고유 문구·심볼은 상표 등록 가능성과 타 상표 충돌을 분리 점검한다.',
        '스포일러가 되는 굿즈는 공개 시점과 판매 시점을 따로 둔다.',
      ]),
      formGroupsKo: freezeFormGroups([
        {
          titleKo: '상품화 가능 요소',
          purposeKo: '굿즈 제작자가 바로 쓸 수 있는 캐릭터, 문구, 상징물을 고른다.',
          fieldsKo: ['캐릭터명', '상징 문구', '소품', '로고·문양', '반복 노출 장면'],
        },
        {
          titleKo: '브랜드 사용 기준',
          purposeKo: '상품 품질과 작품 이미지를 해치지 않도록 금지선을 둔다.',
          fieldsKo: ['허용 상품군', '금지 상품군', '색상 기준', '문구 조합', '샘플 승인 절차'],
        },
        {
          titleKo: '라이선스 조건',
          purposeKo: '카테고리 독점, 판매 지역, 재고 처리, 최소 보장금을 분리한다.',
          fieldsKo: ['카테고리 독점', '판매 지역', '계약 기간', '최소 보장금', '재고 처리 조건'],
        },
      ]),
    },
  });

// ============================================================
// PART 3 — plan builder
// ============================================================

function normalizeProfileId(raw: MediaIpPackProfileId | string): MediaIpPackProfileId {
  const key = String(raw).trim();
  if ((PROFILE_IDS as readonly string[]).includes(key)) {
    return key as MediaIpPackProfileId;
  }
  return 'webtoon';
}

function canonicalKeys(keys: readonly IpBibleSectionKey[]): IpBibleSectionKey[] {
  const keySet = new Set(keys);
  return IP_BIBLE_SECTION_KEYS.filter((key) => keySet.has(key));
}

function readFilledSectionKeys(input: MediaIpPackPlanInput): IpBibleSectionKey[] {
  if (Array.isArray(input.filledSectionKeys)) {
    return canonicalKeys(input.filledSectionKeys);
  }

  if (input.bible?.sections) {
    return IP_BIBLE_SECTION_KEYS.filter((key) => input.bible?.sections[key]?.filled === true);
  }

  if (input.submissionPackage?.sections) {
    return canonicalKeys(
      input.submissionPackage.sections
        .filter((section) => section.filled)
        .map((section) => section.key),
    );
  }

  return [];
}

function diffKeys(
  wanted: readonly IpBibleSectionKey[],
  filledSet: ReadonlySet<IpBibleSectionKey>,
): IpBibleSectionKey[] {
  return canonicalKeys(wanted).filter((key) => !filledSet.has(key));
}

function buildPackageAlignmentWarnings(profile: MediaIpPackProfile): string[] {
  const packageSectionSet = new Set(PACKAGE_SECTION_MAP[profile.packageType]);
  const missingInBasePackage = profile.requiredSections.filter((key) => !packageSectionSet.has(key));
  if (missingInBasePackage.length === 0) {
    return [];
  }

  return [
    `${profile.labelKo} 필수 섹션 중 기존 ${profile.packageType} 패키지에 없는 항목: ${missingInBasePackage.join(', ')}`,
  ];
}

function completionPercent(
  profile: MediaIpPackProfile,
  missingRequired: readonly IpBibleSectionKey[],
  missingRecommended: readonly IpBibleSectionKey[],
): number {
  const requiredWeight = profile.requiredSections.length * 2;
  const recommendedWeight = profile.recommendedSections.length;
  const totalWeight = requiredWeight + recommendedWeight;
  if (totalWeight <= 0) {
    return 0;
  }

  const missingWeight = missingRequired.length * 2 + missingRecommended.length;
  return Math.max(0, Math.min(100, Math.round(((totalWeight - missingWeight) / totalWeight) * 100)));
}

export function listMediaIpPackProfiles(): MediaIpPackProfile[] {
  return PROFILE_IDS.map((id) => MEDIA_IP_PACK_PROFILES[id]);
}

export function getMediaIpPackProfile(
  profileId: MediaIpPackProfileId | string,
): MediaIpPackProfile {
  return MEDIA_IP_PACK_PROFILES[normalizeProfileId(profileId)];
}

export function buildMediaIpPackPlan(input: MediaIpPackPlanInput): MediaIpPackPlan {
  const profile = getMediaIpPackProfile(input.profileId);
  const filledSections = readFilledSectionKeys(input);
  const filledSet = new Set(filledSections);
  const missingRequired = diffKeys(profile.requiredSections, filledSet);
  const missingRecommended = diffKeys(profile.recommendedSections, filledSet);
  const status: MediaIpPackStatus =
    missingRequired.length > 0 ? 'hold' : missingRecommended.length > 0 ? 'review' : 'ready';
  const packageSections = canonicalKeys(PACKAGE_SECTION_MAP[profile.packageType]);

  return {
    profile,
    status,
    completionPercent: completionPercent(profile, missingRequired, missingRecommended),
    filledSections,
    missingRequired,
    missingRecommended,
    packageSections,
    packageAlignmentWarnings: buildPackageAlignmentWarnings(profile),
    summaryKo:
      status === 'ready'
        ? `${profile.labelKo} 1차 제안 준비가 끝났습니다.`
        : status === 'review'
          ? `${profile.labelKo} 필수 항목은 채워졌고 권장 항목 보강이 남았습니다.`
          : `${profile.labelKo} 필수 항목이 부족해 제안 전 보강이 필요합니다.`,
  };
}
