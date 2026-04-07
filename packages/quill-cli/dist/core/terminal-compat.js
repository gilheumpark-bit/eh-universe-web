"use strict";
// ============================================================
// CS Quill 🦔 — Terminal Compatibility Layer
// ============================================================
// PowerShell, CMD, bash, zsh, Windows Terminal 전부 지원.
// 이모지/ANSI/유니코드 지원 여부 감지 → 자동 폴백.
Object.defineProperty(exports, "__esModule", { value: true });
exports.spinnerFrames = exports.box = exports.colors = exports.icons = void 0;
exports.detectTerminal = detectTerminal;
exports.compatProgressBar = compatProgressBar;
exports.compatDivider = compatDivider;
exports.printHeader = printHeader;
exports.printScore = printScore;
exports.printSection = printSection;
function detectTerminal() {
    const env = process.env;
    const platform = process.platform;
    // CI detection
    const isCI = !!(env.CI || env.GITHUB_ACTIONS || env.GITLAB_CI || env.JENKINS_URL || env.CIRCLECI);
    // Shell detection
    const shell = detectShell();
    // Color support
    const forceColor = env.FORCE_COLOR;
    const noColor = env.NO_COLOR !== undefined;
    const colorTerm = env.COLORTERM;
    const term = env.TERM ?? '';
    const isWindowsTerminal = !!env.WT_SESSION;
    const isDumbTerminal = term === 'dumb';
    let supportsColor = false;
    let supports256Color = false;
    let supportsTrueColor = false;
    if (noColor || isDumbTerminal) {
        // No color
    }
    else if (forceColor !== undefined) {
        supportsColor = true;
        supports256Color = parseInt(forceColor, 10) >= 2;
        supportsTrueColor = parseInt(forceColor, 10) >= 3;
    }
    else if (isWindowsTerminal) {
        supportsColor = true;
        supports256Color = true;
        supportsTrueColor = true;
    }
    else if (colorTerm === 'truecolor' || colorTerm === '24bit') {
        supportsColor = true;
        supports256Color = true;
        supportsTrueColor = true;
    }
    else if (term.includes('256color')) {
        supportsColor = true;
        supports256Color = true;
    }
    else if (platform !== 'win32' || shell !== 'cmd') {
        supportsColor = process.stdout.isTTY ?? false;
    }
    // Unicode support
    const supportsUnicode = platform !== 'win32' || isWindowsTerminal || shell === 'powershell' || shell === 'pwsh' || !!env.WT_SESSION;
    const supportsEmoji = supportsUnicode && (platform !== 'win32' || isWindowsTerminal);
    const supportsBoxDrawing = supportsUnicode;
    return {
        supportsColor, supports256Color, supportsTrueColor,
        supportsUnicode, supportsEmoji, supportsBoxDrawing,
        shell, platform, isCI,
    };
}
function detectShell() {
    const env = process.env;
    if (env.PSModulePath && !env.BASH_VERSION)
        return 'powershell';
    if (env.ZSH_VERSION)
        return 'zsh';
    if (env.BASH_VERSION)
        return 'bash';
    if (env.FISH_VERSION)
        return 'fish';
    if (process.platform === 'win32') {
        if (env.TERM_PROGRAM === 'vscode')
            return 'vscode';
        if (env.ComSpec?.includes('cmd.exe'))
            return 'cmd';
        return 'powershell';
    }
    return 'unknown';
}
// IDENTITY_SEAL: PART-1 | role=detection | inputs=process.env | outputs=TerminalCapabilities
// ============================================================
// PART 2 — Icon Fallbacks
// ============================================================
let _caps = null;
function getCaps() {
    if (!_caps)
        _caps = detectTerminal();
    return _caps;
}
exports.icons = {
    get quill() { return getCaps().supportsEmoji ? '🦔' : '[CS]'; },
    get pass() { return getCaps().supportsEmoji ? '✅' : '[OK]'; },
    get fail() { return getCaps().supportsEmoji ? '❌' : '[FAIL]'; },
    get warn() { return getCaps().supportsEmoji ? '⚠️' : '[WARN]'; },
    get info() { return getCaps().supportsEmoji ? 'ℹ️' : '[INFO]'; },
    get fire() { return getCaps().supportsEmoji ? '🔥' : '[!]'; },
    get lock() { return getCaps().supportsEmoji ? '🔒' : '[LOCK]'; },
    get key() { return getCaps().supportsEmoji ? '🔑' : '[KEY]'; },
    get folder() { return getCaps().supportsEmoji ? '📁' : '[DIR]'; },
    get file() { return getCaps().supportsEmoji ? '📄' : '[FILE]'; },
    get gear() { return getCaps().supportsEmoji ? '⚙️' : '[CFG]'; },
    get rocket() { return getCaps().supportsEmoji ? '🚀' : '[GO]'; },
    get star() { return getCaps().supportsEmoji ? '⭐' : '[*]'; },
    get bug() { return getCaps().supportsEmoji ? '🐛' : '[BUG]'; },
    get shield() { return getCaps().supportsEmoji ? '🛡️' : '[SEC]'; },
    get clock() { return getCaps().supportsEmoji ? '⏱️' : '[TIME]'; },
    get chart() { return getCaps().supportsEmoji ? '📊' : '[DATA]'; },
    get red() { return getCaps().supportsEmoji ? '🔴' : '(!)'; },
    get yellow() { return getCaps().supportsEmoji ? '🟡' : '(~)'; },
    get green() { return getCaps().supportsEmoji ? '🟢' : '(+)'; },
};
// IDENTITY_SEAL: PART-2 | role=icons | inputs=none | outputs=icon-strings
// ============================================================
// PART 3 — Color Fallbacks
// ============================================================
function colorCode(code) {
    return getCaps().supportsColor ? code : '';
}
exports.colors = {
    red: (s) => `${colorCode('\x1b[31m')}${s}${colorCode('\x1b[0m')}`,
    green: (s) => `${colorCode('\x1b[32m')}${s}${colorCode('\x1b[0m')}`,
    yellow: (s) => `${colorCode('\x1b[33m')}${s}${colorCode('\x1b[0m')}`,
    blue: (s) => `${colorCode('\x1b[34m')}${s}${colorCode('\x1b[0m')}`,
    magenta: (s) => `${colorCode('\x1b[35m')}${s}${colorCode('\x1b[0m')}`,
    cyan: (s) => `${colorCode('\x1b[36m')}${s}${colorCode('\x1b[0m')}`,
    dim: (s) => `${colorCode('\x1b[2m')}${s}${colorCode('\x1b[0m')}`,
    bold: (s) => `${colorCode('\x1b[1m')}${s}${colorCode('\x1b[0m')}`,
    reset: '\x1b[0m',
};
// IDENTITY_SEAL: PART-3 | role=colors | inputs=string | outputs=ansi-string
// ============================================================
// PART 4 — Box Drawing Fallbacks
// ============================================================
exports.box = {
    get topLeft() { return getCaps().supportsBoxDrawing ? '┌' : '+'; },
    get topRight() { return getCaps().supportsBoxDrawing ? '┐' : '+'; },
    get bottomLeft() { return getCaps().supportsBoxDrawing ? '└' : '+'; },
    get bottomRight() { return getCaps().supportsBoxDrawing ? '┘' : '+'; },
    get horizontal() { return getCaps().supportsBoxDrawing ? '─' : '-'; },
    get vertical() { return getCaps().supportsBoxDrawing ? '│' : '|'; },
    get doubleH() { return getCaps().supportsBoxDrawing ? '═' : '='; },
    get doubleV() { return getCaps().supportsBoxDrawing ? '║' : '|'; },
    get filled() { return getCaps().supportsBoxDrawing ? '█' : '#'; },
    get empty() { return getCaps().supportsBoxDrawing ? '░' : '.'; },
};
// IDENTITY_SEAL: PART-4 | role=box | inputs=none | outputs=box-chars
// ============================================================
// PART 5 — Spinner Fallbacks
// ============================================================
exports.spinnerFrames = getCaps().supportsUnicode
    ? ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
    : ['|', '/', '-', '\\'];
