export type LangKey = "en" | "ja" | "zh";
export type SegStatus = "done" | "review" | "pending";
export type LayoutMode = "split" | "inline";

export interface Segment {
  id: string;
  kind?: "heading" | "dialogue";
  ko: string;
  status: SegStatus;
  terms: string[];
}

interface LangMeta {
  code: string;
  label: string;
  native: string;
  flag: string;
}

export const LANG_TO_TARGET: Record<LangKey, "EN" | "JP" | "CN"> = {
  en: "EN",
  ja: "JP",
  zh: "CN",
};

export const LANGS: Record<LangKey, LangMeta> = {
  en: { code: "EN", label: "영어", native: "English", flag: "EN" },
  ja: { code: "JA", label: "일본어", native: "日本語", flag: "日" },
  zh: { code: "ZH", label: "중국어", native: "中文", flag: "中" },
};

export const REWRITE_CHIPS = ["더 자연스럽게", "원문 결 살리기", "문장 길이 맞추기", "존대 유지"];
