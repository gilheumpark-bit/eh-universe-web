import type { ComponentType } from "react";
import { Bug, GitBranch, ListTree, ScrollText, Settings2, ShieldCheck, Users } from "lucide-react";

export type LauncherTab =
  | "outline"
  | "long-arc"
  | "debugger"
  | "reader-sim"
  | "diff"
  | "defense"
  | "journal"
  | "settings";

export type JournalView = "inspector" | "provenance";

export type NovelIDELanguage = "KO" | "EN" | "JP" | "CN";
export type CertificateLanguage = "ko" | "en" | "ja" | "zh";

export type LauncherTabDefinition = {
  id: LauncherTab;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

export function getLauncherTabs(isKO: boolean): LauncherTabDefinition[] {
  return [
    { id: "outline", label: isKO ? "구조" : "Structure", icon: ListTree },
    { id: "long-arc", label: isKO ? "장기 맥락" : "Story Arc", icon: GitBranch },
    { id: "debugger", label: isKO ? "모순 점검" : "Continuity", icon: Bug },
    { id: "reader-sim", label: isKO ? "독자" : "Reader", icon: Users },
    { id: "diff", label: isKO ? "의미 비교" : "Meaning", icon: GitBranch },
    { id: "defense", label: isKO ? "맥락 보호" : "Context Guard", icon: ShieldCheck },
    { id: "journal", label: isKO ? "과정기록" : "Records", icon: ScrollText },
    { id: "settings", label: isKO ? "패널 설정" : "Panel", icon: Settings2 },
  ];
}

export function getCertificateLanguage(language: NovelIDELanguage): CertificateLanguage {
  switch (language) {
    case "EN":
      return "en";
    case "JP":
      return "ja";
    case "CN":
      return "zh";
    case "KO":
    default:
      return "ko";
  }
}
