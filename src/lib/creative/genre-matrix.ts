// ============================================================
// genre-matrix — 창작 지침 02_장르 (장르 자동 활성 chg_135) 흡수
// 한국 웹소설 15개 장르를 enum + 프로필로 정의하고,
// 장르별 (1) 템포 (2) 클리셰 풀 (3) 훅 유형 (4) 추천 독자 페르소나
// (5) 점검 체크리스트를 단일 매트릭스로 제공한다.
// 순수 TS. React/DOM/fetch 의존 0. 절대금지 8파일 import 0. 신규 모듈 상호 import 0.
// ============================================================

// ============================================================
// PART 1 — 타입 정의 (장르 enum · 템포 · 프로필 인터페이스)
// ============================================================

/**
 * 한국 웹소설 15개 핵심 장르.
 * 문자열 enum — 직렬화/로깅 시 가독성 보장, 비교 안전.
 */
export enum GENRES {
  /** 헌터물 — 게이트·각성·랭킹 시스템 */
  HUNTER = 'hunter',
  /** 회귀물 — 과거 회귀 후 미래 정보로 역전 */
  REGRESSION = 'regression',
  /** 로맨스 판타지 — 이세계/귀족 사회 + 로맨스 */
  ROMANCE_FANTASY = 'romance-fantasy',
  /** 무협 — 강호·문파·내공 */
  MARTIAL_ARTS = 'martial-arts',
  /** 정통 판타지 — 검과 마법의 이세계 */
  FANTASY = 'fantasy',
  /** SF — 미래·우주·기술 */
  SF = 'sf',
  /** 현대 로맨스 — 현실 배경 연애 */
  ROMANCE = 'romance',
  /** 현대 판타지 — 현실 + 초능력/이능 */
  MODERN_FANTASY = 'modern-fantasy',
  /** 선협 — 수선·등선·동방 신화 */
  XIANXIA = 'xianxia',
  /** 전문직 — 의사·변호사·요리사 등 직업 전문성 */
  PROFESSIONAL = 'professional',
  /** 재벌물 — 재벌가·상속·경영 암투 */
  CHAEBOL = 'chaebol',
  /** 아카데미물 — 학원·성장·랭킹 */
  ACADEMY = 'academy',
  /** 빙의물 — 소설/게임 속 인물에 빙의 */
  POSSESSION = 'possession',
  /** 게임 판타지 — 가상현실 게임 시스템 */
  GAME_FANTASY = 'game-fantasy',
  /** 일반 — 특정 장르 클리셰에 묶이지 않는 보편 서사 */
  GENERAL = 'general',
}

/** 서사 템포: 빠름(사건 밀집) / 중간 / 느림(분위기·내면). */
export type Tempo = 'fast' | 'mid' | 'slow';

/**
 * 장르 프로필 — 한 장르의 집필 지침 단위.
 */
export interface GenreProfile {
  /** 장르 식별자 (GENRES 값). */
  id: GENRES;
  /** 한국어 표기 라벨. */
  label: string;
  /** 전개 템포. */
  tempo: Tempo;
  /** 장르 관습(클리셰) 풀 — 활용/회피 판단 소스. */
  clichePool: string[];
  /** 도입/회차 말미 훅 유형. */
  hookTypes: string[];
}

// ============================================================
// PART 2 — GENRE_PROFILES 매핑 (15 장르 × 프로필)
// ============================================================

/**
 * 15개 장르 프로필 매핑.
 * 각 장르의 clichePool/hookTypes 는 한국 웹소설 시장 관습 기반.
 * Readonly + freeze 로 런타임 변조 차단(불변 데이터).
 */
