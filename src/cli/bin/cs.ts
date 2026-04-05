#!/usr/bin/env node
// ============================================================
// CS Quill 🦔 — CLI Entry Point
// ============================================================

import { Command } from 'commander';
import { resolveAlias } from '../core/alias';

const VERSION = '0.1.0';

// ============================================================
// PART 1 — Program Setup
// ============================================================

const program = new Command();

program
  .name('cs')
  .description('🦔 CS Quill — 코드 퀄리티 지키는 고슴도치')
  .version(VERSION);

// ============================================================
// PART 2 — Core Commands
// ============================================================

program
  .command('init')
  .description('프로젝트 초기화 (온보딩)')
  .action(async () => {
    const { runInit } = await import('../commands/init');
    await runInit();
  });

program
  .command('generate <prompt>')
  .alias('g')
  .description('코드 생성 (SEAL 계약 병렬)')
  .option('--mode <mode>', '생성 모드: fast | full | strict', 'full')
  .option('--structure <type>', '코드 구조: auto | on | off', 'auto')
  .option('--with-tests', '테스트 코드 동시 생성')
  .option('--commit', '생성 후 자동 커밋')
  .option('--pr', '생성 후 PR 생성')
  .option('--dry-run', '실행 계획만 미리보기')
  .option('--no-tui', 'TUI 없이 실행')
  .action(async (prompt, opts) => {
    const { runGenerate } = await import('../commands/generate');
    await runGenerate(prompt, opts);
  });

program
  .command('verify [path]')
  .alias('v')
  .description('8팀 병렬 검증 (로컬, $0)')
  .option('--threshold <score>', '통과 기준점', '77')
  .option('--format <fmt>', '출력 포맷: table | json | sarif', 'table')
  .option('--watch', '파일 변경 시 자동 검증')
  .option('--parallel', 'worker_threads 병렬 실행', true)
  .action(async (path, opts) => {
    const { runVerify } = await import('../commands/verify');
    await runVerify(path ?? './src', opts);
  });

program
  .command('audit')
  .alias('a')
  .description('16영역 프로젝트 감사')
  .option('--format <fmt>', '출력 포맷: table | json | sarif', 'table')
  .option('--trend', '주간 품질 추이')
  .action(async (opts) => {
    const { runAudit } = await import('../commands/audit');
    await runAudit(opts);
  });

// ============================================================
// PART 3 — Performance Commands
// ============================================================

program
  .command('stress [path]')
  .description('실측 부하 테스트')
  .option('--scenario <name>', '시나리오: normal | heavy | spike | soak | breakpoint | cascade | memory-leak | cold-start')
  .option('--users <n>', '가상 유저 수', '100')
  .option('--duration <sec>', '테스트 시간(초)', '30')
  .action(async (path, opts) => {
    const { runStress } = await import('../commands/stress');
    await runStress(path ?? './src', opts);
  });

program
  .command('bench [path]')
  .description('함수별 벤치마크')
  .option('--save <name>', '베이스라인 저장')
  .option('--compare <name>', '베이스라인 비교')
  .option('--fail-if-slower <pct>', 'N% 느려지면 실패')
  .action(async (path, opts) => {
    const { runBench } = await import('../commands/bench');
    await runBench(path ?? './src', opts);
  });

program
  .command('playground')
  .description('🎮 44엔진 풀벤치마크')
  .option('--full', '44엔진 전부 실행')
  .option('--compare <project>', '오픈소스 프로젝트와 비교')
  .option('--leaderboard', '글로벌 리더보드')
  .option('--challenge', '이번 주 챌린지')
  .option('--share', '벤치마크 카드 생성')
  .action(async (opts) => {
    const { runPlayground } = await import('../commands/playground');
    await runPlayground(opts);
  });

// ============================================================
// PART 4 — Security & Compliance
// ============================================================

program
  .command('ip-scan [path]')
  .description('IP/특허/라이선스 스캔')
  .action(async (path, opts) => {
    const { runIpScan } = await import('../commands/ip-scan');
    await runIpScan(path ?? './src', opts);
  });

program
  .command('compliance')
  .description('배포 전 컴플라이언스 원스톱 체크')
  .option('--pre-release', '릴리즈 전 전체 검사')
  .action(async (opts) => {
    const { runCompliance } = await import('../commands/compliance');
    await runCompliance(opts);
  });

// ============================================================
// PART 5 — User-Friendly Commands
// ============================================================

program
  .command('vibe <prompt>')
  .description('🎵 바이브 모드 — 자연어 100%, 기술 0')
  .action(async (prompt) => {
    const { runVibe } = await import('../commands/vibe');
    await runVibe(prompt);
  });

program
  .command('explain [path]')
  .description('코드 해설 (PART별 분석)')
  .action(async (path) => {
    const { runExplain } = await import('../commands/explain');
    await runExplain(path ?? '.');
  });

program
  .command('sprint')
  .description('목록 순차 자동 생성')
  .argument('<tasks>', '태스크 목록 (줄바꿈 구분)')
  .action(async (tasks) => {
    const { runSprint } = await import('../commands/sprint');
    await runSprint(tasks);
  });

program
  .command('learn')
  .description('🎓 학습 모드 — 수정 이유 해설')
  .action(async () => {
    const { runLearn } = await import('../commands/learn');
    await runLearn();
  });

program
  .command('suggest')
  .description('💡 프로젝트 개선 추천')
  .action(async () => {
    const { runSuggest } = await import('../commands/suggest');
    await runSuggest();
  });

