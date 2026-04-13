// ============================================================
// Code Studio — Error Parser
// ============================================================
// TypeScript 컴파일러 에러, ESLint 에러, 런타임 에러를 구조화된 포맷으로 파싱.
// ============================================================
// PART 1 — TypeScript Error Parsing
// ============================================================
const TS_ERROR_REGEX = /^(.+?)\((\d+),(\d+)\):\s+error\s+(TS\d+):\s+(.+)$/;
const TS_WARNING_REGEX = /^(.+?)\((\d+),(\d+)\):\s+warning\s+(TS\d+):\s+(.+)$/;
function parseTypeScriptErrors(output) {
    const errors = [];
    for (const line of output.split('\n')) {
        const trimmed = line.trim();
        const errMatch = trimmed.match(TS_ERROR_REGEX);
        if (errMatch) {
            errors.push({
                source: 'typescript',
                severity: 'error',
                file: errMatch[1],
                line: parseInt(errMatch[2], 10),
                column: parseInt(errMatch[3], 10),
                code: errMatch[4],
                message: errMatch[5],
                raw: trimmed,
            });
            continue;
        }
        const warnMatch = trimmed.match(TS_WARNING_REGEX);
        if (warnMatch) {
            errors.push({
                source: 'typescript',
                severity: 'warning',
                file: warnMatch[1],
                line: parseInt(warnMatch[2], 10),
                column: parseInt(warnMatch[3], 10),
                code: warnMatch[4],
                message: warnMatch[5],
                raw: trimmed,
            });
        }
    }
    return errors;
}
// IDENTITY_SEAL: PART-1 | role=TypeScriptParsing | inputs=output | outputs=ParsedError[]
// ============================================================
// PART 2 — ESLint & Runtime Error Parsing
// ============================================================
const ESLINT_REGEX = /^\s*(\d+):(\d+)\s+(error|warning)\s+(.+?)\s+([\w/@-]+)$/;
const ESLINT_FILE_REGEX = /^([/\\].+|[A-Z]:\\.+)$/;
function parseESLintErrors(output) {
    const errors = [];
    let currentFile = '';
    for (const line of output.split('\n')) {
        const trimmed = line.trim();
        if (ESLINT_FILE_REGEX.test(trimmed)) {
            currentFile = trimmed;
            continue;
        }
        const match = trimmed.match(ESLINT_REGEX);
        if (match && currentFile) {
            errors.push({
                source: 'eslint',
                severity: match[3] === 'error' ? 'error' : 'warning',
                file: currentFile,
                line: parseInt(match[1], 10),
                column: parseInt(match[2], 10),
                code: match[5],
                message: match[4],
                raw: trimmed,
            });
        }
    }
    return errors;
}
const RUNTIME_STACK_REGEX = /^\s+at\s+.+\((.+?):(\d+):(\d+)\)/;
const RUNTIME_ERROR_REGEX = /^(\w*Error):\s+(.+)$/;
function parseRuntimeErrors(output) {
    const errors = [];
    const lines = output.split('\n');
    for (let i = 0; i < lines.length; i++) {
        const errorMatch = lines[i].match(RUNTIME_ERROR_REGEX);
        if (errorMatch) {
            // Look for first stack frame
            let file = 'unknown';
            let line = 0;
            let column = 0;
            for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
                const stackMatch = lines[j].match(RUNTIME_STACK_REGEX);
                if (stackMatch) {
                    file = stackMatch[1];
                    line = parseInt(stackMatch[2], 10);
                    column = parseInt(stackMatch[3], 10);
                    break;
                }
            }
            errors.push({
                source: 'runtime',
                severity: 'error',
                file,
                line,
                column,
                code: errorMatch[1],
                message: errorMatch[2],
                raw: lines.slice(i, Math.min(i + 5, lines.length)).join('\n'),
            });
        }
    }
    return errors;
}
// IDENTITY_SEAL: PART-2 | role=ESLintRuntime | inputs=output | outputs=ParsedError[]
// ============================================================
// PART 3 — Unified Parser API
// ============================================================
/** Auto-detect error source and parse */
export function parseErrors(output) {
    const errors = [];
    // Try all parsers — they only match their own format
    errors.push(...parseTypeScriptErrors(output));
    errors.push(...parseESLintErrors(output));
    errors.push(...parseRuntimeErrors(output));
    // Deduplicate by file+line+message
    const seen = new Set();
    return errors.filter(e => {
        const key = `${e.file}:${e.line}:${e.message}`;
        if (seen.has(key))
            return false;
        seen.add(key);
        return true;
    });
}
/** Parse with explicit source hint */
export function parseErrorsWithSource(output, source) {
    switch (source) {
        case 'typescript': return parseTypeScriptErrors(output);
        case 'eslint': return parseESLintErrors(output);
        case 'runtime': return parseRuntimeErrors(output);
        default: return parseErrors(output);
    }
}
/** Group errors by file */
export function groupErrorsByFile(errors) {
    const grouped = new Map();
    for (const err of errors) {
        const list = grouped.get(err.file) ?? [];
        list.push(err);
        grouped.set(err.file, list);
    }
    return grouped;
}
/** Get error/warning counts */
export function errorSummary(errors) {
    let e = 0, w = 0, inf = 0;
    for (const err of errors) {
        if (err.severity === 'error')
            e++;
        else if (err.severity === 'warning')
            w++;
        else
            inf++;
    }
    return { errors: e, warnings: w, info: inf };
}
// IDENTITY_SEAL: PART-3 | role=UnifiedParser | inputs=output,source | outputs=ParsedError[],Map,summary
