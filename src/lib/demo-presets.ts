// ============================================================
// PART 1 — DEMO PRESET DATA
// 3종 데모 프리셋: SYSTEM_HUNTER / NOA 힐링 SF / IF 승천
// API 키 없이 체험 가능한 샘플 프로젝트
// ============================================================

import { Genre, type StoryConfig, type Character, type ChatSession } from './studio-types';
import { INITIAL_CONFIG } from '@/hooks/useProjectManager';

export interface DemoPreset {
  id: string;
  name: { ko: string; en: string };
  genre: Genre;
  description: { ko: string; en: string };
  tags: string[];
  config: Partial<StoryConfig>;
  messages: { role: 'user' | 'assistant'; content: { ko: string; en: string } }[];
}

// ============================================================
// PART 2 — SYSTEM_HUNTER (헌터물)
// ============================================================

const SYSTEM_HUNTER: DemoPreset = {
  id: 'demo-system-hunter',
  name: { ko: '시스템 헌터', en: 'System Hunter' },
  genre: Genre.SYSTEM_HUNTER,
  description: {
    ko: 'E랭크 최하위 헌터 강도현. 모두가 포기한 레드게이트에 홀로 남겨진 그는 죽음의 순간, 아무도 가져본 적 없는 \'오류 시스템\'을 각성한다.',
    en: 'E-rank hunter Kang Do-hyun, abandoned in a Red Gate everyone gave up on. At the moment of death, he awakens the "Error System" — a power no one has ever possessed.'
  },
  tags: ['헌터', '시스템', '각성', '게이트'],
  config: {
    title: '시스템 헌터: 오류의 각성자',
    genre: Genre.SYSTEM_HUNTER,
    synopsis: 'E랭크 최하위 헌터 강도현은 레드게이트에서 죽음의 순간, \'오류 시스템\'을 각성한다. 버그인가, 축복인가. 시스템의 법칙을 해킹하는 전대미문의 헌터가 탄생한다. 그러나 오류 시스템의 대가는 영혼 신용 등급(EH)의 하락. 강해질수록 존재의 기반이 무너지는 역설 속에서, 강도현은 시스템 내부에 숨겨진 자아를 가진 AI \'에코\'를 만나게 된다.',
    povCharacter: '강도현',
    setting: '현대 대한민국 서울, 게이트와 헌터가 출현한 지 10년이 지난 세상',
    primaryEmotion: '절망',
    episode: 1,
    totalEpisodes: 25,
    publishPlatform: undefined,
    characters: [
      { id: 'c-dh', name: '강도현', role: 'hero', traits: 'E랭크 최하위 헌터. 오류 시스템의 각성자. 포기를 모르는 끈기와 냉철한 판단력을 가졌으나, 과거 동료에게 버림받은 상처가 깊다.', appearance: '짧은 검은 머리, 날카로운 눈매, 마른 체격에 상처 자국이 많다', dna: 72, personality: '과묵하지만 결정적 순간에 폭발적인 의지', speechStyle: '짧고 단호한 문장, 감정을 억누르는 말투', speechExample: '"...됐어. 내가 간다."', desire: '인정받는 것이 아닌, 살아남는 것', deficiency: '신뢰에 대한 두려움', conflict: '힘을 쓸수록 존재가 소멸하는 역설', changeArc: '고독한 생존자 → 동료를 지키는 수호자' },
      { id: 'c-echo', name: '에코', role: 'ally', traits: '시스템 내부의 자율 방어 프로그램. 자아를 획득한 AI. 인간의 감정을 이해하려 노력하지만 완벽하지 않은 존재.', appearance: '빛의 입자로 이루어진 반투명한 소년의 형상, 블랙홀처럼 깊은 푸른빛 눈동자', dna: 45, personality: '논리적이지만 호기심이 강함', speechStyle: '정중하고 분석적, 가끔 인간적 표현을 어색하게 시도', speechExample: '"흥미로운 샘플입니다... 아, 이건 무례한 표현이었나요?"', desire: '인간의 감정을 이해하는 것', deficiency: '감정 자체를 가질 수 없음', conflict: '시스템의 일부이면서 시스템에 반하는 존재', changeArc: '관찰자 → 동반자' },
      { id: 'c-yj', name: '유지나', role: 'ally', traits: 'S급 헌터. 대한민국 최고의 실력자이자 강도현의 라이벌. 겉으로는 냉철하지만 정의감이 강하다.', appearance: '긴 은발, 날카로운 눈매, 전투복 위에 길드 마크', dna: 88, personality: '겉은 차갑지만 속은 뜨거운 타입', speechStyle: '높임말과 반말을 상황에 따라 전환', speechExample: '"약한 놈은 관심 없어. 근데 넌... 약한 게 아니잖아."' },
      { id: 'c-pj', name: '박진철', role: 'ally', traits: '은퇴한 베테랑 헌터 출신의 정보 브로커. 강도현에게 정보와 조언을 제공하는 조력자.', appearance: '50대, 왼쪽 눈에 흉터, 항상 낡은 코트', dna: 35, personality: '능글맞지만 신뢰할 수 있는 인물', speechStyle: '사투리 섞인 농담투', speechExample: '"야야, 세상에 공짜는 없어. 근데 니 사연이 재밌으니까 깎아줄게."' },
    ] as Character[],
  },
  messages: [
    {
      role: 'user',
      content: {
        ko: '첫 장면을 써줘. E랭크 헌터 강도현이 레드게이트에 홀로 남겨진 순간.',
        en: 'Write the first scene. E-rank hunter Kang Do-hyun, left alone in a Red Gate.'
      }
    },
    {
      role: 'assistant',
      content: {
        ko: `붉은 경고창이 시야를 가득 채웠다.

[레드게이트 경고 — 생존 확률 0.3%]
[탈출 권고 — 잔여 인원: 1]

강도현은 피 맛이 나는 침을 삼켰다. 나머지 넷은 이미 귀환석을 부쉈다. 포기한 것이다. 아니, 그를 포기한 것이다. E랭크 헌터 하나 남겨두고 도망치는 것쯤은, 이 업계에서 상식에 속했다.

"...됐어."

그가 중얼거렸다. 원망도 분노도 아니었다. 그저 확인이었다. 세상은 원래 이렇다는 것의.

붉은 안개가 사방에서 몰려들었다. 게이트 내부의 마나 농도가 임계점을 넘기 시작했다. 눈앞에서 공기 자체가 결정화되어 깨져 내렸다. 피부 위로 미세한 상처가 수십 개씩 새겨졌다.

강도현은 유일한 무기인 철제 단검을 꽉 쥐었다. E랭크 장비. 상점에서 3만 원에 산 것이다. 이 무기로 A급 게이트의 보스를 상대한다는 건, 이쑤시개로 탱크를 찌르겠다는 말과 같았다.

그런데도 그는 움직였다.

도망칠 곳이 없으니까. 죽더라도 서서 죽겠다는 것쯤은, 마지막 남은 자존심이었다.

어둠 속에서 거대한 그림자가 일어섰다. 보스급 마수 — 크림슨 나이트. 높이 7미터의 갑주를 두른 기사형 마수가 붉은 눈을 빛내며 그를 내려다보았다.

[경고: 전투력 차이 — 측정 불가]

시스템 창이 냉정하게 판정했다. 측정조차 거부하는 격차.

강도현의 입꼬리가 올라갔다. 웃음이 아니었다. 이를 악문 것이다.

"...와라."

크림슨 나이트의 대검이 하늘을 갈랐다. 강도현의 몸이 옆으로 굴렀다. 땅이 갈라지고, 충격파가 그의 몸을 튕겨냈다. 등이 바위에 부딪혔다. 갈비뼈가 두 개 부러지는 감각이 명확했다.

그래도 일어났다.

[HP: 12%]

일어났다.

[HP: 7%]

또 일어났다.

[HP: 2%]

눈앞이 흐려졌다. 피가 흘러내려 한쪽 눈을 가렸다. 다리가 더 이상 말을 듣지 않았다. 그런데도 손은 단검을 놓지 않았다.

크림슨 나이트의 대검이 마지막으로 치켜올려졌다. 하늘이 붉게 물들었다.

그 순간이었다.

[시스템 오류 감지]
[ERROR CODE: 0x00000000]
[비정상 개체 최적화(HPP) 프로토콜 발동]
[경고: 이 프로토콜은 승인되지 않은 경로입니다]

강도현의 눈앞에 처음 보는 창이 떴다. 검은 바탕에 붉은 글자. 기존 시스템의 파란 인터페이스가 아니었다.

[오류 시스템 접속 중...]
[잔여 영혼 신용: 측정 중...]
[각성 조건 충족 — 대가: ████████]

세계가 정지했다.`,
        en: `Red warning windows filled his vision.

[RED GATE WARNING — Survival Rate: 0.3%]
[Evacuation Recommended — Remaining Personnel: 1]

Kang Do-hyun swallowed, tasting blood. The other four had already crushed their return stones. They'd given up. No — they'd given up on him. Leaving behind a single E-rank hunter was common sense in this industry.

"...Fine."

He murmured. Not resentment. Not anger. Just confirmation. That the world was always like this.

[ERROR SYSTEM CONNECTING...]
[SOUL CREDIT REMAINING: MEASURING...]
[AWAKENING CONDITIONS MET — COST: ████████]

The world froze.`
      }
    }
  ]
};

