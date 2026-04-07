"use strict";
// ============================================================
// CS Quill 🦔 — Git Deep Adapter
// ============================================================
// Aider의 Git 통합을 로컬 git CLI로 대체.
// blame, branch, auto-commit, diff, history.
Object.defineProperty(exports, "__esModule", { value: true });
exports.isGitRepo = isGitRepo;
exports.getCurrentBranch = getCurrentBranch;
exports.getLastCommit = getLastCommit;
exports.getStatus = getStatus;
exports.blame = blame;
exports.diff = diff;
exports.diffStat = diffStat;
exports.autoStash = autoStash;
exports.autoStashPop = autoStashPop;
exports.autoCommit = autoCommit;
exports.autoBranch = autoBranch;
exports.getRecentHistory = getRecentHistory;
exports.getFileHotspots = getFileHotspots;
exports.analyzeBugProneFiles = analyzeBugProneFiles;
exports.getCodeChurn = getCodeChurn;
exports.getComplexityTrends = getComplexityTrends;
exports.runFullGitDeepAnalysis = runFullGitDeepAnalysis;
const { execSync } = require('child_process');
// Shell argument sanitizer — injection 방지
function sanitize(arg) {
    return arg.replace(/[`$\\!;"'|&<>(){}]/g, '');
}
// ============================================================
// PART 1 — Git Info
// ============================================================
function isGitRepo(rootPath) {
    try {
        execSync('git rev-parse --is-inside-work-tree', { cwd: rootPath, encoding: 'utf-8', stdio: 'pipe' });
        return true;
    }
    catch {
        return false;
    }
}
function getCurrentBranch(rootPath) {
    try {
        return execSync('git branch --show-current', { cwd: rootPath, encoding: 'utf-8', stdio: 'pipe' }).trim();
    }
    catch {
        return 'unknown';
    }
}
function getLastCommit(rootPath) {
    try {
        const output = execSync('git log -1 --pretty=format:"%H|%s|%an|%ai"', { cwd: rootPath, encoding: 'utf-8', stdio: 'pipe' });
        const [hash, message, author, date] = output.split('|');
        return { hash, message, author, date };
    }
    catch {
        return null;
    }
}
function getStatus(rootPath) {
    try {
        const output = execSync('git status --porcelain', { cwd: rootPath, encoding: 'utf-8', stdio: 'pipe' });
        const modified = [];
        const untracked = [];
        const staged = [];
        for (const line of output.split('\n').filter(Boolean)) {
            const status = line.slice(0, 2);
            const file = line.slice(3);
            if (status.includes('?'))
                untracked.push(file);
            else if (status[0] !== ' ')
                staged.push(file);
            else
                modified.push(file);
        }
        return { modified, untracked, staged };
    }
    catch {
        return { modified: [], untracked: [], staged: [] };
    }
}
function blame(rootPath, filePath) {
    try {
        const output = execSync(`git blame --porcelain "${filePath}" 2>/dev/null`, {
            cwd: rootPath, encoding: 'utf-8', stdio: 'pipe',
        });
        const results = [];
        const lines = output.split('\n');
        let currentHash = '';
        let currentAuthor = '';
        let currentDate = '';
        let lineNum = 0;
        for (const line of lines) {
            const hashMatch = line.match(/^([0-9a-f]{40})\s+(\d+)\s+(\d+)/);
            if (hashMatch) {
                currentHash = hashMatch[1].slice(0, 8);
                lineNum = parseInt(hashMatch[3], 10);
                continue;
            }
            if (line.startsWith('author '))
                currentAuthor = line.slice(7);
            if (line.startsWith('author-time '))
                currentDate = new Date(parseInt(line.slice(12), 10) * 1000).toISOString().slice(0, 10);
            if (line.startsWith('\t')) {
                results.push({ hash: currentHash, author: currentAuthor, date: currentDate, line: lineNum, content: line.slice(1) });
            }
        }
        return results;
    }
    catch {
        return [];
    }
}
// IDENTITY_SEAL: PART-2 | role=blame | inputs=rootPath,filePath | outputs=BlameLine[]
// ============================================================
// PART 3 — Git Diff
// ============================================================
function diff(rootPath, ref) {
    try {
        const cmd = ref ? `git diff "${sanitize(ref)}"` : 'git diff';
        return execSync(cmd, { cwd: rootPath, encoding: 'utf-8', stdio: 'pipe' });
    }
    catch {
        return '';
    }
}
function diffStat(rootPath, ref) {
    try {
        const cmd = ref ? `git diff --numstat "${sanitize(ref)}"` : 'git diff --numstat';
        const output = execSync(cmd, { cwd: rootPath, encoding: 'utf-8', stdio: 'pipe' });
        return output.split('\n').filter(Boolean).map(line => {
            const [added, removed, file] = line.split('\t');
            return { file, added: parseInt(added, 10) || 0, removed: parseInt(removed, 10) || 0 };
        });
    }
    catch {
        return [];
    }
}
// IDENTITY_SEAL: PART-3 | role=diff | inputs=rootPath,ref | outputs=string,stat
// ============================================================
// PART 4 — Auto Operations
// ============================================================
function autoStash(rootPath, message = 'cs-quill-auto') {
    try {
        execSync(`git stash push -m "${sanitize(message)}"`, { cwd: rootPath, stdio: 'pipe' });
        return true;
    }
    catch {
        return false;
    }
}
function autoStashPop(rootPath) {
    try {
        execSync('git stash pop', { cwd: rootPath, stdio: 'pipe' });
        return true;
    }
    catch {
        return false;
    }
}
function autoCommit(rootPath, files, message) {
    try {
        for (const file of files) {
            execSync(`git add "${sanitize(file)}"`, { cwd: rootPath, stdio: 'pipe' });
        }
        execSync(`git commit -m "${sanitize(message)}"`, { cwd: rootPath, stdio: 'pipe' });
        return true;
    }
    catch {
        return false;
    }
}
function autoBranch(rootPath, branchName) {
    try {
        const safe = sanitize(branchName);
        execSync(`git checkout -b "${safe}" 2>/dev/null || git checkout "${safe}"`, { cwd: rootPath, stdio: 'pipe' });
        return true;
    }
    catch {
        return false;
    }
}
// IDENTITY_SEAL: PART-4 | role=auto-ops | inputs=rootPath | outputs=boolean
// ============================================================
// PART 5 — History Analysis
// ============================================================
function getRecentHistory(rootPath, limit = 20) {
    try {
        const output = execSync(`git log --oneline --numstat -${limit} --pretty=format:"COMMIT|%h|%s|%an|%ai"`, {
            cwd: rootPath, encoding: 'utf-8', stdio: 'pipe',
        });
        const commits = [];
        let current = null;
        for (const line of output.split('\n')) {
            if (line.startsWith('COMMIT|')) {
                if (current)
                    commits.push(current);
                const [, hash, message, author, date] = line.split('|');
                current = { hash, message, author, date, files: 0 };
            }
            else if (current && line.trim()) {
                current.files++;
            }
        }
        if (current)
            commits.push(current);
        return commits;
    }
    catch {
        return [];
    }
}
function getFileHotspots(rootPath, limit = 10) {
    try {
        const output = execSync('git log --name-only --pretty=format:"" --since="30 days ago" -- "*.ts" "*.tsx" 2>/dev/null', {
            cwd: rootPath, encoding: 'utf-8', stdio: 'pipe',
        });
        const counts = new Map();
        for (const line of output.split('\n').filter(Boolean)) {
            counts.set(line, (counts.get(line) ?? 0) + 1);
        }
        return [...counts.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([file, commits]) => ({ file, commits }));
    }
    catch {
        return [];
    }
}
// IDENTITY_SEAL: PART-5 | role=history | inputs=rootPath | outputs=commits,hotspots
// ============================================================
// PART 6 — Blame Analysis for Bug-Prone Files
// ============================================================
function analyzeBugProneFiles(rootPath, limit = 10) {
    try {
        // Find files involved in bug-fix commits (commits with fix/bug/hotfix in message)
        const output = execSync('git log --all --oneline --name-only --grep="fix" --grep="bug" --grep="hotfix" --grep="patch" -i --since="180 days ago" 2>/dev/null', { cwd: rootPath, encoding: 'utf-8', stdio: 'pipe' });
        const fileFixCounts = new Map();
        let currentCommit = '';
        for (const line of output.split('\n')) {
            if (!line.trim())
                continue;
            // Commit lines start with a short hash
            if (/^[0-9a-f]{7,}\s/.test(line)) {
                currentCommit = line;
            }
            else if (currentCommit) {
                const file = line.trim();
                if (!file.includes(' ') && file.includes('.')) {
                    const entry = fileFixCounts.get(file) ?? { fixes: 0, authors: new Map() };
                    entry.fixes++;
                    fileFixCounts.set(file, entry);
                }
            }
        }
        // Get total commit count for each file and author info
        const results = [];
        for (const [file, data] of [...fileFixCounts.entries()].sort((a, b) => b[1].fixes - a[1].fixes).slice(0, limit)) {
            let totalCommits = 0;
            try {
                totalCommits = parseInt(execSync(`git log --oneline --follow -- "${sanitize(file)}" 2>/dev/null | wc -l`, {
                    cwd: rootPath, encoding: 'utf-8', stdio: 'pipe',
                }).trim(), 10) || 1;
            }
            catch {
                totalCommits = 1;
            }
            // Get authors for this file's fix commits
            try {
                const authorOut = execSync(`git log --grep="fix" --grep="bug" --grep="hotfix" -i --format="%an" -- "${sanitize(file)}" 2>/dev/null`, { cwd: rootPath, encoding: 'utf-8', stdio: 'pipe' });
                const authorCounts = new Map();
                for (const a of authorOut.split('\n').filter(Boolean)) {
                    authorCounts.set(a, (authorCounts.get(a) ?? 0) + 1);
                }
                data.authors = authorCounts;
            }
            catch { /* skip */ }
            const bugRatio = Math.round((data.fixes / totalCommits) * 100);
            const riskScore = Math.min(100, data.fixes * 10 + bugRatio);
            results.push({
                file,
                bugFixCommits: data.fixes,
                totalCommits,
                bugRatio,
                topAuthors: [...data.authors.entries()]
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 3)
                    .map(([author, fixes]) => ({ author, fixes })),
                riskScore,
            });
        }
        return results;
    }
    catch {
        return [];
    }
}
// IDENTITY_SEAL: PART-6 | role=bug-prone | inputs=rootPath | outputs=bugProneFiles
// ============================================================
// PART 7 — Code Churn Metrics
// ============================================================
function getCodeChurn(rootPath, days = 30) {
    try {
        const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
        const output = execSync(`git log --since="${since}" --numstat --pretty=format:"COMMIT_MARK" --no-merges 2>/dev/null`, { cwd: rootPath, encoding: 'utf-8', stdio: 'pipe' });
        const fileStats = new Map();
        let totalAdditions = 0;
        let totalDeletions = 0;
        let commitCount = 0;
        for (const line of output.split('\n')) {
            if (line === 'COMMIT_MARK') {
                commitCount++;
                continue;
            }
            if (!line.trim())
                continue;
            const parts = line.split('\t');
            if (parts.length < 3)
                continue;
            const added = parseInt(parts[0], 10) || 0;
            const deleted = parseInt(parts[1], 10) || 0;
            const file = parts[2];
            if (file === '-' || !file)
                continue;
            totalAdditions += added;
            totalDeletions += deleted;
            const existing = fileStats.get(file) ?? { added: 0, deleted: 0, commits: 0 };
            existing.added += added;
            existing.deleted += deleted;
            existing.commits++;
            fileStats.set(file, existing);
        }
        const fileChurn = [...fileStats.entries()]
            .map(([file, stats]) => ({
            file,
            added: stats.added,
            deleted: stats.deleted,
            churn: stats.added + stats.deleted,
            commits: stats.commits,
        }))
            .sort((a, b) => b.churn - a.churn)
            .slice(0, 20);
        const totalChurn = totalAdditions + totalDeletions;
        const churnRatio = totalAdditions > 0 ? Math.round((totalDeletions / totalAdditions) * 100) / 100 : 0;
        const highChurnFiles = fileChurn.filter(f => f.churn > 200).length;
        const avgChurnPerCommit = commitCount > 0 ? Math.round(totalChurn / commitCount) : 0;
        return {
            totalAdditions,
            totalDeletions,
            churnRatio,
            fileChurn,
            highChurnFiles,
            avgChurnPerCommit,
        };
    }
    catch {
        return { totalAdditions: 0, totalDeletions: 0, churnRatio: 0, fileChurn: [], highChurnFiles: 0, avgChurnPerCommit: 0 };
    }
}
// IDENTITY_SEAL: PART-7 | role=code-churn | inputs=rootPath | outputs=churnMetrics
// ============================================================
// PART 8 — File Complexity Trends Over Commits
// ============================================================
function getComplexityTrends(rootPath, filePath, sampleCount = 10) {
    try {
        // Get recent commits that touched this file
        const logOutput = execSync(`git log --oneline -${sampleCount * 2} --format="%H|%ai|%an" -- "${sanitize(filePath)}" 2>/dev/null`, { cwd: rootPath, encoding: 'utf-8', stdio: 'pipe' });
        const commits = logOutput.split('\n').filter(Boolean).slice(0, sampleCount);
        const trends = [];
        for (const line of commits) {
            const [hash, date, author] = line.split('|');
            if (!hash)
                continue;
            try {
                const content = execSync(`git show "${hash.slice(0, 8)}:${sanitize(filePath)}" 2>/dev/null`, { cwd: rootPath, encoding: 'utf-8', stdio: 'pipe' });
                const lines = content.split('\n');
                const lineCount = lines.length;
                // Count functions (regex-based for speed)
                const fnPattern = /(?:function\s+\w+|(?:async\s+)?(?:const|let|var)\s+\w+\s*=\s*(?:async\s+)?\(|(?:async\s+)?(?:\w+)\s*\([^)]*\)\s*\{|=>\s*\{)/g;
                const functionCount = (content.match(fnPattern) ?? []).length;
                // Estimate max nesting by brace depth
                let maxNesting = 0;
                let currentDepth = 0;
                for (const ch of content) {
                    if (ch === '{') {
                        currentDepth++;
                        if (currentDepth > maxNesting)
                            maxNesting = currentDepth;
                    }
                    if (ch === '}')
                        currentDepth--;
                }
                // Simple complexity = lines * nesting * (functions ? 1 : 2)
                const complexity = Math.round((lineCount * (maxNesting / 3) + functionCount * 5) / 10);
                trends.push({
                    commitHash: hash.slice(0, 8),
                    date: (date ?? '').slice(0, 10),
                    author: author ?? '',
                    lineCount,
                    functionCount,
                    maxNesting,
                    complexity,
                });
            }
            catch { /* file didn't exist at this commit */ }
        }
        return trends.reverse(); // chronological order
    }
    catch {
        return [];
    }
}
// IDENTITY_SEAL: PART-8 | role=complexity-trends | inputs=rootPath,filePath | outputs=trends
// ============================================================
// PART 9 — Unified Git Deep Analysis
// ============================================================
function runFullGitDeepAnalysis(rootPath) {
    const bugProne = analyzeBugProneFiles(rootPath);
    const churn = getCodeChurn(rootPath);
    const hotspots = getFileHotspots(rootPath);
    const history = getRecentHistory(rootPath);
    // Score: penalize high bug-prone files and high churn
    const bugScore = Math.max(0, 100 - bugProne.filter(f => f.riskScore > 50).length * 15);
    const churnScore = churn.highChurnFiles > 5 ? 60 : churn.highChurnFiles > 2 ? 80 : 100;
    const score = Math.round((bugScore + churnScore) / 2);
    return { bugProneFiles: bugProne, codeChurn: churn, hotspots, recentHistory: history, score };
}
// IDENTITY_SEAL: PART-9 | role=unified-git-deep | inputs=rootPath | outputs=analysis