export const GENRE_PROFILES: Readonly<Record<GENRES, GenreProfile>> = Object.freeze({
  [GENRES.HUNTER]: {
    id: GENRES.HUNTER,
    label: '헌터물',
    tempo: 'fast',
    clichePool: ['약자 각성', '히든 클래스', '게이트 브레이크', '랭킹 역전', '레이드 전멸 위기'],
    hookTypes: ['각성 순간', '랭킹 공개', '보스 등장', '시스템 메시지'],
  },
  [GENRES.REGRESSION]: {
    id: GENRES.REGRESSION,
    label: '회귀물',
    tempo: 'fast',
    clichePool: ['죽음 직전 회귀', '미래 정보 선점', '원수 응징', '망한 가문 재건', '예언된 파국 회피'],
    hookTypes: ['회귀 자각', '미래 사건 예고', '복수 선언', '바뀐 분기점'],
  },
  [GENRES.ROMANCE_FANTASY]: {
    id: GENRES.ROMANCE_FANTASY,
    label: '로맨스 판타지',
    tempo: 'mid',
    clichePool: ['악역 영애 빙의', '계약 결혼', '냉미남 공략', '파혼 후 성장', '숨겨진 신분'],
    hookTypes: ['첫 만남 긴장', '오해 발생', '관계 진전', '정체 폭로'],
  },
  [GENRES.MARTIAL_ARTS]: {
    id: GENRES.MARTIAL_ARTS,
    label: '무협',
    tempo: 'mid',
    clichePool: ['기연 습득', '문파 멸문', '복수혈전', '정사대전', '천하제일 도전'],
    hookTypes: ['비무 대결', '기연 발견', '원한 각성', '고수 등장'],
  },
  [GENRES.FANTASY]: {
    id: GENRES.FANTASY,
    label: '판타지',
    tempo: 'mid',
    clichePool: ['소환된 용사', '마왕 토벌', '숨겨진 혈통', '고대 유물', '종족 갈등'],
    hookTypes: ['세계 위기 제시', '능력 각성', '운명적 만남', '강적 등장'],
  },
  [GENRES.SF]: {
    id: GENRES.SF,
    label: 'SF',
    tempo: 'mid',
    clichePool: ['디스토피아 통제', 'AI 반란', '시간 역설', '우주 식민', '기억 조작'],
    hookTypes: ['기술적 미스터리', '세계관 충격', '윤리 딜레마', '재난 카운트다운'],
  },
  [GENRES.ROMANCE]: {
    id: GENRES.ROMANCE,
    label: '현대 로맨스',
    tempo: 'slow',
    clichePool: ['운명적 재회', '신분 차이', '삼각관계', '오피스 로맨스', '첫사랑 회귀'],
    hookTypes: ['감정선 교차', '고백 직전', '질투 유발', '이별 위기'],
  },
  [GENRES.MODERN_FANTASY]: {
    id: GENRES.MODERN_FANTASY,
    label: '현대 판타지',
    tempo: 'fast',
    clichePool: ['평범한 일상 균열', '숨겨진 조직', '각성한 이능', '현실 침공', '비밀 세계'],
    hookTypes: ['이능 발현', '초자연 사건', '조직 접촉', '정체 은폐 위기'],
  },
  [GENRES.XIANXIA]: {
    id: GENRES.XIANXIA,
    label: '선협',
    tempo: 'slow',
    clichePool: ['폐인 각성', '단약 연성', '천겁 시련', '종문 입문', '등선 도전'],
    hookTypes: ['경지 돌파', '보물 쟁탈', '천재지변', '선인 강림'],
  },
  [GENRES.PROFESSIONAL]: {
    id: GENRES.PROFESSIONAL,
    label: '전문직',
    tempo: 'mid',
    clichePool: ['천재 신입', '불가능한 케이스', '내부 비리', '경쟁 라이벌', '회귀한 베테랑'],
    hookTypes: ['난제 등장', '시한부 데드라인', '진단/판결 반전', '전문성 과시'],
  },
  [GENRES.CHAEBOL]: {
    id: GENRES.CHAEBOL,
    label: '재벌물',
    tempo: 'mid',
    clichePool: ['숨겨진 자식', '상속 분쟁', '경영권 암투', '계약 결혼', '몰락 후 재기'],
    hookTypes: ['후계 지명', '배신 폭로', '인수합병 전쟁', '비밀 출생'],
  },
  [GENRES.ACADEMY]: {
    id: GENRES.ACADEMY,
    label: '아카데미물',
    tempo: 'mid',
    clichePool: ['최약체 입학', '천재 동기', '서열전', '숨겨진 재능', '졸업 시험'],
    hookTypes: ['실력 평가', '결투 신청', '비밀 발각', '랭킹 갱신'],
  },
  [GENRES.POSSESSION]: {
    id: GENRES.POSSESSION,
    label: '빙의물',
    tempo: 'fast',
    clichePool: ['악역 빙의', '엑스트라 생존', '원작 붕괴', '예정된 죽음 회피', '주인공 대체'],
    hookTypes: ['빙의 자각', '원작 이탈', '죽음 플래그', '설정 활용'],
  },
  [GENRES.GAME_FANTASY]: {
    id: GENRES.GAME_FANTASY,
    label: '게임 판타지',
    tempo: 'fast',
    clichePool: ['튜토리얼 격파', '히든 퀘스트', '버그 악용', '랭킹 1위', '현실 연동'],
    hookTypes: ['시스템 알림', '레벨업 연출', '레어 드랍', '보스 레이드'],
  },
  [GENRES.GENERAL]: {
    id: GENRES.GENERAL,
    label: '일반',
    tempo: 'mid',
    clichePool: ['평범한 주인공', '일상 갈등', '성장 서사', '관계 변화', '선택의 기로'],
    hookTypes: ['갈등 제시', '전환점', '감정 고조', '결단의 순간'],
  },
});

