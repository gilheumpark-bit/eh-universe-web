import type { AppLanguage } from "./studio-types";

import ko from "./translations-ko";
import en from "./translations-en";
import ja from "./translations-ja";
import zh from "./translations-zh";

/**
 * 번역 딕셔너리 shape — KO가 canonical source.
 * EN/JP/CN은 KO 구조와 일치하거나 부분 일치.
 * 완벽한 구조 일치 강제는 빌드 깨짐 위험으로 `typeof ko` 대신 부분 일치 허용.
 */
export type TranslationDict = typeof ko;

export const TRANSLATIONS: Record<AppLanguage, TranslationDict> = {
  KO: ko,
  EN: en as unknown as TranslationDict,
  JP: ja as unknown as TranslationDict,
  CN: zh as unknown as TranslationDict,
};
