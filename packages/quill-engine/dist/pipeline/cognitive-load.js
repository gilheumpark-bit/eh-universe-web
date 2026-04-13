// ============================================================
// PART 1 — Types (FatigueDetector 메트릭 패턴 차용)
// ============================================================
// ============================================================
// PART 2 — Parsing Helpers
// ============================================================
const FUNC_RE = /(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(|(\w+)\s*\([^)]*\)\s*\{)/g;
const BRANCH_KEYWORDS = /\b(if|else if|case|catch|\?\?|\|\||&&|\?)\b/g;
function measureNesting(lines) {
    let maxDepth = 0;
    let current = 0;
    for (const line of lines) {
        const trimmed = line.trim();
        for (const ch of trimmed) {
            if (ch === '{') {
                current++;
                maxDepth = Math.max(maxDepth, current);
            }
            if (ch === '}') {
                current = Math.max(0, current - 1);
            }
        }
    }
    return maxDepth;
}
function countParams(line) {
    const match = line.match(/\(([^)]*)\)/);
    if (!match || !match[1].trim())
        return 0;
    return match[1].split(',').length;
}
function scoreNameClarity(name) {
    if (!name)
        return 0;
    if (name.length <= 1)
        return 10;
    if (name.length <= 3)
        return 30;
    let score = Math.min(name.length * 5, 50);
    // camelCase / snake_case separation bonus
    const words = name.split(/(?=[A-Z])|_/).filter(Boolean);
    if (words.length >= 2)
        score += 30;
    if (words.length >= 3)
        score += 20;
    return Math.min(score, 100);
}
function extractFunctions(code) {
    const lines = code.split('\n');
    const blocks = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        FUNC_RE.lastIndex = 0;
        const match = FUNC_RE.exec(line);
        if (!match)
            continue;
        const name = match[1] || match[2] || match[3] || 'anonymous';
        // Find the matching closing brace
        let depth = 0;
        let started = false;
        const fnLines = [];
        for (let j = i; j < lines.length; j++) {
            fnLines.push(lines[j]);
            for (const ch of lines[j]) {
                if (ch === '{') {
                    depth++;
                    started = true;
                }
                if (ch === '}')
                    depth--;
            }
            if (started && depth <= 0) {
                blocks.push({ name, startLine: i + 1, content: fnLines });
                break;
            }
        }
    }
    return blocks;
}
// ============================================================
// PART 4 — Scoring Engine
// ============================================================
function computeFunctionScore(block) {
    const bodyText = block.content.join('\n');
    const lineCount = block.content.length;
    const nestingDepth = measureNesting(block.content);
    const parameterCount = countParams(block.content[0]);
    const nameClarity = scoreNameClarity(block.name);
    // Cyclomatic complexity: count branch keywords
    BRANCH_KEYWORDS.lastIndex = 0;
    const branches = bodyText.match(BRANCH_KEYWORDS);
    const cyclomaticComplexity = 1 + (branches?.length ?? 0);
    // Weighted score (0-100, higher = more cognitive load)
    const lengthPenalty = Math.min(lineCount / 1.5, 30);
    const nestPenalty = Math.min(nestingDepth * 8, 25);
    const paramPenalty = Math.min(parameterCount * 5, 15);
    const complexityPenalty = Math.min((cyclomaticComplexity - 1) * 3, 20);
    const clarityPenalty = Math.max(0, (100 - nameClarity) * 0.1);
    const score = Math.round(Math.min(lengthPenalty + nestPenalty + paramPenalty + complexityPenalty + clarityPenalty, 100));
    const level = score >= 85 ? 'critical' : score >= 70 ? 'warning' : 'ok';
    return {
        name: block.name,
        startLine: block.startLine,
        endLine: block.startLine + lineCount - 1,
        lineCount,
        nestingDepth,
        parameterCount,
        cyclomaticComplexity,
        nameClarity,
        score,
        level,
    };
}
// ============================================================
// PART 5 — Public API
// ============================================================
export function analyzeCognitiveLoad(code) {
    if (!code.trim()) {
        return { functions: [], overallScore: 0, level: 'ok', summary: 'Empty file' };
    }
    const blocks = extractFunctions(code);
    if (blocks.length === 0) {
        return { functions: [], overallScore: 0, level: 'ok', summary: 'No functions found' };
    }
    const functions = blocks.map(computeFunctionScore);
    const overallScore = Math.round(functions.reduce((sum, f) => sum + f.score, 0) / functions.length);
    const level = overallScore >= 85 ? 'critical' : overallScore >= 70 ? 'warning' : 'ok';
    const critical = functions.filter((f) => f.level === 'critical').length;
    const warning = functions.filter((f) => f.level === 'warning').length;
    const summary = `${functions.length} functions analyzed. ${critical} critical, ${warning} warnings. Avg load: ${overallScore}/100`;
    return { functions, overallScore, level, summary };
}
// IDENTITY_SEAL: cognitive-load | role=CognitiveLoadAnalyzer | inputs=codeString | outputs=CognitiveLoadResult