// ============================================================
// PART 3 — 페르소나 / 체크리스트 보조 데이터
// ============================================================

/**
 * 장르별 추천 독자 페르소나 키.
 * 페르소나 키는 앱 독자 시뮬레이터의 식별자(영문 슬러그)로 둔다.
 * 모든 장르는 보편 페르소나 'casual-reader' 를 공통 포함한다.
 */
const GENRE_PERSONAS: Readonly<Record<GENRES, readonly string[]>> = Object.freeze({
  [GENRES.HUNTER]: ['power-fantasy-fan', 'system-lover', 'action-junkie'],
  [GENRES.REGRESSION]: ['revenge-seeker', 'strategy-reader', 'power-fantasy-fan'],
  [GENRES.ROMANCE_FANTASY]: ['romance-fan', 'aesthetic-reader', 'character-shipper'],
  [GENRES.MARTIAL_ARTS]: ['classic-wuxia-fan', 'action-junkie', 'lore-digger'],
  [GENRES.FANTASY]: ['worldbuilding-fan', 'adventure-reader', 'lore-digger'],
  [GENRES.SF]: ['idea-reader', 'worldbuilding-fan', 'thinker'],
  [GENRES.ROMANCE]: ['romance-fan', 'character-shipper', 'emotional-reader'],
  [GENRES.MODERN_FANTASY]: ['power-fantasy-fan', 'urban-reader', 'mystery-fan'],
  [GENRES.XIANXIA]: ['cultivation-fan', 'lore-digger', 'long-haul-reader'],
  [GENRES.PROFESSIONAL]: ['competence-fan', 'realism-reader', 'thinker'],
  [GENRES.CHAEBOL]: ['drama-fan', 'romance-fan', 'power-fantasy-fan'],
  [GENRES.ACADEMY]: ['growth-reader', 'power-fantasy-fan', 'character-shipper'],
  [GENRES.POSSESSION]: ['meta-reader', 'strategy-reader', 'character-shipper'],
  [GENRES.GAME_FANTASY]: ['system-lover', 'gamer-reader', 'power-fantasy-fan'],
  [GENRES.GENERAL]: ['emotional-reader', 'thinker'],
});

/** 모든 장르에 공통 적용되는 보편 독자 페르소나. */
const UNIVERSAL_PERSONA = 'casual-reader';

/**
 * 장르별 점검 항목.
 * 장르 고유 체크 + 모든 장르 공통 체크(보편 서사 위생)로 구성.
 */
