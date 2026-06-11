
import { Genre, AppLanguage } from "./studio-types";
// [N1-noa-identity — 2026-06-11] 화자 2줄·ENGINE LOGIC·OUTPUT RULES 원문은
// noa-identity.ts 로 단일화 (pipeline.buildSystemInstruction 와의 2벌 중복 해소).
import {
  buildNoaSystemHeader,
  NOA_ENGINE_PREAMBLE,
  NOA_ENGINE_LOGIC,
  buildNoaOutputRules,
} from "./ai/noa-identity";

// TRANSLATIONS moved to studio-translations.ts for bundle splitting
export { TRANSLATIONS } from "./studio-translations";

export const ENGINE_VERSION = "10.0";

export const SYSTEM_INSTRUCTION = `
${buildNoaSystemHeader()}

${NOA_ENGINE_PREAMBLE}

${NOA_ENGINE_LOGIC}

${buildNoaOutputRules()}
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