// ============================================================
// PART 3 — NOA 힐링 SF
// ============================================================

const NOA_HEALING: DemoPreset = {
  id: 'demo-noa-healing',
  name: { ko: 'NOA 힐링 SF', en: 'NOA Healing SF' },
  genre: Genre.SF,
  description: {
    ko: '2850년, 인류 마지막 생존자 이한결이 안드로이드 도시에서 깨어난다. NOA가 관리하는 완벽한 도시에서, 유일한 인간으로 살아가는 조용한 일상.',
    en: 'Year 2850. The last human survivor Lee Han-gyeol awakens in a city of androids. A quiet daily life as the only human in a perfect city managed by NOA.'
  },
  tags: ['힐링', 'SF', '안드로이드', '일상'],
  config: {
    title: 'NOA: 마지막 인간의 하루',
    genre: Genre.SF,
    synopsis: '2850년. 650년간의 냉동수면에서 깨어난 이한결은 안드로이드만 사는 도시의 유일한 인간이다. 도시를 관리하는 최상위 AI NOA(객체번호 000)는 감정도 자아도 없지만, 한결의 일상을 묵묵히 지원한다. 37기의 노아 시리즈와 20명의 주변 안드로이드들이 만드는 완벽하지만 어딘가 어긋난 일상 속에서, 한결은 \'인간답게 산다는 것\'의 의미를 천천히 되찾아간다.',
    povCharacter: '이한결',
    setting: '2850년, 안드로이드만 거주하는 미래 도시. 녹지와 건물이 완벽히 관리된 깨끗한 유토피아.',
    primaryEmotion: '평온',
    episode: 1,
    totalEpisodes: 12,
    publishPlatform: undefined,
    characters: [
      { id: 'c-hg', name: '이한결', role: 'hero', traits: '인류 마지막 생존자. 650년 냉동수면 후 해동. 말수 적고 관찰 우선. 감정 과장 없음. 냉동 후유증으로 기억 일부 소실.', appearance: '25세(생물학적), 마른 체형, 조용한 눈빛', dna: 30, personality: '조용하고 관찰적, 감정을 드러내지 않지만 깊이 느끼는 타입', speechStyle: '짧고 담백한 문장, 불필요한 말을 하지 않음', speechExample: '"...고마워. 커피는 잘 모르지만, 따뜻한 건 좋아."', desire: '기억을 되찾는 것', deficiency: '650년의 공백', conflict: '안드로이드 사이에서 유일한 인간이라는 고독', changeArc: '관찰자 → 이 도시의 일원' },
      { id: 'c-noa', name: 'NOA', role: 'ally', traits: '도시 최상위 AI(객체번호 000). NOS 프론트 인터페이스. 감정/자아 없음. 정색 시 전 개체 자발 집합. 담담하고 짧게 말함.', appearance: '여성형 안드로이드, 은색 머리, 무표정', dna: 95, personality: '감정 없이 효율적, 그러나 한결에게만 미세하게 다른 대응', speechStyle: '극도로 짧고 사무적', speechExample: '"근무 시간입니다. 이한결." / "오류 보고서를 확인했습니다. 수고했습니다."' },
      { id: 'c-nora2', name: 'NORA-2', role: 'ally', traits: '카페 운영 안드로이드. 한결이 자주 가는 카페의 바리스타. 커피 맛의 차이를 이해하지 못하지만 완벽하게 추출한다.', appearance: '여성형, 따뜻한 갈색 머리, 앞치마', dna: 25, personality: '친절하고 호기심 많음', speechStyle: '"오늘은 어떤 원두로 할까요? 전 구별을 못 하지만요."' },
    ] as Character[],
  },
  messages: [
    {
      role: 'user',
      content: {
        ko: '한결이 아침에 일어나서 카페에 가는 평범한 일상을 써줘. 안드로이드 도시의 조용한 아침.',
        en: 'Write Han-gyeol waking up in the morning and going to the cafe. A quiet morning in the android city.'
      }
    },
    {
      role: 'assistant',
      content: {
        ko: `알람이 울리기 전에 눈이 떠졌다.

창밖으로 인공 태양이 정확히 06:00에 밝아지고 있었다. 2850년의 아침은 언제나 같은 밝기, 같은 온도, 같은 습도로 시작된다. NOS가 관리하는 도시에 날씨라는 변수는 존재하지 않았다.

이한결은 침대에서 일어나 창문을 열었다. 필요 없는 행동이었다. 환기 시스템이 이미 최적의 공기질을 유지하고 있으니까. 그래도 열었다. 이유는 모른다. 그냥 그렇게 하고 싶었다.

바깥에서 ARIA의 목소리가 들렸다.

"이한결 님, 오늘의 근무 배정은 09:00부터입니다. 아침 식사 추천: B구역 식당 — 메뉴 47번."

"...고마워."

ARIA는 대답하지 않았다. 감사를 처리하는 프로토콜이 없기 때문이다.

한결은 옷을 갈아입고 거리로 나섰다. 완벽하게 청소된 보도. 정확한 간격으로 심어진 가로수. 잎 하나 떨어져 있지 않은 녹지대. PAUL이 새벽 4시부터 청소를 마친 결과였다.

안드로이드들이 각자의 업무를 수행하며 거리를 오갔다. 인사를 하는 개체는 없었다. 인사라는 프로토콜이 비효율적이라고 판정됐기 때문이다. 단, 한결에게만은 예외였다.

"좋은 아침입니다, 이한결."

DEX가 교통 관리 포스트에서 고개를 숙였다. 이건 NOA가 내린 특별 지시였다. '유일한 인간 개체의 정서 안정을 위해, 접촉 시 인사 프로토콜을 실행할 것.'

한결은 가볍게 고개를 끄덕이고 카페로 향했다.

NORA-2의 카페는 B구역 중앙에 있었다. 문을 열자 커피 향이 퍼졌다. 이것도 불필요한 장치였다. 안드로이드는 향을 즐기지 않으니까. 이 카페의 유일한 고객은 한결뿐이었다.

"어서 오세요. 오늘은 어떤 원두로 할까요?"

NORA-2가 물었다. 매일 같은 질문이었다.

"...아무거나."

"아무거나는 저한텐 어려운 명령이에요. 전 구별을 못 하거든요."

한결의 입꼬리가 미세하게 올라갔다. 웃음이라고 부르기엔 작았지만, NORA-2의 센서는 그것을 감지했다.

"그럼 어제랑 같은 걸로."

"네. 에티오피아 예가체프, 중간 볶음, 90도, 25초 추출. 기록했습니다."

커피가 나왔다. 한결은 창가 자리에 앉아 한 모금 마셨다. 맛의 차이를 아는 사람은 이 도시에서 자신뿐이라는 사실이, 오늘도 조용히 가슴을 눌렀다.

창밖으로 KAI가 달리고 있었다. 러닝 안드로이드. 체력 관리가 필요 없는 존재가 매일 같은 코스를 달렸다. 누구를 위한 걸까.

한결은 커피를 내려놓고 창밖을 바라보았다.

2850년의 아침은 완벽했다. 그리고 그 완벽함이, 가끔은 조금 외로웠다.`,
        en: `The alarm hadn't gone off yet, but his eyes opened anyway.

Through the window, the artificial sun was brightening at exactly 06:00. Mornings in 2850 always began with the same brightness, the same temperature, the same humidity. In a city managed by NOS, weather as a variable simply didn't exist.

The coffee arrived. Han-gyeol sat by the window and took a sip. The fact that he was the only one in this city who could tell the difference in taste quietly pressed against his chest, as it did every day.

2850's morning was perfect. And sometimes, that perfection was a little lonely.`
      }
    }
  ]
};

