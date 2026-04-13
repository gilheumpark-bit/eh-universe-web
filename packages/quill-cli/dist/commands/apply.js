"use strict";
// ============================================================
// CS Quill 🦔 — cs apply + cs undo commands
// ============================================================
// 원본 보존 모드: .cs/generated/ → 원본에 적용 / 롤백.
Object.defineProperty(exports, "__esModule", { value: true });
exports.runApply = runApply;
exports.runUndo = runUndo;
const fs_1 = require("fs");
const path_1 = require("path");
async function runApply(file, opts) {
    const generatedDir = (0, path_1.join)(process.cwd(), '.cs', 'generated');
    const backupDir = (0, path_1.join)(process.cwd(), '.cs', 'backup');
    // Check file mode
    try {
        const { loadMergedConfig } = require('../core/config');
        const config = loadMergedConfig();
        if (config.fileMode === 'yolo' && !opts.all) {
            opts.all = true; // Yolo = auto apply all
            console.log('  ⚡ Yolo 모드 — 전체 자동 적용\n');
        }
    }
    catch { }
    if (!(0, fs_1.existsSync)(generatedDir)) {
        console.log('  ⚠️  적용할 파일이 없습니다. (.cs/generated/ 비어있음)');
        return;
    }
    (0, fs_1.mkdirSync)(backupDir, { recursive: true });
    const filesToApply = opts.all
        ? (0, fs_1.readdirSync)(generatedDir).filter(f => f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.js') || f.endsWith('.jsx'))
        : file ? [(0, path_1.basename)(file)] : [];
    if (filesToApply.length === 0) {
        console.log('  ⚠️  파일을 지정하세요: cs apply <filename> 또는 cs apply --all');
        return;
    }
    console.log('🦔 CS Quill — 수정본 적용\n');
    let applied = 0;
    let failed = 0;
    for (const f of filesToApply) {
        const generatedPath = (0, path_1.join)(generatedDir, f);
        const targetPath = (0, path_1.join)(process.cwd(), 'src', f);
        if (!(0, fs_1.existsSync)(generatedPath)) {
            console.log(`  ⚠️  ${f} — 수정본 없음`);
            continue;
        }
        // Read generated content first to validate
        let content;
        try {
            content = (0, fs_1.readFileSync)(generatedPath, 'utf-8');
        }
        catch (err) {
            console.log(`  ❌ ${f} — 수정본 읽기 실패: ${err.message}`);
            failed++;
            continue;
        }
        if (!content || content.trim().length === 0) {
            console.log(`  ⚠️  ${f} — 수정본이 비어있음, 건너뜀`);
            continue;
        }
        // Show diff before applying (safe/auto mode)
        if ((0, fs_1.existsSync)(targetPath)) {
            try {
                const { loadMergedConfig } = require('../core/config');
                const cfg = loadMergedConfig();
                if (cfg.fileMode !== 'yolo') {
                    const { computeDiff, formatDiff, printDiffSummary } = require('../tui/diff-preview');
                    const original = (0, fs_1.readFileSync)(targetPath, 'utf-8');
                    const diff = computeDiff(original, content);
                    const changed = diff.filter(d => d.type !== 'unchanged').length;
                    if (changed > 0) {
                        console.log(`\n  📊 ${f}: ${printDiffSummary(diff)}`);
                        if (changed < 30)
                            console.log(formatDiff(diff));
                    }
                }
            }
            catch { /* diff optional */ }
            // Backup original before overwriting
            try {
                const backupName = `${f}.${Date.now()}`;
                (0, fs_1.copyFileSync)(targetPath, (0, path_1.join)(backupDir, backupName));
                console.log(`  📋 ${f} 백업 → .cs/backup/${backupName}`);
            }
            catch (err) {
                console.log(`  ❌ ${f} — 백업 실패: ${err.message}`);
                failed++;
                continue; // Don't apply if backup failed
            }
        }
        // diff-guard: block apply unless --override
        if ((0, fs_1.existsSync)(targetPath)) {
            try {
                // eslint-disable-next-line @typescript-eslint/no-require-imports
                const { runDiffGuard } = require('@eh/quill-engine/pipeline/diff-guard');
                const original = (0, fs_1.readFileSync)(targetPath, 'utf-8');
                const decision = runDiffGuard({
                    original,
                    modified: content,
                    fileName: f,
                    policy: { mode: 'soft' },
                    language: f.endsWith('.tsx') ? 'tsx' : f.endsWith('.ts') ? 'typescript' : f.endsWith('.jsx') ? 'jsx' : 'javascript',
                });
                if (decision.status === 'fail' && !opts.override) {
                    console.log(`  ⛔ ${f} — diff-guard 차단 (Override 필요)`);
                    for (const fd of decision.findings.slice(0, 6)) {
                        console.log(`     - [${fd.rule}] ${fd.message}${fd.line ? ` (L${fd.line})` : ''}`);
                    }
                    console.log(`     hint: cs apply ${f} --override`);
                    failed++;
                    continue;
                }
                if (decision.status === 'fail' && opts.override) {
                    console.log(`  ⚠️  ${f} — diff-guard 위반이지만 --override로 강제 적용`);
                }
            }
            catch (err) {
                console.log(`  ⚠️  ${f} — diff-guard 실행 실패(무시): ${err.message}`);
            }
        }
        // Atomic write: write to temp file first, then rename
        try {
            (0, fs_1.mkdirSync)((0, path_1.join)(process.cwd(), 'src'), { recursive: true });
            const tmpPath = targetPath + '.tmp.' + Date.now();
            (0, fs_1.writeFileSync)(tmpPath, content, 'utf-8');
            // Verify temp file was written correctly
            const verify = (0, fs_1.readFileSync)(tmpPath, 'utf-8');
            if (verify.length !== content.length) {
                (0, fs_1.unlinkSync)(tmpPath);
                throw new Error('쓰기 검증 실패: 크기 불일치');
            }
            // Rename temp to target (atomic on most filesystems)
            (0, fs_1.renameSync)(tmpPath, targetPath);
            console.log(`  ✅ ${f} → src/${f} 적용 완료 (${content.length}자)`);
            applied++;
        }
        catch (err) {
            console.log(`  ❌ ${f} — 적용 실패: ${err.message}`);
            failed++;
            // Clean up temp file if it exists
            try {
                const tmpGlob = targetPath + '.tmp.';
                const { readdirSync: ls } = require('fs');
                const dir = require('path').dirname(targetPath);
                const base = require('path').basename(targetPath);
                for (const tmp of ls(dir)) {
                    if (tmp.startsWith(base + '.tmp.')) {
                        try {
                            (0, fs_1.unlinkSync)((0, path_1.join)(dir, tmp));
                        }
                        catch { /* ignore */ }
                    }
                }
            }
            catch { /* ignore cleanup errors */ }
        }
    }
    console.log(`\n  완료: ${applied}개 적용, ${failed}개 실패\n`);
}
async function runUndo(opts) {
    const backupDir = (0, path_1.join)(process.cwd(), '.cs', 'backup');
    if (!(0, fs_1.existsSync)(backupDir)) {
        console.log('  ⚠️  되돌릴 백업이 없습니다.');
        return;
    }
    const backups = (0, fs_1.readdirSync)(backupDir)
        .filter(f => /\.\d+$/.test(f))
        .sort()
        .reverse();
    if (backups.length === 0) {
        console.log('  ⚠️  되돌릴 백업이 없습니다.');
        return;
    }
    console.log('🦔 CS Quill — 되돌리기\n');
    const toRestore = opts.all ? backups : [backups[0]];
    for (const backup of toRestore) {
        const originalName = backup.replace(/\.\d+$/, '');
        const targetPath = (0, path_1.join)(process.cwd(), 'src', originalName);
        const backupPath = (0, path_1.join)(backupDir, backup);
        (0, fs_1.copyFileSync)(backupPath, targetPath);
        console.log(`  ↩️  ${originalName} 복원 완료 (from ${backup})`);
    }
    console.log('');
}
// IDENTITY_SEAL: PART-2 | role=undo | inputs=opts | outputs=files
