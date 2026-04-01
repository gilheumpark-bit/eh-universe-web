// ============================================================
// tool-links — Single source for standalone /tools routes
// ============================================================

export type ToolLinkEntry = {
  href: string;
  ko: string;
  en: string;
  jp?: string;
  cn?: string;
};

/** Standalone /tools routes — single source for index, ToolNav, Header dropdown. */
export const TOOL_LINKS: ToolLinkEntry[] = [
  { href: "/tools/galaxy-map", ko: "은하 지도", en: "Galaxy Map", jp: "銀河マップ", cn: "银河地图" },
  { href: "/tools/vessel", ko: "함선 비교", en: "Vessel", jp: "艦船クラス", cn: "舰船分类" },
  { href: "/tools/neka-sound", ko: "네카 사운드", en: "NEKA Sound", jp: "ネカサウンド", cn: "音效" },
  { href: "/tools/noa-tower", ko: "NOA 타워", en: "NOA Tower", jp: "ノアタワー", cn: "诺亚塔" },
  { href: "/tools/warp-gate", ko: "워프 게이트", en: "Warp Gate", jp: "ワープゲート", cn: "跃迁门" },
  { href: "/tools/soundtrack", ko: "사운드트랙", en: "Soundtrack", jp: "サウンドトラック", cn: "原声带" },
  { href: "/tools/style-studio", ko: "문체 스튜디오", en: "Style Studio", jp: "文体スタジオ", cn: "文体工作室" },
];
