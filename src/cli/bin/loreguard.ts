#!/usr/bin/env node
// ============================================================
// loreguard CLI entry — npm bin entry.
//
// Subcommands:
//   loreguard lint <file>      — 5축 검증
//   loreguard simulate <file>  — Reader Simulation
//   loreguard symbols <file>   — Symbol Index
//
// Flags 공통:
//   --token <token>            — LSP API 토큰 (env: LOREGUARD_LSP_TOKEN)
//   --base <url>               — LSP base URL (env: LOREGUARD_BASE_URL)
//   --format <text|json>       — 출력 형식 (default: text)
//
// [C] argv 파싱 — 외부 lib 회피, 단순 substring 매칭
// [G] 단일 entry — bin entry 로 import 후 즉시 실행
// [K] 단일 책임 — 각 subcommand 는 별도 모듈
// ============================================================

import { lintNovel, formatLintResult } from '../commands/lint-novel';
import { simulateNovel, formatSimulateResult } from '../commands/simulate-novel';
import { symbolsNovel, formatSymbolsResult } from '../commands/symbols-novel';

interface ParsedArgs {
  command: string;
  filePath?: string;
  token?: string;
  baseUrl?: string;
  format: 'text' | 'json';
  configPath?: string;
}

function parseArgs(argv: string[]): ParsedArgs {
  const args: ParsedArgs = {
    command: argv[2] ?? 'help',
    format: 'text',
  };
  // argv[3] = filePath (subcommand 직후)
  if (argv[3] && !argv[3].startsWith('--')) {
    args.filePath = argv[3];
  }
  for (let i = 3; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--token' && argv[i + 1]) {
      args.token = argv[++i];
    } else if (arg === '--base' && argv[i + 1]) {
      args.baseUrl = argv[++i];
    } else if (arg === '--format' && argv[i + 1]) {
      args.format = argv[++i] === 'json' ? 'json' : 'text';
    } else if (arg === '--config' && argv[i + 1]) {
      args.configPath = argv[++i];
    } else if (arg.startsWith('--token=')) {
      args.token = arg.slice('--token='.length);
    } else if (arg.startsWith('--base=')) {
      args.baseUrl = arg.slice('--base='.length);
    } else if (arg.startsWith('--format=')) {
      args.format = arg.slice('--format='.length) === 'json' ? 'json' : 'text';
    } else if (arg.startsWith('--config=')) {
      args.configPath = arg.slice('--config='.length);
    }
  }
  return args;
}

function printHelp(): void {
  // 간결한 help — CLI 출력은 console.log 허용 (도구 본분).

  console.log(
    `Loreguard CLI — The IDE for Novelists

Usage:
  loreguard <command> <file> [options]

Commands:
  lint       5-axis verification (synopsis drift / character / world / foreshadow / tension)
  simulate   Reader simulation (5 personas dropout prediction)
  symbols    Symbol Index export (characters / places / items / concepts)
  help       Show this help

Options:
  --token <token>      LSP API token (or LOREGUARD_LSP_TOKEN)
  --base <url>         LSP base URL (or LOREGUARD_BASE_URL, default http://localhost:3000)
  --format <text|json> Output format (default: text)
  --config <path>      Optional config.json (symbols only)

Examples:
  loreguard lint manuscript.md --token=lg_lsp_xxx
  loreguard simulate manuscript.md
  loreguard symbols manuscript.md --config=story.json --format=json
`,
  );
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv);

  if (args.command === 'help' || args.command === '--help' || args.command === '-h') {
    printHelp();
    return;
  }

  if (!args.filePath) {
     
    console.error('Error: file path required');
    printHelp();
    process.exit(1);
  }

  try {
    if (args.command === 'lint') {
      const r = await lintNovel({
        filePath: args.filePath,
        token: args.token,
        baseUrl: args.baseUrl,
      });

      console.log(args.format === 'json' ? JSON.stringify(r, null, 2) : formatLintResult(r));
    } else if (args.command === 'simulate') {
      const r = await simulateNovel({
        filePath: args.filePath,
        token: args.token,
        baseUrl: args.baseUrl,
      });

      console.log(args.format === 'json' ? JSON.stringify(r, null, 2) : formatSimulateResult(r));
    } else if (args.command === 'symbols') {
      const r = await symbolsNovel({
        filePath: args.filePath,
        configPath: args.configPath,
        token: args.token,
        baseUrl: args.baseUrl,
      });

      console.log(args.format === 'json' ? JSON.stringify(r, null, 2) : formatSymbolsResult(r));
    } else {
       
      console.error(`Unknown command: ${args.command}`);
      printHelp();
      process.exit(1);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
     
    console.error(`Error: ${msg}`);
    process.exit(1);
  }
}

void main();
