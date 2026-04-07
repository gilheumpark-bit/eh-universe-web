// ============================================================
// NOI 일관성 태그 자동 생성 — 캐릭터 외모 → 비주얼 태그
// ============================================================

import { Character } from './studio-types';

// 외모 키워드 사전 (한국어 + 영어)
const HAIR_KEYWORDS: Record<string, string> = {
  '흑발': 'black_hair', '검은 머리': 'black_hair', '금발': 'blonde_hair',
  '은발': 'silver_hair', '백발': 'white_hair', '갈색 머리': 'brown_hair',
  '붉은 머리': 'red_hair', '적발': 'red_hair', '청발': 'blue_hair',
  '녹발': 'green_hair', '분홍 머리': 'pink_hair', '보라 머리': 'purple_hair',
  '장발': 'long_hair', '단발': 'short_hair', '포니테일': 'ponytail',
  '땋은 머리': 'braid', '곱슬': 'curly_hair', '직모': 'straight_hair',
  '웨이브': 'wavy_hair', '삭발': 'shaved_head', '대머리': 'bald',
  // English
  'black hair': 'black_hair', 'blonde': 'blonde_hair', 'silver hair': 'silver_hair',
  'white hair': 'white_hair', 'brown hair': 'brown_hair', 'red hair': 'red_hair',
  'long hair': 'long_hair', 'short hair': 'short_hair', 'ponytail': 'ponytail',
  'braid': 'braid', 'curly': 'curly_hair', 'straight hair': 'straight_hair',
};

const EYE_KEYWORDS: Record<string, string> = {
  '적안': 'red_eyes', '빨간 눈': 'red_eyes', '청안': 'blue_eyes',
  '파란 눈': 'blue_eyes', '금안': 'golden_eyes', '녹안': 'green_eyes',
  '갈색 눈': 'brown_eyes', '흑안': 'dark_eyes', '이색안': 'heterochromia',
  '은안': 'silver_eyes', '보라 눈': 'purple_eyes',
  'red eyes': 'red_eyes', 'blue eyes': 'blue_eyes', 'golden eyes': 'golden_eyes',
  'green eyes': 'green_eyes', 'brown eyes': 'brown_eyes', 'dark eyes': 'dark_eyes',
  'heterochromia': 'heterochromia',
};

const BODY_KEYWORDS: Record<string, string> = {
  '키가 큰': 'tall', '장신': 'tall', '키가 작은': 'short_stature', '소녀체형': 'petite',
  '근육질': 'muscular', '마른': 'slim', '건장': 'athletic', '왜소': 'short_stature',
  '흉터': 'scar', '상처': 'scar', '문신': 'tattoo', '피어싱': 'piercing',
  '안대': 'eyepatch', '안경': 'glasses', '뿔': 'horns', '날개': 'wings',
  '꼬리': 'tail', '귀': 'animal_ears', '반수': 'kemonomimi',
  'tall': 'tall', 'short': 'short_stature', 'muscular': 'muscular',
  'slim': 'slim', 'athletic': 'athletic', 'scar': 'scar', 'tattoo': 'tattoo',
  'glasses': 'glasses', 'eyepatch': 'eyepatch', 'horns': 'horns',
  'wings': 'wings', 'tail': 'tail',
};

const ATTIRE_KEYWORDS: Record<string, string> = {
  '교복': 'school_uniform', '갑옷': 'armor', '로브': 'robe', '정장': 'suit',
  '후드': 'hoodie', '망토': 'cape', '가죽': 'leather', '군복': 'military_uniform',
  '기모노': 'kimono', '한복': 'hanbok', '드레스': 'dress',
  'uniform': 'school_uniform', 'armor': 'armor', 'robe': 'robe', 'suit': 'suit',
  'hoodie': 'hoodie', 'cape': 'cape', 'leather': 'leather', 'dress': 'dress',
};

/**
 * 캐릭터 외모 설명에서 비주얼 일관성 태그를 자동 추출
 */
export function extractConsistencyTags(character: Character): string[] {
  const tags: string[] = [];
  const source = [character.appearance, character.symbol, character.externalPerception]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (!source) return tags;

  const dictionaries = [HAIR_KEYWORDS, EYE_KEYWORDS, BODY_KEYWORDS, ATTIRE_KEYWORDS];

  for (const dict of dictionaries) {
    for (const [keyword, tag] of Object.entries(dict)) {
      if (source.includes(keyword.toLowerCase()) && !tags.includes(tag)) {
        tags.push(tag);
      }
    }
  }

  return tags;
}

/**
 * 여러 캐릭터에서 태그를 일괄 추출
 */
export function extractAllConsistencyTags(characters: Character[]): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const char of characters) {
    const tags = extractConsistencyTags(char);
    if (tags.length > 0) {
      result[char.id] = tags;
    }
  }
  return result;
}

/**
 * 캐릭터 이름과 태그를 결합한 프롬프트 프래그먼트 생성
 */
export function buildConsistencyFragment(character: Character): string {
  const tags = extractConsistencyTags(character);
  if (tags.length === 0) return '';
  return `[${character.name}: ${tags.join(', ')}]`;
}

// IDENTITY_SEAL: PART-1 | role=NOI auto-tag extraction | inputs=Character | outputs=string[]