// IDENTITY_SEAL: PART-5 | role=spinner | inputs=none | outputs=string[]
// ============================================================
// PART 6 — Progress Bar (Compat)
// ============================================================
function compatProgressBar(current, total, width = 20) {
    const ratio = Math.min(1, current / Math.max(1, total));
    const filled = Math.round(ratio * width);
    return exports.box.filled.repeat(filled) + exports.box.empty.repeat(width - filled);
}
function compatDivider(width = 52, double = false) {
    return (double ? exports.box.doubleH : exports.box.horizontal).repeat(width);
}
// IDENTITY_SEAL: PART-6 | role=progress | inputs=current,total | outputs=string
// ============================================================
// PART 7 — Print Helpers
// ============================================================
function printHeader(title) {
    const divider = compatDivider(52, true);
    console.log(divider);
    console.log(`  ${exports.icons.quill} ${title}`);
    console.log(divider);
}
function printScore(label, score, maxWidth = 20) {
    const bar = compatProgressBar(score, 100, maxWidth);
    const icon = score >= 80 ? exports.icons.pass : score >= 60 ? exports.icons.warn : exports.icons.fail;
    console.log(`  ${icon} ${label.padEnd(14)} ${bar} ${score}/100`);
}
function printSection(title) {
    console.log(`\n  ${compatDivider(52)}`);
    console.log(`  ${title}`);
}
// IDENTITY_SEAL: PART-7 | role=print-helpers | inputs=various | outputs=console
