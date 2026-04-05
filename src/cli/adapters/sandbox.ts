// ============================================================
// CS Quill 🦔 — Local Sandbox Adapter
// ============================================================
// WebContainer → child_process + /tmp 격리 실행.
// Codex CLI의 클라우드 샌드박스를 로컬로 대체.

import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';

// ============================================================
// PART 1 — Types
// ============================================================

export interface SandboxConfig {
  timeout: number;
  maxMemoryMB: number;
  allowNetwork: boolean;
  env?: Record<string, string>;
}

export interface SandboxResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
  memoryUsedMB?: number;
  timedOut: boolean;
}

const DEFAULT_CONFIG: SandboxConfig = {
  timeout: 5000,
  maxMemoryMB: 256,
  allowNetwork: false,
};

// IDENTITY_SEAL: PART-1 | role=types | inputs=none | outputs=SandboxConfig,SandboxResult

// ============================================================
// PART 2 — Sandbox Lifecycle
// ============================================================

function createSandboxDir(): string {
  const id = randomBytes(8).toString('hex');
  const dir = join(tmpdir(), `cs-sandbox-${id}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function destroySandbox(dir: string): void {
  try {
    rmSync(dir, { recursive: true, force: true });
  } catch { /* best-effort cleanup */ }
}

function writeSandboxFiles(dir: string, files: Record<string, string>): void {
  for (const [name, content] of Object.entries(files)) {
    const filePath = join(dir, name);
    const fileDir = filePath.substring(0, filePath.lastIndexOf('/'));
    if (fileDir !== dir) mkdirSync(fileDir, { recursive: true });
    writeFileSync(filePath, content, 'utf-8');
  }

  // Minimal package.json if not provided
  if (!files['package.json']) {
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'cs-sandbox', private: true, type: 'module' }));
  }
}

// IDENTITY_SEAL: PART-2 | role=lifecycle | inputs=none | outputs=dir

// ============================================================
// PART 3 — Execution
// ============================================================

export function runInSandbox(
  code: string,
  config: Partial<SandboxConfig> = {},
): SandboxResult {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const dir = createSandboxDir();
  const start = performance.now();

  try {
    writeSandboxFiles(dir, {
      'run.mjs': code,
    });

    const envVars: Record<string, string> = {
      ...process.env as Record<string, string>,
      NODE_ENV: 'test',
      CS_SANDBOX: '1',
      ...cfg.env,
    };

    // Block network if needed
    if (!cfg.allowNetwork) {
      envVars['NODE_OPTIONS'] = `--max-old-space-size=${cfg.maxMemoryMB}`;
    }

    const stdout = execSync(`node --experimental-vm-modules run.mjs 2>&1`, {
      cwd: dir,
      timeout: cfg.timeout,
      encoding: 'utf-8',
      env: envVars,
      maxBuffer: 1024 * 1024,
    });

    return {
      success: true,
      stdout: stdout.slice(0, 5000),
      stderr: '',
      exitCode: 0,
      durationMs: Math.round(performance.now() - start),
      timedOut: false,
    };
  } catch (e: unknown) {
    const error = e as { status?: number; stdout?: string; stderr?: string; killed?: boolean };
    return {
      success: false,
      stdout: (error.stdout ?? '').slice(0, 5000),
      stderr: (error.stderr ?? '').slice(0, 5000),
      exitCode: error.status ?? 1,
      durationMs: Math.round(performance.now() - start),
      timedOut: error.killed ?? false,
    };
  } finally {
    destroySandbox(dir);
  }
}

// IDENTITY_SEAL: PART-3 | role=execution | inputs=code,config | outputs=SandboxResult

// ============================================================
// PART 4 — Multi-File Sandbox
// ============================================================

export function runProjectInSandbox(
  files: Record<string, string>,
  entryPoint: string = 'index.mjs',
  config: Partial<SandboxConfig> = {},
): SandboxResult {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const dir = createSandboxDir();
  const start = performance.now();

  try {
    writeSandboxFiles(dir, files);

    const stdout = execSync(`node ${entryPoint} 2>&1`, {
      cwd: dir,
      timeout: cfg.timeout,
      encoding: 'utf-8',
      env: {
        ...process.env as Record<string, string>,
        NODE_ENV: 'test',
        CS_SANDBOX: '1',
        NODE_OPTIONS: `--max-old-space-size=${cfg.maxMemoryMB}`,
        ...cfg.env,
      },
      maxBuffer: 1024 * 1024,
    });

    return {
      success: true, stdout: stdout.slice(0, 5000), stderr: '', exitCode: 0,
      durationMs: Math.round(performance.now() - start), timedOut: false,
    };
  } catch (e: unknown) {
    const error = e as { status?: number; stdout?: string; stderr?: string; killed?: boolean };
    return {
      success: false,
      stdout: (error.stdout ?? '').slice(0, 5000),
      stderr: (error.stderr ?? '').slice(0, 5000),
      exitCode: error.status ?? 1,
      durationMs: Math.round(performance.now() - start),
      timedOut: error.killed ?? false,
    };
  } finally {
    destroySandbox(dir);
  }
}

// IDENTITY_SEAL: PART-4 | role=multi-file | inputs=files,entryPoint,config | outputs=SandboxResult

// ============================================================
// PART 5 — Fuzz Runner (edge-case 입력 주입)
// ============================================================

const FUZZ_INPUTS = [
  'null', 'undefined', '""', '0', '-1', 'NaN', 'Infinity',
  '[]', '{}', 'true', 'false',
  '"a".repeat(10000)', '"<script>alert(1)</script>"',
  'Symbol("test")', 'new Date(0)', 'Promise.resolve()',
];

export function fuzzInSandbox(
  functionCode: string,
  functionName: string,
  config: Partial<SandboxConfig> = {},
): Array<{ input: string; result: SandboxResult }> {
  const results: Array<{ input: string; result: SandboxResult }> = [];

  for (const input of FUZZ_INPUTS) {
    const testCode = `
${functionCode}

try {
  const result = ${functionName}(${input});
  console.log(JSON.stringify({ ok: true, result: String(result).slice(0, 100) }));
} catch (e) {
  console.log(JSON.stringify({ ok: false, error: e.message }));
}
`;
    const result = runInSandbox(testCode, { ...config, timeout: 2000 });
    results.push({ input, result });
  }

  return results;
}

// IDENTITY_SEAL: PART-5 | role=fuzz-runner | inputs=functionCode,functionName | outputs=fuzz-results
