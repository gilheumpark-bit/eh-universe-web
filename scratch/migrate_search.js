const fs = require('fs');
const path = require('path');
const p = path.join(process.cwd(), 'apps/desktop/renderer/components/code-studio/SearchPanel.tsx');
let c = fs.readFileSync(p, 'utf8');

c = c.replace(
  'import { L4 } from "@/lib/i18n";',
  'import { L4, createT } from "@/lib/i18n";\nimport type { AppLanguage } from "@eh/shared-types";'
);

c = c.replace(
  '}: FileGroupProps) {',
  '}: FileGroupProps & { t: any }) {'
);

c = c.replace(
  'filePath, results, onOpenFile, showReplace, onReplace, lang',
  'filePath, results, onOpenFile, showReplace, onReplace, t'
);

c = c.replace(
  '{L4(lang, { ko: "바꾸기", en: "Replace" })}',
  "{t('searchPanel.replace')}"
);

c = c.replace(
  'const { lang } = useLang();',
  'const { lang } = useLang();\n  const t = createT(lang as AppLanguage);'
);

c = c.replace(
  'return L4(lang, { ko: `${total}개의 결과 (${fileCount}개 파일)`, en: `${total} result${total !== 1 ? "s" : ""} in ${fileCount} file${fileCount !== 1 ? "s" : ""}` });',
  `return L4(lang, { 
      ko: \`\${total}개의 결과 (\${fileCount}개 파일)\`, 
      en: \`\${total} result\${total !== 1 ? "s" : ""} in \${fileCount} file\${fileCount !== 1 ? "s" : ""}\`,
      ja: \`\${total} 件の結果 (\${fileCount} ファイル)\`,
      zh: \`\${total} 个结果 (\${fileCount} 个文件)\`
    });`
);

c = c.replace(
  '{L4(lang, { ko: "검색", en: "Search" })}',
  "{t('searchPanel.title')}"
);

c = c.replace(
  'L4(lang, { ko: "검색 닫기", en: "Close search" })',
  "t('searchPanel.close')"
);

c = c.replace(
  'L4(lang, { ko: "검색...", en: "Search..." })',
  "t('searchPanel.searchPlaceholder')"
);

c = c.replace(
  'L4(lang, { ko: "검색 기록", en: "Search history" })',
  "t('searchPanel.history')"
);

c = c.replace(
  'L4(lang, { ko: "바꾸기 전환", en: "Toggle replace" })',
  "t('searchPanel.toggleReplace')"
);

c = c.replace(
  'L4(lang, { ko: "바꿀 내용...", en: "Replace with..." })',
  "t('searchPanel.replaceWith')"
);

c = c.replace(
  '{L4(lang, { ko: "모두 바꾸기", en: "Replace All" })}',
  "{t('searchPanel.replaceAll')}"
);

c = c.replace(
  'L4(lang, { ko: "대소문자 구분", en: "Case sensitive" })',
  "t('searchPanel.caseSensitive')"
);

c = c.replace(
  'L4(lang, { ko: "정규식 사용", en: "Use regular expression" })',
  "t('searchPanel.useRegex')"
);

c = c.replace(
  'L4(lang, { ko: "파일 형식 필터", en: "File type filter" })',
  "t('searchPanel.fileTypeFilter')"
);

c = c.replace(
  'L4(lang, { ko: "모든 파일", en: "All Files" })',
  "t('searchPanel.allFiles')"
);

c = c.replace(
  'L4(lang, { ko: "모든 파일", en: "All Files" })',
  "t('searchPanel.allFiles')"
);

c = c.replace(
  '{L4(lang, { ko: "2글자 이상 입력하세요", en: "Type at least 2 characters" })}',
  "{t('searchPanel.typeMore')}"
);

c = c.replace(
  '{L4(lang, { ko: "일치하는 결과 없음", en: "No matching results" })}',
  "{t('searchPanel.noResults')}"
);

c = c.replace(
  'lang={lang}',
  'lang={lang}\n              t={t}'
);

fs.writeFileSync(p, c);
console.log("Migration complete");
