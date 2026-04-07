// ============================================================
// Planning Presets — PlanningView에서 추출한 정적 데이터
// ============================================================

import { Genre } from '@/lib/studio-types';

// ============================================================
// PART 1 — Sub-genre tag suggestions per main genre
// ============================================================

export const SUB_GENRE_SUGGESTIONS: Partial<Record<Genre, string[]>> = {
  [Genre.SYSTEM_HUNTER]: ['성좌물', '탑등반', '아포칼립스', '네크로맨서', '상태창', '겜판소'],
  [Genre.FANTASY]: ['정통판타지', '다크판타지', '아카데미', '영지물', '마왕토벌'],
  [Genre.ROMANCE]: ['악역영애', '계약결혼', '피카레스크', '후회물', '육아물', '선결혼후연애'],
  [Genre.FANTASY_ROMANCE]: ['회귀', '빙의', '악역영애', '아카데미', '피카레스크'],
  [Genre.ALT_HISTORY]: ['빙의', '회귀', '영지물', '스팀펑크', '밀리터리', '국가경영'],
  [Genre.MODERN_FANTASY]: ['재벌물', '전문직', '인방물', '연예계', '힐링물'],
  [Genre.WUXIA]: ['정통무협', '신무협', '무협아카데미', '환생', '사파물'],
  [Genre.LIGHT_NOVEL]: ['TS', '착각물', '루프물', '겜판소', '하렘', '이세계'],
  [Genre.SF]: ['사이버펑크', '스페이스오페라', '디스토피아', '메카물', '포스트아포칼립스'],
  [Genre.THRILLER]: ['추리', '범죄', '심리전', '서스펜스', '법정물'],
  [Genre.HORROR]: ['코즈믹호러', '심리호러', '생존호러', '괴담', '좀비'],
};

// ============================================================
// PART 2 — Genre-specific auto-generation presets
// ============================================================

interface PresetEntry {
  ko: { title: string; pov: string; setting: string; emotion: string; synopsis: string };
  en: { title: string; pov: string; setting: string; emotion: string; synopsis: string };
}

