// ============================================================
// PART 1 — Module Header
// ============================================================
//
// command-spec.ts — Translation Studio internal command schema.
//
// This file describes deterministic workflow commands that can be rendered in
// product UI, docs, or server-side orchestration. It does not declare a public
// executable or package entry point.
//
// [C] runtime-safe spec — command metadata only
// [K] schema only, no execution
// ============================================================

// ============================================================
// PART 2 — Types
// ============================================================

export interface TranslationCommandSpec {
  name: string;
  description: { ko: string; en: string };
  args: { name: string; description: string; required?: boolean }[];
  options: { flag: string; description: string; default?: string }[];
  examples: string[];
}

// ============================================================
// PART 3 — Spec
// ============================================================

export const TRANSLATE_WORKFLOW_COMMAND: TranslationCommandSpec = {
  name: 'translate',
  description: {
    ko: '소설 파일 듀얼 번역 (Source-faithful + Market-ready)',
    en: 'Dual translate a novel file (Source-faithful + Market-ready)',
  },
  args: [
    { name: '<file>', description: 'Input file path (.md / .txt)', required: true },
  ],
  options: [
    { flag: '--from <lang>', description: 'Source language (ko / en / ja / zh)', default: 'ko' },
    { flag: '--to <lang>', description: 'Target language', default: 'en' },
    { flag: '--mode <mode>', description: "'faithful' | 'market' | 'dual' | 'default'", default: 'dual' },
    { flag: '--genre <id>', description: 'Korean web novel genre (hunter / regression / romantasy / ...)', default: 'generic' },
    { flag: '--platform <id>', description: 'Output platform preset (kdp / royalroad / kakaopage / ...)', default: 'kdp' },
    { flag: '--out <dir>', description: 'Output directory', default: './out' },
  ],
  examples: [
    'translate manuscript.md --to en --mode dual',
    'translate ch01.md --to en --mode market --genre hunter --platform kdp',
    'translate ch01.md --to ko --mode faithful',
  ],
};

export const VALIDATE_WORKFLOW_COMMAND: TranslationCommandSpec = {
  name: 'validate',
  description: {
    ko: '번역본 1원칙 검증 (단락 1:1 / 단어 비율 / 누락)',
    en: 'Validate translation against Rule #1 (paragraph parity / ratio / missing)',
  },
  args: [
    { name: '<file>', description: 'Translation file path', required: true },
    { name: '<source>', description: 'Source file path', required: true },
  ],
  options: [
    { flag: '--track <mode>', description: "'faithful' | 'market'", default: 'faithful' },
    { flag: '--from <lang>', description: 'Source language', default: 'ko' },
    { flag: '--to <lang>', description: 'Target language', default: 'en' },
  ],
  examples: [
    'validate ch01-en.md ch01.md --track faithful',
    'validate ch01-en.md ch01.md --track market',
  ],
};

export const PACKAGE_WORKFLOW_COMMAND: TranslationCommandSpec = {
  name: 'package',
  description: {
    ko: '프로젝트 출고 패키지 생성 (EPUB / DOCX)',
    en: 'Generate release package (EPUB / DOCX) for a project',
  },
  args: [
    { name: '<project>', description: 'Project directory or manifest path', required: true },
  ],
  options: [
    { flag: '--track <mode>', description: "'faithful' | 'market' | 'both'", default: 'market' },
    { flag: '--output <fmt>', description: "'epub' | 'docx' | 'both'", default: 'epub' },
    { flag: '--platform <id>', description: 'Platform preset (KDP / WEBTOON / ...)', default: 'kdp' },
    { flag: '--out <dir>', description: 'Output directory', default: './out' },
  ],
  examples: [
    'package my-novel --track market --output epub',
    'package my-novel --track both --output both',
    'package my-novel --track faithful --output docx',
  ],
};

// ============================================================
// PART 4 — Help Text
// ============================================================

export function buildTranslationCommandHelpText(lang: 'ko' | 'en' = 'ko'): string {
  const commands = [
    TRANSLATE_WORKFLOW_COMMAND,
    VALIDATE_WORKFLOW_COMMAND,
    PACKAGE_WORKFLOW_COMMAND,
  ];
  const lines: string[] = [];
  lines.push(lang === 'ko'
    ? 'Translation Studio Commands — 번역·현지화'
    : 'Translation Studio Commands — Translation & Localization');
  lines.push('');
  for (const command of commands) {
    lines.push(`  ${command.name} ${command.args.map((argument) => argument.name).join(' ')}`);
    lines.push(`    ${command.description[lang]}`);
    if (command.options.length > 0) {
      lines.push(lang === 'ko' ? '    옵션:' : '    Options:');
      for (const option of command.options) {
        const defaultText = option.default ? ` (default: ${option.default})` : '';
        lines.push(`      ${option.flag.padEnd(28)} ${option.description}${defaultText}`);
      }
    }
    if (command.examples.length > 0) {
      lines.push(lang === 'ko' ? '    예시:' : '    Examples:');
      for (const example of command.examples) {
        lines.push(`      ${example}`);
      }
    }
    lines.push('');
  }
  return lines.join('\n');
}

export const ALL_TRANSLATION_WORKFLOW_COMMANDS: TranslationCommandSpec[] = [
  TRANSLATE_WORKFLOW_COMMAND,
  VALIDATE_WORKFLOW_COMMAND,
  PACKAGE_WORKFLOW_COMMAND,
];
