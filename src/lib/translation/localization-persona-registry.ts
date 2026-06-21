export type LocalizationMarketCode =
  | 'ko'
  | 'en-us'
  | 'en-sea'
  | 'ja'
  | 'fr'
  | 'pt-br'
  | 'es-latam'
  | 'vi'
  | 'nl-be'
  | 'de-be'
  | 'zh-general';

export interface LocalizationMarketProfile {
  code: LocalizationMarketCode;
  labelKo: string;
  readerLensKo: string[];
  decisionNoteKo: string;
}

const MARKET_PROFILES: Record<LocalizationMarketCode, LocalizationMarketProfile> = {
  ko: {
    code: 'ko',
    labelKo: '한국어 역검수',
    readerLensKo: ['말맛', '장르 관습', '회차 호흡'],
    decisionNoteKo: '한국어 원문 의도가 번역 후 되돌아왔을 때 무너지지 않는지 확인합니다.',
  },
  'en-us': {
    code: 'en-us',
    labelKo: '영미권 독자',
    readerLensKo: ['문장 호흡', '고유명사 표기', '설명 과밀'],
    decisionNoteKo: '영어를 모르는 사용자도 뉘앙스 변화와 독자 반응을 한국어로 판단합니다.',
  },
  'en-sea': {
    code: 'en-sea',
    labelKo: '동남아 영어권 독자',
    readerLensKo: ['간결성', '관계 호칭', '플랫폼 문법'],
    decisionNoteKo: '영어권 공통 표현과 지역 독자에게 어색한 호칭·관계를 나눠 봅니다.',
  },
  ja: {
    code: 'ja',
    labelKo: '일본어권 독자',
    readerLensKo: ['호칭', '대사 리듬', '라이트노벨 문법'],
    decisionNoteKo: '호칭과 말투의 위계가 깨지면 캐릭터 관계가 달라질 수 있습니다.',
  },
  fr: {
    code: 'fr',
    labelKo: '프랑스어권 독자',
    readerLensKo: ['문장 밀도', '격식', '문화 설명'],
    decisionNoteKo: '직역으로 딱딱해진 문장을 독자 호흡 기준으로 확인합니다.',
  },
  'pt-br': {
    code: 'pt-br',
    labelKo: '브라질 포르투갈어권 독자',
    readerLensKo: ['대화 자연도', '감정 온도', '장면 속도'],
    decisionNoteKo: '감정선과 대화 리듬이 독자에게 자연스럽게 읽히는지 봅니다.',
  },
  'es-latam': {
    code: 'es-latam',
    labelKo: '라틴아메리카 스페인어권 독자',
    readerLensKo: ['구어체', '명칭 설명', '장면 전환'],
    decisionNoteKo: '지역 독자에게 낯선 표현은 설명보다 흐름 안에서 해결되는지 확인합니다.',
  },
  vi: {
    code: 'vi',
    labelKo: '베트남어권 독자',
    readerLensKo: ['호칭', '가족·관계 표현', '문장 속도'],
    decisionNoteKo: '관계 호칭과 감정 온도가 바뀌면 인물 인상이 달라질 수 있습니다.',
  },
  'nl-be': {
    code: 'nl-be',
    labelKo: '벨기에 네덜란드어권 독자',
    readerLensKo: ['간결성', '용어 일관성', '설명 균형'],
    decisionNoteKo: '시장별 독자 호흡에 맞춰 설명량과 용어 반복을 확인합니다.',
  },
  'de-be': {
    code: 'de-be',
    labelKo: '벨기에 독일어권 독자',
    readerLensKo: ['복합문', '용어 표기', '설정 설명'],
    decisionNoteKo: '긴 설정문이 독자에게 한 번에 읽히는지 확인합니다.',
  },
  'zh-general': {
    code: 'zh-general',
    labelKo: '중국어권 문장 점검',
    readerLensKo: ['표기', '문장 누락', '용어 일관성'],
    decisionNoteKo: '현지 독자 샘플 없이 표기와 누락 중심으로만 보수적으로 확인합니다.',
  },
};

export function resolveLocalizationMarketProfile(targetLanguage: string): LocalizationMarketProfile {
  const normalized = targetLanguage.trim().toLowerCase();
  if (normalized === 'ko' || normalized === 'kr') return MARKET_PROFILES.ko;
  if (normalized === 'ja' || normalized === 'jp' || normalized === 'japanese') return MARKET_PROFILES.ja;
  if (normalized === 'fr' || normalized === 'french') return MARKET_PROFILES.fr;
  if (normalized === 'pt' || normalized === 'pt-br' || normalized === 'portuguese') return MARKET_PROFILES['pt-br'];
  if (normalized === 'es' || normalized === 'es-latam' || normalized === 'spanish') return MARKET_PROFILES['es-latam'];
  if (normalized === 'vi' || normalized === 'vn' || normalized === 'vietnamese') return MARKET_PROFILES.vi;
  if (normalized === 'nl' || normalized === 'nl-be' || normalized === 'dutch') return MARKET_PROFILES['nl-be'];
  if (normalized === 'de' || normalized === 'de-be' || normalized === 'german') return MARKET_PROFILES['de-be'];
  if (normalized === 'zh' || normalized === 'cn' || normalized === 'chinese') return MARKET_PROFILES['zh-general'];
  if (normalized === 'en-sea') return MARKET_PROFILES['en-sea'];
  return MARKET_PROFILES['en-us'];
}

