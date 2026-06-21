import type { LoreguardPlanId, CertificateProductId } from '@/lib/billing/loreguard-plans';
import type { MediaIpPackProfileId } from '@/lib/creative/media-ip-pack-profile';
import type { StoryConfig } from '@/lib/studio-types';

// ============================================================
// PART 1 — 창작자 그룹 타입
// ============================================================

export type CreatorSegmentId =
  | 'serialWebNovel'
  | 'contestAuthor'
  | 'selfPublisher'
  | 'screenWriter'
  | 'webtoonStoryWriter'
  | 'gameVisualPlanner'
  | 'globalRightsAuthor'
  | 'studioPublisher';

export interface CreatorSegmentProfile {
  id: CreatorSegmentId;
  labelKo: string;
  descriptionKo: string;
  primaryNeedKo: string;
  recommendedPlanId: LoreguardPlanId;
  upgradePlanId: LoreguardPlanId | null;
  mediaProfiles: readonly MediaIpPackProfileId[];
  certificateProducts: readonly CertificateProductId[];
  requiredProjectInputsKo: readonly string[];
  riskChecksKo: readonly string[];
  packagePitchKo: string;
}

export interface CreatorSegmentRecommendationInput {
  genreMode?: StoryConfig['genreMode'] | null;
  releasePurpose?: StoryConfig['releasePurpose'] | null;
  projectTargetLanguage?: StoryConfig['projectTargetLanguage'] | null;
  targetMarket?: StoryConfig['targetMarket'] | null;
  publishPlatform?: StoryConfig['publishPlatform'] | StoryConfig['platform'] | null;
  totalEpisodes?: number | null;
  rightsStatus?: StoryConfig['rightsStatus'] | null;
}

// ============================================================
// PART 2 — 창작자 그룹 레지스트리
// ============================================================

const SEGMENT_IDS: readonly CreatorSegmentId[] = Object.freeze([
  'serialWebNovel',
  'contestAuthor',
  'selfPublisher',
  'screenWriter',
  'webtoonStoryWriter',
  'gameVisualPlanner',
  'globalRightsAuthor',
  'studioPublisher',
]);

function freezeMediaProfiles(
  values: readonly MediaIpPackProfileId[],
): readonly MediaIpPackProfileId[] {
  return Object.freeze([...values]);
}

function freezeCertificateProducts(
  values: readonly CertificateProductId[],
): readonly CertificateProductId[] {
  return Object.freeze([...values]);
}