const GENRE_CHECKLISTS: Readonly<Record<GENRES, readonly string[]>> = Object.freeze({
  [GENRES.HUNTER]: ['각성/성장 단계가 납득되는가', '시스템 규칙이 일관적인가', '전투 스케일이 점증하는가'],
  [GENRES.REGRESSION]: ['회귀 전후 인과가 어긋나지 않는가', '미래 정보 활용이 과하지 않은가', '나비효과 변화가 추적되는가'],
  [GENRES.ROMANCE_FANTASY]: ['두 인물의 감정선이 단계적인가', '신분/세계 설정이 충돌 없는가', '악역 동기가 설득적인가'],
  [GENRES.MARTIAL_ARTS]: ['무공/내공 체계가 일관적인가', '강호 세력 구도가 명확한가', '비무 합의 개연성이 있는가'],
  [GENRES.FANTASY]: ['마법/세계 규칙이 자기모순 없는가', '종족/세력 설정이 정리됐는가', '힘의 균형이 무너지지 않는가'],
  [GENRES.SF]: ['기술 전제가 작중 일관적인가', '과학적 아이디어가 서사에 봉사하는가', '미래 사회 논리가 성립하는가'],
  [GENRES.ROMANCE]: ['감정 변화가 비약 없는가', '갈등이 인위적이지 않은가', '두 인물 매력이 균형 잡혔는가'],
  [GENRES.MODERN_FANTASY]: ['현실/초자연 경계가 정합적인가', '이능 규칙이 일관적인가', '일상과 비밀의 긴장이 유지되는가'],
  [GENRES.XIANXIA]: ['경지 체계가 명확한가', '수련 인과가 납득되는가', '천도/세계관 용어가 일관적인가'],
  [GENRES.PROFESSIONAL]: ['직업 디테일이 정확한가', '전문 갈등이 작위적이지 않은가', '주인공 역량이 과장 없는가'],
  [GENRES.CHAEBOL]: ['가문/지분 관계가 정리됐는가', '경영/법 디테일이 그럴듯한가', '암투 동기가 명료한가'],
  [GENRES.ACADEMY]: ['서열/평가 규칙이 일관적인가', '성장 곡선이 단계적인가', '동기 인물군이 구분되는가'],
  [GENRES.POSSESSION]: ['원작 설정과 빙의 후 일관성이 있는가', '죽음 플래그 회피가 개연적인가', '메타 정보 활용이 과하지 않은가'],
  [GENRES.GAME_FANTASY]: ['게임 시스템 규칙이 일관적인가', '수치/밸런스가 무너지지 않는가', '현실/게임 경계가 명확한가'],
  [GENRES.GENERAL]: ['주제가 일관되게 관통하는가', '인물 동기가 분명한가', '장면 목적이 뚜렷한가'],
});

/** 모든 장르에 공통 적용되는 보편 점검 항목. */
const UNIVERSAL_CHECKS: readonly string[] = Object.freeze([
  '도입부 3문장 안에 훅이 있는가',
  '회차 말미에 다음 화 유인(클리프행어)이 있는가',
  '시점/인칭이 일관적인가',
]);

// ============================================================
// PART 4 — 조회 함수 (안전 폴백 포함)
// ============================================================

/**
 * 임의 입력값을 유효한 GENRES 값으로 정규화. 알 수 없으면 GENERAL.
 * (enum 값/대소문자/공백을 흡수하는 내부 폴백 헬퍼.)
 */
function normalizeGenre(id: unknown): GENRES {
  if (typeof id !== 'string') return GENRES.GENERAL;
  const key = id.trim().toLowerCase();
  // enum 값 직접 매칭 (GENRES 값들은 모두 소문자 슬러그)
  for (const g of Object.values(GENRES)) {
    if (g === key) return g;
  }
  return GENRES.GENERAL;
}

/**
 * 장르 프로필 조회.
 * @param id  장르 식별자 (GENRES 값 또는 문자열)
 * @returns 해당 프로필. 알 수 없는 id 는 GENERAL 프로필로 안전 폴백.
 */
export function getGenreProfile(id: unknown): GenreProfile {
  return GENRE_PROFILES[normalizeGenre(id)];
}

/**
 * 장르별 추천 독자 페르소나 키 활성화.
 * @param id  장르 식별자
 * @returns 페르소나 키 배열 (보편 페르소나 'casual-reader' 항상 마지막에 1회 포함, 중복 제거).
 *          알 수 없는 id 는 GENERAL 페르소나로 폴백.
 */
export function activatePersonasForGenre(id: unknown): string[] {
  const genre = normalizeGenre(id);
  // 장르 고유 페르소나 + 보편 페르소나 결합 후 중복 제거 (순서 보존)
  const merged = [...GENRE_PERSONAS[genre], UNIVERSAL_PERSONA];
  return [...new Set(merged)];
}

/**
 * 장르별 점검 체크리스트 생성.
 * @param id  장르 식별자
 * @returns 장르 고유 체크 + 보편 체크 결합 배열 (중복 제거, 순서 보존).
 *          알 수 없는 id 는 GENERAL 체크리스트로 폴백.
 */
export function genreChecklist(id: unknown): string[] {
  const genre = normalizeGenre(id);
  const merged = [...GENRE_CHECKLISTS[genre], ...UNIVERSAL_CHECKS];
  return [...new Set(merged)];
}