program
  .command('bookmark <action> [args...]')
  .description('🔖 프롬프트 즐겨찾기 (list|add|remove|run)')
  .action(async (action, args) => {
    const { runBookmark } = await import('../commands/bookmark');
    await runBookmark(action, args);
  });

program
  .command('preset <action> [args...]')
  .description('📦 커뮤니티 프리셋 (list|show|install|remove)')
  .action(async (action, args) => {
    const { runPreset } = await import('../commands/preset');
    await runPreset(action, args);
  });

// ============================================================
// PART 6 — File Management
// ============================================================

program
  .command('apply [file]')
  .description('수정본 → 원본 적용')
  .option('--all', '전체 적용')
  .action(async (file, opts) => {
    const { runApply } = await import('../commands/apply');
    await runApply(file, opts);
  });

program
  .command('undo')
  .description('마지막 수정 되돌리기')
  .option('--all', '전부 되돌리기')
  .action(async (opts) => {
    const { runUndo } = await import('../commands/apply');
    await runUndo(opts);
  });

// ============================================================
// PART 7 — Configuration & Server
// ============================================================

program
  .command('config <action>')
  .description('설정 관리 (keys, structure, level)')
  .action(async (action) => {
    const { runConfig } = await import('../commands/config');
    await runConfig(action);
  });

program
  .command('serve [port]')
  .description('로컬 API 서버 (웹/IDE 연동)')
  .action(async (port) => {
    const { runServe } = await import('../commands/serve');
    await runServe(port ?? '8080');
  });

program
  .command('report')
  .description('일일/팀 리포트')
  .option('--today', '오늘 리포트')
  .option('--team', '팀 리포트')
  .option('--week', '주간 리포트')
  .action(async (opts) => {
    const { runReport } = await import('../commands/report');
    await runReport(opts);
  });

program
  .command('search <query>')
  .description('🔍 프로젝트 내 코드/파일/심볼 검색')
  .option('--files', '파일명 퍼지 검색')
  .option('--symbols', '함수/클래스/타입 검색')
  .option('--glob <pattern>', '파일 필터')
  .action(async (query, opts) => {
    const rootPath = process.cwd();
    if (opts.files) {
      const { fuzzyFileSearch } = await import('../adapters/search-engine');
      const results = fuzzyFileSearch(query, rootPath);
      for (const r of results) console.log(`  ${r.file} (score: ${r.score})`);
    } else if (opts.symbols) {
      const { symbolSearch } = await import('../adapters/search-engine');
      const results = symbolSearch(query, rootPath);
      for (const r of results) console.log(`  ${r.type.padEnd(10)} ${r.name.padEnd(30)} ${r.file}:${r.line}`);
    } else {
      const { ripgrepSearch } = await import('../adapters/search-engine');
      const results = ripgrepSearch(query, rootPath, { glob: opts.glob });
      for (const r of results) console.log(`  ${r.file}:${r.line}  ${r.content.slice(0, 80)}`);
    }
  });

program
  .command('session [action]')
  .description('📋 세션 관리 (list|show|delete)')
  .action(async (action) => {
    const { listSessions, getSessionSummary, getCurrentSession, deleteSession } = await import('../core/session');
    switch (action) {
      case 'list': {
        const sessions = listSessions();
        if (sessions.length === 0) { console.log('  📭 세션 없음\n'); return; }
        console.log('🦔 세션 목록\n');
        for (const s of sessions.slice(0, 10)) {
          console.log(`  ${s.id} — ${s.projectName} (${s.lastCommand}) ${new Date(s.updatedAt).toLocaleDateString()}`);
        }
        console.log('');
        break;
      }
      case 'show': {
        console.log('🦔 현재 세션\n');
        console.log(getSessionSummary());
        console.log('');
        break;
      }
      case 'delete': {
        const current = getCurrentSession();
        if (current) { deleteSession(current.id); console.log(`  🗑️ ${current.id} 삭제됨`); }
        break;
      }
      default:
        console.log(getSessionSummary());
    }
  });

program
  .command('debug <file>')
  .description('🐛 기본 디버깅 (Node.js inspector)')
  .option('--inspect <expression>', '변수/표현식 값 확인')
  .action(async (file, opts) => {
    if (opts.inspect) {
      const { readFileSync } = await import('fs');
      const { quickInspect } = await import('../adapters/debug-adapter');
      const code = readFileSync(file, 'utf-8');
      const result = await quickInspect(code, opts.inspect);
      console.log(`  🔍 ${opts.inspect} = ${result}`);
    } else {
      const { launchDebug } = await import('../adapters/debug-adapter');
      console.log(`  🐛 Node Inspector 시작: ${file}`);
      const session = launchDebug(file);
      if (session) {
        console.log(`  PID: ${session.pid}`);
        console.log(`  Inspector: ${session.inspectorUrl}`);
        console.log('  Chrome DevTools에서 열기: chrome://inspect');
      } else {
        console.log('  ❌ 디버깅 시작 실패');
      }
    }
  });

// ============================================================
// PART 8 — Alias Resolution & Execute
// ============================================================

// 다국어 alias 처리: "cs 생성" → "cs generate", "cs 검증" → "cs verify"
const args = process.argv.slice(2);
if (args.length > 0) {
  const resolved = resolveAlias(args[0]);
  if (resolved !== args[0]) {
    process.argv[2] = resolved;
  }
}

program.parse();

// IDENTITY_SEAL: PART-1~8 | role=CLI-entrypoint | inputs=process.argv | outputs=command-execution
