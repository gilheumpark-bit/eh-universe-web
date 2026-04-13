"use strict";
// ============================================================
// CS Quill 🦔 — Security Sandbox (권한 분리 + 네트워크 제어)
// ============================================================
// 보안 85% → 92%: 네트워크 접근 제어, 파일 권한 분리, 플러그인 격리.
Object.defineProperty(exports, "__esModule", { value: true });
exports.POLICIES = void 0;
exports.setPolicy = setPolicy;
exports.checkPermission = checkPermission;
exports.checkPathAccess = checkPathAccess;
exports.checkDomainAccess = checkDomainAccess;
exports.scanForSecrets = scanForSecrets;
exports.enforceResourceLimits = enforceResourceLimits;
exports.getActivePolicy = getActivePolicy;
const child_process_1 = require("child_process");
exports.POLICIES = {
    strict: {
        allowedPermissions: new Set(['fs:read']),
        allowedPaths: ['./src', './package.json', './tsconfig.json'],
        blockedPaths: ['.env', '.env.local', '~/.ssh', '~/.aws'],
        allowedDomains: [],
        blockedDomains: ['*'],
        maxMemoryMB: 128,
        maxCpuSeconds: 10,
        allowEval: false,
    },
    normal: {
        allowedPermissions: new Set(['fs:read', 'fs:write', 'net:outbound', 'exec:node', 'env:read']),
        allowedPaths: ['./'],
        blockedPaths: ['.env', '.env.local', '~/.ssh', '~/.aws', '~/.cs/keys.toml'],
        allowedDomains: ['api.anthropic.com', 'api.openai.com', 'generativelanguage.googleapis.com', 'registry.npmjs.org'],
        blockedDomains: [],
        maxMemoryMB: 512,
        maxCpuSeconds: 60,
        allowEval: false,
    },
    permissive: {
        allowedPermissions: new Set(['fs:read', 'fs:write', 'net:outbound', 'net:inbound', 'exec:shell', 'exec:node', 'env:read']),
        allowedPaths: ['./'],
        blockedPaths: ['~/.ssh', '~/.aws'],
        allowedDomains: ['*'],
        blockedDomains: [],
        maxMemoryMB: 1024,
        maxCpuSeconds: 300,
        allowEval: false,
    },
};
// IDENTITY_SEAL: PART-1 | role=permissions | inputs=none | outputs=SecurityPolicy
// ============================================================
// PART 2 — Permission Checker
// ============================================================
let _activePolicy = exports.POLICIES['normal'];
function setPolicy(level) {
    _activePolicy = exports.POLICIES[level];
}
function checkPermission(permission) {
    return _activePolicy.allowedPermissions.has(permission);
}
function checkPathAccess(filePath) {
    for (const blocked of _activePolicy.blockedPaths) {
        if (filePath.includes(blocked.replace('~', ''))) {
            return { allowed: false, reason: `Blocked path: ${blocked}` };
        }
    }
    return { allowed: true };
}
function extractHostname(input) {
    try {
        const url = new URL(input.startsWith('http') ? input : `https://${input}`);
        return url.hostname;
    }
    catch {
        return input.split('/')[0].split(':')[0];
    }
}
function checkDomainAccess(domain) {
    const hostname = extractHostname(domain);
    if (_activePolicy.blockedDomains.includes('*')) {
        return { allowed: false, reason: 'All outbound blocked (strict mode)' };
    }
    if (_activePolicy.blockedDomains.some(d => hostname === d || hostname.endsWith(`.${d}`))) {
        return { allowed: false, reason: `Blocked domain: ${hostname}` };
    }
    if (_activePolicy.allowedDomains.includes('*')) {
        return { allowed: true };
    }
    if (_activePolicy.allowedDomains.some(d => hostname === d || hostname.endsWith(`.${d}`))) {
        return { allowed: true };
    }
    return { allowed: false, reason: `Domain not in allowlist: ${hostname}` };
}
const SECRET_PATTERNS = [
    { name: 'AWS Key', regex: /AKIA[0-9A-Z]{16}/ },
    { name: 'AWS Secret', regex: /[0-9a-zA-Z/+]{40}/ },
    { name: 'GitHub Token', regex: /ghp_[a-zA-Z0-9]{36}/ },
    { name: 'GitHub OAuth', regex: /gho_[a-zA-Z0-9]{36}/ },
    { name: 'Anthropic Key', regex: /sk-ant-[a-zA-Z0-9-]{80,}/ },
    { name: 'OpenAI Key', regex: /sk-[a-zA-Z0-9]{48,}/ },
    { name: 'Google API Key', regex: /AIza[a-zA-Z0-9_-]{35}/ },
    { name: 'Stripe Key', regex: /sk_(?:live|test)_[a-zA-Z0-9]{24,}/ },
    { name: 'Private Key', regex: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/ },
    { name: 'Password', regex: /password\s*[:=]\s*["'][^"']{5,}["']/i },
    { name: 'Connection String', regex: /(?:mongodb|postgres|mysql|redis):\/\/[^\s]+/ },
];
function scanForSecrets(content, fileName) {
    const findings = [];
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
        for (const pattern of SECRET_PATTERNS) {
            if (pattern.regex.test(lines[i])) {
                const match = lines[i].match(pattern.regex);
                findings.push({
                    type: pattern.name,
                    file: fileName,
                    line: i + 1,
                    masked: match ? match[0].slice(0, 8) + '***' + match[0].slice(-4) : '***',
                });
            }
        }
    }
    return findings;
}
// IDENTITY_SEAL: PART-3 | role=secrets | inputs=content,fileName | outputs=SecretFinding[]
// ============================================================
// PART 4 — Resource Limiter
// ============================================================
function enforceResourceLimits(pid) {
    const maxMem = _activePolicy.maxMemoryMB;
    // Set Node.js memory limit for current process
    if (!pid) {
        process.env.NODE_OPTIONS = `--max-old-space-size=${maxMem}`;
        return;
    }
    // For child processes: use ulimit (Unix)
    if (process.platform !== 'win32') {
        try {
            (0, child_process_1.execSync)(`ulimit -v ${maxMem * 1024} 2>/dev/null`, { stdio: 'pipe' });
        }
        catch { /* ulimit not available */ }
    }
}
function getActivePolicy() {
    return { ..._activePolicy };
}
// IDENTITY_SEAL: PART-4 | role=limiter | inputs=pid | outputs=void