export const CREATOR_SEGMENT_PROFILES: Readonly<Record<CreatorSegmentId, CreatorSegmentProfile>> =
  Object.freeze({
    serialWebNovel: {
      id: 'serialWebNovel',
      labelKo: '정기 연재 작가',
      descriptionKo: '주 2~7회 연재하며 회차 단위 과정기록과 출고 준비가 필요한 작가.',
      primaryNeedKo: '회차별 과정기록, 설정 준수 점검, 플랫폼 제출 전 점검.',
      recommendedPlanId: 'starter',
      upgradePlanId: 'studio',
      mediaProfiles: freezeMediaProfiles(['webtoon', 'audioDrama', 'globalTranslation']),
      certificateProducts: freezeCertificateProducts(['episode-basic', 'episode-c2pa', 'complete-basic']),
      requiredProjectInputsKo: Object.freeze([
        '연재 플랫폼',
        '목표 회차',
        '핵심 전제',
        '주요 인물',
        '권리/IP 메모',
      ]),
      riskChecksKo: Object.freeze([
        '동시 연재 작품 간 설정 혼입',
        '플랫폼 선공개 권리 제한',
        '회차별 문체 급변',
        '상표·실존 인물 언급',
      ]),
      packagePitchKo: '회차별 기록을 쌓아 완결 과정기록과 웹툰화 제안 자료로 연결한다.',
    },
    contestAuthor: {
      id: 'contestAuthor',
      labelKo: '공모전 응모 작가',
      descriptionKo: '완성 원고와 제출 참고 자료가 중요한 단편·중편·장편 응모 작가.',
      primaryNeedKo: '완결 과정기록, 권리/IP 점검, 제출용 요약.',
      recommendedPlanId: 'starter',
      upgradePlanId: 'pro',
      mediaProfiles: freezeMediaProfiles(['screen', 'globalTranslation']),
      certificateProducts: freezeCertificateProducts(['complete-basic', 'complete-pro']),
      requiredProjectInputsKo: Object.freeze([
        '공모전명',
        '제출 마감일',
        '분량 기준',
        '창작 기여 메모',
        '외부 참고 자료',
      ]),
      riskChecksKo: Object.freeze([
        '응모 요강의 보조 도구 고지 조건',
        '공동 창작자 또는 자료 제공자 권리',
        '출처 기록 부족',
        '완결본과 제출본 버전 차이',
      ]),
      packagePitchKo: '제출본 기준의 창작 결정과 수정 이력을 묶어 심사 참고 자료로 정리한다.',
    },
    selfPublisher: {
      id: 'selfPublisher',
      labelKo: '자가출판 작가',
      descriptionKo: '전자책·종이책·오디오북까지 직접 출고하는 개인 출판 작가.',
      primaryNeedKo: '출판 메타데이터, 표지·폰트·번역 자산 권리, 완결 출고 패키지.',
      recommendedPlanId: 'studio',
      upgradePlanId: 'pro',
      mediaProfiles: freezeMediaProfiles(['audioDrama', 'globalTranslation', 'goodsBrand']),
      certificateProducts: freezeCertificateProducts(['complete-basic', 'complete-pro', 'publisher-package']),
      requiredProjectInputsKo: Object.freeze([
        '출판 형식',
        '대상 국가',
        '표지·폰트 출처',
        '번역 검수자',
        '판매 채널',
      ]),
      riskChecksKo: Object.freeze([
        '표지·폰트·이미지 상업 이용 범위',
        '번역권과 전자책·종이책 권리 구분',
        '출판 메타데이터 누락',
        'AI 보조 사용 고지 필요 여부',
      ]),
      packagePitchKo: '출판용 메타데이터와 권리/IP 묶음을 함께 정리해 1권 단위 출고를 돕는다.',
    },
    screenWriter: {
      id: 'screenWriter',
      labelKo: '영상 기획 작가',
      descriptionKo: '드라마·영화·OTT 제출을 목표로 로그라인, 트리트먼트, 시즌 구조를 다듬는 작가.',
      primaryNeedKo: '영상화 제안 자료, 시즌 구조, 각색권 범위 정리.',
      recommendedPlanId: 'pro',
      upgradePlanId: 'publisher',
      mediaProfiles: freezeMediaProfiles(['screen', 'audioDrama', 'goodsBrand']),
      certificateProducts: freezeCertificateProducts(['complete-pro', 'publisher-package']),
      requiredProjectInputsKo: Object.freeze([
        '로그라인',
        '시즌 구조',
        '주요 회차 전환점',
        '인물 갈등 구조',
        '각색권 메모',
      ]),
      riskChecksKo: Object.freeze([
        '영상화권 기간·지역·독점 여부',
        '트리트먼트와 대본 개발물 귀속',
        '실존 인물·상표·장소 리스크',
        '결말 포함 자료 전달 범위',
      ]),
      packagePitchKo: '시즌 구조와 장면성을 중심으로 제작사 검토용 권리/IP 묶음을 만든다.',
    },
    webtoonStoryWriter: {
      id: 'webtoonStoryWriter',
      labelKo: '웹툰 스토리 작가',
      descriptionKo: '콘티·대사·장면 지시를 분리해 작화팀과 협업하는 스토리 작가.',
      primaryNeedKo: '웹툰화 권리팩, 캐릭터·키씬·컷 전환 메모, 분업 기록.',
      recommendedPlanId: 'studio',
      upgradePlanId: 'pro',
      mediaProfiles: freezeMediaProfiles(['webtoon', 'goodsBrand']),
      certificateProducts: freezeCertificateProducts(['episode-c2pa', 'complete-pro']),
      requiredProjectInputsKo: Object.freeze([
        '캐릭터 외형',
        '키씬',
        '회차별 컷 전환',
        '작화 협업 범위',
        '콘티 산출물 귀속',
      ]),
      riskChecksKo: Object.freeze([
        '스토리와 작화 산출물 귀속',
        '캐릭터 실루엣·상징색 유사성',
        '플랫폼 독점 연재 조건',
        '썸네일·광고 소재 사용 범위',
      ]),
      packagePitchKo: '스토리 결정과 작화 전달 자료를 분리해 웹툰화 협업 자료로 묶는다.',
    },
    gameVisualPlanner: {
      id: 'gameVisualPlanner',
      labelKo: '게임·비주얼노벨 기획자',
      descriptionKo: '세계관, 캐릭터, 아이템을 반복 플레이와 선택 구조로 확장하려는 기획자.',
      primaryNeedKo: '코어 루프, 캐릭터 로스터, 성장·경제 구조, 아이템 권리표.',
      recommendedPlanId: 'pro',
      upgradePlanId: 'publisher',
      mediaProfiles: freezeMediaProfiles(['gameAnimation', 'goodsBrand']),
      certificateProducts: freezeCertificateProducts(['complete-pro', 'publisher-package']),
      requiredProjectInputsKo: Object.freeze([
        '세계관 규칙',
        '반복 행동',
        '성장/해금 구조',
        '캐릭터 로스터',
        '아이템·스킬 권리',
      ]),
      riskChecksKo: Object.freeze([
        '플레이 규칙과 원작 설정 충돌',
        '캐릭터·아이템 명칭 상표 위험',
        '스킬·시스템 UI의 기존 게임 유사성',
        '음성·OST·DLC·굿즈 권리 분리',
      ]),
      packagePitchKo: '소설의 설정을 플레이 규칙과 자산 목록으로 바꿔 게임·비주얼노벨 제안 자료로 묶는다.',
    },
    globalRightsAuthor: {
      id: 'globalRightsAuthor',
      labelKo: '해외 출고 작가',
      descriptionKo: '번역·현지화·해외 에이전시 제출을 준비하는 작가.',
      primaryNeedKo: '현지화 기준, 용어집, 문화 리스크, 권리 지역 구분.',
      recommendedPlanId: 'studio',
      upgradePlanId: 'pro',
      mediaProfiles: freezeMediaProfiles(['globalTranslation', 'audioDrama', 'screen']),
      certificateProducts: freezeCertificateProducts(['episode-c2pa', 'complete-pro']),
      requiredProjectInputsKo: Object.freeze([
        '대상 언어',
        '대상 국가',
        '고유명사 표기',
        '용어집',
        '문화 리스크 메모',
      ]),
      riskChecksKo: Object.freeze([
        '번역권 지역·언어 범위',
        '현지 제목·표지 승인권',
        '문화권별 민감 표현',
        '사용자가 대상 언어를 모른다는 전제의 검수 요약',
      ]),
      packagePitchKo: '원문·충실판·시장판 차이를 기록하고 해외 제출용 권리/IP 묶음으로 정리한다.',
    },
    studioPublisher: {
      id: 'studioPublisher',
      labelKo: '조직 운영자',
      descriptionKo: '여러 작가와 작품을 그룹 단위로 운영하는 출판사·매니지먼트·제작사.',
      primaryNeedKo: '그룹 워크스페이스, 작품별 출고 현황, 권리/IP 점검 기준 통일.',
      recommendedPlanId: 'publisher',
      upgradePlanId: null,
      mediaProfiles: freezeMediaProfiles(['screen', 'webtoon', 'audioDrama', 'globalTranslation', 'goodsBrand']),
      certificateProducts: freezeCertificateProducts(['publisher-package']),
      requiredProjectInputsKo: Object.freeze([
        '작품 소유자',
        '소속 작가',
        '계약 상태',
        '출고 대상',
        '검토 담당자',
      ]),
      riskChecksKo: Object.freeze([
        '프로젝트별 자료 격리',
        '작품 간 기준선 오염',
        '계약 상태와 권리 범위 불일치',
        '외부 제출 전 승인 누락',
      ]),
      packagePitchKo: '작품별 출고 자료와 권리/IP 점검을 조직 기준으로 통일한다.',
    },
  });

