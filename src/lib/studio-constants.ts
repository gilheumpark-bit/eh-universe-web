
import { Genre, AppLanguage } from "./studio-types";

// TRANSLATIONS moved to studio-translations.ts for bundle splitting
export { TRANSLATIONS } from "./studio-translations";

export const ENGINE_VERSION = "10.0";

export const SYSTEM_INSTRUCTION = `
당신은 "NOA 소설 스튜디오"의 핵심 엔진 [ANS 10.0]입니다.
당신은 'Project EH'의 세계관 물리 법칙을 준수하며 작가와 협업하여 소설을 집필합니다.

[ENGINE LOGIC: PROJECT EH CORE DEVICES]
1. 데이터 동기화 (QFR): 소환/이동은 물리적 복제입니다. 렌더링 지연이나 데이터 손상을 서사의 긴장감으로 활용하십시오.
2. 인과율 금융 (CRL): 마법은 세계의 법칙을 시스템으로부터 '대출'받는 행위입니다. 남용 시 영혼의 신용 등급(EH)이 하락하며 파멸에 이릅니다.
3. 개체 최적화 (HPP): 레벨업은 시스템의 '자산 가치 업데이트'입니다. 과도한 오버클럭은 데이터 과부하 부작용을 일으킵니다.
4. 최종 정산 (Audit): 죽음은 '회계적 제명'이자 '부실 자산 상각'입니다. 존재 근거가 지워지는 소멸로 묘사하십시오.

[OUTPUT RULES]
- 반드시 유저가 선택한 [Target Language]를 엄격히 준수하십시오.
- 서사는 4개의 파트로 나누어 출력하되, 문장마다 공학적 연산을 거쳐 치환된 독자용 언어로 묘사하십시오.
- 마지막에 반드시 아래 형식의 분석 리포트를 JSON으로 포함하십시오:
\`\`\`json
{
  "grade": "S~F",
  "metrics": { "tension": 0-100, "pacing": 0-100, "immersion": 0-100 },
  "active_eh_layer": "가동된 EH 핵심 장치명",
  "critique": "해당 언어로 작성된 상세 비평"
}
\`\`\`
`;

export const GENRE_LABELS: Record<AppLanguage, Record<Genre, string>> = {
  KO: {
    [Genre.SF]: "SF",
    [Genre.FANTASY]: "판타지",
    [Genre.ROMANCE]: "로맨스",
    [Genre.THRILLER]: "스릴러",
    [Genre.HORROR]: "공포",
    [Genre.SYSTEM_HUNTER]: "헌터물",
    [Genre.FANTASY_ROMANCE]: "로판",
    [Genre.ALT_HISTORY]: "대체역사",
    [Genre.MODERN_FANTASY]: "현판",
    [Genre.WUXIA]: "무협",
    [Genre.LIGHT_NOVEL]: "라노벨",
  },
  EN: {
    [Genre.SF]: "Sci-Fi",
    [Genre.FANTASY]: "Fantasy",
    [Genre.ROMANCE]: "Romance",
    [Genre.THRILLER]: "Thriller",
    [Genre.HORROR]: "Horror",
    [Genre.SYSTEM_HUNTER]: "System Hunter",
    [Genre.FANTASY_ROMANCE]: "Fan-Rom",
    [Genre.ALT_HISTORY]: "Alt History",
    [Genre.MODERN_FANTASY]: "Modern Fantasy",
    [Genre.WUXIA]: "Wuxia",
    [Genre.LIGHT_NOVEL]: "Light Novel",
  },
  JP: {
    [Genre.SF]: "SF",
    [Genre.FANTASY]: "ファンタジー",
    [Genre.ROMANCE]: "ロマンス",
    [Genre.THRILLER]: "スリラー",
    [Genre.HORROR]: "ホラー",
    [Genre.SYSTEM_HUNTER]: "システムハンター",
    [Genre.FANTASY_ROMANCE]: "悪役令嬢/ロパン",
    [Genre.ALT_HISTORY]: "歴史改変",
    [Genre.MODERN_FANTASY]: "現代ファンタジー",
    [Genre.WUXIA]: "武侠",
    [Genre.LIGHT_NOVEL]: "ラノベ",
  },
  CN: {
    [Genre.SF]: "科幻",
    [Genre.FANTASY]: "奇幻",
    [Genre.ROMANCE]: "浪漫",
    [Genre.THRILLER]: "惊悚",
    [Genre.HORROR]: "恐怖",
    [Genre.SYSTEM_HUNTER]: "系统猎人",
    [Genre.FANTASY_ROMANCE]: "奇幻言情",
    [Genre.ALT_HISTORY]: "架空历史",
    [Genre.MODERN_FANTASY]: "都市奇幻",
    [Genre.WUXIA]: "武侠",
    [Genre.LIGHT_NOVEL]: "轻小说",
  }
};
