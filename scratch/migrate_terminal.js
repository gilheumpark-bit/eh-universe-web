const fs = require('fs');
const path = require('path');
const p = path.join(process.cwd(), 'apps/desktop/renderer/components/code-studio/TerminalPanel.tsx');
let c = fs.readFileSync(p, 'utf8');

c = c.replace(
  'import { L4 } from "@/lib/i18n";',
  'import { L4, createT } from "@/lib/i18n";\nimport type { AppLanguage } from "@eh/shared-types";'
);

c = c.replace(
  'async function analyzeErrorWithAI(',
  'async function analyzeErrorWithAI('
);

c = c.replace(
  'provider = getActiveProvider();',
  'provider = getActiveProvider();\n    const t = createT(lang as AppLanguage);'
);

c = c.replace(
  'const { lang } = useLang();',
  'const { lang } = useLang();\n  const t = createT(lang as AppLanguage);'
);

c = c.replace(
  `L4(lang, { ko: "분석 완료", en: "Analysis complete" })`,
  `t('terminalPanel.analysisComplete')`
);
c = c.replace(
  `L4(lang, { ko: "stderr 로그를 확인하세요.", en: "Please check stderr logs." })`,
  `t('terminalPanel.stderrLogs')`
);

c = c.replace(
  `L4(lang, { ko: "[출력이 클립보드에 복사됨]", en: "[Output copied to clipboard]" })`,
  `t('terminalPanel.copiedToClipboard')`
);
c = c.replace(
  `L4(lang, { ko: "WebContainer 부팅 중\\u2026", en: "Booting WebContainer\\u2026" })`,
  `t('terminalPanel.booting')`
);
c = c.replace(
  `L4(lang, { ko: "EH Code Studio Terminal v2.0 \\u2014 시뮬레이션 모드", en: "EH Code Studio Terminal v2.0 \\u2014 Simulated Mode" })`,
  `t('terminalPanel.simulatedMode')`
);
c = c.replace(
  `L4(lang, { ko: "실제 명령 실행 가능: npm, node, git, ls, cat 등", en: "Actual commands available: npm, node, git, ls, cat, etc." })`,
  `t('terminalPanel.actualCommands')`
);
c = c.replace(
  `L4(lang, { ko: "시뮬레이션 모드 \\u2014 내장 명령 사용 가능 (type 'help')", en: "Simulated mode \\u2014 built-in commands available (type 'help')" })`,
  `t('terminalPanel.simulatedFallback')`
);
c = c.replace(
  `L4(lang, { ko: "내장 명령으로 대체합니다 (type 'help')", en: "Fallback to built-in commands (type 'help')" })`,
  `t('terminalPanel.fallbackToBuiltin')`
);
c = c.replace(
  `L4(lang, { ko: "[AI 분석 중\\u2026]", en: "[AI analysis in progress\\u2026]" })`,
  `t('terminalPanel.aiAnalysisInProgress')`
);
c = c.replace(
  `L4(lang, { ko: "제안", en: "Suggestion" })`,
  `t('terminalPanel.suggestion')`
);
c = c.replace(
  `L4(lang, { ko: "터미널", en: "Terminal" })`,
  `t('terminalPanel.terminal')`
);
c = c.replace(
  `L4(lang, { ko: "출력 복사", en: "Copy output" })`,
  `t('terminalPanel.copyOutput')`
);
c = c.replace(
  `L4(lang, { ko: "클릭하여 다시 실행", en: "Click to run again" })`,
  `t('terminalPanel.runAgain')`
);
c = c.replace(
  `L4(lang, { ko: "부팅 중\\u2026", en: "Booting\\u2026" })`,
  `t('terminalPanel.booting')`
);
c = c.replace(
  `L4(lang, { ko: "명령어 입력... (Tab: 자동완성, Ctrl+L: 화면 지우기)", en: "command... (Tab: autocomplete, Ctrl+L: clear)" })`,
  `t('terminalPanel.commandInput')`
);

c = c.replace(
  'L4(lang, { ko: `WebContainer 부팅 실패: ${(err as Error).message}`, en: `WebContainer boot failed: ${(err as Error).message}` })',
  `L4(lang, { 
              ko: \`WebContainer 부팅 실패: \${(err as Error).message}\`, 
              en: \`WebContainer boot failed: \${(err as Error).message}\`,
              ja: \`WebContainer 起動失敗: \${(err as Error).message}\`,
              zh: \`WebContainer 启动失败: \${(err as Error).message}\`
            })`
);

c = c.replaceAll(
  'L4(lang, { ko: scrollLock ? "자동 스크롤 켜기" : "스크롤 잠금", en: scrollLock ? "Enable auto-scroll" : "Lock scroll" })',
  `L4(lang, { 
              ko: scrollLock ? "자동 스크롤 켜기" : "스크롤 잠금", 
              en: scrollLock ? "Enable auto-scroll" : "Lock scroll",
              ja: scrollLock ? "自動スクロールを有効にする" : "スクロールをロック",
              zh: scrollLock ? "启用自动滚动" : "锁定滚动"
            })`
);

c = c.replaceAll(
  'L4(lang, { ko: "터미널 명령 입력", en: "Terminal command input" })',
  `L4(lang, { ko: "터미널 명령 입력", en: "Terminal command input", ja: "ターミナルコマンド入力", zh: "终端命令输入" })`
);

fs.writeFileSync(p, c);
console.log("Terminal Panel migrated");
