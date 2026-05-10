// ============================================================
// PART 1 — Module Header
// ============================================================
//
// cli-spec.ts — Loreguard Translation CLI 명령 스펙 (런타임 등록 가능 형태).
//
// 시장 분석 4차 §"CLI" + IR 보고서 §"Cross-border Novel IDE":
//   loreguard translate <file> --to en --mode dual --platform kdp --genre hunter
//   loreguard validate <file> --track faithful
//   loreguard publish <project> --track market --output epub
//
// 본 모듈은 결정론적 spec 정의. 실제 명령 실행은 별 entry point (src/cli/bin/loreguard.ts) 에서
// dynamic import 로 호출. CLI 인프라 변경 영향 회피.
//
// [C] runtime spec — 명령 등록·도움말 자동 생성 가능
// [K] spec 만, 실행 0
// ============================================================

// ============================================================
// PART 2 — Types
// ============================================================

export interface CliCommand {
  name: string;
  description: { ko: string; en: string };
  args: { name: string; description: string; required?: boolean }[];
  options: { flag: string; description: string; default?: string }[];
  examples: string[];
}

// ============================================================
// PART 3 — Spec
// ============================================================

export const TRANSLATE_COMMAND: CliCommand = {
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
    'loreguard translate manuscript.md --to en --mode dual',
    'loreguard translate ch01.md --to en --mode market --genre hunter --platform kdp',
    'loreguard translate ch01.md --to ko --mode faithful',
  ],
};

export const VALIDATE_COMMAND: CliCommand = {
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
    'loreguard validate ch01-en.md ch01.md --track faithful',
    'loreguard validate ch01-en.md ch01.md --track market',
  ],
};

export const PUBLISH_COMMAND: CliCommand = {
  name: 'publish',
  description: {
    ko: '프로젝트 출판 패키지 생성 (EPUB / DOCX)',
    en: 'Generate publish package (EPUB / DOCX) for a project',
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
    'loreguard publish my-novel --track market --output epub',
    'loreguard publish my-novel --track both --output both',
    'loreguard publish my-novel --track faithful --output docx',
  ],
};

// ============================================================
// PART 4 — 도움말 텍스트 자동 생성
// ============================================================

export function buildCliHelpText(lang: 'ko' | 'en' = 'ko'): string {
  const cmds = [TRANSLATE_COMMAND, VALIDATE_COMMAND, PUBLISH_COMMAND];
  const lines: string[] = [];
  lines.push(lang === 'ko'
    ? 'Loreguard Translation CLI — Cross-border Novel IDE'
    : 'Loreguard Translation CLI — Cross-border Novel IDE');
  lines.push('');
  for (const cmd of cmds) {
    lines.push(`  loreguard ${cmd.name} ${cmd.args.map((a) => a.name).join(' ')}`);
    lines.push(`    ${cmd.description[lang]}`);
    if (cmd.options.length > 0) {
      lines.push(lang === 'ko' ? '    옵션:' : '    Options:');
      for (const opt of cmd.options) {
        const defStr = opt.default ? ` (default: ${opt.default})` : '';
        lines.push(`      ${opt.flag.padEnd(28)} ${opt.description}${defStr}`);
      }
    }
    if (cmd.examples.length > 0) {
      lines.push(lang === 'ko' ? '    예시:' : '    Examples:');
      for (const ex of cmd.examples) {
        lines.push(`      $ ${ex}`);
      }
    }
    lines.push('');
  }
  return lines.join('\n');
}

export const ALL_TRANSLATION_COMMANDS: CliCommand[] = [
  TRANSLATE_COMMAND,
  VALIDATE_COMMAND,
  PUBLISH_COMMAND,
];
