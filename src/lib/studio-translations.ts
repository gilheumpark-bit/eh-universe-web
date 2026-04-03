import type { AppLanguage } from "./studio-types";

import ko from "./translations-ko";
import en from "./translations-en";
import ja from "./translations-ja";
import zh from "./translations-zh";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const TRANSLATIONS: Record<AppLanguage, Record<string, any>> = {
  KO: ko,
  EN: en,
  JA: ja,
  ZH: zh,
};
