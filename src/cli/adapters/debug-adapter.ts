// ============================================================
// CS Quill 🦔 — DAP Basic (Node.js Inspector)
// ============================================================
// 기본 디버깅: Node.js 내장 inspector로 breakpoint, step, inspect.
// 풀 DAP가 아닌 경량 디버깅.

import { execSync, spawn } from 'child_process';

// ============================================================
// PART 1 — Types
// ============================================================

export interface BreakpointInfo {
  file: string;
  line: number;
  condition?: string;
}

export interface DebugSession {
  pid: number;
  inspectorUrl: string;
  breakpoints: BreakpointInfo[];
}

// IDENTITY_SEAL: PART-1 | role=types | inputs=none | outputs=BreakpointInfo,DebugSession

// ============================================================
// PART 2 — Node Inspector Launch
// ============================================================

export async function launchDebug(filePath: string, breakpoints?: BreakpointInfo[]): Promise<DebugSession | null> {
  try {
    // Insert debugger statements at breakpoint lines
    if (breakpoints && breakpoints.length > 0) {
      const { readFileSync, writeFileSync } = require('fs');
      const code = readFileSync(filePath, 'utf-8');
      const lines = code.split('\n');

      // Insert in reverse order to preserve line numbers
      const sorted = [...breakpoints].sort((a, b) => b.line - a.line);
      for (const bp of sorted) {
        if (bp.line > 0 && bp.line <= lines.length) {
          const indent = lines[bp.line - 1].match(/^\s*/)?.[0] ?? '';
          lines.splice(bp.line - 1, 0, `${indent}debugger; // CS Quill breakpoint`);
        }
      }

      const debugFile = filePath.replace(/\.(ts|js)$/, '.debug.$1');
      writeFileSync(debugFile, lines.join('\n'));
      filePath = debugFile;
    }

    const child = spawn('node', ['--inspect-brk', filePath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: false,
    });

    let inspectorUrl = '';
    child.stderr?.on('data', (data: Buffer) => {
      const text = data.toString();
      const match = text.match(/ws:\/\/[^\s]+/);
      if (match) inspectorUrl = match[0];
    });

    // Wait briefly for inspector to start (non-blocking)
    await new Promise(resolve => setTimeout(resolve, 1000));

    return {
      pid: child.pid ?? 0,
      inspectorUrl,
      breakpoints: breakpoints ?? [],
    };
  } catch {
    return null;
  }
}

// IDENTITY_SEAL: PART-2 | role=launch | inputs=filePath,breakpoints | outputs=DebugSession

// ============================================================
// PART 3 — Quick Inspect (변수 값 확인)
// ============================================================

export async function quickInspect(code: string, expression: string): Promise<string> {
  const { runInSandbox } = await import('../adapters/sandbox');

  const inspectCode = `
${code}

try {
  const __result = ${expression};
  console.log(JSON.stringify({
    type: typeof __result,
    value: __result === null ? 'null' : __result === undefined ? 'undefined' : JSON.stringify(__result).slice(0, 500),
    constructor: __result?.constructor?.name ?? 'unknown'
  }));
} catch(e) {
  console.log(JSON.stringify({ type: 'error', value: e.message }));
}
`;

  const result = runInSandbox(inspectCode, { timeout: 3000 });

  if (result.success && result.stdout) {
    try {
      return result.stdout.trim();
    } catch { /* skip */ }
  }

  return result.stderr || 'inspect failed';
}

// IDENTITY_SEAL: PART-3 | role=inspect | inputs=code,expression | outputs=string

// ============================================================
// PART 4 — Profile (CPU/Memory 스냅샷)
// ============================================================

export function profileRun(filePath: string, durationSec: number = 5): {
  cpuProfile?: string;
  heapSnapshot?: string;
  duration: number;
} {
  const startTime = performance.now();

  try {
    // CPU profile
    execSync(
      `node --cpu-prof --cpu-prof-interval=1000 --cpu-prof-dir=/tmp "${filePath}" &
       PID=$!
       sleep ${durationSec}
       kill $PID 2>/dev/null`,
      { encoding: 'utf-8', timeout: (durationSec + 5) * 1000 },
    );

    return {
      cpuProfile: '/tmp/*.cpuprofile',
      duration: Math.round(performance.now() - startTime),
    };
  } catch {
    return { duration: Math.round(performance.now() - startTime) };
  }
}

// IDENTITY_SEAL: PART-4 | role=profile | inputs=filePath,duration | outputs=profile
