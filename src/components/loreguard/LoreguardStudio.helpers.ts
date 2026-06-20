import { LOREGUARD_TABS, type LoreguardTabId } from "./LoreguardShell";
import type { ResultType } from "@/components/studio/GlobalSearchPalette";

export const RESULT_TO_TAB: Partial<Record<ResultType, LoreguardTabId>> = {
  project: "project",
  character: "character",
  episode: "writing",
  world: "world",
  text: "writing",
};

export const SHORTCUT_TAB_ORDER: LoreguardTabId[] = [
  "project",
  "world",
  "character",
  "plot",
  "scene",
  "direction",
  "writing",
  "revision",
  "translate",
  "export",
];

const LOREGUARD_TAB_IDS = new Set<LoreguardTabId>(LOREGUARD_TABS.map((tab) => tab.id));

export function readLoreguardTabParam(value: string | null): LoreguardTabId | null {
  return value && LOREGUARD_TAB_IDS.has(value as LoreguardTabId) ? (value as LoreguardTabId) : null;
}

export function latestProjectSessionId(
  project: { sessions?: Array<{ id: string; lastUpdate?: number }> } | null | undefined,
): string | null {
  if (!project?.sessions?.length) return null;
  let latest = project.sessions[0];
  for (const session of project.sessions) {
    if ((session.lastUpdate || 0) > (latest.lastUpdate || 0)) latest = session;
  }
  return latest.id;
}

export const TAB_HELP_SUMMARY: Record<LoreguardTabId, { ko: string; en: string; ja: string; zh: string }> = {
  project: {
    ko: "방향, 출고 형태, 권리 메모를 먼저 잡습니다.",
    en: "Set direction, release format and rights notes first.",
    ja: "方向性、出稿形式、権利メモを先に固めます。",
    zh: "先确定方向、交付形态和权利备注。",
  },
  world: {
    ko: "세계관 원칙과 설정 후보를 질문형 기준으로 정리합니다.",
    en: "Organize world rules and setting candidates with guided questions.",
    ja: "Noa設定ガイドで世界観の原則と設定候補を整理します。",
    zh: "通过 Noa 设置指南整理世界观原则和设定候选。",
  },
  character: {
    ko: "캐릭터, 아이템, 관계를 보드에 쌓습니다.",
    en: "Build characters, items and relationships on the board.",
    ja: "キャラクター、アイテム、関係性をボードに蓄積します。",
    zh: "在看板上整理角色、道具和关系。",
  },
  plot: {
    ko: "메인 시나리오와 흐름을 구조화합니다.",
    en: "Structure the main scenario and story flow.",
    ja: "メインシナリオと流れを構造化します。",
    zh: "结构化主线剧情和故事走向。",
  },
  scene: {
    ko: "화수별 장면, 목적, 갈등, 전환점을 잡습니다.",
    en: "Define each episode's scenes, purpose, conflict and turn.",
    ja: "各話のシーン、目的、対立、転換点を決めます。",
    zh: "确定每章场景、目的、冲突和转折点。",
  },
  direction: {
    ko: "연출 톤, 카메라, 감정선, 장면 리듬을 조율합니다.",
    en: "Tune direction tone, camera, emotion line and scene rhythm.",
    ja: "演出トーン、カメラ、感情線、シーンリズムを調整します。",
    zh: "调整演出语气、镜头、情绪线和场景节奏。",
  },
  writing: {
    ko: "원고 작성, 편집, 검토 요청을 진행합니다.",
    en: "Write, edit and request review for the manuscript.",
    ja: "原稿の執筆、編集、検討依頼を進めます。",
    zh: "进行正文写作、编辑和审阅请求。",
  },
  revision: {
    ko: "퇴고 후보를 보고 작가 승인 기준으로 반영합니다.",
    en: "Review revision candidates and apply only with author approval.",
    ja: "推敲候補を確認し、作者承認基準で反映します。",
    zh: "查看修订候选，并按作者批准标准应用。",
  },
  translate: {
    ko: "번역, 현지화, 검수, 사인오프를 관리합니다.",
    en: "Manage translation, localization, review and sign-off.",
    ja: "翻訳、ローカライズ、検収、サインオフを管理します。",
    zh: "管理翻译、本地化、审校和签核。",
  },
  export: {
    ko: "원고와 과정기록, 권리/IP 점검 자료를 묶습니다.",
    en: "Bundle manuscripts, process records and rights/IP review material.",
    ja: "原稿、過程記録、権利/IP確認資料をまとめます。",
    zh: "打包正文、过程记录和权利/IP 检查资料。",
  },
};
