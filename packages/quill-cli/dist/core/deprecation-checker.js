"use strict";
// ============================================================
// CS Quill 🦔 — Deprecation Checker
// ============================================================
// package.json 버전 감지 → 구형 코드 패턴 경고.
// 8팀 파이프라인에 주입 가능한 deprecation 규칙 DB.
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkDeprecations = checkDeprecations;
exports.formatDeprecationReport = formatDeprecationReport;
const fs_1 = require("fs");
const path_1 = require("path");
const RULES = [
    // React 19+
    { framework: 'react', minVersion: '19', pattern: /React\.FC/g, message: 'React.FC 불필요 (React 19)', replacement: '일반 함수 타입으로 교체', severity: 'warning' },
    { framework: 'react', minVersion: '19', pattern: /forwardRef/g, message: 'forwardRef 제거됨 (React 19)', replacement: 'ref를 일반 prop으로 전달', severity: 'error' },
    { framework: 'react', minVersion: '19', pattern: /defaultProps/g, message: 'defaultProps deprecated (React 19)', replacement: 'ES 기본값 파라미터 사용', severity: 'warning' },
    { framework: 'react', minVersion: '19', pattern: /propTypes/g, message: 'propTypes deprecated', replacement: 'TypeScript 타입 사용', severity: 'warning' },
    // Next.js 14+ (App Router)
    { framework: 'next', minVersion: '14', pattern: /getServerSideProps/g, message: 'getServerSideProps 제거됨', replacement: 'Server Component에서 직접 fetch', severity: 'error' },
    { framework: 'next', minVersion: '14', pattern: /getStaticProps/g, message: 'getStaticProps 제거됨', replacement: 'Server Component + generateStaticParams', severity: 'error' },
    { framework: 'next', minVersion: '14', pattern: /next\/router/g, message: 'next/router deprecated', replacement: 'next/navigation 사용', severity: 'error' },
    { framework: 'next', minVersion: '14', pattern: /next\/head/g, message: 'next/head deprecated', replacement: 'Metadata API (export const metadata) 사용', severity: 'warning' },
    { framework: 'next', minVersion: '14', pattern: /_app\.tsx|_document\.tsx/g, message: '_app/_document 제거됨', replacement: 'app/layout.tsx 사용', severity: 'error' },
    // Tailwind 4+
    { framework: 'tailwindcss', minVersion: '4', pattern: /tailwind\.config\.(js|ts)/g, message: 'tailwind.config.js deprecated (v4)', replacement: 'CSS-first @theme 설정', severity: 'warning' },
    // TypeScript 5+
    { framework: 'typescript', minVersion: '5', pattern: /\benum\s+\w+/g, message: 'enum 사용 주의', replacement: 'const object + as const 추천', severity: 'warning' },
    // Node.js 18+
    { framework: 'node', minVersion: '18', pattern: /require\s*\(/g, message: 'require() → ESM import 권장 (Node 18+)', replacement: 'import ... from ...', severity: 'warning' },
    { framework: 'node', minVersion: '18', pattern: /new Buffer\s*\(/g, message: 'new Buffer() deprecated', replacement: 'Buffer.from() 또는 Buffer.alloc()', severity: 'error' },
    // Vue 3+
    { framework: 'vue', minVersion: '3', pattern: /Vue\.component/g, message: 'Vue.component deprecated (Vue 3)', replacement: 'defineComponent + <script setup>', severity: 'error' },
    { framework: 'vue', minVersion: '3', pattern: /new Vue\(/g, message: 'new Vue() deprecated (Vue 3)', replacement: 'createApp()', severity: 'error' },
    // Express 5+
    { framework: 'express', minVersion: '5', pattern: /app\.del\(/g, message: 'app.del() removed (Express 5)', replacement: 'app.delete()', severity: 'error' },
    { framework: 'express', minVersion: '5', pattern: /res\.sendfile\(/g, message: 'res.sendfile() removed (Express 5)', replacement: 'res.sendFile()', severity: 'error' },
];
function detectVersions(rootPath) {
    const pkgPath = (0, path_1.join)(rootPath, 'package.json');
    if (!(0, fs_1.existsSync)(pkgPath))
        return {};
    try {
        const pkg = JSON.parse((0, fs_1.readFileSync)(pkgPath, 'utf-8'));
        const all = { ...pkg.dependencies, ...pkg.devDependencies };
        return {
            react: all.react?.replace(/[\^~]/g, ''),
            next: all.next?.replace(/[\^~]/g, ''),
            tailwindcss: all.tailwindcss?.replace(/[\^~]/g, ''),
            typescript: all.typescript?.replace(/[\^~]/g, ''),
        };
    }
    catch {
        return {};
    }
}
function majorVersion(version) {
    if (!version)
        return 0;
    // semver range 안전 파싱: "^17.0.0", ">=17 <19", "*", "~5.3" 등 처리
    const cleaned = version.replace(/[\^~>=<\s]/g, '');
    const match = cleaned.match(/^(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
}
function checkDeprecations(code, fileName, rootPath) {
    const versions = detectVersions(rootPath);
    const findings = [];
    const lines = code.split('\n');
    for (const rule of RULES) {
        const frameworkVersion = majorVersion(versions[rule.framework]);
        const ruleMinVersion = parseInt(rule.minVersion, 10);
        if (frameworkVersion < ruleMinVersion)
            continue;
        for (let i = 0; i < lines.length; i++) {
            if (rule.pattern.test(lines[i])) {
                findings.push({ file: fileName, line: i + 1, rule });
            }
            rule.pattern.lastIndex = 0; // Reset regex state
        }
    }
    return findings;
}
function formatDeprecationReport(findings) {
    if (findings.length === 0)
        return '  ✅ Deprecated 패턴 없음';
    const lines = [`  ⚠️  Deprecated 패턴 ${findings.length}건:\n`];
    for (const f of findings) {
        const icon = f.rule.severity === 'error' ? '❌' : '⚠️';
        lines.push(`  ${icon} ${f.file}:${f.line} — ${f.rule.message}`);
        lines.push(`     → ${f.rule.replacement}`);
    }
    return lines.join('\n');
}
// IDENTITY_SEAL: PART-3 | role=checker | inputs=code,fileName,rootPath | outputs=DeprecationFinding[]
