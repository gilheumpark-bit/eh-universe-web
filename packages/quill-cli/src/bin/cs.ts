#!/usr/bin/env node
/**
 * @eh/quill-cli — entry binary
 *
 * Usage:
 *   cs verify [path]    — run quill engine on file or dir
 *   cs apply [path]     — apply suggested fixes
 *   cs audit            — full project audit
 *   cs --version
 *   cs --help
 *
 * Real implementation populated in Phase B-3 by extracting
 * renderer/cli/{bin,commands,adapters,formatters,tui}/*
 */

import { ENGINE_VERSION } from '@eh/quill-engine';

const argv = process.argv.slice(2);
const command = argv[0] ?? 'help';

switch (command) {
  case '--version':
  case '-v':
    console.log(`cs v0.1.0 (engine ${ENGINE_VERSION})`);
    process.exit(0);

  case '--help':
  case '-h':
  case 'help':
    console.log(`
EH Code Studio CLI

USAGE
  cs <command> [args]

COMMANDS
  verify [path]    Run quill engine on file or directory
  apply [path]     Apply suggested fixes
  audit            Full project audit
  help             Show this help

OPTIONS
  -v, --version    Show version
  -h, --help       Show help
`);
    process.exit(0);

  case 'verify':
  case 'apply':
  case 'audit':
    console.log(`[stub] ${command} not yet ported. See Phase B-3.`);
    process.exit(0);

  default:
    console.error(`Unknown command: ${command}`);
    console.error(`Run 'cs help' for usage.`);
    process.exit(1);
}
