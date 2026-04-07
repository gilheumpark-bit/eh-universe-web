"use strict";
// @ts-nocheck
// ============================================================
// CS Quill 🦔 — Search Engine (fzf + ripgrep)
// ============================================================
// 프로젝트 내 파일/코드 초고속 검색.
// fzf = 퍼지 파일 검색, ripgrep = 코드 내용 검색.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ripgrepSearch = ripgrepSearch;
exports.fuzzyFileSearch = fuzzyFileSearch;
exports.symbolSearch = symbolSearch;
exports.getResultWithContext = getResultWithContext;
exports.runFullSearch = runFullSearch;
const { execSync } = require('child_process');
const { readdirSync, readFileSync, statSync } = require('fs');
const { join, relative, extname } = require('path');
function ripgrepSearch(query, rootPath, opts) {
    const maxResults = opts?.maxResults ?? 50;
    const contextLines = opts?.contextLines ?? 0;
    const caseFlag = opts?.caseSensitive ? '' : '-i';
    const globFlag = opts?.glob ? `--glob "${opts.glob}"` : '--glob "*.{ts,tsx,js,jsx,py,go,rs,java,rb,php}"';
    const regexFlag = opts?.regex ? '' : '--fixed-strings';
    const contextFlag = contextLines > 0 ? `--context ${contextLines}` : '';
    try {
        const output = execSync(`rg ${caseFlag} ${regexFlag} ${globFlag} ${contextFlag} --json --max-count ${maxResults} -- "${query.replace(/["\\`$]/g, '\\$&')}" "${rootPath}"`, { encoding: 'utf-8', timeout: 10000, maxBuffer: 5 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'] });
        const results = [];
        const contextMap = new Map();
        let currentMatchIdx = -1;
        const lines = output.split('\n').filter(Boolean);
        for (const line of lines) {
            try {
                const data = JSON.parse(line);
                if (data.type === 'match') {
                    currentMatchIdx = results.length;
                    const matchContent = data.data.lines?.text?.trim()?.slice(0, 200) ?? '';
                    results.push({
                        file: relative(rootPath, data.data.path.text),
                        line: data.data.line_number,
                        column: data.data.submatches?.[0]?.start ?? 0,
                        content: matchContent,
                        matchLength: data.data.submatches?.[0]?.end - data.data.submatches?.[0]?.start ?? 0,
                        contextBefore: [],
                        contextAfter: [],
                    });
                    contextMap.set(currentMatchIdx, { before: [], after: [] });
                }
                else if (data.type === 'context' && currentMatchIdx >= 0) {
                    const ctx = contextMap.get(currentMatchIdx);
                    if (ctx) {
                        const text = data.data.lines?.text?.trim()?.slice(0, 200) ?? '';
                        if (data.data.line_number < results[currentMatchIdx].line) {
                            ctx.before.push(text);
                        }
                        else {
                            ctx.after.push(text);
                        }
                    }
                }
            }
            catch { /* skip malformed */ }
        }
        // Apply context to results
        for (const [idx, ctx] of contextMap) {
            results[idx].contextBefore = ctx.before;
            results[idx].contextAfter = ctx.after;
        }
        // Score by relevance
        return rankSearchResults(results, query);
    }
    catch {
        // Fallback: native grep
        return grepFallback(query, rootPath, maxResults);
    }
}
/** Rank search results by relevance */
function rankSearchResults(results, query) {
    const queryLower = query.toLowerCase();
    for (const r of results) {
        let score = 10; // base score
        const contentLower = r.content.toLowerCase();
        const fileLower = r.file.toLowerCase();
        // Exact match bonus
        if (contentLower.includes(queryLower))
            score += 20;
        // Whole word match bonus
        const wordBoundary = new RegExp(`\\b${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (wordBoundary.test(r.content))
            score += 15;
        // Filename match bonus
        if (fileLower.includes(queryLower))
            score += 25;
        // Source file priority (not test/spec/mock)
        if (/\.(test|spec|mock|stub|fixture)\./i.test(r.file))
            score -= 5;
        else
            score += 5;
        // Definition-like patterns (function/class/const declarations)
        if (/(?:function|class|const|let|var|export|interface|type)\s/.test(r.content))
            score += 10;
        // Import/require patterns are lower relevance
        if (/(?:import|require)\s/.test(r.content))
            score -= 5;
        // Shallower file paths are more relevant
        const depth = (r.file.match(/[/\\]/g) || []).length;
        score -= depth * 2;
        r.relevanceScore = Math.max(0, score);
    }
    return results.sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0));
}
function grepFallback(query, rootPath, maxResults) {
    try {
        const output = execSync(`grep -rn --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" "${query.replace(/"/g, '\\"')}" "${rootPath}"`, { encoding: 'utf-8', timeout: 10000, stdio: ['pipe', 'pipe', 'pipe'] });
        return output.split('\n').filter(Boolean).map(line => {
            const match = line.match(/^(.+?):(\d+):(.*)$/);
            if (!match)
                return null;
            return {
                file: relative(rootPath, match[1]),
                line: parseInt(match[2], 10),
                column: 0,
                content: match[3].trim().slice(0, 200),
                matchLength: query.length,
            };
        }).filter((r) => r !== null);
    }
    catch {
        return [];
    }
}
function fuzzyFileSearch(query, rootPath, maxResults = 20) {
    // Collect all files
    const files = [];
    const IGNORE = new Set(['node_modules', '.next', '.git', 'dist', 'build', '.cs', '__pycache__', '.cache']);
    function walk(dir) {
        try {
            const entries = readdirSync(dir, { withFileTypes: true });
            for (const e of entries) {
                if (e.name.startsWith('.') || IGNORE.has(e.name))
                    continue;
                const full = join(dir, e.name);
                if (e.isDirectory()) {
                    walk(full);
                    continue;
                }
                files.push(relative(rootPath, full));
            }
        }
        catch { /* skip */ }
    }
    walk(rootPath);
    // Fuzzy match
    const queryLower = query.toLowerCase();
    const results = [];
    for (const file of files) {
        const score = fuzzyScore(queryLower, file.toLowerCase());
        if (score > 0) {
            results.push({ file, score });
        }
    }
    return results.sort((a, b) => b.score - a.score).slice(0, maxResults);
}
function fuzzyScore(query, target) {
    if (query.length === 0)
        return 0;
    if (target.includes(query))
        return 100 + (1 / target.length);
    let score = 0;
    let queryIdx = 0;
    let consecutive = 0;
    let prevMatch = false;
    for (let i = 0; i < target.length && queryIdx < query.length; i++) {
        if (target[i] === query[queryIdx]) {
            queryIdx++;
            consecutive = prevMatch ? consecutive + 1 : 1;
            score += consecutive * 2;
            // Bonus for path separator match (start of filename/directory)
            if (i === 0 || target[i - 1] === '/' || target[i - 1] === '\\' || target[i - 1] === '.') {
                score += 5;
            }
            prevMatch = true;
        }
        else {
            prevMatch = false;
        }
    }
    return queryIdx === query.length ? score : 0;
}
function symbolSearch(query, rootPath, maxResults = 20) {
    const patterns = [
        { regex: `(?:export\\s+)?(?:async\\s+)?function\\s+(${query}\\w*)`, type: 'function' },
        { regex: `(?:export\\s+)?class\\s+(${query}\\w*)`, type: 'class' },
        { regex: `(?:export\\s+)?(?:const|let|var)\\s+(${query}\\w*)\\s*=`, type: 'variable' },
        { regex: `(?:export\\s+)?type\\s+(${query}\\w*)\\s*=`, type: 'type' },
        { regex: `(?:export\\s+)?interface\\s+(${query}\\w*)`, type: 'interface' },
    ];
    const results = [];
    for (const pat of patterns) {
        try {
            const output = execSync(`rg --json -e "${pat.regex}" --glob "*.{ts,tsx,js,jsx}" --max-count ${maxResults} "${rootPath}"`, { encoding: 'utf-8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'], env: { ...process.env, PATH: process.env.PATH } });
            for (const line of output.split('\n').filter(Boolean)) {
                try {
                    const data = JSON.parse(line);
                    if (data.type === 'match') {
                        const nameMatch = data.data.lines?.text?.match(new RegExp(pat.regex));
                        if (nameMatch?.[1]) {
                            results.push({
                                name: nameMatch[1],
                                type: pat.type,
                                file: relative(rootPath, data.data.path.text),
                                line: data.data.line_number,
                            });
                        }
                    }
                }
                catch { /* skip */ }
            }
        }
        catch { /* rg not available */ }
    }
    // rg 실패 시 fs 기반 fallback
    if (results.length === 0) {
        try {
            const walk = (dir, depth = 0) => {
                if (depth > 5 || results.length >= maxResults)
                    return;
                for (const entry of readdirSync(dir, { withFileTypes: true })) {
                    if (entry.name.startsWith('.') || ['node_modules', 'dist', '.next', '.git'].includes(entry.name))
                        continue;
                    const full = join(dir, entry.name);
                    if (entry.isDirectory()) {
                        walk(full, depth + 1);
                        continue;
                    }
                    if (!/\.(ts|tsx|js|jsx)$/.test(entry.name))
                        continue;
                    try {
                        const content = statSync(full).size < 100000 ? require('fs').readFileSync(full, 'utf-8') : '';
                        const lines = content.split('\n');
                        for (let i = 0; i < lines.length && results.length < maxResults; i++) {
                            for (const pat of patterns) {
                                const m = lines[i].match(new RegExp(pat.regex));
                                if (m?.[1]) {
                                    results.push({ name: m[1], type: pat.type, file: relative(rootPath, full), line: i + 1 });
                                }
                            }
                        }
                    }
                    catch { /* skip */ }
                }
            };
            walk(rootPath);
        }
        catch { /* final fallback */ }
    }
    return results.slice(0, maxResults);
}
function getResultWithContext(result, rootPath, contextLines = 3) {
    const fullPath = join(rootPath, result.file);
    let before = [];
    let after = [];
    try {
        const content = readFileSync(fullPath, 'utf-8');
        const lines = content.split('\n');
        const lineIdx = result.line - 1;
        const startLine = Math.max(0, lineIdx - contextLines);
        const endLine = Math.min(lines.length - 1, lineIdx + contextLines);
        before = lines.slice(startLine, lineIdx);
        after = lines.slice(lineIdx + 1, endLine + 1);
    }
    catch { /* file not readable */ }
    const pad = String(result.line + contextLines).length;
    const contextDisplay = [
        ...before.map((l, i) => `  ${String(result.line - before.length + i).padStart(pad)} | ${l}`),
        `> ${String(result.line).padStart(pad)} | ${result.content}`,
        ...after.map((l, i) => `  ${String(result.line + 1 + i).padStart(pad)} | ${l}`),
    ].join('\n');
    return { ...result, contextBefore: before, contextAfter: after, contextDisplay };
}
// IDENTITY_SEAL: PART-4 | role=context-display | inputs=result,rootPath | outputs=SearchResultWithContext
// ============================================================
// PART 5 — Unified Search Runner
// ============================================================
function runFullSearch(query, rootPath, opts) {
    const mode = opts?.mode ?? 'all';
    const maxResults = opts?.maxResults ?? 20;
    const contextLines = opts?.contextLines ?? 2;
    const output = { totalResults: 0 };
    // Code search
    if (mode === 'code' || mode === 'all') {
        const codeResults = ripgrepSearch(query, rootPath, { maxResults, contextLines });
        output.code = codeResults;
        output.totalResults += codeResults.length;
        // Best match with full context
        if (codeResults.length > 0) {
            output.bestMatch = getResultWithContext(codeResults[0], rootPath, contextLines);
        }
    }
    // File search
    if (mode === 'file' || mode === 'all') {
        const fileResults = fuzzyFileSearch(query, rootPath, maxResults);
        output.files = fileResults;
        output.totalResults += fileResults.length;
    }
    // Symbol search
    if (mode === 'symbol' || mode === 'all') {
        const symbolResults = symbolSearch(query, rootPath, maxResults);
        output.symbols = symbolResults;
        output.totalResults += symbolResults.length;
    }
    return output;
}
// IDENTITY_SEAL: PART-5 | role=unified-search | inputs=query,rootPath | outputs=results
