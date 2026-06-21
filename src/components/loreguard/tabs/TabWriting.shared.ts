import { L4 } from "@/lib/i18n";
import type { AppLanguage } from "@/lib/studio-types";
import { FONT_FAMILIES, type FontFamilyId } from "@/lib/writing-workspace/font-family";
import type { WritingFontMode } from "@/components/loreguard/ComposerExtras";

export const buildS4Str = (lang: AppLanguage) => ({
  aiResultBadge: L4(lang, { ko: "노아", en: "Noa" }),
  aiResultTitle: L4(lang, { ko: "노아 제안 결과", en: "Noa suggestion result" }),
  insertToDraft: L4(lang, { ko: "원고에 삽입", en: "Insert into draft" }),
  dismissResult: L4(lang, { ko: "무시", en: "Dismiss" }),
  expandResult: L4(lang, { ko: "펼치기", en: "Expand" }),
  collapseResult: L4(lang, { ko: "접기", en: "Collapse" }),
  regenerate: L4(lang, { ko: "다시 요청", en: "Request again" }),
  regenerateAria: L4(lang, { ko: "마지막 노아 제안 다시 요청", en: "Request the last Noa suggestion again" }),
  tokenUnit: L4(lang, { ko: "토큰", en: "tokens" }),
  secondsUnit: L4(lang, { ko: "초", en: "s" }),
  tokenMeterAria: L4(lang, { ko: "이번 생성 토큰 사용량", en: "Token usage for this generation" }),
  episodeLabel: L4(lang, { ko: "회차", en: "Episode" }),
  prevEpisodeAria: L4(lang, { ko: "이전 회차로 이동", en: "Go to the previous episode" }),
  nextEpisodeAria: L4(lang, { ko: "다음 회차로 이동", en: "Go to the next episode" }),
  aiInsertSnapshotLabel: L4(lang, { ko: "노아 제안 삽입 전", en: "Before Noa suggestion insert" }),
});

export const S4_PREVIEW_LEN = 160;

export const buildS5Str = (lang: AppLanguage) => ({
  charUnit: L4(lang, { ko: "자", en: " chars" }),
  noSpaceLabel: L4(lang, { ko: "공백제외", en: "excl. spaces" }),
  syllableLabel: L4(lang, { ko: "음절", en: "syllables" }),
  mSpecPill: L4(lang, { ko: "M 규격 5,500-7,000자", en: "M spec 5,500-7,000 chars" }),
  mSpecTitle: L4(lang, {
    ko: "M 규격 · 표준 회차 참고 분량 — 집필과 이동은 그대로 이어집니다",
    en: "M spec (standard episode) reference length — advisory only, no blocking or alerts",
  }),
  selfCheckTitle: L4(lang, { ko: "자가 점검 · 검토 참고", en: "Self-check · review aid" }),
  selfCheckExpand: L4(lang, { ko: "펼치기", en: "Expand" }),
  selfCheckCollapse: L4(lang, { ko: "접기", en: "Collapse" }),
  selfCheckToggleAria: L4(lang, {
    ko: "자가 점검 카드 접기/펼치기",
    en: "Expand or collapse the self-check card",
  }),
  advisoryCaption: L4(lang, { ko: "검토 참고 — 최종 결정은 작가가 합니다", en: "Review aid — the author decides" }),
  rowDeclarative: L4(lang, { ko: "단정형 정리문 종결", en: "Declarative summary endings" }),
  rowExplanatory: L4(lang, { ko: "설명형 종결", en: "Explanatory endings" }),
  rowRepeatedStart: L4(lang, {
    ko: "연속 동일 어절 시작 문장 쌍",
    en: "Consecutive sentences opening with the same word",
  }),
  countUnit: L4(lang, { ko: "건", en: "" }),
  voiceNotice: L4(lang, {
    ko: "Voice 보호: 자동 문체 변환 없음 — 모든 수정은 작가 결정",
    en: "Voice protection: no automatic style rewriting — every change is the author's call",
  }),
});

export function writingFontModeFromFamily(fontFamily: FontFamilyId | string | null | undefined): WritingFontMode {
  const option = FONT_FAMILIES.find((font) => font.id === fontFamily);
  if (option?.kind === "serif") return "serif";
  if (option?.kind === "mono") return "mono";
  return "default";
}

export const HANGUL_SYL_START = 0xac00;
export const HANGUL_SYL_END = 0xd7a3;
export const RE_DECLARATIVE_END = /(?:이었다|였다|것이다|셈이다|터였다)\.[ \t]*$/gm;
export const RE_EXPLANATORY_END = /(?:법이다|뜻이었다|뿐이었다|모양새였다)\.[ \t]*$/gm;
export const RE_SENTENCE_BOUNDARY = /[.!?…]+\s+|\n+/;
export const RE_LEADING_PUNCT = /^["'“”‘’「」『』()\[\]…—-]+/;
export const RE_FIRST_WS = /\s/;

export const CONTEXT_WORLD_FIELDS: ReadonlyArray<{ key: string; ko: string; en: string }> = [
  { key: "corePremise", ko: "핵심 전제", en: "Core premise" },
  { key: "powerStructure", ko: "권력 구조", en: "Power structure" },
  { key: "currentConflict", ko: "현재 갈등", en: "Current conflict" },
  { key: "worldHistory", ko: "역사", en: "History" },
  { key: "magicTechSystem", ko: "마법/기술 체계", en: "Magic / tech system" },
  { key: "socialSystem", ko: "사회 시스템", en: "Social system" },
  { key: "factionRelations", ko: "종족/세력 관계", en: "Faction relations" },
  { key: "economy", ko: "경제/생활", en: "Economy / livelihood" },
  { key: "survivalEnvironment", ko: "생존 환경", en: "Survival environment" },
  { key: "culture", ko: "문화", en: "Culture" },
  { key: "religion", ko: "종교/신화", en: "Religion / mythology" },
  { key: "education", ko: "교육", en: "Education" },
  { key: "lawOrder", ko: "법/질서", en: "Law & order" },
  { key: "taboo", ko: "금기/규범", en: "Taboo / norms" },
  { key: "travelComm", ko: "이동/통신", en: "Travel / communication" },
  { key: "truthVsBeliefs", ko: "믿음 vs 진실", en: "Beliefs vs truth" },
  { key: "dailyLife", ko: "일상", en: "Daily life" },
];

export const NOA_COMPOSE_SURFACE_LABEL: Record<string, string> = {
  project: "프로젝트",
  world: "세계관",
  character: "캐릭터·아이템",
  scenario: "메인 시나리오",
  scene: "씬시트",
  direction: "연출",
  writing: "집필",
  revision: "퇴고",
  translation: "번역·현지화",
  export: "출고",
};