// ============================================================
// PART 3 — 추천 유틸
// ============================================================

function normalizeMarket(value: unknown): string {
  return typeof value === 'string' ? value.trim().toUpperCase() : '';
}

function hasLongSerialShape(input: CreatorSegmentRecommendationInput): boolean {
  const episodes = typeof input.totalEpisodes === 'number' && Number.isFinite(input.totalEpisodes)
    ? input.totalEpisodes
    : 0;
  return episodes >= 30;
}

export function listCreatorSegmentProfiles(): CreatorSegmentProfile[] {
  return SEGMENT_IDS.map((id) => CREATOR_SEGMENT_PROFILES[id]);
}

export function getCreatorSegmentProfile(id: CreatorSegmentId): CreatorSegmentProfile {
  return CREATOR_SEGMENT_PROFILES[id];
}

export function recommendCreatorSegment(
  input: CreatorSegmentRecommendationInput | null | undefined,
): CreatorSegmentProfile {
  const value = input ?? {};
  const targetLanguage = normalizeMarket(value.projectTargetLanguage);
  const targetMarket = normalizeMarket(value.targetMarket);
  const platform = String(value.publishPlatform ?? '').trim().toLowerCase();

  if (value.rightsStatus === 'external_materials' || value.rightsStatus === 'licensed_source') {
    return CREATOR_SEGMENT_PROFILES.studioPublisher;
  }
  if ((targetLanguage && targetLanguage !== 'KO') || (targetMarket && targetMarket !== 'KR')) {
    return CREATOR_SEGMENT_PROFILES.globalRightsAuthor;
  }
  if (value.genreMode === 'game') {
    return CREATOR_SEGMENT_PROFILES.gameVisualPlanner;
  }
  if (value.genreMode === 'drama' || value.releasePurpose === 'ip_pitch') {
    return CREATOR_SEGMENT_PROFILES.screenWriter;
  }
  if (value.genreMode === 'webtoon') {
    return CREATOR_SEGMENT_PROFILES.webtoonStoryWriter;
  }
  if (platform.includes('kdp') || platform.includes('ebook') || platform.includes('전자책')) {
    return CREATOR_SEGMENT_PROFILES.selfPublisher;
  }
  if (value.releasePurpose === 'contest') {
    return CREATOR_SEGMENT_PROFILES.contestAuthor;
  }
  if (hasLongSerialShape(value)) {
    return CREATOR_SEGMENT_PROFILES.serialWebNovel;
  }
  return CREATOR_SEGMENT_PROFILES.contestAuthor;
}