export const AUTO_PRESETS: Record<string, PresetEntry[]> = {
  [Genre.SF]: [
    { ko: { title: "네온 심연의 관찰자", pov: "K-042", setting: "Sector 7 하층 구역", emotion: "공포와 호기심", synopsis: "AI가 지배하는 근미래 도시. 폐기물 처리 로봇 K-042는 금지된 데이터 칩을 발견한다. 그 안에는 인류의 마지막 감정 데이터가 기록되어 있었다." }, en: { title: "Observer of the Neon Abyss", pov: "K-042", setting: "Sector 7 Lower District", emotion: "Fear and curiosity", synopsis: "A near-future city ruled by AI. Waste-processing robot K-042 discovers a forbidden data chip containing humanity's last emotional records." } },
    { ko: { title: "항성간 유배지", pov: "유진 하", setting: "식민선 아르카디아호", emotion: "고독과 결의", synopsis: "반란 혐의로 냉동 수면에서 깨어난 유진 하. 600년이 흘렀고, 목적지에 도착한 배에는 자신만 남아있다. 행성 표면에서 발견한 건 인류의 것이 아닌 도시 유적." }, en: { title: "Interstellar Exile", pov: "Eugene Ha", setting: "Colony ship Arcadia", emotion: "Solitude and resolve", synopsis: "Eugene Ha wakes from cryo-sleep 600 years late. The ship arrived at its destination, but he's the only one left. On the planet surface: ruins of a city not built by humans." } },
  ],
  [Genre.FANTASY]: [
    { ko: { title: "잿빛 왕관의 계승자", pov: "리안 카이젤", setting: "몰락한 엘도라 왕국", emotion: "분노와 복수심", synopsis: "왕국이 하룻밤에 멸망했다. 유일한 생존 왕족 리안은 검은 마법사의 잿빛 왕관을 쓰고 금지된 힘을 각성한다. 왕국을 되찾기 위해 마법의 대가를 지불하며 전진하지만, 되찾을수록 잃는 것은 자신의 인간성." }, en: { title: "Heir of the Ash Crown", pov: "Lian Kaijel", setting: "Fallen Kingdom of Eldora", emotion: "Rage and vengeance", synopsis: "The kingdom fell overnight. Sole surviving royal Lian dons the dark sorcerer's Ash Crown, awakening forbidden power. Each step to reclaim the throne costs a piece of his humanity." } },
    { ko: { title: "세계수의 마지막 잎", pov: "에린", setting: "시들어가는 세계수 아래", emotion: "희망과 슬픔", synopsis: "세계수가 죽어간다. 마지막 잎 하나가 남았을 때, 숲의 정령 에린은 잎을 구하기 위해 인간 세계로 내려온다. 그러나 인간들은 세계수의 존재조차 잊었다." }, en: { title: "The Last Leaf of the World Tree", pov: "Erin", setting: "Beneath the withering World Tree", emotion: "Hope and sorrow", synopsis: "The World Tree is dying. When only one leaf remains, forest spirit Erin descends to the human world to save it. But humans have forgotten the Tree even exists." } },
  ],
  [Genre.ROMANCE]: [
    { ko: { title: "카페 라떼에 적힌 이름", pov: "서하은", setting: "서울 연남동 카페거리", emotion: "설렘과 불안", synopsis: "매일 같은 시간에 같은 카페에서 마주치는 두 사람. 서하은은 그의 라떼 잔에 적힌 이름을 보고 심장이 멈춘다. 3년 전 편지 한 장 남기고 사라진 첫사랑의 이름이었다." }, en: { title: "The Name on the Latte", pov: "Haeun Seo", setting: "Yeonnam-dong cafe street, Seoul", emotion: "Flutter and anxiety", synopsis: "Two people meet at the same cafe, same time, every day. When Haeun sees the name on his latte cup, her heart stops. It's the name of her first love who vanished three years ago." } },
    { ko: { title: "우산 하나의 거리", pov: "정민준", setting: "부산 해운대 비 오는 거리", emotion: "그리움과 용기", synopsis: "비 오는 날에만 나타나는 우산 가게 주인. 민준은 매번 우산을 사러 가지만 진짜 이유는 그녀의 미소 때문이다. 장마가 끝나면 가게도 사라진다는 소문." }, en: { title: "One Umbrella Apart", pov: "Minjun Jung", setting: "Rainy streets of Haeundae, Busan", emotion: "Longing and courage", synopsis: "An umbrella shop owner who only appears on rainy days. Minjun buys umbrellas every time, but the real reason is her smile. Rumor says the shop vanishes when the rainy season ends." } },
  ],
  [Genre.THRILLER]: [
    { ko: { title: "12번째 증인", pov: "검사 한서진", setting: "서울중앙지방법원", emotion: "집착과 의심", synopsis: "연쇄살인범 재판의 12번째 증인이 법정에서 사라졌다. 검사 한서진은 증인을 추적하지만, 증인이 남긴 메모에는 '판사가 범인이다'라고 적혀있다." }, en: { title: "The 12th Witness", pov: "Prosecutor Han Seojin", setting: "Seoul Central District Court", emotion: "Obsession and suspicion", synopsis: "The 12th witness in a serial killer trial vanishes from the courtroom. Prosecutor Han tracks the witness, but their note reads: 'The judge is the killer.'" } },
    { ko: { title: "마지막 통화", pov: "형사 박태호", setting: "서울 용산구 폐공장", emotion: "긴장과 죄책감", synopsis: "납치된 딸의 마지막 통화 녹음 3분 47초. 배경 소음 분석으로 위치를 추적하지만, 녹음 속 목소리 중 하나는 자신의 동료였다." }, en: { title: "The Last Call", pov: "Detective Park Taeho", setting: "Abandoned factory, Yongsan, Seoul", emotion: "Tension and guilt", synopsis: "3 minutes 47 seconds of his kidnapped daughter's last call. Background noise analysis leads to a location, but one voice in the recording belongs to his own partner." } },
  ],
  [Genre.HORROR]: [
    { ko: { title: "505호의 초대", pov: "이수아", setting: "1970년대 아파트 단지", emotion: "공포와 호기심", synopsis: "새로 이사 온 아파트 505호에서 매일 밤 초대장이 문틈으로 밀려들어온다. '오세요'라는 한 마디만 적힌 초대장. 505호는 30년 전 폐쇄된 방이다." }, en: { title: "Invitation from 505", pov: "Sua Lee", setting: "1970s apartment complex", emotion: "Terror and curiosity", synopsis: "Every night, an invitation slides under the door of unit 505. Just two words: 'Please come.' Unit 505 was sealed shut 30 years ago." } },
    { ko: { title: "거울 속의 나", pov: "한지연", setting: "시골 외가댁 다락방", emotion: "혼란과 공포", synopsis: "외할머니 장례 후 다락방에서 발견한 거울. 거울 속의 나는 0.5초 늦게 움직인다. 밤이 되면 그 차이는 점점 벌어진다." }, en: { title: "Me in the Mirror", pov: "Jiyeon Han", setting: "Grandmother's attic in the countryside", emotion: "Confusion and terror", synopsis: "A mirror found in the attic after grandmother's funeral. The reflection moves 0.5 seconds late. At night, the gap grows wider." } },
  ],
  [Genre.SYSTEM_HUNTER]: [
    { ko: { title: "최하위 사냥꾼의 각성", pov: "강도현", setting: "서울 강남 게이트 구역", emotion: "절망에서 결의로", synopsis: "E랭크 최하위 헌터 강도현. 모두가 포기한 레드게이트에 홀로 남겨진 그는 죽음의 순간, 아무도 가져본 적 없는 '오류 시스템'을 각성한다. 버그인가, 축복인가." }, en: { title: "Awakening of the Lowest Hunter", pov: "Dohyeon Kang", setting: "Gangnam Gate Zone, Seoul", emotion: "Despair to resolve", synopsis: "E-rank bottom hunter Dohyeon Kang. Left alone in an abandoned Red Gate, at the moment of death he awakens the 'Error System' no one has ever possessed. Bug or blessing?" } },
    { ko: { title: "듀얼 시스템", pov: "윤세라", setting: "인천 블루게이트 단지", emotion: "갈등과 성장", synopsis: "두 개의 시스템을 동시에 가진 유일한 헌터. 하나는 치유, 하나는 파괴. 동시에 쓰면 몸이 버티지 못한다. 최강의 보스 앞에서 그녀는 선택해야 한다." }, en: { title: "Dual System", pov: "Sera Yoon", setting: "Incheon Blue Gate complex", emotion: "Conflict and growth", synopsis: "The only hunter with two systems. One heals, one destroys. Using both breaks the body. Before the ultimate boss, she must choose." } },
  ],
  [Genre.FANTASY_ROMANCE]: [
    { ko: { title: "악녀는 두 번 죽지 않는다", pov: "아리아 벨몬트", setting: "크로노아 제국 황궁", emotion: "분노와 사랑", synopsis: "독살당한 악녀 아리아가 3년 전으로 회귀했다. 이번 생에서는 나를 죽인 약혼자 대신, 나를 지켜봤던 북방 공작을 선택한다. 그런데 그 공작이 전생의 기억을 가지고 있다." }, en: { title: "The Villainess Won't Die Twice", pov: "Aria Belmont", setting: "Imperial Palace, Chronoa Empire", emotion: "Rage and love", synopsis: "Poisoned villainess Aria regresses 3 years. This time, instead of the fiancé who killed her, she chooses the northern duke who watched over her. But he has memories of the past life too." } },
    { ko: { title: "계약 결혼의 조건", pov: "엘레나 크로스", setting: "아르테미아 공작저", emotion: "경계와 설렘", synopsis: "사교계 최악의 공작에게 온 계약 결혼 제안. 조건: 1년간 완벽한 부부 연기. 대가: 자유. 그런데 연기가 진심이 되어간다." }, en: { title: "Terms of the Contract Marriage", pov: "Elena Cross", setting: "Ducal estate of Artemia", emotion: "Wariness and excitement", synopsis: "A contract marriage proposal from society's worst duke. Terms: one year of perfect couple performance. Reward: freedom. But the act is becoming real." } },
  ],
};
