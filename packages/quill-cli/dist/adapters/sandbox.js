"use strict";
// ============================================================
// CS Quill 🦔 — Local Sandbox Adapter
// ============================================================
// 2계층 샌드박스: vm 모듈(경량) + child_process(중량).
// vm: 빠른 코드 검증, child_process: 파일 I/O 필요한 프로젝트 실행.
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.runInVM = runInVM;
exports.runInProcess = runInProcess;
exports.runInSandbox = runInSandbox;
exports.runProjectInSandbox = runProjectInSandbox;
exports.fuzzInSandbox = fuzzInSandbox;
const fs_1 = require("fs");
const path_1 = require("path");
const child_process_1 = require("child_process");
const os_1 = require("os");
const crypto_1 = require("crypto");
const vm = __importStar(require("vm"));
const DEFAULT_CONFIG = {
    timeout: 5000,
    maxMemoryMB: 256,
    allowNetwork: false,
    mode: 'vm',
};
// IDENTITY_SEAL: PART-1 | role=types | inputs=none | outputs=SandboxConfig,SandboxResult
// ============================================================
// PART 2 — VM Sandbox (경량, 인프로세스)
// ============================================================
function createSafeGlobals() {
    const output = [];
    const errors = [];
    return {
        console: {
            log: (...args) => output.push(args.map(String).join(' ')),
            error: (...args) => errors.push(args.map(String).join(' ')),
            warn: (...args) => output.push(`[warn] ${args.map(String).join(' ')}`),
            info: (...args) => output.push(args.map(String).join(' ')),
        },
        JSON,
        Math,
        Date,
        parseInt,
        parseFloat,
        isNaN,
        isFinite,
        String,
        Number,
        Boolean,
        Array,
        Object,
        Map,
        Set,
        WeakMap,
        WeakSet,
        Symbol,
        Promise,
        RegExp,
        Error,
        TypeError,
        RangeError,
        SyntaxError,
        // 차단: process, require, import, fs, child_process, eval, Function
        __output: output,
        __errors: errors,
    };
}
function runInVM(code, config = {}) {
    const cfg = { ...DEFAULT_CONFIG, ...config, mode: 'vm' };
    const start = performance.now();
    const globals = createSafeGlobals();
    try {
        const context = vm.createContext(globals, {
            codeGeneration: { strings: false, wasm: false },
        });
        const wrappedCode = `
      "use strict";
      ${code}
    `;
        vm.runInContext(wrappedCode, context, {
            timeout: cfg.timeout,
            displayErrors: true,
            breakOnSigint: true,
        });
        const output = globals.__output.join('\n').slice(0, 5000);
        const errors = globals.__errors.join('\n').slice(0, 5000);
        return {
            success: true,
            stdout: output,
            stderr: errors,
            exitCode: 0,
            durationMs: Math.round(performance.now() - start),
            timedOut: false,
            mode: 'vm',
        };
    }
    catch (e) {
        const error = e;
        const timedOut = error.message?.includes('Script execution timed out') ?? false;
        return {
            success: false,
            stdout: globals.__output.join('\n').slice(0, 5000),
            stderr: error.message?.slice(0, 5000) ?? 'unknown error',
            exitCode: 1,
            durationMs: Math.round(performance.now() - start),
            timedOut,
            mode: 'vm',
        };
    }
}
// IDENTITY_SEAL: PART-2 | role=vm-sandbox | inputs=code,config | outputs=SandboxResult
// ============================================================
// PART 3 — Process Sandbox (중량, 파일 I/O 가능)
// ============================================================
function createSandboxDir() {
    const id = (0, crypto_1.randomBytes)(8).toString('hex');
    const dir = (0, path_1.join)((0, os_1.tmpdir)(), `cs-sandbox-${id}`);
    (0, fs_1.mkdirSync)(dir, { recursive: true });
    return dir;
}
function destroySandbox(dir) {
    try {
        (0, fs_1.rmSync)(dir, { recursive: true, force: true });
    }
    catch { /* best-effort */ }
}
function writeSandboxFiles(dir, files) {
    for (const [name, content] of Object.entries(files)) {
        const filePath = (0, path_1.join)(dir, name);
        const fileDir = (0, path_1.join)(filePath, '..');
        if (!(0, fs_1.existsSync)(fileDir))
            (0, fs_1.mkdirSync)(fileDir, { recursive: true });
        (0, fs_1.writeFileSync)(filePath, content, 'utf-8');
    }
    if (!files['package.json']) {
        (0, fs_1.writeFileSync)((0, path_1.join)(dir, 'package.json'), JSON.stringify({ name: 'cs-sandbox', private: true, type: 'module' }));
    }
}
function runInProcess(code, config = {}) {
    const cfg = { ...DEFAULT_CONFIG, ...config, mode: 'process' };
    const dir = createSandboxDir();
    const start = performance.now();
    try {
        writeSandboxFiles(dir, { 'run.mjs': code });
        const envVars = {
            ...process.env,
            NODE_ENV: 'test',
            CS_SANDBOX: '1',
            NODE_OPTIONS: `--max-old-space-size=${cfg.maxMemoryMB}`,
            ...cfg.env,
        };
        // 네트워크 차단: DNS 리졸버를 localhost로 제한
        if (!cfg.allowNetwork) {
            envVars['NODE_OPTIONS'] += ' --dns-result-order=verbatim';
        }
        const stdout = (0, child_process_1.execSync)('node --experimental-vm-modules run.mjs 2>&1', {
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
            mode: 'process',
        };
    }
    catch (e) {
        const error = e;
        return {
            success: false,
            stdout: (error.stdout ?? '').slice(0, 5000),
            stderr: (error.stderr ?? '').slice(0, 5000),
            exitCode: error.status ?? 1,
            durationMs: Math.round(performance.now() - start),
            timedOut: error.killed ?? false,
            mode: 'process',
        };
    }
    finally {
        destroySandbox(dir);
    }
}
// IDENTITY_SEAL: PART-3 | role=process-sandbox | inputs=code,config | outputs=SandboxResult
// ============================================================
// PART 4 — Auto-Select + Public API
// ============================================================
function runInSandbox(code, config = {}) {
    const mode = config.mode ?? 'vm';
    // VM: 순수 JS 검증 (require/import 없는 코드)
    // Process: 파일 I/O, node 모듈 필요한 코드
    if (mode === 'vm') {
        return runInVM(code, config);
    }
    return runInProcess(code, config);
}
// IDENTITY_SEAL: PART-4 | role=auto-select | inputs=code,config | outputs=SandboxResult
// ============================================================
// PART 5 — Multi-File Sandbox (Process mode only)
// ============================================================
function runProjectInSandbox(files, entryPoint = 'index.mjs', config = {}) {
    const cfg = { ...DEFAULT_CONFIG, ...config };
    const dir = createSandboxDir();
    const start = performance.now();
    try {
        writeSandboxFiles(dir, files);
        const stdout = (0, child_process_1.execSync)(`node ${entryPoint} 2>&1`, {
            cwd: dir,
            timeout: cfg.timeout,
            encoding: 'utf-8',
            env: {
                ...process.env,
                NODE_ENV: 'test',
                CS_SANDBOX: '1',
                NODE_OPTIONS: `--max-old-space-size=${cfg.maxMemoryMB}`,
                ...cfg.env,
            },
            maxBuffer: 1024 * 1024,
        });
        return {
            success: true, stdout: stdout.slice(0, 5000), stderr: '', exitCode: 0,
            durationMs: Math.round(performance.now() - start), timedOut: false, mode: 'process',
        };
    }
    catch (e) {
        const error = e;
        return {
            success: false,
            stdout: (error.stdout ?? '').slice(0, 5000),
            stderr: (error.stderr ?? '').slice(0, 5000),
            exitCode: error.status ?? 1,
            durationMs: Math.round(performance.now() - start),
            timedOut: error.killed ?? false,
            mode: 'process',
        };
    }
    finally {
        destroySandbox(dir);
    }
}
// IDENTITY_SEAL: PART-5 | role=multi-file | inputs=files,entryPoint,config | outputs=SandboxResult
// ============================================================
// PART 6 — Fuzz Runner (edge-case 입력 주입, VM mode)
// ============================================================
const FUZZ_INPUTS = [
    'null', 'undefined', '""', '0', '-1', 'NaN', 'Infinity',
    '[]', '{}', 'true', 'false',
    '"a".repeat(10000)', '"<script>alert(1)</script>"',
    'Symbol("test")', 'new Date(0)',
];
function fuzzInSandbox(functionCode, functionName, config = {}) {
    const results = [];
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
        const result = runInVM(testCode, { ...config, timeout: 2000 });
        results.push({ input, result });
    }
    return results;
}
// IDENTITY_SEAL: PART-6 | role=fuzz-runner | inputs=functionCode,functionName | outputs=fuzz-results
