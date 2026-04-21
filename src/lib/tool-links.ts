// ============================================================
// tool-links — Single source for standalone /tools routes
// ============================================================

export type ToolLinkEntry = {
  href: string;
  ko: string;
  en: string;
  ja?: string;
  zh?: string;
};

/** Standalone /tools routes — single source for index, ToolNav, Header dropdown. */
export const TOOL_LINKS: ToolLinkEntry[] = [
  // 2026-04-21: 코드 스튜디오를 집필 OS dock에서 유니버스 내 도구로 이관.
  // 검증형 코드 생성(9-team + Quill 224룰)이라 창작 파이프라인이 아닌 "도구" 카테고리가 맞음.
  { href: "/code-studio", ko: "코드 스튜디오", en: "Code Studio", ja: "コードスタジオ", zh: "代码工作室" },
  { href: "/tools/galaxy-map", ko: "은하 지도", en: "Galaxy Map", ja: "銀河マップ", zh: "银河地图" },
  { href: "/tools/vessel", ko: "함선 비교", en: "Vessel", ja: "艦船クラス", zh: "舰船分类" },
  { href: "/tools/neka-sound", ko: "네카 사운드", en: "NEKA Sound", ja: "ネカサウンド", zh: "音效" },
  { href: "/tools/noa-tower", ko: "NOA 타워", en: "NOA Tower", ja: "ノアタワー", zh: "诺亚塔" },
  { href: "/tools/warp-gate", ko: "워프 게이트", en: "Warp Gate", ja: "ワープゲート", zh: "跃迁门" },
  { href: "/tools/soundtrack", ko: "사운드트랙", en: "Soundtrack", ja: "サウンドトラック", zh: "原声带" },
];

/** Header「도구」드롭다운 */
export const TOOL_LINKS_HEADER_DROPDOWN: ToolLinkEntry[] = TOOL_LINKS;
