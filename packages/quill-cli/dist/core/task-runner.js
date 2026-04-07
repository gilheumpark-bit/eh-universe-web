"use strict";
// @ts-nocheck
// ============================================================
// CS Quill 🦔 — Task Runner
// ============================================================
// 프로젝트별 빌드/테스트/린트 자동 감지 + 실행.
// 빌드 & 실행 60% → 75%
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectTasks = detectTasks;
exports.runTask = runTask;
exports.runBuild = runBuild;
exports.runTests = runTests;
exports.runLint = runLint;
const fs_1 = require("fs");
const path_1 = require("path");
const child_process_1 = require("child_process");
function detectTasks(rootPath) {
    const tasks = [];
    // package.json scripts
    const pkgPath = (0, path_1.join)(rootPath, 'package.json');
    if ((0, fs_1.existsSync)(pkgPath)) {
        try {
            const pkg = JSON.parse((0, fs_1.readFileSync)(pkgPath, 'utf-8'));
            const scripts = pkg.scripts ?? {};
            for (const [name, _cmd] of Object.entries(scripts)) {
                const command = `npm run ${name}`;
                let category = 'custom';
                if (/^(build|compile)/.test(name))
                    category = 'build';
                else if (/^(test|spec|jest|vitest)/.test(name))
                    category = 'test';
                else if (/^(lint|eslint|biome)/.test(name))
                    category = 'lint';
                else if (/^(dev|develop|watch)/.test(name))
                    category = 'dev';
                else if (/^(start|serve)/.test(name))
                    category = 'start';
                tasks.push({ name, command, source: 'package.json', category });
            }
        }
        catch { /* skip */ }
    }
    // Makefile
    if ((0, fs_1.existsSync)((0, path_1.join)(rootPath, 'Makefile'))) {
        try {
            const content = (0, fs_1.readFileSync)((0, path_1.join)(rootPath, 'Makefile'), 'utf-8');
            const targets = content.match(/^([a-zA-Z_-]+):/gm);
            if (targets) {
                for (const target of targets) {
                    const name = target.replace(':', '');
                    if (name.startsWith('.') || name === 'all')
                        continue;
                    tasks.push({ name, command: `make ${name}`, source: 'Makefile', category: 'custom' });
                }
            }
        }
        catch { /* skip */ }
    }
    // Cargo.toml (Rust)
    if ((0, fs_1.existsSync)((0, path_1.join)(rootPath, 'Cargo.toml'))) {
        tasks.push({ name: 'build', command: 'cargo build', source: 'Cargo.toml', category: 'build' });
        tasks.push({ name: 'test', command: 'cargo test', source: 'Cargo.toml', category: 'test' });
        tasks.push({ name: 'clippy', command: 'cargo clippy', source: 'Cargo.toml', category: 'lint' });
    }
    // go.mod (Go)
    if ((0, fs_1.existsSync)((0, path_1.join)(rootPath, 'go.mod'))) {
        tasks.push({ name: 'build', command: 'go build ./...', source: 'go.mod', category: 'build' });
        tasks.push({ name: 'test', command: 'go test ./...', source: 'go.mod', category: 'test' });
        tasks.push({ name: 'vet', command: 'go vet ./...', source: 'go.mod', category: 'lint' });
    }
    // pyproject.toml / requirements.txt (Python)
    if ((0, fs_1.existsSync)((0, path_1.join)(rootPath, 'pyproject.toml')) || (0, fs_1.existsSync)((0, path_1.join)(rootPath, 'requirements.txt'))) {
        tasks.push({ name: 'test', command: 'pytest', source: 'python', category: 'test' });
        tasks.push({ name: 'lint', command: 'pylint src/', source: 'python', category: 'lint' });
    }
    return tasks;
}
function runTask(task, rootPath, timeout = 60000) {
    const start = performance.now();
    try {
        const output = (0, child_process_1.execSync)(task.command, {
            cwd: rootPath,
            encoding: 'utf-8',
            timeout,
            stdio: ['pipe', 'pipe', 'pipe'],
        });
        return {
            task, success: true, output: output.slice(0, 5000),
            duration: Math.round(performance.now() - start), exitCode: 0,
        };
    }
    catch (e) {
        return {
            task, success: false,
            output: ((e.stdout ?? '') + '\n' + (e.stderr ?? '')).slice(0, 5000),
            duration: Math.round(performance.now() - start),
            exitCode: e.status ?? 1,
        };
    }
}
// IDENTITY_SEAL: PART-2 | role=execution | inputs=task,rootPath | outputs=TaskResult
// ============================================================
// PART 3 — Quick Commands
// ============================================================
function runBuild(rootPath) {
    const tasks = detectTasks(rootPath);
    const build = tasks.find(t => t.category === 'build');
    return build ? runTask(build, rootPath) : null;
}
function runTests(rootPath) {
    const tasks = detectTasks(rootPath);
    const test = tasks.find(t => t.category === 'test');
    return test ? runTask(test, rootPath) : null;
}
function runLint(rootPath) {
    const tasks = detectTasks(rootPath);
    const lint = tasks.find(t => t.category === 'lint');
    return lint ? runTask(lint, rootPath) : null;
}
// IDENTITY_SEAL: PART-3 | role=quick-commands | inputs=rootPath | outputs=TaskResult
