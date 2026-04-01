import type { AppLanguage } from "./studio-types";

import ko from "./translations-ko";
import en from "./translations-en";
import jp from "./translations-jp";
import cn from "./translations-cn";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const TRANSLATIONS: Record<AppLanguage, Record<string, any>> = {
  KO: ko,
  EN: en,
  JP: jp,
  CN: cn,
};