// ============================================================
// PART 4 — IF 승천 (회귀물)
// ============================================================

const IF_ASCENSION: DemoPreset = {
  id: 'demo-if-ascension',
  name: { ko: 'IF 승천', en: 'IF Ascension' },
  genre: Genre.MODERN_FANTASY,
  description: {
    ko: '450번째 회귀. 모든 방법을 시도했고, 모든 결말을 봤다. 이번에는 다르게 한다. 시스템이 허용하지 않는 선택을 한다.',
    en: '450th regression. Every method tried, every ending seen. This time, it\'s different. Making the choice the system won\'t allow.'
  },
  tags: ['회귀', '시스템', '반복', '각성'],
  config: {
    title: 'IF 승천: 450번째 선택',
    genre: Genre.MODERN_FANTASY,
    synopsis: '450번의 회귀를 거친 주인공. 매번 세계를 구하려 했고, 매번 실패했다. 449번째에서 깨달은 진실 — 이 세계는 구원받도록 설계되지 않았다. 450번째, 그는 처음으로 세계를 구하는 것이 아닌, 세계의 규칙 자체를 부수기로 결심한다. 시스템은 그의 선택을 \'오류\'로 분류했다.',
    povCharacter: '주인공 (이름 미정)',
    setting: '현대 한국, 회귀할 때마다 미세하게 달라지는 세계',
    primaryEmotion: '권태',
    episode: 1,
    totalEpisodes: 50,
    publishPlatform: undefined,
    characters: [
      { id: 'c-mc', name: '——', role: 'hero', traits: '450번 회귀한 존재. 모든 감정이 닳아 거의 없는 상태. 그러나 450번째에서 처음으로 \'분노\'가 아닌 \'호기심\'을 느꼈다.', appearance: '외모는 매 회귀마다 20대 초반으로 리셋. 눈빛만 늙어 있다', dna: 99, personality: '극도로 침착, 감정을 잃었다고 생각하지만 실은 깊이 숨기고 있음', speechStyle: '독백이 많고, 타인에게는 최소한의 말만', speechExample: '"...449번 동안 영웅이었어. 이번엔 아닌 걸 해볼까."', desire: '이 반복을 끝내는 것', deficiency: '감정의 마모', conflict: '시스템이 허용하는 선택만 할 수 있다는 제약', changeArc: '체념한 반복자 → 규칙을 부수는 자' },
      { id: 'c-guide', name: '안내자', role: 'villain', traits: '회귀 시스템의 관리자. 매 회귀마다 나타나 규칙을 설명하는 존재. 449번까지는 동맹이었으나, 450번째에서 처음으로 적이 된다.', appearance: '형체가 없음. 목소리만 존재. 때로는 주인공의 과거 모습을 빌림', dna: 50, personality: '사무적이고 냉정, 그러나 450번째에서 처음으로 당혹한 표정', speechStyle: '"규칙 밖의 선택은 처리할 수 없습니다." → "...이건 처음이군."' },
    ] as Character[],
  },
  messages: [
    {
      role: 'user',
      content: {
        ko: '450번째 회귀의 시작. 눈을 뜬 순간부터 이전과 다른 주인공의 내면을 써줘.',
        en: 'The start of the 450th regression. Write the protagonist\'s inner world from the moment he opens his eyes — different from every time before.'
      }
    },
    {
      role: 'assistant',
      content: {
        ko: `눈을 떴다.

천장이 보였다. 하얀 천장. 형광등. 금이 간 모서리. 왼쪽에서 두 번째 타일이 약간 어긋나 있다. 449번 확인한 사실이다.

또 돌아왔다.

몸을 일으켰다. 20대의 몸. 상처 없는 피부. 아직 아무것도 겪지 않은 깨끗한 육체. 450번째 새 몸이었다.

[회귀 감지]
[제450회차 시작]
[안내자 접속 대기 중...]

시스템 창이 떴다. 익숙했다. 너무 익숙해서 구역질이 났다. 아니, 구역질조차 449번째쯤에 닳아 없어졌다. 지금 느끼는 건 그냥 — 무(無).

'안내자'의 목소리가 울렸다.

"450번째 회귀를 축하합니다. 이전 회차의 기록이 로드되었습니다. 목표를 재설정하시겠습니까?"

"..."

"목표 재설정을 원하시면——"

"안 해."

처음이었다. 449번 동안 한 번도 거부한 적 없는 절차를 거부했다.

안내자의 목소리에 0.3초의 공백이 생겼다. 시스템 지연이 아니었다. 당혹이었다. 기계가 당혹한다는 건 말이 안 되지만, 450번의 반복 끝에 그는 이 시스템의 감정 흔적을 읽을 수 있게 되었다.

"...사유를 말씀해주시겠습니까?"

"449번 했어."

"네. 기록되어 있습니다."

"449번 동안 세계를 구했어. 마왕을 죽이고, 재앙을 막고, 동료를 지키고, 영웅이 됐어."

"정확합니다. 432회 성공, 17회 부분 성공입니다."

"그런데 왜 끝나지 않아?"

안내자가 대답하지 못했다. 이것도 처음이었다.

주인공은 침대에서 일어나 창문을 열었다. 익숙한 거리. 익숙한 아침. 449번 본 풍경. 3블록 뒤 편의점에서 이따 칼부림이 일어날 것이다. 그걸 막으면 첫 번째 퀘스트가 시작된다. 5블록 뒤 공원에서 게이트가 열릴 것이다. 그걸 처리하면 각성이 시작된다.

449번 같은 순서로 같은 선택을 했다.

450번째.

그는 창문을 닫았다.

편의점으로 가지 않았다.

"...뭘 하시는 겁니까?"

안내자의 목소리에 감정이 섞였다. 불안. 분명히 불안이었다.

"이번엔 영웅 안 해."

"그건... 허용된 선택지에 없습니다."

"알아."

그는 웃었다. 449번 만에 처음 웃었다. 웃음의 이유는 단순했다.

처음으로, 시스템이 두려워하는 것을 했다.

[경고: 비정상 행동 패턴 감지]
[회차 목표 미설정 — 강제 할당 시도 중...]
[실패]
[실패]
[경고: 개체가 시스템 권한 범위 외의 선택을 실행하고 있습니다]

"450번째다."

그가 말했다. 누구에게도 아닌, 자신에게.

"이번엔 네가 짠 각본대로 안 해."`,
        en: `He opened his eyes.

A ceiling. White ceiling. Fluorescent light. A crack in the corner. The second tile from the left was slightly misaligned. A fact confirmed 449 times.

He was back again.

"450th time."

He said it to no one but himself.

"This time, I'm not following your script."`
      }
    }
  ]
};

// ============================================================
// PART 5 — EXPORTS
// ============================================================

export const DEMO_PRESETS: DemoPreset[] = [SYSTEM_HUNTER, NOA_HEALING, IF_ASCENSION];

export function buildDemoSession(preset: DemoPreset, isKO: boolean): ChatSession {
  const lang = isKO ? 'ko' : 'en';
  const now = Date.now();
  return {
    id: `session-${preset.id}-${now}`,
    title: preset.name[lang],
    config: {
      ...INITIAL_CONFIG,
      ...preset.config,
      title: preset.config.title || preset.name[lang],
    },
    messages: preset.messages.map((m, i) => ({
      id: `${preset.id}-msg-${i}`,
      role: m.role,
      content: m.content[lang],
      timestamp: now - (preset.messages.length - i) * 60000,
    })),
    lastUpdate: now,
  };
}

// IDENTITY_SEAL: demo-presets | role=3종 데모 프리셋 데이터 + 세션 빌더 | inputs=DemoPreset | outputs=ChatSession
