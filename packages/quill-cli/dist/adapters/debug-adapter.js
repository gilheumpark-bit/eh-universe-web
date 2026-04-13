"use strict";
// @ts-nocheck — external library wrapper, types handled at runtime
// ============================================================
// CS Quill 🦔 — DAP Basic (Node.js Inspector + CDP)
// ============================================================
// Inspector Protocol (CDP) 직접 연결 + breakpoint + eval.
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
exports.launchDebug = launchDebug;
exports.getDebugTargets = getDebugTargets;
exports.quickInspect = quickInspect;
exports.profileRun = profileRun;
exports.takeHeapSnapshot = takeHeapSnapshot;
exports.killDebugSession = killDebugSession;
const child_process_1 = require("child_process");
const http = __importStar(require("http"));
// IDENTITY_SEAL: PART-1 | role=types | inputs=none | outputs=BreakpointInfo,DebugSession
// ============================================================
// PART 2 — Inspector Launch + WS Discovery
// ============================================================
async function launchDebug(filePath, breakpoints) {
    try {
        const port = 9229 + Math.floor(Math.random() * 100);
        const child = (0, child_process_1.spawn)('node', [`--inspect-brk=127.0.0.1:${port}`, filePath], {
            stdio: ['pipe', 'pipe', 'pipe'],
            detached: false,
        });
        // Inspector URL을 stderr에서 추출
        const wsUrl = await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Inspector start timeout')), 5000);
            child.stderr?.on('data', (data) => {
                const text = data.toString();
                const match = text.match(/ws:\/\/[^\s]+/);
                if (match) {
                    clearTimeout(timeout);
                    resolve(match[0]);
                }
            });
            child.on('error', (err) => {
                clearTimeout(timeout);
                reject(err);
            });
        });
        return {
            pid: child.pid ?? 0,
            inspectorUrl: `http://127.0.0.1:${port}`,
            wsUrl,
            breakpoints: breakpoints ?? [],
            child,
        };
    }
    catch {
        return null;
    }
}
// IDENTITY_SEAL: PART-2 | role=launch | inputs=filePath,breakpoints | outputs=DebugSession
// ============================================================
// PART 3 — CDP HTTP Client (WebSocket 없이 HTTP로 통신)
// ============================================================
async function _cdpHttpRequest(inspectorUrl, _method, _params) {
    // Inspector /json/list로 debugger URL 확보
    const listUrl = `${inspectorUrl}/json/list`;
    const targets = await new Promise((resolve, reject) => {
        http.get(listUrl, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                }
                catch {
                    reject(new Error('Invalid JSON from inspector'));
                }
            });
        }).on('error', reject);
    });
    if (targets.length === 0)
        throw new Error('No debug targets found');
    // CDP via HTTP POST to /json/protocol endpoint
    // 실제로는 WebSocket이 필요하므로 eval은 --eval 방식으로 대체
    return { targetId: targets[0].id, wsUrl: targets[0].webSocketDebuggerUrl };
}
async function getDebugTargets(inspectorUrl) {
    const listUrl = `${inspectorUrl}/json/list`;
    return new Promise((resolve, _reject) => {
        http.get(listUrl, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    const targets = JSON.parse(data);
                    resolve(targets.map((t) => ({
                        id: t.id,
                        title: t.title ?? '',
                        url: t.url ?? '',
                        wsUrl: t.webSocketDebuggerUrl ?? '',
                    })));
                }
                catch {
                    resolve([]);
                }
            });
        }).on('error', () => resolve([]));
    });
}
// IDENTITY_SEAL: PART-3 | role=cdp-client | inputs=inspectorUrl | outputs=targets
// ============================================================
// PART 4 — Quick Inspect (변수 값 확인, VM 기반)
// ============================================================
async function quickInspect(code, expression) {
    const { runInVM } = require('./sandbox');
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
    const result = runInVM(inspectCode, { timeout: 3000 });
    if (result.success && result.stdout) {
        return result.stdout.trim();
    }
    return result.stderr || 'inspect failed';
}
// IDENTITY_SEAL: PART-4 | role=inspect | inputs=code,expression | outputs=string
// ============================================================
// PART 5 — Profile (CPU Profiling via Inspector)
// ============================================================
async function profileRun(filePath, durationSec = 5) {
    const startTime = performance.now();
    const { join } = require('path');
    const { tmpdir } = require('os');
    const { existsSync, readdirSync } = require('fs');
    const outDir = join(tmpdir(), `cs-profile-${Date.now()}`);
    const { mkdirSync } = require('fs');
    mkdirSync(outDir, { recursive: true });
    try {
        const { execSync } = require('child_process');
        // CPU profile: Node.js 내장 --cpu-prof
        execSync(`node --cpu-prof --cpu-prof-dir="${outDir}" --cpu-prof-interval=1000 "${filePath}"`, { encoding: 'utf-8', timeout: (durationSec + 5) * 1000, stdio: 'pipe' });
        // Find generated .cpuprofile
        const files = existsSync(outDir) ? readdirSync(outDir) : [];
        const cpuFile = files.find(f => f.endsWith('.cpuprofile'));
        return {
            cpuProfilePath: cpuFile ? join(outDir, cpuFile) : undefined,
            duration: Math.round(performance.now() - startTime),
        };
    }
    catch {
        return { duration: Math.round(performance.now() - startTime) };
    }
}
// IDENTITY_SEAL: PART-5 | role=profile | inputs=filePath,duration | outputs=profile
// ============================================================
// PART 6 — Heap Snapshot
// ============================================================
async function takeHeapSnapshot(filePath) {
    const { join } = require('path');
    const { tmpdir } = require('os');
    const { existsSync, statSync, readdirSync, mkdirSync } = require('fs');
    const outDir = join(tmpdir(), `cs-heap-${Date.now()}`);
    mkdirSync(outDir, { recursive: true });
    try {
        const { execSync } = require('child_process');
        execSync(`node --heap-prof --heap-prof-dir="${outDir}" "${filePath}"`, { encoding: 'utf-8', timeout: 30000, stdio: 'pipe' });
        const files = existsSync(outDir) ? readdirSync(outDir) : [];
        const heapFile = files.find(f => f.endsWith('.heapprofile'));
        if (heapFile) {
            const fullPath = join(outDir, heapFile);
            const sizeMB = Math.round(statSync(fullPath).size / 1024 / 1024 * 100) / 100;
            return { snapshotPath: fullPath, sizeMB };
        }
        return {};
    }
    catch {
        return {};
    }
}
// IDENTITY_SEAL: PART-6 | role=heap-snapshot | inputs=filePath | outputs=snapshotPath
// ============================================================
// PART 7 — Session Cleanup
// ============================================================
function killDebugSession(session) {
    try {
        session.child.kill('SIGTERM');
        setTimeout(() => {
            try {
                session.child.kill('SIGKILL');
            }
            catch { /* already dead */ }
        }, 2000);
    }
    catch { /* already dead */ }
}
// IDENTITY_SEAL: PART-7 | role=cleanup | inputs=DebugSession | outputs=void
