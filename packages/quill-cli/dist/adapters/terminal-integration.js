"use strict";
// @ts-nocheck
// ============================================================
// CS Quill 🦔 — Terminal Integration
// ============================================================
// pty 관리, REPL 연동, 프로세스 관리.
// 터미널 통합 10% → 70%
Object.defineProperty(exports, "__esModule", { value: true });
exports.Spinner = exports.ProgressBar = void 0;
exports.getDefaultShell = getDefaultShell;
exports.runShellCommand = runShellCommand;
exports.startREPL = startREPL;
exports.getSupportedREPLs = getSupportedREPLs;
exports.startBackground = startBackground;
exports.listJobs = listJobs;
exports.getJobOutput = getJobOutput;
exports.killJob = killJob;
exports.findProcessOnPort = findProcessOnPort;
exports.killProcessOnPort = killProcessOnPort;
exports.printTable = printTable;
exports.printBox = printBox;
const child_process_1 = require("child_process");
// ============================================================
// PART 1 — Shell Detection & Execution
// ============================================================
function getDefaultShell() {
    if (process.platform === 'win32') {
        return process.env.COMSPEC ?? 'cmd.exe';
    }
    return process.env.SHELL ?? '/bin/bash';
}
function runShellCommand(command, opts) {
    try {
        const stdout = (0, child_process_1.execSync)(command, {
            cwd: opts?.cwd ?? process.cwd(),
            encoding: 'utf-8',
            timeout: opts?.timeout ?? 30000,
            env: { ...process.env, ...opts?.env },
            stdio: ['pipe', 'pipe', 'pipe'],
        });
        return { stdout, stderr: '', exitCode: 0 };
    }
    catch (e) {
        return {
            stdout: e.stdout ?? '',
            stderr: e.stderr ?? e.message ?? '',
            exitCode: e.status ?? 1,
        };
    }
}
const REPL_COMMANDS = {
    node: { cmd: 'node', args: ['--interactive'] },
    typescript: { cmd: 'npx', args: ['tsx'] },
    python: { cmd: 'python3', args: ['-i'] },
    ruby: { cmd: 'irb', args: [] },
    go: { cmd: 'gore', args: [] },
};
function startREPL(language) {
    const repl = REPL_COMMANDS[language];
    if (!repl)
        return null;
    try {
        const child = (0, child_process_1.spawn)(repl.cmd, repl.args, {
            stdio: ['pipe', 'pipe', 'pipe'],
            env: { ...process.env, NODE_NO_WARNINGS: '1' },
        });
        child.stdout?.on('data', (data) => {
            process.stdout.write(data);
        });
        child.stderr?.on('data', (data) => {
            process.stderr.write(data);
        });
        return {
            language,
            process: child,
            send: (code) => { child.stdin?.write(code + '\n'); },
            kill: () => { child.kill(); },
        };
    }
    catch {
        return null;
    }
}
function getSupportedREPLs() {
    return Object.keys(REPL_COMMANDS);
}
const _jobs = new Map();
function startBackground(command, cwd) {
    const id = `job-${Date.now().toString(36)}`;
    const child = (0, child_process_1.spawn)('sh', ['-c', command], {
        cwd: cwd ?? process.cwd(),
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: true,
    });
    const job = {
        id,
        command,
        process: child,
        startedAt: Date.now(),
        status: 'running',
        output: '',
    };
    child.stdout?.on('data', (data) => { job.output += data.toString(); });
    child.stderr?.on('data', (data) => { job.output += data.toString(); });
    child.on('close', (code) => { job.status = code === 0 ? 'done' : 'error'; });
    _jobs.set(id, job);
    return id;
}
function listJobs() {
    return [..._jobs.values()].map(j => ({
        id: j.id,
        command: j.command.slice(0, 50),
        status: j.status,
        duration: Math.round((Date.now() - j.startedAt) / 1000),
    }));
}
function getJobOutput(id) {
    return _jobs.get(id)?.output ?? '';
}
function killJob(id) {
    const job = _jobs.get(id);
    if (!job || job.status !== 'running')
        return false;
    job.process.kill();
    job.status = 'done';
    return true;
}
// IDENTITY_SEAL: PART-3 | role=jobs | inputs=command | outputs=jobId
// ============================================================
// PART 4 — Process Watcher (포트/프로세스 관리)
// ============================================================
function findProcessOnPort(port) {
    try {
        const output = (0, child_process_1.execSync)(`lsof -i :${port} -t 2>/dev/null || netstat -tlnp 2>/dev/null | grep :${port}`, {
            encoding: 'utf-8', timeout: 3000,
        });
        const pid = parseInt(output.trim().split('\n')[0], 10);
        if (isNaN(pid))
            return null;
        const cmd = (0, child_process_1.execSync)(`ps -p ${pid} -o comm= 2>/dev/null`, { encoding: 'utf-8', timeout: 2000 }).trim();
        return { pid, command: cmd };
    }
    catch {
        return null;
    }
}
function killProcessOnPort(port) {
    const proc = findProcessOnPort(port);
    if (!proc)
        return false;
    try {
        process.kill(proc.pid);
        return true;
    }
    catch {
        return false;
    }
}
class ProgressBar {
    current = 0;
    total;
    width;
    label;
    fillChar;
    emptyChar;
    startTime;
    constructor(opts) {
        this.total = opts.total;
        this.width = opts.width ?? 30;
        this.label = opts.label ?? '';
        this.fillChar = opts.fillChar ?? '█';
        this.emptyChar = opts.emptyChar ?? '░';
        this.startTime = performance.now();
    }
    update(current, label) {
        this.current = Math.min(current, this.total);
        if (label)
            this.label = label;
        this.render();
    }
    increment(label) {
        this.update(this.current + 1, label);
    }
    render() {
        const ratio = this.total > 0 ? this.current / this.total : 0;
        const filled = Math.round(ratio * this.width);
        const empty = this.width - filled;
        const bar = this.fillChar.repeat(filled) + this.emptyChar.repeat(empty);
        const pct = Math.round(ratio * 100);
        const elapsed = Math.round((performance.now() - this.startTime) / 1000);
        const eta = ratio > 0 && ratio < 1
            ? Math.round(elapsed / ratio * (1 - ratio))
            : 0;
        const etaStr = eta > 0 ? ` ETA ${eta}s` : '';
        process.stdout.write(`\r  [${bar}] ${pct}% ${this.current}/${this.total}${etaStr} ${this.label.padEnd(20)}`);
    }
    done(message) {
        const elapsed = Math.round(performance.now() - this.startTime);
        process.stdout.write('\r' + ' '.repeat(80) + '\r');
        if (message) {
            console.log(`  ${message} (${elapsed}ms)`);
        }
    }
}
exports.ProgressBar = ProgressBar;
// IDENTITY_SEAL: PART-5 | role=progress-bar | inputs=ProgressBarOptions | outputs=ProgressBar
// ============================================================
// PART 6 — Spinner
// ============================================================
const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
class Spinner {
    intervalId = null;
    frameIndex = 0;
    message;
    constructor(message = 'Processing...') {
        this.message = message;
    }
    start() {
        if (this.intervalId)
            return;
        this.frameIndex = 0;
        this.intervalId = setInterval(() => {
            const frame = SPINNER_FRAMES[this.frameIndex % SPINNER_FRAMES.length];
            process.stdout.write(`\r  ${frame} ${this.message}`);
            this.frameIndex++;
        }, 80);
    }
    update(message) {
        this.message = message;
    }
    stop(finalMessage) {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        process.stdout.write('\r' + ' '.repeat(this.message.length + 10) + '\r');
        if (finalMessage) {
            console.log(`  ${finalMessage}`);
        }
    }
}
exports.Spinner = Spinner;
// IDENTITY_SEAL: PART-6 | role=spinner | inputs=message | outputs=Spinner
// ============================================================
// PART 7 — Formatted Output Helpers
// ============================================================
function printTable(headers, rows, colWidths) {
    const widths = colWidths ?? headers.map((h, i) => {
        const maxData = rows.reduce((max, row) => Math.max(max, (row[i] ?? '').length), 0);
        return Math.max(h.length, maxData) + 2;
    });
    const header = headers.map((h, i) => h.padEnd(widths[i])).join(' ');
    console.log(`  ${header}`);
    console.log('  ' + widths.map(w => '─'.repeat(w)).join(' '));
    for (const row of rows) {
        const line = row.map((cell, i) => (cell ?? '').padEnd(widths[i] ?? 10)).join(' ');
        console.log(`  ${line}`);
    }
}
function printBox(title, lines, width = 50) {
    const top = '┌' + '─'.repeat(width - 2) + '┐';
    const bottom = '└' + '─'.repeat(width - 2) + '┘';
    const titleLine = '│ ' + title.padEnd(width - 4) + ' │';
    console.log(`  ${top}`);
    console.log(`  ${titleLine}`);
    console.log(`  │${'─'.repeat(width - 2)}│`);
    for (const line of lines) {
        const trimmed = line.slice(0, width - 4);
        console.log(`  │ ${trimmed.padEnd(width - 4)} │`);
    }
    console.log(`  ${bottom}`);
}
// IDENTITY_SEAL: PART-7 | role=formatted-output | inputs=data | outputs=console
